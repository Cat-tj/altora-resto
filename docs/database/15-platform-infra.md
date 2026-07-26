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
        int aggregateVersion "ADR-039: versi aggregate SAAT event ditulis"
        string eventType "mis. order.submitted - lihat daftar lengkap di bawah"
        int eventVersion "ADR-039: versi skema PAYLOAD per eventType, default 1"
        string schemaVersion "ADR-039: versi ENVELOPE outbox, default '1.0'"
        string correlationId "ADR-039: grup satu operasi bisnis akar"
        string causationId "ADR-039: nullable, event/command LANGSUNG penyebab"
        string deduplicationKey "ADR-039: consumer idempotency key"
        json payload
        string status "TERTUNDA|DIPROSES|TERKIRIM|GAGAL|DEAD_LETTER"
        int attemptCount "default 0"
        datetime availableAt "retry backoff scheduling"
        datetime occurredAt "ADR-039: waktu peristiwa bisnis nyata"
        datetime publishedAt "ADR-039: nullable, kapan sukses publish (sekali isi)"
        datetime processedAt "nullable, kapan upaya TERAKHIR selesai (tiap upaya)"
        string lastError "nullable"
        datetime createdAt
        note "@@unique([aggregateType,aggregateId,aggregateVersion,eventType]); @@unique([deduplicationKey]); @@index([status, availableAt]); trigger partial-mutability outbox_tolak_ubah_kolom_bisnis()"
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

**`outletId` (re-diverifikasi pada batch ADR-039, bukan diasumsikan):** tetap
informational-nullable, BUKAN composite-FK ke `Outlet`, pola yang SAMA
seperti `AuditLog.outletId`/`IdempotencyKey.outletId` - model ini dibuat
pada batch ADR-016 yang SAMA dengan batch composite-FK `IdempotencyKey`,
jadi tidak ada risiko "ditambah setelah batch composite-FK dan terlewat".

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

### ADR-039 - pengerasan versioning/dedup/ordering (9 kolom baru)

Batch ADR-039 menambah 9 kolom top-level ke model yang sudah ada sejak
ADR-016. Ringkasan per kolom (rasional penuh ada di komentar
`prisma/schema/schema.prisma` dan `docs/engineering/DECISION-LOG.md`
ADR-039):

- **`aggregateVersion` (Int, wajib).** Versi aggregate root (mis.
  `Pesanan.version` dari optimistic-locking ADR-035) PADA SAAT event ini
  ditulis - bukan versi terkini. Consumer bisa mendeteksi event yang
  diproses tidak berurutan relatif perubahan state aggregate sebenarnya.
- **`eventVersion` (Int, default 1) vs `schemaVersion` (String, default
  "1.0") - DUA KONSEP BERBEDA, bukan duplikat:**
  - `eventVersion`: versi skema **PAYLOAD** untuk `eventType` SPESIFIK ini
    (mis. `order.accepted` v1 vs v2 bila bentuk payload event itu berubah).
  - `schemaVersion`: versi **ENVELOPE** outbox secara keseluruhan - kolom
    top-level apa saja yang ada di baris ini (batch ADR-039 ini sendiri
    adalah kenaikan schemaVersion pertama, "1.0", karena menambah 9 kolom
    top-level baru).
  - Keduanya independen: `eventType` yang sama bisa tetap `eventVersion=1`
    sementara `schemaVersion` sudah naik (envelope berubah, payload event
    itu tidak), atau sebaliknya.
- **`correlationId` (String, wajib) vs `causationId` (String, nullable) -
  DUA KONSEP BERBEDA:**
  - `correlationId`: ID SAMA untuk SEMUA event/command dari SATU operasi
    bisnis akar (mis. command "terima pesanan" memicu `order.accepted` DAN
    `stock.reserved` - keduanya berbagi `correlationId` yang sama).
  - `causationId`: ID event/command yang LANGSUNG menyebabkan event ini -
    rantai kausal. Contoh: `order.accepted` -> `kitchen.ticket_created` ->
    `notification.sent`, masing-masing `causationId` menunjuk event
    SEBELUMNYA, tapi ketiganya berbagi `correlationId` yang sama. Nullable
    karena event akar (dipicu langsung command pengguna) tidak punya
    causation.
