# ERD - Platform (Tenant, Outlet, Pengguna, Perangkat)

Status dokumen: **DIPERBARUI (correction loop ALT-DEF-001, ALT-DEF-002)**.
`PENGGUNA` sekarang identitas GLOBAL (bukan tenant-scoped); keanggotaan
tenant/outlet/peran dipisah ke `KEANGGOTAAN_TENANT`/`KEANGGOTAAN_OUTLET`/
`KEANGGOTAAN_PERAN`. `PERAN.permissions Json` diganti model ternormalisasi
`IZIN`/`PERAN_IZIN`/`BATAS_IZIN`/`IZIN_SEMENTARA`/`PERMINTAAN_PERSETUJUAN`.
Lihat `docs/engineering/DECISION-LOG.md` ADR-011/ADR-012 untuk rasionalnya.

```mermaid
erDiagram
    TENANT ||--o{ OUTLET : memiliki
    TENANT ||--o{ KEANGGOTAAN_TENANT : punya_anggota
    PENGGUNA ||--o{ KEANGGOTAAN_TENANT : menjadi_anggota
    KEANGGOTAAN_TENANT ||--o{ KEANGGOTAAN_OUTLET : akses_outlet
    OUTLET ||--o{ KEANGGOTAAN_OUTLET : diakses_oleh
    TENANT ||--o{ PERAN : mendefinisikan
    PERAN ||--o{ PERAN_IZIN : memiliki
    IZIN ||--o{ PERAN_IZIN : dikaitkan
    KEANGGOTAAN_TENANT ||--o{ KEANGGOTAAN_PERAN : ditetapkan_peran
    PERAN ||--o{ KEANGGOTAAN_PERAN : ditetapkan_ke
    PERAN ||--o| BATAS_IZIN : punya_batas
    KEANGGOTAAN_TENANT ||--o{ IZIN_SEMENTARA : diberi_izin_sementara
    IZIN ||--o{ IZIN_SEMENTARA : didelegasikan
    TENANT ||--o{ PERMINTAAN_PERSETUJUAN : mengajukan
    KEANGGOTAAN_TENANT ||--o{ PERMINTAAN_PERSETUJUAN : memohon
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
        note "@@unique([tenantId, id]) tambahan - dipakai composite FK KEANGGOTAAN_OUTLET"
    }
    PENGGUNA {
        string id PK
        string namaLengkap
        string email UK "unik GLOBAL, bukan lagi per tenant"
        string passwordHash "nullable sementara, lihat ADR-011"
        string status "AKTIF|NONAKTIF"
        datetime emailTerverifikasiPada
        datetime terakhirLoginPada
        datetime createdAt
        datetime updatedAt
        note "TIDAK PUNYA tenantId/outletId/pinHash lagi - identitas global murni"
    }
    KEANGGOTAAN_TENANT {
        string id PK
        string penggunaId FK
        string tenantId FK
        string status "AKTIF|NONAKTIF"
        boolean isOwner
        datetime bergabungPada
        datetime createdAt
        datetime updatedAt
        note "@@unique([penggunaId, tenantId]); @@unique([tenantId, id]) untuk composite FK"
    }
    KEANGGOTAAN_OUTLET {
        string id PK
        string keanggotaanTenantId FK
        string tenantId "denormalisasi - wajib sama dgn Outlet.tenantId & KeanggotaanTenant.tenantId"
        string outletId FK
        string status "AKTIF|NONAKTIF"
        datetime createdAt
        datetime updatedAt
        note "Composite FK ganda (tenantId+outletId -> Outlet, tenantId+keanggotaanTenantId -> KeanggotaanTenant)"
    }
    PERAN {
        string id PK
        string tenantId FK
        string kode "OWNER|MANAJER|KASIR|PELAYAN|DAPUR|GUDANG|dst"
        string nama
        string deskripsi
        boolean isSystem
        string status "AKTIF|NONAKTIF"
        datetime createdAt
        datetime updatedAt
        note "permissions Json DIHAPUS - lihat PERAN_IZIN"
    }
    IZIN {
        string id PK
        string kode UK "GLOBAL, mis. transaksi.diskon"
        string nama
        string domain "mis. kasir|persediaan|promo"
        string deskripsi
        string status "AKTIF|NONAKTIF"
        datetime createdAt
        datetime updatedAt
    }
    PERAN_IZIN {
        string id PK
        string peranId FK
        string izinId FK
        datetime createdAt
        note "@@unique([peranId, izinId]) - menggantikan Peran.permissions Json"
    }
    KEANGGOTAAN_PERAN {
        string id PK
        string keanggotaanTenantId FK
        string peranId FK
        datetime createdAt
        note "menggantikan PENGGUNA_PERAN lama - peran per keanggotaan tenant, bukan per pengguna global"
    }
    BATAS_IZIN {
        string id PK
        string peranId FK UK "1:1 dengan Peran"
        decimal maksimumDiskonPersen
        int maksimumDiskonNominal
        int maksimumRefund
        decimal maksimumPenyesuaianStok
        boolean wajibPinSupervisor
        boolean wajibPersetujuanManajer
        datetime createdAt
        datetime updatedAt
    }
    IZIN_SEMENTARA {
        string id PK
        string keanggotaanTenantId FK
        string izinId FK
        string diberikanOlehId FK "-> Pengguna"
        string alasan
        datetime berlakuSejak
        datetime berlakuSampai
        string status "AKTIF|NONAKTIF"
        datetime createdAt
    }
    PERMINTAAN_PERSETUJUAN {
        string id PK
        string tenantId FK
        string outletId "nullable"
        string keanggotaanTenantIdPemohon FK
        string jenisAksi "mis. DISKON_MANUAL|REFUND|PENYESUAIAN_STOK"
        string referensiJenis
        string referensiId
        string status "DIAJUKAN|DISETUJUI|DITOLAK|DIBATALKAN"
        string disetujuiOlehId "nullable, -> Pengguna"
        string catatan
        datetime createdAt
        datetime updatedAt
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

- **ALT-DEF-001:** `PENGGUNA` adalah identitas global (autentikasi) - tidak
  membawa `tenantId`/`outletId`/peran langsung lagi. Keanggotaan tenant
  dimodelkan di `KEANGGOTAAN_TENANT`, akses outlet di `KEANGGOTAAN_OUTLET`.
  Satu `PENGGUNA` dapat memiliki banyak baris `KEANGGOTAAN_TENANT` aktif
  (mendukung pengguna lintas tenant, mis. konsultan). `pinHash` (PIN global
  lama) dihapus - PIN-per-outlet adalah model terpisah di batch berikutnya
  (`ALT-DEF-013`).
- **Composite-FK tenant-outlet (CRITICAL):** `OUTLET` dan `KEANGGOTAAN_TENANT`
  punya `@@unique([tenantId, id])` tambahan; `KEANGGOTAAN_OUTLET` memakai
  kolom `tenantId` yang sama pada dua relasi composite FK sekaligus
  (`(tenantId, outletId) -> Outlet(tenantId, id)` dan
  `(tenantId, keanggotaanTenantId) -> KeanggotaanTenant(tenantId, id)`) -
  ini menjamin secara level-database (bukan hanya guard aplikasi) bahwa
  outlet dan keanggotaan tenant yang direferensikan benar-benar dari tenant
  yang sama. Pendekatan ini dicoba langsung dan **berhasil** divalidasi oleh
  `prisma validate` (lihat `RELEASE-EVIDENCE.md`).
- **ALT-DEF-002:** `PERAN.permissions Json` diganti model ternormalisasi:
  `IZIN` (katalog kode izin atomik, unik global), `PERAN_IZIN` (many-to-many
  Peran x Izin), `KEANGGOTAAN_PERAN` (menggantikan `PENGGUNA_PERAN` -
  penetapan peran sekarang per `KEANGGOTAAN_TENANT`, bukan per `Pengguna`
  global, sehingga satu pengguna bisa punya peran berbeda di tenant berbeda),
  `BATAS_IZIN` (limit numerik per peran), `IZIN_SEMENTARA` (delegasi
  sementara), `PERMINTAAN_PERSETUJUAN` (alur approval supervisor generik).
  Lihat `docs/keamanan/PERMISSION-MATRIX.md` untuk mapping lengkap dan
  `prisma/seed/izin.seed.ts` untuk seed kode izin starter.
- `SESI` tidak pernah di-hard-delete; pencabutan sesi memakai `dicabutPada`.
- `AUDIT_LOG` bersifat append-only, sumber kebenaran untuk jejak audit semua domain lain.
- **ALT-DEF-010 (composite tenant/outlet-scoped FK, lihat ADR-013 di `docs/engineering/DECISION-LOG.md`):** `PERANGKAT.outletId` kini composite-FK `(tenantId, outletId) -> Outlet(tenantId, id)`, bukan FK ID tunggal - menjamin `Perangkat` tidak bisa merujuk `Outlet` milik tenant lain. `PENGATURAN_OUTLET` dijudge aman tanpa composite (hanya satu relasi ke `Outlet`, tidak ada FK kedua yang bisa menyimpang).
