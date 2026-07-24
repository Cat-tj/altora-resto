# ERD - Platform (Tenant, Outlet, Pengguna, Perangkat)

```mermaid
erDiagram
    TENANT ||--o{ OUTLET : memiliki
    TENANT ||--o{ PENGGUNA : mempekerjakan
    TENANT ||--o{ PERAN : mendefinisikan
    OUTLET ||--o{ PENGGUNA_OUTLET : menugaskan
    PENGGUNA ||--o{ PENGGUNA_OUTLET : ditugaskan_di
    PENGGUNA }o--o{ PERAN : memiliki
    OUTLET ||--o{ PERANGKAT : terdaftar
    PENGGUNA ||--o{ SESI : membuat
    PENGGUNA ||--o{ AUDIT_LOG : melakukan
    OUTLET ||--o{ PENGATURAN_OUTLET : punya
    TENANT ||--o{ PENGATURAN_TENANT : punya

    TENANT {
        string id PK "ULID"
        string nama
        string slug UK
        string status "AKTIF|NONAKTIF|SUSPENDED"
        datetime createdAt
    }
    OUTLET {
        string id PK
        string tenantId FK
        string nama
        string kode UK "unik per tenant"
        string zonaWaktu
        string status "AKTIF|NONAKTIF"
        datetime createdAt
    }
    PENGGUNA {
        string id PK
        string tenantId FK
        string namaLengkap
        string email UK "unik per tenant"
        string pinHash "PIN kasir/supervisor, hashed"
        string status "AKTIF|NONAKTIF"
        datetime createdAt
    }
    PENGGUNA_OUTLET {
        string id PK
        string penggunaId FK
        string outletId FK
        datetime createdAt
    }
    PERAN {
        string id PK
        string tenantId FK
        string kode "OWNER|MANAJER|KASIR|PELAYAN|DAPUR|GUDANG|dst"
        string nama
        json permissions
    }
    PERANGKAT {
        string id PK
        string tenantId FK
        string outletId FK
        string jenis "KASIR|KDS|PRINTER|TABLET_PELAYAN"
        string kodeAktivasi UK
        string status "AKTIF|NONAKTIF"
        datetime lastSeenAt
    }
    SESI {
        string id PK
        string penggunaId FK
        string perangkatId FK
        datetime dibuatPada
        datetime kadaluarsaPada
        datetime dicabutPada "nullable, bukan hard-delete"
    }
    AUDIT_LOG {
        string id PK
        string tenantId FK
        string outletId FK "nullable"
        string penggunaId FK
        string aksi
        string entitas
        string entitasId
        json sebelum
        json sesudah
        datetime createdAt
    }
    PENGATURAN_TENANT {
        string id PK
        string tenantId FK
        string kunci
        json nilai
    }
    PENGATURAN_OUTLET {
        string id PK
        string outletId FK
        string kunci
        json nilai
    }
```

Catatan:

- `PERAN.permissions` mengacu ke daftar permission pada `docs/keamanan/PERMISSION-MATRIX.md`.
- `SESI` tidak pernah di-hard-delete; pencabutan sesi memakai `dicabutPada`.
- `AUDIT_LOG` bersifat append-only, sumber kebenaran untuk jejak audit semua domain lain.
