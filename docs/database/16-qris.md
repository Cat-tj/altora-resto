# ERD - Konfigurasi QRIS Manual

**ALT-DEF-015 (correction-loop lanjutan):** dokumen ini BARU. Sebelumnya schema
hanya punya `QRIS_KONFIRMASI_MANUAL` (sisi konfirmasi transaksi) dan tidak punya
model konfigurasi QRIS sama sekali, sehingga `ALT-QRS-001` s.d. `ALT-QRS-005` dan
`ALT-SEC-007` (enkripsi payload at rest) tidak punya kolom untuk diterapkan.
Rasional lengkap ada di ADR-021 (`docs/engineering/DECISION-LOG.md`).

> **Batasan arsitektur permanen (`ALT-QRS-010`, ADR-021 Keputusan 4):**
> TIDAK ADA webhook, payment gateway, bank API, e-wallet API, atau konfirmasi
> otomatis di seluruh domain ini. Yang disimpan hanyalah payload QRIS **statis**
> resmi outlet yang didapat dari bank/PJSP di luar sistem ini. Ini bukan
> "belum diimplementasikan" - ini keputusan produk yang tidak akan dibalik.

```mermaid
erDiagram
    OUTLET ||--o{ KONFIGURASI_QRIS : memiliki
    KONFIGURASI_QRIS ||--o{ RIWAYAT_KONFIGURASI_QRIS : diaudit_oleh
    PENGGUNA ||--o{ KONFIGURASI_QRIS : membuat
    PENGGUNA ||--o{ RIWAYAT_KONFIGURASI_QRIS : melakukan
    PEMBAYARAN ||--o| QRIS_KONFIRMASI_MANUAL : dikonfirmasi_lewat
    PENGGUNA ||--o{ QRIS_KONFIRMASI_MANUAL : memverifikasi

    KONFIGURASI_QRIS {
        string id PK
        string tenantId FK
        string outletId FK
        string payloadTerenkripsi "AES-256-GCM base64, TIDAK PERNAH plaintext"
        string fingerprint "SHA-256 atas payload PLAINTEXT, utk dedup/deteksi perubahan"
        string namaMerchant
        string kotaMerchant
        string status "DRAF|MENUNGGU_VERIFIKASI|AKTIF|NONAKTIF"
        string dibuatOlehId FK
        string diverifikasiOlehId FK "nullable"
        datetime diverifikasiPada "nullable"
        datetime createdAt
        datetime updatedAt
    }
    RIWAYAT_KONFIGURASI_QRIS {
        string id PK
        string tenantId FK
        string outletId FK
        string konfigurasiQrisId FK
        string aksi "DIBUAT|DIUBAH|DIAKTIFKAN|DINONAKTIFKAN|DIVERIFIKASI"
        json sebelum "nullable, METADATA saja - tidak pernah payload"
        json sesudah "nullable, METADATA saja - tidak pernah payload"
        string dilakukanOlehId FK
        datetime createdAt
    }
    QRIS_KONFIRMASI_MANUAL {
        string id PK
        string tenantId FK
        string pembayaranId FK UK
        string catatanKasir "nullable, mis. no. referensi dari app bank"
        string diverifikasiOlehId FK
        datetime diverifikasiPada
    }
```

## Catatan

### Enkripsi payload (ALT-QRS-005 / ALT-SEC-007, ADR-021 Keputusan 2)

- `payloadTerenkripsi` menyimpan `nonce || tag || ciphertext` (base64) hasil
  **AES-256-GCM level-aplikasi**. Payload EMV mentah **tidak pernah** ditulis ke
  kolom mana pun.
- Kunci berasal dari **env/KMS, bukan dari database** - sehingga dump database
  saja tidak cukup untuk membacanya (itulah kriteria terima `ALT-SEC-007`).
  `pgcrypto` ditolak justru karena kuncinya berakhir di/dekat database.
- Prisma/Postgres **tidak** melakukan enkripsi ini otomatis - ini murni tanggung
  jawab layer aplikasi sebelum setiap `create`/`update`.
- `fingerprint` = SHA-256 atas payload **plaintext** (bukan ciphertext -
  ciphertext berubah tiap enkripsi karena nonce acak). Dipakai untuk mendeteksi
  unggah-ulang payload yang sama tanpa mendekripsi apa pun.
- **Belum dikerjakan:** implementasi enkripsi/dekripsi nyata, rotasi kunci.

### Satu konfigurasi AKTIF per outlet (ALT-QRS-001, ADR-021 Keputusan 3)

Constraint ini **tidak dapat diekspresikan di DSL Prisma** - ia butuh partial
unique index Postgres:

```sql
CREATE UNIQUE INDEX konfigurasi_qris_satu_aktif_per_outlet
    ON konfigurasi_qris ("tenantId", "outletId")
    WHERE status = 'AKTIF';
```

