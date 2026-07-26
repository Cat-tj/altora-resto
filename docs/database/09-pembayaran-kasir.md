# ERD - Pembayaran & Kasir

**ALT-DEF-004/ALT-DEF-014 (correction-loop lanjutan):** ERD di bawah menggantikan
versi lama di mana `PEMBAYARAN` terikat 1:1 ke `PESANAN` lewat kolom `pesananId`.
Lihat ADR-019 dan ADR-020 di `docs/engineering/DECISION-LOG.md` untuk rasional
lengkap. Konfigurasi QRIS statis per outlet ada di dokumen terpisah
`docs/database/16-qris.md` (ALT-DEF-015).

```mermaid
erDiagram
    OUTLET ||--o{ GILIRAN_KASIR : membuka
    PENGGUNA ||--o{ GILIRAN_KASIR : mengoperasikan
    GILIRAN_KASIR ||--o{ TRANSAKSI_KASIR : mencatat
    OUTLET ||--o{ PEMBAYARAN : menerima
    PEMBAYARAN ||--o{ ALOKASI_PEMBAYARAN : dialokasikan_ke
    PESANAN ||--o{ ALOKASI_PEMBAYARAN : dilunasi_lewat
    PEMBAYARAN ||--o{ PEMBAYARAN_METODE_BARIS : terdiri_dari
    METODE_BAYAR ||--o{ PEMBAYARAN_METODE_BARIS : dipakai
    PEMBAYARAN ||--o{ KOREKSI_PEMBAYARAN : dikoreksi_lewat
    PEMBAYARAN ||--o| QRIS_KONFIRMASI_MANUAL : dapat_punya
    PEMBAYARAN ||--o| STRUK : mencetak
    PEMBAYARAN ||--o{ PEMBAYARAN_REFUND : dapat_direfund

    GILIRAN_KASIR {
        string id PK
        string tenantId FK
        string outletId FK
        string penggunaId FK
        bigint modalAwal "rupiah"
        bigint modalAkhirDihitung "rupiah, nullable sampai ditutup"
        bigint modalAkhirSistem "rupiah, dihitung sistem"
        string status "DIBUKA|DITUTUP_MENUNGGU_VERIFIKASI|DITUTUP_SELESAI"
        datetime dibukaPada
        datetime ditutupPada "nullable"
    }
    TRANSAKSI_KASIR {
        string id PK
        string giliranKasirId FK
        string pesananId FK
        string jenis "PENJUALAN|REFUND|KOREKSI"
        bigint jumlah "rupiah"
        datetime createdAt
    }
    METODE_BAYAR {
        string id PK
        string tenantId FK
        string kode "TUNAI|TRANSFER_MANUAL|QRIS_MANUAL|SALDO_TOKO"
        string nama
        string status "AKTIF|NONAKTIF"
    }
    PEMBAYARAN {
        string id PK
        string tenantId FK
        string outletId FK
        bigint jumlah "rupiah, total peristiwa pembayaran ini"
        bigint totalDiterima "rupiah, uang fisik diserahkan (alur TUNAI)"
        bigint kembalian "rupiah"
        string status "DRAF|MENUNGGU|MENUNGGU_KONFIRMASI|DIBAYAR|GAGAL|DIBATALKAN|DIKOREKSI|DIKEMBALIKAN_SEBAGIAN|DIKEMBALIKAN"
        string dikonfirmasiOlehId FK "nullable, kasir/supervisor yang mengonfirmasi"
        datetime createdAt
        datetime dikonfirmasiPada "nullable"
    }
    ALOKASI_PEMBAYARAN {
        string id PK
        string tenantId FK
        string pembayaranId FK
        string pesananId FK
        bigint jumlah "rupiah, bagian pembayaran ini yg diterapkan ke pesanan tsb"
        datetime createdAt
    }
    PEMBAYARAN_METODE_BARIS {
        string id PK
        string tenantId FK
        string pembayaranId FK
        string metodeBayarId FK
        bigint jumlah "rupiah, mekanisme pembayaran CAMPURAN"
    }
    KOREKSI_PEMBAYARAN {
        string id PK
        string tenantId FK
        string pembayaranId FK
        string alasan
        bigint jumlahSebelum "rupiah"
        bigint jumlahSesudah "rupiah"
        string dikoreksiOlehId FK
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
    STRUK {
        string id PK
        string tenantId FK
        string pembayaranId FK UK
        string nomorStruk UK
        datetime dicetakPada "nullable"
        int jumlahCetakUlang "default 0"
    }
    PEMBAYARAN_REFUND {
        string id PK
        string tenantId FK
        string pembayaranId FK
        bigint jumlah "rupiah"
        string alasan
        string disetujuiOlehId FK
        datetime createdAt
    }
```

