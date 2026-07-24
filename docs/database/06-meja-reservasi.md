# ERD - Meja & Reservasi

```mermaid
erDiagram
    OUTLET ||--o{ AREA_MEJA : punya
    AREA_MEJA ||--o{ MEJA : berisi
    MEJA ||--o{ RESERVASI : dipesan_untuk
    PELANGGAN ||--o{ RESERVASI : membuat
    MEJA ||--o{ PESANAN : dipakai_oleh
    MEJA ||--o{ SESI_MEJA_QR : menghasilkan

    AREA_MEJA {
        string id PK
        string tenantId FK
        string outletId FK
        string nama "mis. Lantai 1, Outdoor"
    }
    MEJA {
        string id PK
        string tenantId FK
        string outletId FK
        string areaMejaId FK
        string nomor UK "unik per outlet"
        int kapasitas
        string status "TERSEDIA|TERPAKAI|DIPESAN|PERLU_DIBERSIHKAN|NONAKTIF"
    }
    SESI_MEJA_QR {
        string id PK
        string mejaId FK
        string token UK "dipakai di /pesan/{token}"
        datetime dibuatPada
        datetime kadaluarsaPada
        datetime ditutupPada "nullable"
    }
    RESERVASI {
        string id PK
        string tenantId FK
        string outletId FK
        string mejaId FK "nullable sampai ditugaskan"
        string pelangganId FK
        int jumlahTamu
        datetime waktuReservasi
        string status "DIAJUKAN|DIKONFIRMASI|TIBA|SELESAI|TIDAK_HADIR|DIBATALKAN"
        datetime createdAt
    }
```

Catatan:

- Alur status `MEJA` dan `RESERVASI` mengikuti state machine "Meja" di `docs/arsitektur/STATE-MACHINES.md`.
- `SESI_MEJA_QR.token` adalah token unik per sesi duduk yang dipakai pada rute publik `/pesan/{token}` (lihat `docs/ui-ux/ROUTE-MAP.md`); ditutup (bukan dihapus) saat meja selesai dipakai.
