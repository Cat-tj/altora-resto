# ERD - Promo

```mermaid
erDiagram
    TENANT ||--o{ PROMO : membuat
    PROMO ||--o{ PROMO_ATURAN : punya
    PROMO ||--o{ KUPON : dapat_punya
    PROMO ||--o{ PROMO_PEMAKAIAN : dipakai_di
    PESANAN ||--o{ PROMO_PEMAKAIAN : memakai
    KUPON ||--o{ PROMO_PEMAKAIAN : dipakai_lewat
    PELANGGAN ||--o{ KUPON : memiliki

    PROMO {
        string id PK
        string tenantId FK
        string nama
        string jenis "DISKON_PERSEN|DISKON_NOMINAL|BELI_X_GRATIS_Y|HARGA_PAKET"
        datetime berlakuSejak
        datetime berlakuSampai
        string status "AKTIF|NONAKTIF|KADALUARSA"
        boolean bisaDigabung "boleh dikombinasi dgn promo lain"
        datetime createdAt
    }
    PROMO_ATURAN {
        string id PK
        string promoId FK
        string jenisSyarat "MIN_BELANJA|ITEM_TERTENTU|KATEGORI_TERTENTU|OUTLET_TERTENTU|JAM_TERTENTU"
        json nilaiSyarat
    }
    KUPON {
        string id PK
        string tenantId FK
        string promoId FK
        string kode UK
        string pelangganId FK "nullable, null = kupon umum"
        int kuotaPemakaian "nullable = tak terbatas"
        int jumlahDipakai "default 0"
        string status "AKTIF|NONAKTIF|HABIS"
    }
    PROMO_PEMAKAIAN {
        string id PK
        string tenantId FK
        string promoId FK
        string kuponId FK "nullable"
        string pesananId FK
        int nilaiDiskon "rupiah"
        datetime createdAt
    }
```

Catatan:

- Kombinasi promo (`bisaDigabung`) dan urutan evaluasi aturan divalidasi di `packages/promo` saat kalkulasi total pesanan; `PROMO_PEMAKAIAN` menyimpan hasil akhir sebagai jejak audit (berapa diskon riil yang diberikan), bukan hanya referensi promo.
