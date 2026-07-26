# ERD - Platform Infrastruktur (Idempotency, Outbox, Notifikasi)

Status dokumen: **BARU (correction loop ALT-DEF-017)**. Menambahkan model
infrastruktur cross-cutting yang belum ada di `01-platform.md`:
`IDEMPOTENCY_KEY` (jaminan idempotency endpoint kritis), `DOMAIN_OUTBOX_EVENT`
(transactional outbox untuk propagasi event domain), dan `NOTIFICATION`
(notifikasi in-app). Lihat `docs/engineering/DECISION-LOG.md` ADR-016 untuk
rasional desain lengkap.

**Batasan cakupan (penting):** batch ini HANYA menambah model + dokumentasi
kontrak. Middleware idempotency nyata, relay worker outbox nyata, publisher
event nyata di domain manapun (Pesanan/Dapur/Pembayaran/Persediaan/Karyawan),
dan handler endpoint notifikasi nyata **BELUM DIKERJAKAN** - lihat
`docs/engineering/DEFECT-LEDGER.md` ALT-DEF-017 (status `SIAP_DIVERIFIKASI`).

```mermaid
erDiagram
    TENANT ||--o{ IDEMPOTENCY_KEY : memiliki
    TENANT ||--o{ DOMAIN_OUTBOX_EVENT : memiliki
    TENANT ||--o{ NOTIFICATION : memiliki
    PENGGUNA ||--o{ NOTIFICATION : menerima

    IDEMPOTENCY_KEY {
        string id PK "ULID"
        string tenantId FK
        string outletId "nullable, informational - BUKAN FK, lihat ADR-016"
        string key "idempotency key dari klien (header Idempotency-Key)"
        string scope "mis. checkout, pembayaran.konfirmasi, promo.terapkan"
        string requestHash "hash payload - deteksi key dipakai ulang dgn payload beda"
        int responseStatus "nullable"
        json responseBody "nullable"
        string status "MEMPROSES|SELESAI|GAGAL"
        datetime expiresAt
        datetime createdAt
        datetime updatedAt
        note "@@unique([tenantId, scope, key])"
    }
    DOMAIN_OUTBOX_EVENT {
        string id PK
        string tenantId FK
        string outletId "nullable"
        string aggregateType "mis. Pesanan, Pembayaran, TiketDapur"
        string aggregateId
        string eventType "mis. order.submitted - lihat daftar lengkap di bawah"
        json payload
        string status "TERTUNDA|DIPROSES|TERKIRIM|GAGAL"
        int attemptCount "default 0"
        datetime availableAt "retry backoff scheduling"
        datetime processedAt "nullable"
        string lastError "nullable"
        datetime createdAt
        note "@@index([status, availableAt]) - polling/dispatch relay worker"
    }
    NOTIFICATION {
        string id PK
        string tenantId FK
        string outletId "nullable"
        string keanggotaanTenantId FK "nullable, -> KEANGGOTAAN_TENANT, composite (tenantId, keanggotaanTenantId) - ADR-033 (sebelumnya penggunaId -> Pengguna langsung); lihat catatan targeting di bawah"
        string tipe "PESANAN_QR_MASUK|PESANAN_BERUBAH|PESANAN_SIAP|..."
        string judul
        string pesan
        json data "nullable - payload deep-link, mis. {orderId: ...}"
        datetime dibacaPada "nullable"
        datetime createdAt
        note "@@index([keanggotaanTenantId, dibacaPada]) - query unread"
    }
```

## IdempotencyKey (ALT-PLT-018)

Menjamin request duplikat ke endpoint kritis (klien retry karena timeout,
koneksi terputus, dsb) tidak menghasilkan efek ganda. Alur pemakaian
(service-layer, bukan bagian skema):

1. Klien mengirim header `Idempotency-Key: <key>` pada endpoint kritis.
2. Service menghitung `requestHash` dari body request, lalu mencari baris
   `IdempotencyKey` dengan `(tenantId, scope, key)` yang sama.
   - **Tidak ditemukan:** buat baris baru `status = MEMPROSES`, proses
     request seperti biasa, lalu isi `responseStatus`/`responseBody` dan set
     `status = SELESAI` (atau `GAGAL` bila request gagal) setelah selesai.
   - **Ditemukan, `requestHash` SAMA, `status = SELESAI`:** kembalikan
     `responseStatus`/`responseBody` tersimpan TANPA memproses ulang efek
     bisnis - inilah jaminan idempotency-nya.
   - **Ditemukan, `requestHash` SAMA, `status = MEMPROSES`:** request
     pertama masih berjalan (request duplikat tiba sebelum yang pertama
     selesai) - tolak/tunda (mis. `409 Conflict` atau retry-after), JANGAN
     proses paralel.
   - **Ditemukan, `requestHash` BERBEDA:** key dipakai ulang dengan payload
     yang berbeda dari request asli - ini kesalahan klien/potensi bug, HARUS
     ditolak eksplisit sebagai `409 Conflict`, bukan diam-diam memproses
     ulang atau mengembalikan response basi.
3. `expiresAt` membatasi berapa lama baris idempotency dipertahankan
   (kebijakan retensi/TTL konkret adalah keputusan service-layer, mis. 24 jam).

