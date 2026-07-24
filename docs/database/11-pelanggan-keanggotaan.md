# ERD - Pelanggan & Keanggotaan

```mermaid
erDiagram
    TENANT ||--o{ PELANGGAN : mendaftar
    PELANGGAN ||--o| KEANGGOTAAN : punya
    KEANGGOTAAN }o--|| TIER_MEMBERSHIP : berada_di
    KEANGGOTAAN ||--o{ POIN_RIWAYAT : mencatat
    PELANGGAN ||--o{ PESANAN : memesan
    PELANGGAN ||--o{ RESERVASI : memesan_meja
    PELANGGAN ||--o{ KUPON : memiliki

    PELANGGAN {
        string id PK
        string tenantId FK
        string namaLengkap
        string nomorTelepon UK "unik per tenant"
        string email "nullable"
        datetime createdAt
    }
    TIER_MEMBERSHIP {
        string id PK
        string tenantId FK
        string nama "mis. Silver, Gold, Platinum"
        int minPoinKumulatif
        json benefit
    }
    KEANGGOTAAN {
        string id PK
        string pelangganId FK UK
        string tierMembershipId FK
        int poinAktif
        int poinKumulatif "sepanjang masa, untuk penentuan tier"
        string status "AKTIF|NONAKTIF"
        datetime bergabungPada
    }
    POIN_RIWAYAT {
        string id PK
        string keanggotaanId FK
        string pesananId FK "nullable"
        string jenis "PEROLEHAN|PENUKARAN|PENYESUAIAN|KADALUARSA"
        int jumlah "positif=masuk, negatif=keluar"
        datetime createdAt
    }
```

Catatan:

- `POIN_RIWAYAT` bersifat append-only (no hard-delete); `KEANGGOTAAN.poinAktif` adalah saldo turunan yang direkonsiliasi dari riwayat.
- Kenaikan tier dievaluasi dari `poinKumulatif` terhadap `TIER_MEMBERSHIP.minPoinKumulatif`, dijalankan sebagai proses terpisah (bukan trigger DB implisit) agar bisa diaudit.