- **`deduplicationKey` (String, wajib, `@@unique`).** Consumer-supplied atau
  business-logic-supplied key untuk pemrosesan idempotent di sisi
  CONSUMER - lihat kontrak wajib "consumer idempotent" di
  `docs/api/API-CONTRACT.md` bagian 17.3.
- **`occurredAt` (DateTime, wajib) vs `createdAt` (sudah ada).** `occurredAt`
  adalah waktu peristiwa BISNIS sebenarnya terjadi; `createdAt` adalah waktu
  baris outbox ditulis. Pada pola outbox yang benar (event ditulis dalam
  transaksi bisnis yang sama), keduanya SEHARUSNYA identik atau berbeda
  hanya beberapa milidetik - `occurredAt` tetap kolom terpisah untuk
  mengakomodasi kasus non-ideal (backfill/replay event lama).
- **`publishedAt` (DateTime, nullable) vs `processedAt` (sudah ada,
  MAKNANYA DIPERSEMPIT pada batch ini) - BUKAN kolom duplikat:**
  - `publishedAt`: kapan relay worker BERHASIL mem-publish event ke
    konsumen eksternal - diisi SEKALI, saat sukses pertama, bersamaan
    `status -> TERKIRIM`. Tidak pernah berubah lagi setelahnya.
  - `processedAt`: kapan relay worker TERAKHIR KALI menyelesaikan SATU
    upaya pemrosesan baris ini, apa pun hasilnya (sukses maupun gagal) -
    diisi ulang SETIAP upaya. Berguna untuk observability "kapan terakhir
    disentuh worker" untuk baris yang masih gagal berulang, sesuatu yang
    `publishedAt` (murni penanda sukses) tidak bisa jawab.

**Dua unique constraint dedup (SEPARATE, BUKAN redundan):**

1. `@@unique([aggregateType, aggregateId, aggregateVersion, eventType])` -
   write-side dedup: mencegah event type yang SAMA tercatat dua kali untuk
   aggregate yang sama pada versi yang sama (bug/race di kode PENULIS).
2. `@@unique([deduplicationKey])` - dedup TERPISAH yang cakupannya bisa
   berbeda dari #1 (consumer/business-logic-supplied, independen dari
   aggregate versioning). Kedua constraint dibutuhkan bersama karena
   masing-masing melindungi jalur penyebab duplikasi yang berbeda.

**Status `DEAD_LETTER` (baru).** Terminal, BERBEDA dari `GAGAL` (yang masih
akan di-retry). Kebijakan kapan memindahkan baris `GAGAL -> DEAD_LETTER`
(mis. setelah `attemptCount` melewati ambang N) adalah keputusan OPERASIONAL
relay worker, bukan bagian skema.

**Trigger partial-mutability `outbox_tolak_ubah_kolom_bisnis()` (migrasi
`20260726160000_harden_transactional_outbox`).** Menegakkan "retry tidak
mengubah payload" di level DATABASE: menolak UPDATE terhadap kolom konten
bisnis (`payload`, `eventType`, `aggregateType`, `aggregateId`,
`aggregateVersion`, `eventVersion`, `schemaVersion`, `correlationId`,
`causationId`, `deduplicationKey`, `occurredAt`, `createdAt`, `id`,
`tenantId`, `outletId`), TAPI mengizinkan UPDATE kolom state pemrosesan
(`status`, `attemptCount`, `availableAt`, `processedAt`, `publishedAt`,
`lastError`). BERBEDA dari `ledger_tolak_ubah()` (ADR-032) yang menolak
SEMUA UPDATE tanpa kecuali - tabel ini punya siklus hidup pemrosesan yang
SAH sehingga butuh desain partial-mutability, bukan reject-all murni. Lihat
ADR-039 untuk penjelasan lengkap perbedaan pola ini.

**Ordering per aggregate - DB mendukung, TIDAK menegakkan.** Index unique
`(aggregateType, aggregateId, aggregateVersion, eventType)` menyediakan
B-tree yang leftmost prefix-nya `(aggregateType, aggregateId,
aggregateVersion)` - query "ambil event aggregate ini terurut versi" efisien
tanpa index tambahan. TAPI Postgres tidak menjamin urutan dequeue tanpa
`ORDER BY` eksplisit di setiap query consumer - disiplin ini WAJIB
diterapkan di kode relay worker (app-level), skema hanya menyediakan index
pendukungnya.

