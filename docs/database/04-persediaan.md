# ERD - Persediaan

```mermaid
erDiagram
    OUTLET ||--o{ GUDANG : punya
    GUDANG ||--o{ STOK_BAHAN : menyimpan
    BAHAN ||--o{ STOK_BAHAN : disimpan_sebagai
    STOK_BAHAN ||--o{ MUTASI_STOK : dicatat_lewat
    GUDANG ||--o{ STOK_OPNAME : melakukan
    STOK_OPNAME ||--o{ STOK_OPNAME_BARIS : berisi
    BAHAN ||--o{ STOK_OPNAME_BARIS : dihitung

    GUDANG {
        string id PK
        string tenantId FK
        string outletId FK
        string nama
        string status "AKTIF|NONAKTIF"
    }
    STOK_BAHAN {
        string id PK
        string gudangId FK
        string bahanId FK
        decimal kuantitas "saldo berjalan, hasil agregasi mutasi"
        datetime updatedAt
    }
    MUTASI_STOK {
        string id PK
        string tenantId FK
        string outletId FK
        string gudangId FK
        string bahanId FK
        string jenis "MASUK_PEMBELIAN|KELUAR_PENJUALAN|OPNAME_PENYESUAIAN|TRANSFER_MASUK|TRANSFER_KELUAR|RETUR"
        decimal jumlah "positif=masuk, negatif=keluar"
        string referensiJenis "PEMBELIAN|PESANAN|OPNAME|TRANSFER"
        string referensiId "id dokumen sumber"
        string dibalikOlehId FK "nullable, self-relasi ke mutasi pembalik"
        string dibuatOlehId FK
        datetime createdAt
    }
    STOK_OPNAME {
        string id PK
        string tenantId FK
        string gudangId FK
        string status "DIRENCANAKAN|BERLANGSUNG|SELESAI|DIBATALKAN"
        datetime dijadwalkanPada
        datetime diselesaikanPada
        string dibuatOlehId FK
    }
    STOK_OPNAME_BARIS {
        string id PK
        string stokOpnameId FK
        string bahanId FK
        decimal kuantitasSistem "snapshot saat opname dimulai"
        decimal kuantitasFisik "hasil hitung fisik"
        decimal selisih "kuantitasFisik - kuantitasSistem"
    }
```

Catatan (no hard-delete):

- `MUTASI_STOK` bersifat append-only. Koreksi kesalahan input dilakukan dengan menambah baris mutasi pembalik baru yang menunjuk lewat `dibalikOlehId`, bukan menghapus/mengubah baris lama.
- `STOK_BAHAN.kuantitas` adalah saldo turunan (derived) dari total `MUTASI_STOK` - didesain agar bisa direkonsiliasi ulang kapan saja dari log mutasi.
- Alur status `STOK_OPNAME` mengikuti state machine "Opname" di `docs/arsitektur/STATE-MACHINES.md`.
