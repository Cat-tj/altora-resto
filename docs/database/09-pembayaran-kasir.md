# ERD - Pembayaran & Kasir

```mermaid
erDiagram
    OUTLET ||--o{ GILIRAN_KASIR : membuka
    PENGGUNA ||--o{ GILIRAN_KASIR : mengoperasikan
    GILIRAN_KASIR ||--o{ TRANSAKSI_KASIR : mencatat
    PESANAN ||--o{ PEMBAYARAN : dilunasi_oleh
    TRANSAKSI_KASIR ||--o| PEMBAYARAN : merujuk
    PEMBAYARAN ||--o{ PEMBAYARAN_METODE_BARIS : terdiri_dari
    METODE_BAYAR ||--o{ PEMBAYARAN_METODE_BARIS : dipakai
    PEMBAYARAN ||--o| QRIS_KONFIRMASI_MANUAL : dapat_punya
    PEMBAYARAN ||--o| STRUK : mencetak
    PEMBAYARAN ||--o| PEMBAYARAN_REFUND : dapat_direfund

    GILIRAN_KASIR {
        string id PK
        string tenantId FK
        string outletId FK
        string penggunaId FK
        int modalAwal "rupiah"
        int modalAkhirDihitung "rupiah, nullable sampai ditutup"
        int modalAkhirSistem "rupiah, dihitung sistem"
        string status "DIBUKA|DITUTUP_MENUNGGU_VERIFIKASI|DITUTUP_SELESAI"
        datetime dibukaPada
        datetime ditutupPada "nullable"
    }
    TRANSAKSI_KASIR {
        string id PK
        string giliranKasirId FK
        string pesananId FK
        string jenis "PENJUALAN|REFUND|KOREKSI"
        int jumlah "rupiah"
        datetime createdAt
    }
    METODE_BAYAR {
        string id PK
        string tenantId FK
        string kode "TUNAI|QRIS_MANUAL|KARTU_DEBIT|KARTU_KREDIT|EWALLET"
        string nama
        string status "AKTIF|NONAKTIF"
    }
    PEMBAYARAN {
        string id PK
        string tenantId FK
        string outletId FK
        string pesananId FK
        int totalDibayar "rupiah"
        int totalDiterima "rupiah, untuk hitung kembalian tunai"
        int kembalian "rupiah"
        string status "MENUNGGU|DIKONFIRMASI|GAGAL|DIBATALKAN|DIREFUND"
        string dikonfirmasiOlehId FK "nullable, dipakai utk approval supervisor"
        datetime createdAt
        datetime dikonfirmasiPada "nullable"
    }
    PEMBAYARAN_METODE_BARIS {
        string id PK
        string pembayaranId FK
        string metodeBayarId FK
        int jumlah "rupiah, mendukung split bill"
    }
    QRIS_KONFIRMASI_MANUAL {
        string id PK
        string pembayaranId FK UK
        string catatanKasir "nullable, mis. no. referensi dari app bank"
        string diverifikasiOlehId FK
        datetime diverifikasiPada
    }
    STRUK {
        string id PK
        string pembayaranId FK UK
        string nomorStruk UK
        datetime dicetakPada "nullable"
        int jumlahCetakUlang "default 0"
    }
    PEMBAYARAN_REFUND {
        string id PK
        string pembayaranId FK
        int jumlah "rupiah"
        string alasan
        string disetujuiOlehId FK
        datetime createdAt
    }
```

Catatan:

- Alur `GILIRAN_KASIR.status` dan `PEMBAYARAN.status` mengikuti state machine "Giliran Kasir" dan "Pembayaran" di `docs/arsitektur/STATE-MACHINES.md`.
- **QRIS mode manual** (rilis awal, sebelum integrasi API QRIS payment gateway): kasir menandai pembayaran QRIS sebagai diterima secara manual setelah memverifikasi notifikasi masuk di aplikasi bank/QRIS, dicatat di `QRIS_KONFIRMASI_MANUAL`. Field ini disiapkan agar mudah diganti oleh integrasi otomatis di rilis berikutnya tanpa mengubah bentuk `PEMBAYARAN`.
- Refund tidak menghapus `PEMBAYARAN` asli - dicatat sebagai baris baru `PEMBAYARAN_REFUND` yang merujuk ke pembayaran asli (no hard-delete pada data finansial).
- `STRUK` dapat dicetak ulang (`jumlahCetakUlang`) tanpa membuat entitas struk baru.
