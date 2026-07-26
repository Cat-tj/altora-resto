# ERD - Menu & Katalog

```mermaid
erDiagram
    OUTLET ||--o{ KATEGORI_MENU : punya
    KATEGORI_MENU ||--o{ ITEM_MENU : berisi
    ITEM_MENU ||--o{ VARIAN_MENU : punya
    ITEM_MENU ||--o{ ITEM_MODIFIER_GRUP : punya
    MODIFIER_GRUP ||--o{ ITEM_MODIFIER_GRUP : dipakai_di
    MODIFIER_GRUP ||--o{ MODIFIER_OPSI : berisi
    ITEM_MENU ||--o{ HARGA_ITEM_OUTLET : punya_harga_per_outlet
    ITEM_MENU ||--o| RESEP : diproduksi_dari

    KATEGORI_MENU {
        string id PK
        string tenantId FK
        string outletId FK "nullable, null = berlaku semua outlet"
        string nama
        int urutan
        string status "AKTIF|NONAKTIF"
    }
    ITEM_MENU {
        string id PK
        string tenantId FK
        string kategoriId FK
        string nama
        string deskripsi
        string gambarUrl
        boolean stokTakTerbatas
        string status "AKTIF|NONAKTIF|HABIS"
        datetime createdAt
    }
    VARIAN_MENU {
        string id PK
        string itemMenuId FK
        string nama "mis. Kecil/Sedang/Besar"
        bigint hargaTambahan "rupiah, bisa 0"
        string status "AKTIF|NONAKTIF"
    }
    MODIFIER_GRUP {
        string id PK
        string tenantId FK
        string nama "mis. Level Pedas, Topping"
        boolean wajibPilih
        int minPilihan
        int maxPilihan
    }
    ITEM_MODIFIER_GRUP {
        string id PK
        string itemMenuId FK
        string modifierGrupId FK
        int urutan
    }
    MODIFIER_OPSI {
        string id PK
        string modifierGrupId FK
        string nama
        int hargaTambahan
        string status "AKTIF|NONAKTIF"
    }
    HARGA_ITEM_OUTLET {
        string id PK
        string itemMenuId FK
        string outletId FK
        bigint harga "rupiah"
        datetime berlakuSejak
    }
```

Catatan:

- Harga dasar ada di `HARGA_ITEM_OUTLET` per outlet (bukan kolom harga tunggal di `ITEM_MENU`) supaya harga bisa berbeda per outlet dalam satu tenant.
- Relasi ke `RESEP` bersifat opsional (item menu tanpa resep = tidak memotong stok otomatis).
- **ALT-DEF-010 (composite tenant/outlet-scoped FK, lihat ADR-013 di `docs/engineering/DECISION-LOG.md`):** `KATEGORI_MENU.outletId` (nullable) dan `ITEM_MENU.kategoriId` kini composite-FK berbasis `tenantId` ke `Outlet`/`KategoriMenu`. `HARGA_ITEM_OUTLET` sebelumnya TIDAK punya kolom `tenantId` sama sekali (gap ditemukan saat audit) - kini ditambahkan `tenantId` beserta DUA composite-FK sekaligus ke `ItemMenu(tenantId, id)` dan `Outlet(tenantId, id)` (pola sama seperti `KeanggotaanOutlet`/ADR-011), menjamin harga per outlet tidak bisa merujuk item menu atau outlet milik tenant lain.