**Kenapa `IdempotencyKey.tenantId` cukup FK biasa (bukan composite-FK
ganda):** lihat ADR-016 Keputusan 2 - model ini hanya punya satu relasi
tenant-owned (langsung ke `Tenant`), tidak seperti `KeanggotaanOutlet`/
`PinOutlet` yang bernaung di bawah DUA parent tenant-scoped independen
(`Outlet` DAN `KeanggotaanTenant`) yang bisa saling menyimpang. `outletId` di
sini kolom informational nullable, sama seperti `AuditLog.outletId`.

## DomainOutboxEvent (ALT-PLT-019)

Pola **transactional outbox**: setiap kali sebuah domain (Pesanan, Dapur,
Pembayaran, Persediaan, Karyawan, dst.) mengubah state bisnis yang perlu
diketahui pihak lain (klien realtime, worker agregasi analitik ADR-008, KDS),
ia menulis SATU baris `DomainOutboxEvent` DALAM TRANSAKSI DATABASE YANG SAMA
dengan perubahan state tersebut. Sebuah relay worker terpisah (di luar
cakupan batch ini) secara berkala membaca baris `status IN ('TERTUNDA',
'GAGAL')` dengan `availableAt <= now()` (lewat index `[status, availableAt]`),
mem-publish ke konsumen (WebSocket/broker/job agregasi), lalu menandai
`status = TERKIRIM` (atau menaikkan `attemptCount`/`availableAt`/`lastError`
dan mengembalikan ke `TERTUNDA`/`GAGAL` bila publish gagal).

**Kenapa outbox, bukan publish langsung:** lihat ADR-016 Keputusan 3. Inti
alasannya adalah **atomicity** - publish langsung ke sistem eksternal di
titik yang sama dengan commit database berarti dua operasi terpisah yang
bisa gagal secara independen (commit sukses, publish gagal = event hilang
permanen). Outbox membuat "tulis event" menjadi bagian dari transaksi
database yang sama dengan perubahan state, sehingga event TIDAK PERNAH
hilang selama transaksi itu sendiri berhasil.

**Daftar `eventType` lengkap** (dari master spec, publisher-nya adalah
pekerjaan fitur domain terkait di batch berikutnya, BUKAN batch ini):

| eventType | Dipicu oleh (domain, batch berikutnya) |
|---|---|
| `order.submitted` | Pesanan |
| `order.accepted` | Pesanan |
| `order.rejected` | Pesanan |
| `order.updated` | Pesanan |
| `order.cancelled` | Pesanan |
| `order.sent_to_kitchen` | Pesanan/Dapur |
| `kitchen.started` | Dapur |
| `kitchen.ready` | Dapur |
| `order.served` | Pesanan |
| `payment.awaiting_confirmation` | Pembayaran |
| `payment.confirmed` | Pembayaran |
| `stock.low` | Persediaan |
| `stock.adjusted` | Persediaan |
| `shift.opened` | Karyawan/Absensi |
| `shift.closed` | Karyawan/Absensi |
| `attendance.created` | Karyawan/Absensi |

## Notification (ALT-PLT-020)

Notifikasi **internal Altora SAJA** - tidak ada integrasi WhatsApp/SMS/push
eksternal apa pun (lihat ADR-016 Keputusan 4). Klien membaca baris ini lewat
polling atau realtime (`GET /api/v1/notifikasi`), dan menandainya dibaca
(`POST /api/v1/notifikasi/{id}/read` mengisi `dibacaPada`).

**Targeting saat `keanggotaanTenantId` NULL:** notifikasi broadcast (mis.
`STOK_KRITIS` untuk siapa pun berperan GUDANG di suatu outlet) tidak
mereferensikan satu `KeanggotaanTenant` tertentu. Pass ini SENGAJA tidak
menambah model `NotificationTarget` (many-to-many ke penerima) - lihat
ADR-016 Keputusan 5 untuk trade-off lengkapnya. Ketika
`keanggotaanTenantId IS NULL`, menentukan siapa yang berhak melihat baris
ini adalah tanggung jawab service-layer (filter `outletId` + peran pemanggil
saat query), bukan dijamin skema.

**ADR-033 - `penggunaId` -> `keanggotaanTenantId` (perbaikan TRIVIAL,
BUKAN redesain targeting).** Field ini berpindah dari FK langsung ke
`Pengguna` (identitas global) menjadi composite-FK ke `KeanggotaanTenant`
(`(tenantId, keanggotaanTenantId) -> KeanggotaanTenant(tenantId, id)`) -
penerapan pola yang sama seperti seluruh field aktor lain di batch ADR-033,
karena `Notification` sudah membawa `tenantId` sendiri. Ini HANYA
memperbaiki VALIDASI ACTOR (kolom yang ada sekarang menjamin merujuk
keanggotaan yang sah untuk tenant ini) - redesain TARGETING yang lebih
dalam (`keanggotaanOutletId` untuk notifikasi outlet-scoped, `peranId`
untuk broadcast-per-peran, model `NotificationTarget` terpisah) TETAP
di luar cakupan batch ini, dicadangkan untuk batch "perbaiki notification
targeting" terpisah (lihat ADR-016 dan ADR-033 di
`docs/engineering/DECISION-LOG.md`).

Kembali ke [README.md](./README.md) untuk indeks ERD domain lain.