**"Event ditulis dalam transaksi bisnis yang sama" - kontrak inti, TIDAK ADA
penegakan DB generik.** Ini adalah jaminan FUNDAMENTAL pola outbox (event
dan perubahan state bisnis di-commit bersama dalam satu transaksi), murni
tanggung jawab kode APLIKASI/handler yang belum ada di repo ini
(sama seperti kontrak transaksi pembayaran-pesanan ADR-036/ALT-DEF-047).
Sebuah trigger generik yang menegakkan "setiap perubahan state punya baris
outbox yang cocok" TIDAK REALISTIS dibangun secara generik - pemetaan
transisi state -> eventType berbeda-beda per aggregate/domain (aturan
bisnis, bukan struktur tabel), sehingga trigger seperti itu tidak bisa
ditulis tanpa mengetahui aturan spesifik tiap domain terlebih dahulu.
Keputusan ini didokumentasikan jujur sebagai gap app-level (lihat
`INVARIAN-BELUM-DITEGAKKAN.md` kategori C), bukan dipaksakan menjadi trigger
yang tidak benar-benar generik.

**Daftar `eventType` lengkap** (dari master spec, publisher-nya adalah
pekerjaan fitur domain terkait di batch berikutnya, BUKAN batch ini).
**Diperluas pada batch ADR-039 ini** untuk menutup `ALT-DEF-042` (8 event
baru ditandai eksplisit di bawah):

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
| `order.completed` | Pesanan (DISAJIKAN -> SELESAI, ALT-DEF-005 correction-loop) |
| `order.voided_after_production` | Pesanan (ADR-036 sub-problem C - void setelah produksi, BEDA dari `order.cancelled` biasa) |
| `retur.diajukan` | Pesanan/PesananRetur (ADR-036) |
| `retur.disetujui` | Pesanan/PesananRetur (ADR-036) |
| `retur.ditolak` | Pesanan/PesananRetur (ADR-036) |
| `retur.diproses` | Pesanan/PesananRetur (ADR-036) |
| `retur.selesai` | Pesanan/PesananRetur (ADR-036 - memicu recompute `Pesanan.statusRetur`) |
| `order.split` **(BARU, ADR-039, menutup ALT-DEF-042)** | Pesanan (ALT-PES-014/017 - belum ada state machine/model split penuh di schema saat ini; eventType didaftarkan sebagai kontrak nama untuk batch fitur mendatang) |
| `order.reopened` **(BARU, ADR-039, menutup ALT-DEF-042)** | Pesanan (ALT-PES-015/018 - idem, kontrak nama saja) |
| `order.merged` **(BARU, ADR-039, menutup ALT-DEF-042)** | Pesanan (ALT-PES-016 - idem, kontrak nama saja) |
| `payment.awaiting_confirmation` | Pembayaran |
| `payment.confirmed` | Pembayaran |
| `payment.refunded` **(BARU, ADR-039, menutup ALT-DEF-042)** | Pembayaran/GiliranKasir (ALT-KSR-007, lihat model `PembayaranRefund` yang sudah ada) |
| `stock.low` | Persediaan |
| `stock.adjusted` | Persediaan |
| `shift.opened` | Karyawan/Absensi |
| `shift.closed` | Karyawan/Absensi |
| `attendance.created` | Karyawan/Absensi |
| `membership.point_redeemed` **(BARU, ADR-039, menutup ALT-DEF-042)** | Keanggotaan (ALT-MBR-010, lihat `PoinRiwayat` append-only ADR-032) |
| `membership.stamp_redeemed` **(BARU, ADR-039, menutup ALT-DEF-042)** | Keanggotaan (ALT-MBR-016, lihat `LedgerStempel` append-only ADR-032) |
| `promo.applied` **(BARU, diusulkan batch ADR-039 ini sendiri, BUKAN dari ALT-DEF-042)** | Promo (melengkapi `PromoPemakaian.jumlahPenerapan` ADR-038 - promo repeatable diterapkan pertama kali dalam satu pesanan) |
| `promo.repeat_applied` **(BARU, diusulkan batch ADR-039 ini sendiri, BUKAN dari ALT-DEF-042)** | Promo (idem - promo repeatable diterapkan ULANG, `jumlahPenerapan` naik) |

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