SQL-nya ada di `prisma/migrations/manual/001_konfigurasi_qris_partial_unique.sql`
dan **wajib** disertakan pada migrasi pertama yang benar-benar dijalankan.

- `@@unique([tenantId, outletId, status])` **sengaja TIDAK dipakai** sebagai
  pengganti: ia akan melarang satu outlet punya lebih dari satu konfigurasi
  `NONAKTIF`, padahal riwayat konfigurasi lama HARUS boleh menumpuk sebagai
  `NONAKTIF` (ADR-006, no hard-delete). Constraint yang tampak menegakkan aturan
  padahal tidak lebih berbahaya daripada tidak ada constraint sama sekali.
- **Status nyata saat ini:** index di atas BELUM PERNAH dijalankan (tidak ada
  Postgres di environment ini, `ALT-DEF-029`). Sampai ia benar-benar ada,
  aturan satu-aktif HANYA dijaga guard level-aplikasi (nonaktifkan lama +
  aktifkan baru dalam satu transaksi) dan **TIDAK aman terhadap race condition**
  dua request bersamaan.
- Constraint yang benar-benar ADA di schema:
  `@@unique([tenantId, outletId, fingerprint])` - payload yang sama tidak
  didaftarkan dua kali di outlet yang sama. Ini constraint yang **berbeda** dan
  tidak menggantikan aturan satu-aktif.

### Audit perubahan (ALT-QRS-008)

- `RIWAYAT_KONFIGURASI_QRIS` bersifat **append-only** - barisnya tidak pernah
  diubah/dihapus (ADR-006). Ini konfigurasi yang menentukan ke rekening siapa uang
  pelanggan mengalir; setiap perubahannya wajib dapat ditelusuri.
- `sebelum`/`sesudah` hanya memuat **metadata** (`namaMerchant`, `kotaMerchant`,
  `status`, `fingerprint`) dan **tidak pernah** memuat payload (terenkripsi
  maupun plaintext) - kalau tidak, tabel audit menjadi jalur kebocoran yang
  melewati `ALT-SEC-007`.
- Audit khusus dipilih di atas `AUDIT_LOG` generik karena riwayat ini perlu
  bertipe kuat (enum `aksi`) dan dapat diquery per outlet.

### Nominal dinamis (ALT-QRS-006)

- Nominal tagihan **selalu dihitung server-side** dari total pesanan, lalu
  disisipkan ke payload QRIS statis outlet **saat runtime**. Klien **tidak pernah**
  mengirimkan nominal final - kalau boleh, pelanggan dapat membayar 1.000 untuk
  tagihan 100.000 dan QR yang dipajang akan "benar" menurut sistem.
- QR yang bernominal tidak disimpan sebagai baris/blob - ia diturunkan setiap kali
  dibutuhkan dari (konfigurasi aktif outlet + total pesanan).
- **Belum dikerjakan:** parser EMV (`ALT-QRS-003`) dan validator CRC16
  (`ALT-QRS-004`) - itu kode, bukan skema.

### Konfirmasi manual (ALT-QRS-007, ADR-020 Keputusan 2)

Alur lengkap, dengan guard keamanan finansial paling penting di domain ini:

1. Server menghitung total pesanan (server-side, tidak dari klien).
2. Server menghasilkan payload QRIS bernominal dari konfigurasi AKTIF outlet.
3. Pelanggan membayar lewat aplikasi banknya (di luar sistem ini).
4. Pelanggan menekan "Sudah Membayar" -> `Pembayaran.status = MENUNGGU_KONFIRMASI`.
   **Tombol ini TIDAK PERNAH menghasilkan `DIBAYAR`.**
5. Kasir memeriksa notifikasi masuk di aplikasi merchant.
6. Kasir mengonfirmasi (izin `pembayaran.qris.konfirmasi-manual`) -> baris
   `QRIS_KONFIRMASI_MANUAL` ditulis DAN `Pembayaran.status = DIBAYAR`, dalam satu
   transaksi.

Tanpa guard langkah 4, siapa pun yang memegang link QR meja dapat menandai
tagihannya sendiri lunas. Tabel transisi lengkap ada di
`docs/arsitektur/STATE-MACHINES.md` bagian 2 "Pembayaran".

- Koreksi konfirmasi yang keliru (`ALT-QRS-009`) dicatat sebagai
  `KOREKSI_PEMBAYARAN` (lihat `09-pembayaran-kasir.md`), tidak menghapus baris
  `QRIS_KONFIRMASI_MANUAL` asal.
- **ADR-033:** `KonfigurasiQris.dibuatOlehId`/`diverifikasiOlehId` (nullable) dan `RiwayatKonfigurasiQris.dilakukanOlehId` dipindah dari FK langsung ke `Pengguna` menjadi composite-FK OUTLET-LEVEL `(tenantId, outletId, xxxOlehId) -> KeanggotaanOutlet(tenantId, outletId, id)`. Lihat `docs/engineering/DECISION-LOG.md` ADR-033.
