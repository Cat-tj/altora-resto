# ERD - Analitik (Read Model)

`packages/analitik` **tidak pernah** membaca tabel transaksional mentah (`PESANAN`, `PEMBAYARAN`, `MUTASI_STOK`, dst) secara langsung. Semua dashboard dan laporan dibaca dari tabel read-model berikut, yang diisi lewat proses agregasi terjadwal/event-driven terpisah dari jalur transaksi utama.

```mermaid
erDiagram
    OUTLET ||--o{ RM_PENJUALAN_HARIAN : diagregasi
    OUTLET ||--o{ RM_PENJUALAN_ITEM_HARIAN : diagregasi
    ITEM_MENU ||--o{ RM_PENJUALAN_ITEM_HARIAN : diringkas
    OUTLET ||--o{ RM_STOK_KRITIS : dipantau
    BAHAN ||--o{ RM_STOK_KRITIS : dipantau
    OUTLET ||--o{ RM_KINERJA_KARYAWAN_HARIAN : diagregasi
    KARYAWAN ||--o{ RM_KINERJA_KARYAWAN_HARIAN : diringkas

    RM_PENJUALAN_HARIAN {
        string id PK
        string tenantId FK
        string outletId FK
        date tanggal
        int totalTransaksi
        int totalPenjualan "rupiah"
        int totalDiskon "rupiah"
        int totalRefund "rupiah"
        datetime dihitungPada
    }
    RM_PENJUALAN_ITEM_HARIAN {
        string id PK
        string tenantId FK
        string outletId FK
        string itemMenuId FK
        date tanggal
        int kuantitasTerjual
        int totalPenjualan "rupiah"
    }
    RM_STOK_KRITIS {
        string id PK
        string tenantId FK
        string outletId FK
        string bahanId FK
        decimal kuantitasTerkini
        decimal ambangMinimum
        datetime dihitungPada
    }
    RM_KINERJA_KARYAWAN_HARIAN {
        string id PK
        string tenantId FK
        string outletId FK
        string karyawanId FK
        date tanggal
        int totalTransaksiDitangani
        int totalPenjualanDitangani "rupiah"
        int menitTerlambat
    }
```

Catatan:

- Semua tabel `RM_*` bersifat read-model (denormalisasi, hasil agregasi) dan aman untuk dibaca oleh `packages/analitik` sesuai aturan dependency-cruiser.
- Proses pengisian read-model (job agregasi harian, atau event-driven) berada di luar `packages/analitik` itu sendiri (mis. worker terjadwal yang membaca tabel transaksional dan menulis ke `RM_*`) - ini akan dirinci pada implementasi loop Analitik.