## Catatan

### Alokasi pembayaran (ALT-DEF-014, ADR-019)

- `PEMBAYARAN` **tidak lagi punya kolom `pesananId`**. Ia merepresentasikan satu
  PERISTIWA penerimaan uang, bukan pelunasan satu pesanan. Keterkaitan ke pesanan
  selalu lewat `ALOKASI_PEMBAYARAN`, yang memungkinkan dua arah sekaligus:
  - **satu pembayaran -> banyak pesanan** (group/patungan bill: satu tamu membayar
    tiga bon meja sekaligus);
  - **satu pesanan -> banyak pembayaran** (bayar sebagian/bertahap, `ALT-KSR-005`).
- `ALOKASI_PEMBAYARAN` punya `@@unique([pembayaranId, pesananId])` - paling banyak
  satu baris per pasangan. Perubahan nilai alokasi memperbarui baris tsb dan
  dicatat lewat `KOREKSI_PEMBAYARAN`, tidak menambah baris kedua.
- "Berapa yang sudah dibayar untuk pesanan X" =
  `SUM(ALOKASI_PEMBAYARAN.jumlah)` atas `PEMBAYARAN` berstatus `DIBAYAR`. Pesanan
  tetap `MENUNGGU_PEMBAYARAN`/belum `SELESAI` selama jumlah itu `< totalAkhir`.

### Pembayaran campuran (ALT-DEF-004, ADR-019 Keputusan 3)

- Tidak ada metode bayar bernama `CAMPURAN` dan tidak boleh pernah ada.
  Pembayaran campuran = SATU `PEMBAYARAN` dengan BEBERAPA baris
  `PEMBAYARAN_METODE_BARIS` (mis. tunai 50.000 + QRIS manual 30.000).
- `ALOKASI_PEMBAYARAN` dan `PEMBAYARAN_METODE_BARIS` menjawab pertanyaan yang
  **berbeda** dan keduanya diperlukan: alokasi = "uang ini melunasi tagihan mana",
  baris metode = "uang ini masuk lewat instrumen apa".

### Invariant jumlah (WAJIB, ditegakkan level aplikasi)

Untuk setiap `PEMBAYARAN`:

1. `SUM(PEMBAYARAN_METODE_BARIS.jumlah) == PEMBAYARAN.jumlah`
2. `SUM(ALOKASI_PEMBAYARAN.jumlah) == PEMBAYARAN.jumlah`

Prisma/Postgres **tidak** dapat menegakkan agregat lintas-baris secara deklaratif.
Kedua invariant WAJIB divalidasi server-side **di dalam satu transaksi database
yang sama** dengan penulisan pembayaran beserta seluruh barisnya (ADR-019
Keputusan 4). Integration test yang wajib ada (batch berikutnya):
`pembayaran_invariant_sum_metode_sama_dengan_jumlah`,
`pembayaran_invariant_sum_alokasi_sama_dengan_jumlah`,
`pembayaran_invariant_gagal_membatalkan_seluruh_transaksi`.

### Metode bayar (ALT-DEF-004)

- Scope final: **`TUNAI`, `TRANSFER_MANUAL`, `QRIS_MANUAL`, `SALDO_TOKO`**.
- `KARTU_DEBIT`/`KARTU_KREDIT`/`EWALLET` **dihapus seluruhnya** - ketiganya
  mengandaikan integrasi payment gateway/EDC/e-wallet API yang dilarang eksplisit
  oleh `ALT-QRS-010` dan ADR-003.
- `METODE_BAYAR` punya `@@unique([tenantId, kode])` - satu baris katalog per kode
  per tenant.

### Struk, refund, koreksi

- **`STRUK` adalah bukti per PERISTIWA PEMBAYARAN**, bukan per pesanan (ADR-019
  Keputusan 5). Konsekuensi yang diterima secara sadar: pada pembayaran bertahap
  satu pesanan menghasilkan beberapa struk (satu per pembayaran - benar secara
  akuntansi); pada group bill satu struk mencakup beberapa pesanan (isinya
  dirender dari `ALOKASI_PEMBAYARAN` pembayaran tsb). Relasi 1:1
  `STRUK <-> PEMBAYARAN` tetap benar dan dipertahankan.
