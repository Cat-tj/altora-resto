# ERD - Resep & Bahan (BOM)

```mermaid
erDiagram
    ITEM_MENU ||--o| RESEP : punya
    RESEP ||--o{ RESEP_BAHAN : terdiri_dari
    BAHAN ||--o{ RESEP_BAHAN : dipakai_di
    BAHAN ||--o{ STOK_BAHAN : punya_stok
    BAHAN }o--|| SATUAN : diukur_dalam

    BAHAN {
        string id PK
        string tenantId FK
        string nama
        string kodeSku UK "unik per tenant"
        string satuanDasarId FK
        int stokMinimum "ambang batas peringatan"
        string status "AKTIF|NONAKTIF"
    }
    SATUAN {
        string id PK
        string tenantId FK
        string nama "gram, ml, pcs, dst"
        string simbol
    }
    RESEP {
        string id PK
        string tenantId FK
        string itemMenuId FK UK "1 item menu : 1 resep aktif"
        string versi
        string status "AKTIF|NONAKTIF"
        datetime createdAt
    }
    RESEP_BAHAN {
        string id PK
        string resepId FK
        string bahanId FK
        decimal jumlah "kuantitas per 1 porsi item menu"
        string satuanId FK
    }
```

Catatan:

- `RESEP_BAHAN.jumlah` boleh `Decimal` (bukan Int) karena satuan bahan baku (gram/ml) butuh presisi pecahan - berbeda dari nilai uang yang wajib `Int`.
- Pemotongan stok otomatis saat pesanan selesai dihitung dari `RESEP_BAHAN` dikalikan kuantitas item pada pesanan, lalu dicatat sebagai baris baru di `MUTASI_STOK` (lihat `04-persediaan.md`) - bukan mengubah `STOK_BAHAN` secara langsung tanpa jejak.
- **ALT-DEF-010 (lihat ADR-013 di `docs/engineering/DECISION-LOG.md`):** `BAHAN` mendapat `@@unique([tenantId, id])` tambahan agar model lain (`StokBahan`, `MutasiStok`, `RmStokKritis` di domain 04/14) bisa memakai composite-FK menuju `Bahan`. `RESEP_BAHAN` sendiri (baris/junction murni di bawah `Resep`) di luar cakupan audit composite-FK batch ini - lihat ADR-013 untuk daftar lengkap tabel baris yang dijudge aman tanpa composite.
