# ERD - Dapur (Kitchen Display System)

`packages/dapur` tidak memiliki tabel transaksional sendiri untuk item pesanan - ia membaca **read-contract** dari domain Pesanan (`@altora/pesanan/kontrak-dapur`) dan hanya menulis status "progres masak" miliknya sendiri di tabel berikut.

```mermaid
erDiagram
    PESANAN ||--o| TIKET_DAPUR : menghasilkan
    TIKET_DAPUR ||--o{ TIKET_DAPUR_BARIS : berisi
    ITEM_PESANAN ||--o| TIKET_DAPUR_BARIS : diacu_read_only
    OUTLET ||--o{ STASIUN_DAPUR : punya

    TIKET_DAPUR {
        string id PK
        string tenantId FK
        string outletId FK
        string pesananId FK "read-only, sumber kebenaran tetap PESANAN"
        string stasiunDapurId FK "nullable"
        string status "MASUK_ANTRIAN|DIPROSES|SIAP|DIAMBIL_PELAYAN"
        datetime masukPada
        datetime mulaiDiprosesPada "nullable"
        datetime siapPada "nullable"
    }
    TIKET_DAPUR_BARIS {
        string id PK
        string tiketDapurId FK
        string itemPesananId FK "referensi read-only ke ITEM_PESANAN"
        string statusMasak "MENUNGGU|DIMASAK|SIAP"
    }
    STASIUN_DAPUR {
        string id PK
        string tenantId FK
        string outletId FK
        string nama "mis. Stasiun Panas, Stasiun Minuman"
    }
```

Catatan:

- `TIKET_DAPUR` dan `TIKET_DAPUR_BARIS` adalah tabel MILIK dapur (boleh ditulis oleh `packages/dapur`), tetapi field yang merujuk ke pesanan (`pesananId`, `itemPesananId`) hanya boleh **dibaca**, bukan diubah - perubahan itemnya sendiri (nama, harga, kuantitas) hanya lewat domain Pesanan.
- Update `TIKET_DAPUR.status` mengikuti state machine "Dapur" di `docs/arsitektur/STATE-MACHINES.md`, dan memicu event yang dikonsumsi domain Pesanan untuk memperbarui `PESANAN.status`/`ITEM_PESANAN.status` (lewat kontrak, bukan write langsung lintas domain).