- `STRUK` dapat dicetak ulang (`jumlahCetakUlang`) tanpa membuat entitas baru.
- Refund tidak menghapus `PEMBAYARAN` asli - baris baru `PEMBAYARAN_REFUND`
  (no hard-delete pada data finansial, ADR-006). Status pembayaran menjadi
  `DIKEMBALIKAN_SEBAGIAN` bila `SUM(refund.jumlah) < PEMBAYARAN.jumlah`, dan
  `DIKEMBALIKAN` bila sama (ADR-020 Keputusan 4).
- Salah input nominal dikoreksi lewat `KOREKSI_PEMBAYARAN` (append-only,
  `jumlahSebelum`/`jumlahSesudah`), status pembayaran menjadi `DIKOREKSI`.

### QRIS mode manual

- Kasir menandai pembayaran QRIS lunas **secara manual** setelah memverifikasi
  notifikasi masuk di aplikasi merchant, dicatat di `QRIS_KONFIRMASI_MANUAL`.
- **Tidak ada** webhook/payment gateway/bank API/e-wallet API/konfirmasi otomatis -
  ini batasan arsitektur permanen (`ALT-QRS-010`, ADR-021 Keputusan 4), bukan
  "belum diimplementasikan". Kalimat pada versi lama dokumen ini yang menyebut
  field disiapkan "agar mudah diganti integrasi otomatis di rilis berikutnya"
  DIHAPUS karena bertentangan dengan keputusan produk.
- **Tombol "Sudah Membayar" milik pelanggan TIDAK PERNAH menghasilkan status
  `DIBAYAR`** - hanya `MENUNGGU_KONFIRMASI` (ADR-020 Keputusan 2). Lihat tabel
  transisi di `docs/arsitektur/STATE-MACHINES.md` bagian 2.

### Tenant-safety (ALT-DEF-010, ADR-013)

- `GILIRAN_KASIR.outletId` dan `PEMBAYARAN.outletId` memakai composite-FK
  `(tenantId, outletId) -> Outlet(tenantId, id)`.
- Seluruh anak `PEMBAYARAN` (`ALOKASI_PEMBAYARAN`, `PEMBAYARAN_METODE_BARIS`,
  `KOREKSI_PEMBAYARAN`, `QRIS_KONFIRMASI_MANUAL`, `STRUK`, `PEMBAYARAN_REFUND`)
  kini membawa `tenantId` sendiri + composite-FK
  `(tenantId, pembayaranId) -> Pembayaran(tenantId, id)`.
- `ALOKASI_PEMBAYARAN.pesananId` memakai composite-FK
  `(tenantId, pesananId) -> Pesanan(tenantId, id)` - menggantikan composite-FK
  yang dulu ada langsung di `PEMBAYARAN.pesanan`.
- `PEMBAYARAN_METODE_BARIS` memakai pola composite-FK **ganda** (seperti
  `KeanggotaanOutlet`, ADR-011): satu kolom `tenantId` dipakai dua kali, menuju
  `Pembayaran(tenantId, id)` DAN `MetodeBayar(tenantId, id)`.
- **Belum diperbaiki:** `TRANSAKSI_KASIR` masih tanpa `tenantId` sama sekali -
  itu `ALT-DEF-031`, di luar cakupan batch ini.
- **ADR-033:** `GiliranKasir.penggunaId` dipindah ke composite-FK OUTLET-LEVEL `(tenantId, outletId, penggunaId) -> KeanggotaanOutlet(tenantId, outletId, id)`; `Pembayaran.dikonfirmasiOlehId` (nullable) demikian pula OUTLET-LEVEL; `KoreksiPembayaran.dikoreksiOlehId`, `QrisKonfirmasiManual.diverifikasiOlehId`, `PembayaranRefund.disetujuiOlehId` dipindah ke composite-FK TENANT-LEVEL `(tenantId, xxxOlehId) -> KeanggotaanTenant(tenantId, id)` - seluruhnya sebelumnya FK langsung ke `Pengguna`. Lihat `docs/engineering/DECISION-LOG.md` ADR-033.
