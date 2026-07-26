# ERD - Platform (Tenant, Outlet, Pengguna, Perangkat)

Status dokumen: **DIPERBARUI (correction loop ALT-DEF-001, ALT-DEF-002,
ALT-DEF-003, ALT-DEF-013)**.
`PENGGUNA` sekarang identitas GLOBAL (bukan tenant-scoped); keanggotaan
tenant/outlet/peran dipisah ke `KEANGGOTAAN_TENANT`/`KEANGGOTAAN_OUTLET`/
`KEANGGOTAAN_PERAN`. `PERAN.permissions Json` diganti model ternormalisasi
`IZIN`/`PERAN_IZIN`/`BATAS_IZIN`/`IZIN_SEMENTARA`/`PERMINTAAN_PERSETUJUAN`.
Lihat `docs/engineering/DECISION-LOG.md` ADR-011/ADR-012 untuk rasionalnya.

Batch ALT-DEF-003/ALT-DEF-013 menambahkan pengerasan autentikasi/sesi/PIN:
`TOKEN_RESET_KATA_SANDI`, `PERCOBAAN_LOGIN`, `PIN_OUTLET`,
`RIWAYAT_PERANGKAT`, plus field lockout di `PENGGUNA` dan field keamanan
tambahan di `SESI`. Lihat `docs/engineering/DECISION-LOG.md` ADR-014/ADR-015.

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
    KEANGGOTAAN_TENANT ||--o{ IZIN_SEMENTARA : "memberikan (ADR-033, diberikanOlehId)"
    IZIN ||--o{ IZIN_SEMENTARA : didelegasikan
    TENANT ||--o{ PERMINTAAN_PERSETUJUAN : mengajukan
    KEANGGOTAAN_TENANT ||--o{ PERMINTAAN_PERSETUJUAN : memohon
    KEANGGOTAAN_TENANT ||--o{ PERMINTAAN_PERSETUJUAN : "menyetujui (ADR-033, disetujuiOlehId)"
    OUTLET ||--o{ PERANGKAT : terdaftar
    PENGGUNA ||--o{ SESI : membuat
    KEANGGOTAAN_TENANT ||--o{ SESI : konteks_aktif
    PENGGUNA ||--o{ AUDIT_LOG : melakukan
    PENGGUNA ||--o{ TOKEN_RESET_KATA_SANDI : meminta
    KEANGGOTAAN_TENANT ||--o{ PIN_OUTLET : punya_pin
    OUTLET ||--o{ PIN_OUTLET : diakses_pin
    PENGGUNA ||--o{ RIWAYAT_PERANGKAT : beraksi
    PERANGKAT ||--o{ RIWAYAT_PERANGKAT : diriwayatkan
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
        datetime terkunciSampai "nullable - lockout sementara, ADR-014"
        int jumlahPercobaanGagal "default 0, ADR-014"
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
        string tenantId FK "denormalisasi, ADR-033 - dipakai kedua composite-FK di bawah"
        string keanggotaanTenantId FK "penerima izin, composite (tenantId, keanggotaanTenantId)"
        string izinId FK
        string diberikanOlehId FK "-> KEANGGOTAAN_TENANT, composite (tenantId, diberikanOlehId), ADR-033 (sebelumnya -> Pengguna)"
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
        string disetujuiOlehId "nullable, -> KEANGGOTAAN_TENANT, composite (tenantId, disetujuiOlehId), ADR-033 (sebelumnya -> Pengguna)"
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
        string keanggotaanTenantId FK "nullable - konteks tenant aktif, ADR-014"
        string perangkatId FK
        string tokenHash UK "hash token bearer, tidak pernah simpan mentah"
        datetime dibuatPada
        datetime kadaluarsaPada
        datetime terakhirAktifPada "ADR-014"
        datetime dicabutPada "nullable, bukan hard-delete"
        string alasanPencabutan "nullable"
        string ipHash "nullable"
        string userAgent "nullable"
    }
    TOKEN_RESET_KATA_SANDI {
        string id PK
        string penggunaId FK
        string tokenHash UK "hash token reset, tidak pernah simpan mentah"
        datetime kadaluarsaPada
        datetime digunakanPada "nullable - conditional uniqueness di service-layer, ADR-014"
        datetime createdAt
    }
    PERCOBAAN_LOGIN {
        string id PK
        string email "teks bebas, TIDAK FK ke Pengguna - lihat ADR-014"
        boolean berhasil
        string ipHash "nullable"
        string userAgent "nullable"
        datetime createdAt
        note "append-only, dipakai deteksi brute-force"
    }
    PIN_OUTLET {
        string id PK
        string keanggotaanTenantId FK
        string tenantId "denormalisasi - wajib sama dgn Outlet.tenantId & KeanggotaanTenant.tenantId"
        string outletId FK
        string perangkatId "nullable, BUKAN FK ke Perangkat - lihat ADR-015"
        string pinHash
        string status "AKTIF|NONAKTIF"
        datetime createdAt
        datetime updatedAt
        note "Composite FK ganda seperti KEANGGOTAAN_OUTLET; NULL pada perangkatId TIDAK dicegah unique constraint - ADR-015"
    }
    RIWAYAT_PERANGKAT {
        string id PK
        string penggunaId FK
        string perangkatId FK
        string aksi "DIDAFTARKAN|DIGUNAKAN|DICABUT"
        datetime createdAt
        note "append-only, berbeda dari state terkini di PERANGKAT"
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
- **ADR-033:** `IZIN_SEMENTARA.diberikanOlehId` dan
  `PERMINTAAN_PERSETUJUAN.disetujuiOlehId` dipindah dari FK langsung ke
  `PENGGUNA` (identitas global) menjadi composite-FK ke `KEANGGOTAAN_TENANT`
  (`(tenantId, xxxOlehId) -> KeanggotaanTenant(tenantId, id)`) - menjamin di
  level database bahwa aktor benar-benar tercatat sebagai anggota tenant
  yang sama dengan baris yang diaksesnya. `IZIN_SEMENTARA` mendapat kolom
  `tenantId` baru (denormalisasi) untuk mendukung kedua composite-FK
  (penerima dan pemberi izin). Lihat `docs/engineering/DECISION-LOG.md`
  ADR-033 untuk audit lengkap seluruh 47 field aktor tenant-scoped di
  seluruh skema (bukan hanya dua yang ada di domain platform ini).
- `SESI` tidak pernah di-hard-delete; pencabutan sesi memakai `dicabutPada`.
- `AUDIT_LOG` bersifat append-only, sumber kebenaran untuk jejak audit semua domain lain.
- **ALT-DEF-010 (composite tenant/outlet-scoped FK, lihat ADR-013 di `docs/engineering/DECISION-LOG.md`):** `PERANGKAT.outletId` kini composite-FK `(tenantId, outletId) -> Outlet(tenantId, id)`, bukan FK ID tunggal - menjamin `Perangkat` tidak bisa merujuk `Outlet` milik tenant lain. `PENGATURAN_OUTLET` dijudge aman tanpa composite (hanya satu relasi ke `Outlet`, tidak ada FK kedua yang bisa menyimpang).
- **ALT-DEF-003 (pengerasan kredensial/sesi, lihat ADR-014):** `PENGGUNA`
  mendapat `terkunciSampai`/`jumlahPercobaanGagal` (lockout sementara,
  field eksplisit - bukan dihitung ulang dari `PERCOBAAN_LOGIN` tiap
  request). `TOKEN_RESET_KATA_SANDI` (baru) menyimpan hanya `tokenHash`
  (never raw token) untuk alur lupa/reset kata sandi; conditional
  uniqueness ("token dipakai/kadaluarsa tidak boleh dipakai ulang") adalah
  keterbatasan Prisma yang didokumentasikan, enforcement di service-layer.
  `PERCOBAAN_LOGIN` (baru) adalah log append-only, sengaja TIDAK di-FK ke
  `Pengguna` supaya percobaan dengan email tak terdaftar tetap tercatat
  (deteksi enumerasi email). `SESI` mendapat `tokenHash` (unik, wajib -
  lookup sesi lewat hash, bukan `id`), `keanggotaanTenantId` (nullable -
  konteks tenant aktif sesi, lihat rasional nullable di ADR-014),
  `terakhirAktifPada`, `alasanPencabutan`, `ipHash`, `userAgent`.
- **ALT-DEF-013 (PIN per outlet, lihat ADR-015):** `PIN_OUTLET` (baru)
  menggantikan konsep PIN global yang sudah dihapus dari `PENGGUNA` di
  ALT-DEF-001 - PIN sekarang scoped ke `(KeanggotaanTenant, Outlet,
  perangkat opsional)` memakai composite-FK ganda identik
  `KEANGGOTAAN_OUTLET`. `perangkatId` di `PIN_OUTLET` sengaja BUKAN FK ke
  `PERANGKAT` (PIN staf bisa dipakai dari perangkat pribadi yang tak
  teregistrasi); NULL pada `perangkatId` tidak dicegah oleh unique
  constraint database (keterbatasan Postgres NULL != NULL), enforcement
  "hanya satu PIN tanpa-perangkat-spesifik" ada di service-layer.
  `RIWAYAT_PERANGKAT` (baru) adalah jejak audit append-only asosiasi
  `Pengguna`<->`Perangkat` (DIDAFTARKAN/DIGUNAKAN/DICABUT), berbeda dari
  `PERANGKAT` yang hanya menyimpan state terkini satu perangkat fisik.
