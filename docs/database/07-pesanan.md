# ERD - Pesanan

```mermaid
erDiagram
    OUTLET ||--o{ PESANAN : menerima
    MEJA ||--o{ PESANAN : untuk
    PELANGGAN ||--o{ PESANAN : memesan
    PESANAN ||--o{ ITEM_PESANAN : berisi
    ITEM_MENU ||--o{ ITEM_PESANAN : dipesan_sebagai
    VARIAN_MENU ||--o{ ITEM_PESANAN : dipilih
    ITEM_PESANAN ||--o{ ITEM_PESANAN_MODIFIER : punya
    MODIFIER_OPSI ||--o{ ITEM_PESANAN_MODIFIER : dipilih
    PESANAN ||--o{ PESANAN_RIWAYAT_STATUS : mencatat
    PESANAN ||--o{ PEMBAYARAN : dilunasi_oleh
    PESANAN ||--o| PROMO_PEMAKAIAN : memakai

    PESANAN {
        string id PK
        string tenantId FK
        string outletId FK
        string mejaId FK "nullable, mis. take-away"
        string pelangganId FK "nullable"
        string kanal "KASIR|PELAYAN|QR_PELANGGAN"
        string nomorPesanan UK "unik per outlet per hari"
        string status "BARU|DIKONFIRMASI|DIPROSES_DAPUR|SIAP_DISAJIKAN|DISAJIKAN|DIBAYAR|DIBATALKAN"
        int subtotal "rupiah"
        int totalDiskon "rupiah"
        int totalPajak "rupiah"
        int totalServiceCharge "rupiah"
        int totalAkhir "rupiah"
        string dibuatOlehId FK
        datetime createdAt
        datetime dibatalkanPada "nullable"
    }
    ITEM_PESANAN {
        string id PK
        string pesananId FK
        string itemMenuId FK
        string varianMenuId FK "nullable"
        int kuantitas
        int hargaSatuan "rupiah, snapshot saat pemesanan"
        string catatan "nullable, mis. tanpa es"
        string status "BARU|DIKIRIM_DAPUR|SIAP|DISAJIKAN|DIBATALKAN"
    }
    ITEM_PESANAN_MODIFIER {
        string id PK
        string itemPesananId FK
        string modifierOpsiId FK
        int hargaTambahan "rupiah, snapshot"
    }
    PESANAN_RIWAYAT_STATUS {
        string id PK
        string pesananId FK
        string statusSebelumnya
        string statusBaru
        string diubahOlehId FK
        datetime createdAt
    }
```

Catatan:

- Alur `PESANAN.status` mengikuti state machine "Pesanan" di `docs/arsitektur/STATE-MACHINES.md`; setiap transisi dicatat di `PESANAN_RIWAYAT_STATUS` (append-only, untuk audit & analitik).
- Harga (`hargaSatuan`, `hargaTambahan`) selalu disimpan sebagai **snapshot** pada saat pemesanan - perubahan harga menu di kemudian hari tidak mengubah nilai pesanan lama.
- Pembatalan pesanan tidak menghapus baris - `status` menjadi `DIBATALKAN` dan `dibatalkanPada` diisi.
- `packages/dapur` membaca domain ini HANYA lewat read-contract `kontrak-dapur` (subset field: id pesanan, item, catatan, status dapur, meja/nomor) - lihat `08-dapur.md`.
- **ALT-DEF-010 (composite tenant/outlet-scoped FK, lihat ADR-013 di `docs/engineering/DECISION-LOG.md`):** `PESANAN.outletId` kini composite-FK `(tenantId, outletId) -> Outlet(tenantId, id)`; `PESANAN.mejaId` (nullable) kini composite-FK level-outlet `(outletId, mejaId) -> Meja(outletId, id)` - menjamin meja yang dirujuk berada di outlet yang sama dengan pesanan; `PESANAN.pelangganId` (nullable) kini composite-FK `(tenantId, pelangganId) -> Pelanggan(tenantId, id)`.
