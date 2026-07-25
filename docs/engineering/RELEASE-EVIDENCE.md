# Release Evidence - Altora Resto

Status dokumen: **DRAF AWAL - BELUM ADA RILIS**.

Dokumen ini akan memuat bukti konkret (log hasil test, screenshot, output CI) untuk
setiap rilis. Pada titik penulisan dokumen ini, **belum ada satu pun rilis, build,
atau proses test yang dijalankan** - repo baru berisi scaffold monorepo, ERD, skema
Prisma awal, dan dokumen desain. Tidak ada klaim `LULUS` yang dibuat di dokumen ini
karena tidak ada yang benar-benar diuji.

## Bukti yang benar-benar tersedia sampai saat ini

| Item | Perintah | Hasil aktual | Tanggal |
|---|---|---|---|
| Validasi skema Prisma | `npx prisma@5.20.0 format --schema prisma/schema/schema.prisma` lalu `npx prisma@5.20.0 validate --schema prisma/schema/schema.prisma` (dengan `DATABASE_URL` dummy lokal, tanpa koneksi database nyata) | `Formatted prisma/schema/schema.prisma in 56ms` dan `The schema at prisma/schema/schema.prisma is valid` | 2026-07-24 |
| Typecheck token desain | `tsc --noEmit --strict` atas `packages/desain/src/tokens.ts` + `index.ts` | Tidak ada error output (bersih) | 2026-07-24 |

Kedua item di atas adalah **pemeriksaan statis** (validasi sintaks skema & tipe), BUKAN
bukti bahwa aplikasi berjalan, bahwa migrasi benar-benar diterapkan ke database nyata,
atau bahwa fitur apa pun berfungsi end-to-end.

## Catatan pass 2026-07-24: pencatatan defect, bukan perbaikan

Pass correction-loop pada 2026-07-24 yang menulis ulang
`docs/engineering/DEFECT-LEDGER.md` (29 defect, `ALT-DEF-001` s.d. `ALT-DEF-029`)
adalah **pass pencatatan defect murni** — tidak ada schema, kode aplikasi, atau
kontrak API yang diubah pada pass ini (hanya file di `docs/engineering/*.md`).
Tidak ada bukti perbaikan untuk defect apa pun ditambahkan di sini karena memang
belum ada perbaikan yang dilakukan; satu-satunya pengecualian adalah ALT-DEF-012
yang bukti verifikasinya (`grep` jumlah baris requirement) sudah tercatat langsung
di `DEFECT-LEDGER.md`, bukan di sini, karena itu bukti untuk gejala (ukuran
checklist) bukan untuk akar masalah schema.

Sebelum satu pun defect di `DEFECT-LEDGER.md` boleh berpindah status ke
`DITUTUP`, verifikasi berikut wajib dijalankan dan hasilnya dicatat di sini
sesuai format entri rilis di bawah:

1. `npx prisma@5.20.0 validate --schema prisma/schema/schema.prisma` (dan
   `format`) setelah perubahan schema — bukti sintaks valid, bukan bukti
   perilaku benar.
2. `prisma migrate dev` terhadap database Postgres kosong (lihat ALT-DEF-029) —
   bukti bahwa schema benar-benar bisa diterapkan, bukan hanya valid secara
   sintaks.
3. Typecheck (`tsc --noEmit --strict`) atas paket yang terpengaruh perubahan
   schema/API.
4. Test otomatis terkait (unit/integration/security) untuk defect yang
   diperbaiki — termasuk test isolasi tenant (lihat ALT-DEF-027) begitu harness
   test tersedia.
5. Pembaruan `docs/engineering/TRACEABILITY-MATRIX.md` untuk requirement yang
   terpengaruh, supaya requirement->entitas/endpoint/rute/permission/bukti uji
   tetap konsisten dengan `MASTER-CHECKLIST.md` (lihat ALT-DEF-020 di
   `DEFECT-LEDGER.md` untuk status sinkronisasi saat ini).

Tanpa kelima bukti di atas, status defect di `DEFECT-LEDGER.md` **tidak boleh**
diklaim `DITUTUP` — ini menegaskan ulang aturan integritas bukti di bagian bawah
dokumen ini.

## Pass correction-loop 2026-07-25: perbaikan ALT-DEF-001 dan ALT-DEF-002

Cakupan: `Pengguna`/`KeanggotaanTenant`/`KeanggotaanOutlet` (ALT-DEF-001) dan
`Peran`/`Izin`/`PeranIzin`/`KeanggotaanPeran`/`BatasIzin`/`IzinSementara`/
`PermintaanPersetujuan` (ALT-DEF-002). Lihat `docs/engineering/DECISION-LOG.md`
ADR-011/ADR-012 untuk desain lengkap.

### 1. `prisma format`

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/altora_resto" npx prisma format --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
Formatted prisma/schema/schema.prisma in 58ms 🚀
```

### 2. `prisma validate`

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/altora_resto" npx prisma validate --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
The schema at prisma/schema/schema.prisma is valid 🚀
```

Sintaks valid termasuk composite-FK ganda `KeanggotaanOutlet` (dua relasi
memakai kolom `tenantId` yang sama menuju `Outlet(tenantId, id)` dan
`KeanggotaanTenant(tenantId, id)`) - pendekatan ini DICOBA langsung sesuai
instruksi correction-loop dan **berhasil**, tidak perlu fallback ke
scalar+guard aplikasi.

### 3. `prisma generate` (tanpa koneksi database nyata)

Lingkungan ini tidak punya `pnpm`; `prisma generate` mencoba auto-install
`@prisma/client` lewat `pnpm add` dan gagal (`spawn pnpm ENOENT`). Setelah
`@prisma/client`+`prisma` diinstal manual lewat
`npm install --no-save --no-package-lock @prisma/client@5.20.0 prisma@5.20.0`
(workaround environment, tidak mengubah `package.json`/lockfile proyek),
`prisma generate` **berhasil tanpa koneksi database**:

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/altora_resto" npx prisma generate --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma

✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 458ms
```

### 4. Test struktur/arsitektur (dijalankan nyata)

`packages/test-support/src/architecture/keanggotaan-outlet-constraints.test.ts`
(grep/pembacaan teks `schema.prisma` untuk memverifikasi constraint composite
tenant-outlet dan model Izin/Peran ternormalisasi) dijalankan langsung lewat
Node type-stripping (bukan lewat `vitest` - lihat DIBLOKIR di bawah):

```
$ node --experimental-strip-types packages/test-support/src/architecture/keanggotaan-outlet-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-001/ALT-DEF-002 lulus.
```

`packages/test-support/src/architecture/prisma-client-shape.test.ts`
(type-check compile-time atas `Prisma.*CreateInput` yang di-generate untuk
model baru) - `tsc --noEmit` **bersih, tanpa error**:

```
$ npx tsc --noEmit --strict --module ESNext --moduleResolution Bundler --target ES2022 --skipLibCheck packages/test-support/src/architecture/prisma-client-shape.test.ts
(tidak ada output - bersih)
```

`keanggotaan-outlet-constraints.test.ts` dan `prisma/seed/izin.seed.ts` juga
lulus `tsc --noEmit` (dengan `--types node` untuk modul `node:fs`/`node:path`):

```
$ npx tsc --noEmit --strict --module ESNext --moduleResolution Bundler --target ES2022 --skipLibCheck --types node packages/test-support/src/architecture/keanggotaan-outlet-constraints.test.ts prisma/seed/izin.seed.ts
(tidak ada output - bersih)
```

**DIBLOKIR:** eksekusi lewat `pnpm --filter @altora/test-support test`
(vitest) tidak bisa dijalankan di environment ini karena `pnpm` tidak
terinstal dan tidak ada lockfile workspace nyata untuk diinstal darinya - lihat
`ALT-DEF-027` (belum ada harness test). Assertion yang sama sudah dibuktikan
lulus secara nyata lewat `node --experimental-strip-types` di atas, sebagai
pengganti sementara yang jujur (bukan simulasi/fabrikasi hasil vitest).

### 5. `prisma migrate dev` - DIBLOKIR

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/altora_resto_migrate_test" npx prisma migrate dev --schema=prisma/schema/schema.prisma --name alt_def_001_002_keanggotaan_izin --create-only
Prisma schema loaded from prisma/schema/schema.prisma
Datasource "db": PostgreSQL database "altora_resto_migrate_test", schema "public" at "localhost:5432"

Error: P1010: User `user` was denied access on the database `altora_resto_migrate_test.public`
```

**DIBLOKIR: migrasi belum dapat diverifikasi karena PostgreSQL nyata tidak
tersedia di environment ini** (konsisten dengan `ALT-DEF-029`). Tidak ada file
migrasi yang dibuat/di-commit dari percobaan ini (`prisma/migrations/` tetap
kosong).

### Kesimpulan status

Schema dan seed literal untuk ALT-DEF-001/ALT-DEF-002 sudah benar secara
sintaks (`format`+`validate`), tipe yang dihasilkan sudah benar secara bentuk
(`generate` + `tsc --noEmit`), dan constraint yang jadi jaring pengaman
level-database sudah dibuktikan ada lewat test struktur nyata. **Belum ada**
migrasi nyata ke Postgres maupun test integrasi/isolasi-tenant sungguhan -
karena itu status kedua defect di `DEFECT-LEDGER.md` adalah
`SIAP_DIVERIFIKASI`, BUKAN `DITUTUP`.

## Pass correction-loop 2026-07-25 (lanjutan): perbaikan ALT-DEF-010 dan ALT-DEF-014

Cakupan: composite-FK tenant/outlet lintas skema (`Perangkat`, `KategoriMenu`,
`ItemMenu`, `HargaItemOutlet`, `Gudang`, `StokBahan`, `MutasiStok`,
`StokOpname`, `PurchaseOrder`, `PenerimaanBarang`, `AreaMeja`, `Meja`,
`Reservasi`, `Pesanan`, `StasiunDapur`, `TiketDapur`, `GiliranKasir`,
`Pembayaran`, `Karyawan`, `Absensi`, `RekapKasHarian`, `BiayaOperasional`,
keempat tabel `RmXxx`), plus `@@unique([tenantId, id])` pendukung pada
`Bahan`, `Supplier`, `Jabatan`, `KategoriBiaya`, `Pelanggan`. Lihat
`docs/engineering/DECISION-LOG.md` ADR-013 untuk desain lengkap dan daftar
model yang dijudge aman tanpa composite-FK.

### 1. `prisma format`

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/altora_resto" npx prisma format --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
Formatted prisma/schema/schema.prisma in 64ms 🚀
```

Catatan proses: format pertama kali GAGAL dua kali sebelum lulus - (1)
"Ambiguous relation detected" pada `Outlet.hargaItemOutlet`/`ItemMenu.hargaOutlet`
dan relasi `StokBahan`/`PenerimaanBarang` lain yang butuh nama relasi eksplisit
(diperbaiki dengan menambahkan `@relation("HargaItemOutletOutlet")` dkk. pada
sisi list-nya), dan (2) "A one-to-one relation must use unique fields on the
defining side" pada `TiketDapur.pesanan` dan `RekapKasHarian.giliranKasir`
(diperbaiki dengan menambahkan `@@unique([tenantId, pesananId])` pada
`TiketDapur` dan `@@unique([tenantId, giliranKasirId])` pada
`RekapKasHarian`). Kedua error ini murni aturan sintaks Prisma untuk
composite-FK, BUKAN keterbatasan struktural yang butuh fallback - setelah
diperbaiki, format/validate/generate semuanya lulus bersih (lihat di bawah).

### 2. `prisma validate`

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/altora_resto" npx prisma validate --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
The schema at prisma/schema/schema.prisma is valid 🚀
```

### 3. `prisma generate` (tanpa koneksi database nyata)

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/altora_resto" npx prisma generate --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma

✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 654ms
```

### 4. Test struktur/arsitektur (dijalankan nyata)

`packages/test-support/src/architecture/tenant-outlet-composite-constraints.test.ts`
(baru, ALT-DEF-010/ALT-DEF-014) dijalankan lewat Node type-stripping:

```
$ node --experimental-strip-types packages/test-support/src/architecture/tenant-outlet-composite-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-010/ALT-DEF-014 lulus.
```

Test lama `keanggotaan-outlet-constraints.test.ts` (ALT-DEF-001/002)
dijalankan ulang untuk memverifikasi tidak ada regresi dari perubahan skema
besar-besaran pass ini:

```
$ node --experimental-strip-types packages/test-support/src/architecture/keanggotaan-outlet-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-001/ALT-DEF-002 lulus.
```

`tsc --noEmit` atas keempat file test (baru + lama) - semuanya **bersih,
tanpa error**:

```
$ npx tsc --noEmit --strict --module ESNext --moduleResolution Bundler --target ES2022 --skipLibCheck --types node packages/test-support/src/architecture/tenant-outlet-composite-constraints.test.ts
(tidak ada output - bersih)

$ npx tsc --noEmit --strict --module ESNext --moduleResolution Bundler --target ES2022 --skipLibCheck packages/test-support/src/architecture/prisma-client-shape-tenant-outlet.test.ts
(tidak ada output - bersih)

$ npx tsc --noEmit --strict --module ESNext --moduleResolution Bundler --target ES2022 --skipLibCheck packages/test-support/src/architecture/prisma-client-shape.test.ts
(tidak ada output - bersih)

$ npx tsc --noEmit --strict --module ESNext --moduleResolution Bundler --target ES2022 --skipLibCheck --types node packages/test-support/src/architecture/keanggotaan-outlet-constraints.test.ts prisma/seed/izin.seed.ts
(tidak ada output - bersih)
```

**DIBLOKIR:** eksekusi lewat `pnpm --filter @altora/test-support test`
(vitest) tetap tidak bisa dijalankan di environment ini (sama seperti pass
sebelumnya - lihat `ALT-DEF-027`). Assertion yang sama sudah dibuktikan lulus
secara nyata lewat `node --experimental-strip-types` di atas.

### 5. `prisma migrate dev` - DIBLOKIR (konsisten dengan pass sebelumnya)

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/altora_resto_migrate_test" npx prisma migrate dev --schema=prisma/schema/schema.prisma --name alt_def_010_014_composite_tenant_outlet --create-only
Prisma schema loaded from prisma/schema/schema.prisma
Datasource "db": PostgreSQL database "altora_resto_migrate_test", schema "public" at "localhost:5432"

Error: P1010: User `user` was denied access on the database `altora_resto_migrate_test.public`
```

**DIBLOKIR: migrasi belum dapat diverifikasi karena PostgreSQL nyata tidak
tersedia di environment ini** (konsisten dengan `ALT-DEF-029`). Tidak ada file
migrasi yang dibuat/di-commit dari percobaan ini (`prisma/migrations/` tetap
kosong).

### Kesimpulan status

Schema untuk ALT-DEF-010/ALT-DEF-014 sudah benar secara sintaks
(`format`+`validate`), tipe yang dihasilkan sudah benar secara bentuk
(`generate` + `tsc --noEmit`, termasuk `Unchecked...CreateInput` untuk tiga
model yang baru mendapat kolom `tenantId` denormalisasi - `HargaItemOutlet`,
`StokBahan`, `PenerimaanBarang`), dan seluruh composite-FK yang diklaim di
ADR-013 sudah dibuktikan ada lewat test struktur nyata, tanpa regresi pada
test ALT-DEF-001/002 yang sudah ada. **Belum ada** migrasi nyata ke Postgres
maupun test integrasi/isolasi-tenant sungguhan - karena itu status kedua
defect di `DEFECT-LEDGER.md` adalah `SIAP_DIVERIFIKASI`, BUKAN `DITUTUP`.

## Pass correction-loop 2026-07-25 (lanjutan): perbaikan ALT-DEF-003 dan ALT-DEF-013

Cakupan: pengerasan autentikasi/sesi/PIN - `TokenResetKataSandi`,
`PercobaanLogin`, `PinOutlet` (composite-FK ganda seperti
`KeanggotaanOutlet`), `RiwayatPerangkat`, field lockout eksplisit di
`Pengguna` (`terkunciSampai`, `jumlahPercobaanGagal`), dan `Sesi` diperkeras
(`tokenHash`, `keanggotaanTenantId`, `terakhirAktifPada`,
`alasanPencabutan`, `ipHash`, `userAgent`). Lihat
`docs/engineering/DECISION-LOG.md` ADR-014/ADR-015 untuk desain lengkap.

### 1. `prisma format`

```
$ npx prisma format --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
Formatted prisma/schema/schema.prisma in 59ms 🚀
```

Tidak ada error sintaks yang perlu diperbaiki pada pass ini (berbeda dari
pass ALT-DEF-010/014 yang sempat menemukan dua error "ambiguous relation"/
"one-to-one relation" - pola composite-FK ganda `PinOutlet` mengikuti persis
pola `KeanggotaanOutlet` yang sudah terbukti valid, termasuk penamaan
relasi eksplisit `PinOutletOutlet`/`PinOutletTenantScoped` sejak awal
penulisan skema, sehingga tidak memicu error yang sama).

### 2. `prisma validate`

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/altora_resto" npx prisma validate --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
The schema at prisma/schema/schema.prisma is valid 🚀
```

### 3. `prisma generate` (tanpa koneksi database nyata)

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/altora_resto" npx prisma generate --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma

✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 641ms
```

`npx prisma` (versi 5.20.0 yang sudah terinstal dari pass-pass sebelumnya di
`node_modules`) berjalan langsung tanpa perlu workaround
`npm install --no-save --no-package-lock @prisma/client@5.20.0 prisma@5.20.0`
pada pass ini - dependency sudah tersedia dari batch ALT-DEF-010/014
sebelumnya di environment yang sama.

### 4. Test struktur/arsitektur (dijalankan nyata)

`packages/test-support/src/architecture/sesi-auth-pin-constraints.test.ts`
(baru, ALT-DEF-003/ALT-DEF-013) dijalankan lewat Node type-stripping:

```
$ node --experimental-strip-types packages/test-support/src/architecture/sesi-auth-pin-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-003/ALT-DEF-013 lulus.
```

Kedua test lama dijalankan ulang untuk memverifikasi tidak ada regresi dari
penambahan model/field pass ini:

```
$ node --experimental-strip-types packages/test-support/src/architecture/keanggotaan-outlet-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-001/ALT-DEF-002 lulus.

$ node --experimental-strip-types packages/test-support/src/architecture/tenant-outlet-composite-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-010/ALT-DEF-014 lulus.
```

`tsc --noEmit` atas seluruh file test arsitektur (baru + lama) plus
`izin.seed.ts` - semuanya **bersih, tanpa error**:

```
$ npx tsc --noEmit --strict --module ESNext --moduleResolution Bundler --target ES2022 --skipLibCheck --types node packages/test-support/src/architecture/sesi-auth-pin-constraints.test.ts
(tidak ada output - bersih)

$ npx tsc --noEmit --strict --module ESNext --moduleResolution Bundler --target ES2022 --skipLibCheck packages/test-support/src/architecture/prisma-client-shape-auth-pin.test.ts
(tidak ada output - bersih)

$ npx tsc --noEmit --strict --module ESNext --moduleResolution Bundler --target ES2022 --skipLibCheck --types node packages/test-support/src/architecture/*.test.ts prisma/seed/izin.seed.ts
(tidak ada output - bersih, mencakup keanggotaan-outlet-constraints.test.ts,
tenant-outlet-composite-constraints.test.ts, prisma-client-shape.test.ts,
prisma-client-shape-tenant-outlet.test.ts, sesi-auth-pin-constraints.test.ts,
prisma-client-shape-auth-pin.test.ts sekaligus)
```

**DIBLOKIR:** eksekusi lewat `pnpm --filter @altora/test-support test`
(vitest) tetap tidak bisa dijalankan di environment ini (sama seperti
pass-pass sebelumnya - lihat `ALT-DEF-027`). Assertion yang sama sudah
dibuktikan lulus secara nyata lewat `node --experimental-strip-types` di
atas.

### 5. `prisma migrate dev` - DIBLOKIR (konsisten dengan pass sebelumnya)

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/altora_resto_migrate_test" npx prisma migrate dev --schema=prisma/schema/schema.prisma --name alt_def_003_013_auth_pin_hardening --create-only
Prisma schema loaded from prisma/schema/schema.prisma
Datasource "db": PostgreSQL database "altora_resto_migrate_test", schema "public" at "localhost:5432"

Error: P1010: User `user` was denied access on the database `altora_resto_migrate_test.public`
```

**DIBLOKIR: migrasi belum dapat diverifikasi karena PostgreSQL nyata tidak
tersedia di environment ini** (konsisten dengan `ALT-DEF-029`). Tidak ada
file migrasi yang dibuat/di-commit dari percobaan ini
(`prisma/migrations/` tetap kosong).

### Kesimpulan status

Schema untuk ALT-DEF-003/ALT-DEF-013 sudah benar secara sintaks
(`format`+`validate`), tipe yang dihasilkan sudah benar secara bentuk
(`generate` + `tsc --noEmit`, termasuk `Unchecked...CreateInput` untuk
`PinOutlet`, `TokenResetKataSandi`, `PercobaanLogin`, `RiwayatPerangkat`,
`Sesi`), dan seluruh model/field yang diklaim di ADR-014/ADR-015 sudah
dibuktikan ada lewat test struktur nyata, tanpa regresi pada test
ALT-DEF-001/002/010/014 yang sudah ada. **Belum ada** migrasi nyata ke
Postgres, implementasi handler auth/PIN sungguhan, maupun test integrasi
login/PIN sungguhan - karena itu status kedua defect di
`DEFECT-LEDGER.md` adalah `SIAP_DIVERIFIKASI`, BUKAN `DITUTUP`.

## Pass correction-loop 2026-07-25 (lanjutan): perbaikan ALT-DEF-017

Cakupan: infrastruktur idempotency/outbox/notifikasi - `IdempotencyKey`
(`@@unique([tenantId, scope, key])`, FK biasa ke `Tenant`),
`DomainOutboxEvent` (index `[status, availableAt]`), `Notification`
(in-app saja, `penggunaId` nullable, index `[penggunaId, dibacaPada]`).
Lihat `docs/engineering/DECISION-LOG.md` ADR-016 untuk desain lengkap.

### 1. `prisma format`

```
$ npx prisma format --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
Formatted prisma/schema/schema.prisma in 59ms 🚀
```

Tidak ada error sintaks yang perlu diperbaiki pada pass ini. Berbeda dari
`IdempotencyKey`/`DomainOutboxEvent`/`Notification` yang SENGAJA tidak
memakai pola composite-FK ganda (lihat ADR-016 Keputusan 2 dan 5), sehingga
tidak ada risiko error "ambiguous relation"/"one-to-one relation" seperti
yang sempat muncul di pass ALT-DEF-010/014.

### 2. `prisma validate`

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/altora_resto_dummy" npx prisma validate --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
The schema at prisma/schema/schema.prisma is valid 🚀
```

### 3. `prisma generate` (tanpa koneksi database nyata)

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/altora_resto_dummy" npx prisma generate --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma

✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 666ms
```

Diverifikasi langsung lewat grep atas `node_modules/.prisma/client/index.d.ts`
bahwa `IdempotencyKeyUncheckedCreateInput`, `DomainOutboxEventUncheckedCreateInput`,
dan `NotificationUncheckedCreateInput` benar-benar dihasilkan.

### 4. Test struktur/arsitektur (dijalankan nyata)

`packages/test-support/src/architecture/idempotency-outbox-notification-constraints.test.ts`
(baru, ALT-DEF-017) dijalankan lewat Node type-stripping:

```
$ node --experimental-strip-types packages/test-support/src/architecture/idempotency-outbox-notification-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-017 lulus.
```

Ketiga test lama dijalankan ulang untuk memverifikasi tidak ada regresi dari
penambahan model/field pass ini:

```
$ node --experimental-strip-types packages/test-support/src/architecture/keanggotaan-outlet-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-001/ALT-DEF-002 lulus.

$ node --experimental-strip-types packages/test-support/src/architecture/tenant-outlet-composite-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-010/ALT-DEF-014 lulus.

$ node --experimental-strip-types packages/test-support/src/architecture/sesi-auth-pin-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-003/ALT-DEF-013 lulus.
```

`tsc --noEmit` atas file baru (test struktur + compile-time shape) - bersih,
tanpa error:

```
$ npx tsc --noEmit --strict --module ESNext --moduleResolution Bundler --target ES2022 --skipLibCheck packages/test-support/src/architecture/prisma-client-shape-platform-infra.test.ts
(tidak ada output - bersih)

$ npx tsc --noEmit --strict --module ESNext --moduleResolution Bundler --target ES2022 --skipLibCheck --types node packages/test-support/src/architecture/*.test.ts prisma/seed/izin.seed.ts
(tidak ada output - bersih, mencakup keanggotaan-outlet-constraints.test.ts,
tenant-outlet-composite-constraints.test.ts, prisma-client-shape.test.ts,
prisma-client-shape-tenant-outlet.test.ts, sesi-auth-pin-constraints.test.ts,
prisma-client-shape-auth-pin.test.ts, idempotency-outbox-notification-constraints.test.ts,
prisma-client-shape-platform-infra.test.ts sekaligus - tanpa regresi pada
seluruh file test arsitektur sebelumnya)
```

**DIBLOKIR:** eksekusi lewat `pnpm --filter @altora/test-support test`
(vitest) tetap tidak bisa dijalankan di environment ini (sama seperti
pass-pass sebelumnya - lihat `ALT-DEF-027`). Assertion yang sama sudah
dibuktikan lulus secara nyata lewat `node --experimental-strip-types` di
atas.

### 5. `prisma migrate dev` - DIBLOKIR (konsisten dengan pass sebelumnya)

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/altora_resto_migrate_test" npx prisma migrate dev --schema=prisma/schema/schema.prisma --name alt_def_017_idempotency_outbox_notification --create-only
Prisma schema loaded from prisma/schema/schema.prisma
Datasource "db": PostgreSQL database "altora_resto_migrate_test", schema "public" at "localhost:5432"

Error: P1010: User `user` was denied access on the database `altora_resto_migrate_test.public`
```

**DIBLOKIR: migrasi belum dapat diverifikasi karena PostgreSQL nyata tidak
tersedia di environment ini** (konsisten dengan `ALT-DEF-029`). Tidak ada
file migrasi yang dibuat/di-commit dari percobaan ini
(`prisma/migrations/` tetap kosong).

### Kesimpulan status

Schema untuk ALT-DEF-017 sudah benar secara sintaks (`format`+`validate`),
tipe yang dihasilkan sudah benar secara bentuk (`generate` + `tsc --noEmit`,
termasuk `Unchecked...CreateInput` untuk `IdempotencyKey`,
`DomainOutboxEvent`, `Notification`), dan seluruh model/field yang diklaim di
ADR-016 sudah dibuktikan ada lewat test struktur nyata, tanpa regresi pada
test ALT-DEF-001/002/003/010/013/014 yang sudah ada. **Belum ada** migrasi
nyata ke Postgres, middleware idempotency nyata, relay worker outbox nyata,
publisher event domain nyata, maupun handler endpoint notifikasi sungguhan -
karena itu status `ALT-DEF-017` adalah `SIAP_DIVERIFIKASI`, BUKAN `DITUTUP`.
Dokumentasi requirement header `Idempotency-Key` di `docs/api/API-CONTRACT.md`
bagian 17.1 juga menutup gap yang sebelumnya dicatat terpisah di
`ALT-DEF-022`.

## Pass correction-loop 2026-07-25 (lanjutan): perbaikan ALT-DEF-005 dan ALT-DEF-016

Batch ini mengganti `StatusPesanan` 7-status lama dengan state machine
14-status penuh, mengubah `PesananRiwayatStatus.statusSebelumnya/statusBaru`
dari `String` bebas menjadi enum, menambah model `PesananPerubahan`/
`PesananPenolakan`/`PesananPembatalan`, menambah kolom snapshot lengkap ke
`ItemPesanan`/`ItemPesananModifier`, dan menyelaraskan `StatusItemPesanan` ke
daftar penuh dari correction spec. Lihat ADR-017 di
`docs/engineering/DECISION-LOG.md` untuk rasional desain lengkap.

### 1. `prisma format` + `prisma validate`

```
$ npx prisma format --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
Formatted prisma/schema/schema.prisma in 68ms 🚀

$ DATABASE_URL="postgresql://user:pass@localhost:5432/db" npx prisma validate --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
The schema at prisma/schema/schema.prisma is valid 🚀
```

(Satu iterasi awal gagal validate dengan `Error code: P1012` karena
`Pesanan.status @default(BARU)` masih merujuk nilai enum lama yang sudah
dihapus - diperbaiki menjadi `@default(DRAF)` sebelum re-run di atas, bukti
bahwa validasi ini benar-benar dijalankan terhadap perubahan nyata, bukan
diasumsikan lulus.)

### 2. `prisma generate` tanpa koneksi database nyata

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/db" npx prisma generate --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma

✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 696ms
```

Diverifikasi lewat grep terhadap `node_modules/.prisma/client/index.d.ts` bahwa
tipe input untuk model baru/diperbarui benar-benar ter-generate:

```
$ grep -n "PesananPerubahanUncheckedCreateInput\|PesananPenolakanUncheckedCreateInput\|PesananPembatalanUncheckedCreateInput\|JenisPerubahanPesanan\b" node_modules/.prisma/client/index.d.ts | head -5
691:export const JenisPerubahanPesanan: {
701:export type JenisPerubahanPesanan = (typeof JenisPerubahanPesanan)[keyof typeof JenisPerubahanPesanan]
1015:export type JenisPerubahanPesanan = $Enums.JenisPerubahanPesanan
1017:export const JenisPerubahanPesanan: typeof $Enums.JenisPerubahanPesanan
66059:    data: XOR<PesananPerubahanCreateInput, PesananPerubahanUncheckedCreateInput>
```

### 3. Test struktur baru dijalankan nyata (`node --experimental-strip-types`)

```
$ node --experimental-strip-types packages/test-support/src/architecture/pesanan-state-machine-snapshot-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-005/ALT-DEF-016 lulus.
```

Assertion yang lulus mencakup: `StatusPesanan` memuat seluruh 14 nilai baru
dan TIDAK lagi memuat nilai lama (`BARU`/`DIPROSES_DAPUR`/`SIAP_DISAJIKAN`/
`DIBAYAR`); `StatusItemPesanan` diselaraskan ke 9 nilai penuh; enum
`JenisPerubahanPesanan` ada dengan 7 nilai starter; `PesananRiwayatStatus.
statusSebelumnya`/`statusBaru` bertipe enum `StatusPesanan` (bukan `String`);
`ItemPesanan` punya seluruh 10 kolom `*Snapshot`/`resepVersiId` (scalar polos,
TANPA relasi FK ke `VersiResep`); `ItemPesananModifier` punya 4 kolom snapshot
baru + `modifierOpsiId` tetap dipertahankan; `PesananPerubahan`/
`PesananPenolakan`/`PesananPembatalan` ada dengan bentuk yang sesuai
(`PesananPenolakan.pesananId` dan `PesananPembatalan.pesananId` sama-sama
`@unique`, lihat ADR-017 Keputusan 3 dan 4 untuk alasan berbeda di balik
keduanya); regresi `Pesanan.outlet` composite-FK (`ALT-DEF-010`) dan
`TiketDapur.pesananId @unique` (kardinalitas 1:1 dipertahankan, scope
`ALT-DEF-006`) tetap tegak.

### 4. `tsc --noEmit --strict` atas seluruh file test arsitektur (regresi)

```
$ npx tsc --noEmit --strict --module ESNext --moduleResolution Bundler --target ES2022 --skipLibCheck --types node packages/test-support/src/architecture/*.test.ts prisma/seed/izin.seed.ts
(tidak ada output - bersih, mencakup KESEPULUH file test arsitektur sekaligus:
keanggotaan-outlet-constraints.test.ts, tenant-outlet-composite-constraints.test.ts,
prisma-client-shape.test.ts, prisma-client-shape-tenant-outlet.test.ts,
sesi-auth-pin-constraints.test.ts, prisma-client-shape-auth-pin.test.ts,
idempotency-outbox-notification-constraints.test.ts,
prisma-client-shape-platform-infra.test.ts,
pesanan-state-machine-snapshot-constraints.test.ts (BARU),
prisma-client-shape-pesanan.test.ts (BARU) - tanpa regresi pada
seluruh file test arsitektur sebelumnya)
```

Seluruh 8 file test arsitektur yang sudah ada sebelum batch ini (dijalankan
satu per satu lewat `node --experimental-strip-types` untuk file berbasis
assertion teks) tetap lulus tanpa regresi:

```
$ for f in packages/test-support/src/architecture/*.test.ts; do node --experimental-strip-types "$f"; done
OK: seluruh assertion arsitektur ALT-DEF-017 lulus.
OK: seluruh assertion arsitektur ALT-DEF-001/ALT-DEF-002 lulus.
OK: seluruh assertion arsitektur ALT-DEF-005/ALT-DEF-016 lulus.
(file prisma-client-shape*.test.ts tidak mencetak apa pun - murni type-check
via `satisfies`, tidak ada assertion runtime; TIDAK melempar error apa pun
saat dieksekusi = lulus)
OK: seluruh assertion arsitektur ALT-DEF-003/ALT-DEF-013 lulus.
OK: seluruh assertion arsitektur ALT-DEF-010/ALT-DEF-014 lulus.
```

### 5. `prisma migrate dev` - DIBLOKIR (konsisten dengan pass sebelumnya)

Tidak dicoba ulang pada pass ini - keterbatasan lingkungan yang sama sudah
didokumentasikan lengkap di pass ALT-DEF-017 di atas (`P1010: User denied
access`, tidak ada Postgres nyata di environment ini, `ALT-DEF-029`).

### Kesimpulan status

Schema untuk ALT-DEF-005/ALT-DEF-016 sudah benar secara sintaks
(`format`+`validate`), tipe yang dihasilkan sudah benar secara bentuk
(`generate` + `tsc --noEmit --strict`), dan seluruh model/field yang diklaim
di ADR-017 sudah dibuktikan ada lewat test struktur nyata, tanpa regresi pada
KESELURUHAN 8 test arsitektur yang sudah ada sebelumnya (ALT-DEF-001/002/
003/010/013/014/017). **Belum ada** migrasi nyata ke Postgres, handler/
endpoint transisi status nyata, middleware guard kanal/kebijakan-prepaid
nyata, publisher event domain nyata, maupun model `PesananRetur`
(`ALT-PES-018`, scope batch berikutnya) - karena itu status `ALT-DEF-005` dan
`ALT-DEF-016` adalah `SIAP_DIVERIFIKASI`, BUKAN `DITUTUP`.

## Pass correction-loop 2026-07-25 (lanjutan): perbaikan ALT-DEF-006

Batch ini menghapus `TiketDapur.pesananId @unique` (yang memaksa kardinalitas
1:1 `Pesanan`<->`TiketDapur`), menggantinya dengan
`@@unique([pesananId, stasiunDapurId, nomorGelombang])`, memperluas
`StatusTiketDapur` dari 4 ke 8 nilai, dan menambah tiga model baru
(`AturanRoutingDapur`, `RiwayatStatusTiketDapur`, `GelombangDapur`). Lihat
ADR-018 di `docs/engineering/DECISION-LOG.md` untuk rasional desain lengkap.

### 1. `prisma format` + `prisma validate`

```
$ npx prisma format --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
Formatted prisma/schema/schema.prisma in 69ms 🚀

$ npx prisma validate --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
Error: Prisma schema validation - (get-config wasm)
Error code: P1012
error: Environment variable not found: DATABASE_URL.
  -->  prisma/schema/schema.prisma:22
   |
21 |   provider = "postgresql"
22 |   url      = env("DATABASE_URL")
   |

Validation Error Count: 1
[Context: getConfig]

Prisma CLI Version : 5.20.0

$ DATABASE_URL="postgresql://user:pass@localhost:5432/dummy" npx prisma validate --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
The schema at prisma/schema/schema.prisma is valid 🚀
```

Kegagalan pertama di atas sengaja dicatat apa adanya: itu **bukan** error
skema melainkan `DATABASE_URL` yang belum di-set di shell - dicantumkan agar
jelas bahwa perintah ini benar-benar dijalankan (bukan output yang
diasumsikan), dan agar pembaca berikutnya tahu bahwa `validate` di repo ini
memerlukan env var dummy sekalipun tidak ada database nyata.

### 2. `prisma generate`

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/dummy" npx prisma generate --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma

✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 672ms
```

### 3. `tsc --noEmit --strict`

```
$ cd packages/test-support && npx tsc --noEmit --strict; echo "TSC_EXIT=$?"
TSC_EXIT=0
```

Satu iterasi awal GAGAL dengan tiga error `TS2345: Argument of type
'string | undefined' is not assignable to parameter of type 'string'` pada
`dapur-kds-multi-stasiun.test.ts` (hasil `matchAll(...).map((m) => m[1])`
bertipe `string | undefined` di bawah `noUncheckedIndexedAccess`) - diperbaiki
dengan filter type-guard eksplisit (bukan non-null assertion) sebelum re-run
di atas. Dicatat sebagai bukti bahwa `--strict` benar-benar dijalankan
terhadap file baru, bukan diasumsikan lulus.

### 4. Test arsitektur: 10 file -> 12 file, 12/12 lulus, TANPA regresi

Runner: `node --experimental-strip-types` (Node v25.5.0) - vitest masih
DIBLOKIR di environment ini, sama seperti batch-batch sebelumnya
(`ALT-DEF-027`).

**Sebelum batch ini:** 10 file test arsitektur.
**Sesudah batch ini:** 12 file (2 file baru).

```
$ for f in packages/test-support/src/architecture/*.test.ts; do node --experimental-strip-types "$f"; done

PASS  dapur-kds-multi-stasiun.test.ts                       (BARU)
PASS  idempotency-outbox-notification-constraints.test.ts
PASS  keanggotaan-outlet-constraints.test.ts
PASS  pesanan-state-machine-snapshot-constraints.test.ts
PASS  prisma-client-shape-auth-pin.test.ts
PASS  prisma-client-shape-dapur.test.ts                     (BARU)
PASS  prisma-client-shape-pesanan.test.ts
PASS  prisma-client-shape-platform-infra.test.ts
PASS  prisma-client-shape-tenant-outlet.test.ts
PASS  prisma-client-shape.test.ts
PASS  sesi-auth-pin-constraints.test.ts
PASS  tenant-outlet-composite-constraints.test.ts
---
TOTAL=12  PASS=12  FAIL=0
```

### 5. Dua kegagalan regresi NYATA yang ditemukan dan ditangani

Batch ini mengubah kardinalitas `Pesanan`<->`TiketDapur`, jadi baseline
dijalankan lebih dulu terhadap 10 test lama. **Dua di antaranya GAGAL** - dan
keduanya punya sebab yang BERBEDA secara mendasar, jadi ditangani berbeda:

**(a) `pesanan-state-machine-snapshot-constraints.test.ts` - kegagalan yang
BENAR dan diharapkan.**

```
Error: ASSERTION GAGAL: TiketDapur.pesananId harus TETAP @unique pada batch ini -
mengubah kardinalitas 1:1 adalah scope ALT-DEF-006 (batch berikutnya), BUKAN
batch ALT-DEF-005/ALT-DEF-016 ini.
Tidak ditemukan: "pesananId         String           @unique"
```

Assertion ini adalah **scope-guard yang sengaja ditulis pada batch
sebelumnya** untuk memastikan perubahan kardinalitas tidak bocor lebih awal.
Batch ALT-DEF-006 inilah yang memang ditugaskan mengerjakannya, sehingga
guard tersebut sudah selesai tugasnya dan DIBALIK menjadi assertion arah-baru
(`assertNotContains` untuk `@unique` lama + `assertContains` untuk constraint
komposit + `Pesanan.tiketDapur TiketDapur[]`). Ini bukan "mematikan test yang
mengganggu" - assertion tetap ada, arahnya saja yang dibalik sesuai desain
baru yang sudah di-ADR-kan.

**(b) `tenant-outlet-composite-constraints.test.ts` - kegagalan PALSU
(false positive), dicatat sebagai defect baru `ALT-DEF-033`.**

```
Error: ASSERTION GAGAL: TiketDapur.outlet harus berupa composite FK (tenantId, outletId) -> Outlet(tenantId, id).
Tidak ditemukan: "outlet       Outlet            @relation(fields: [tenantId, outletId], references: [tenantId, id])"
```

Constraint ALT-DEF-010 yang diuji sebenarnya **utuh sepenuhnya**. Yang berubah
hanya JUMLAH SPASI: menambah field `nomorGelombang` dan relasi baru ke model
`TiketDapur` membuat `prisma format` menyelaraskan ulang lebar kolom seluruh
model, menggeser spasi pada baris-baris yang tidak disentuh sama sekali.
Verifikasi manual atas skema hasil format:

```
$ awk '/^model TiketDapur \{/,/^\}/' prisma/schema/schema.prisma | grep outlet
  outletId          String
  // ALT-DEF-010: composite-FK (tenantId, outletId) -> Outlet(tenantId, id).
  outlet        Outlet                    @relation(fields: [tenantId, outletId], references: [tenantId, id])
```

Pencocokan needle diperbaiki agar menormalisasi runs spasi/tab horizontal di
kedua sisi (newline TIDAK dinormalisasi, supaya needle yang memakai `\n`
sebagai penanda awal deklarasi field tetap bermakna). Normalisasi ini murni
lebih permisif - seluruh assertion yang sebelumnya lulus tetap lulus. Akar
masalah (assertion whitespace-exact di SELURUH file test arsitektur, bukan
hanya yang gagal kali ini) dicatat sebagai `ALT-DEF-033`.

### 6. Bukti bahwa test baru TIDAK vacuous (mutation testing)

Test yang selalu lulus tidak membuktikan apa-apa. Dua mutasi sengaja
disuntikkan ke skema/test lalu dikembalikan, untuk membuktikan assertion
benar-benar hidup:

**Mutasi 1 - kembalikan `@unique` lama ke `TiketDapur.pesananId`:**

```
$ perl -0pi -e 's/(model TiketDapur \{[\s\S]*?)pesananId         String\n/$1pesananId         String           \@unique\n/' prisma/schema/schema.prisma
$ node --experimental-strip-types packages/test-support/src/architecture/dapur-kds-multi-stasiun.test.ts

Error: ASSERTION GAGAL: TiketDapur.pesananId TIDAK boleh lagi punya @unique tunggal -
inilah constraint yang memaksa kardinalitas 1:1 dan menjadi inti defect ALT-DEF-006
(ADR-018 Keputusan 1).
```

(skema dikembalikan; test lulus lagi)

**Mutasi 2 - beri `TiketDapurBaris.statusMasak` nilai milik enum tiket
(`DITAHAN`), untuk membuktikan kedua enum sungguh terpisah (ADR-018
Keputusan 6):**

```
$ sed -i '' 's/  statusMasak: "DIMASAK",/  statusMasak: "DITAHAN",/' src/architecture/prisma-client-shape-dapur.test.ts
$ npx tsc --noEmit --strict

src/architecture/prisma-client-shape-dapur.test.ts(155,3): error TS2322:
Type '"DITAHAN"' is not assignable to type 'StatusMasakBaris'.
```

(file dikembalikan; `TSC_EXIT=0` lagi)

### 7. Migrasi Postgres nyata

Tidak dijalankan - sama seperti seluruh batch sebelumnya, tidak ada Postgres
di environment ini (`ALT-DEF-029`). Perlu dicatat bahwa perubahan batch ini
akan membutuhkan migrasi yang **tidak trivial** saat database nyata ada:
menghapus unique index pada `tiket_dapur.pesananId`, menambah kolom
`nomorGelombang` dengan backfill `1`, membuat unique index komposit baru, dan
memetakan ulang nilai enum lama (`MASUK_ANTRIAN` -> `BARU`, `DIPROSES` ->
`SEDANG_DISIAPKAN`, `DIAMBIL_PELAYAN` -> `DISAJIKAN`) - ditambah CHECK
constraint XOR untuk `AturanRoutingDapur` yang sengaja ditunda (ADR-018
Keputusan 4).

### Kesimpulan status

Schema untuk ALT-DEF-006 sudah benar secara sintaks (`format`+`validate`),
tipe yang dihasilkan sudah benar secara bentuk (`generate` +
`tsc --noEmit --strict`), seluruh model/field/enum yang diklaim di ADR-018
sudah dibuktikan ada lewat test struktur nyata yang terbukti non-vacuous, dan
tidak ada regresi pada KESELURUHAN 10 test arsitektur sebelumnya (dua
kegagalan yang muncul sudah dianalisis dan ditangani di bagian 5, bukan
didiamkan). **Belum ada** migrasi nyata ke Postgres, handler/endpoint
pembuatan tiket nyata yang membaca `AturanRoutingDapur`, middleware guard
transisi status `TiketDapur` nyata, maupun CHECK constraint SQL untuk
invariant XOR - karena itu status `ALT-DEF-006` adalah `SIAP_DIVERIFIKASI`,
BUKAN `DITUTUP`.

## Pass correction-loop 2026-07-25 (lanjutan): perbaikan ALT-DEF-004, ALT-DEF-014, ALT-DEF-015

Cakupan batch: scope metode bayar (`ALT-DEF-004`), restrukturisasi alokasi
pembayaran/split bill/pembayaran sebagian (`ALT-DEF-014`), dan konfigurasi QRIS
statis per outlet (`ALT-DEF-015`). ADR terkait: **ADR-019**, **ADR-020**,
**ADR-021** di `docs/engineering/DECISION-LOG.md`.

Commit: `dbd05c6` (fix(payment)), `fe31fae` (fix(qris)), `e37c898`
(test(architecture)), `<commit ledger>` (docs(engineering)).

### 1. `prisma format`

```
$ npx prisma format --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
Formatted prisma/schema/schema.prisma in 71ms 🚀
```

Dijalankan ulang setelah seluruh perubahan selesai dan **idempoten** -
`git status` setelahnya tidak menunjukkan perubahan pada `schema.prisma`.

### 2. `prisma validate` (DATABASE_URL dummy)

```
$ DATABASE_URL="postgresql://altora:altora@localhost:5432/altora_dummy" \
    npx prisma validate --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
The schema at prisma/schema/schema.prisma is valid 🚀
```

Catatan: `PembayaranMetodeBaris` memakai pola composite-FK **ganda** (satu
kolom `tenantId` dipakai dua kali, menuju `Pembayaran(tenantId, id)` DAN
`MetodeBayar(tenantId, id)`) - sama seperti `KeanggotaanOutlet` (ADR-011).
Pola ini BERHASIL divalidasi Prisma, bukan fallback ke scalar+guard.

### 3. `prisma generate`

```
$ DATABASE_URL="postgresql://altora:altora@localhost:5432/altora_dummy" \
    npx prisma generate --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma

✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 888ms
```

### 4. `tsc --noEmit --strict`

```
$ cd packages/test-support && npx tsc --noEmit -p tsconfig.json
$ echo $?
0
```

Bersih (tanpa output). `tsconfig.base.json` yang diwarisi mengaktifkan
`strict`, `noUncheckedIndexedAccess`, dan `exactOptionalPropertyTypes` -
jadi ini `--strict` sungguhan, bukan mode longgar.

### 5. Test arsitektur: 12 file -> 15 file, 15/15 lulus

Hitungan **sebelum** batch ini: **12** file di
`packages/test-support/src/architecture/`. **Sesudah**: **15** file.

```
dapur-kds-multi-stasiun.test.ts                                PASS
idempotency-outbox-notification-constraints.test.ts            PASS
keanggotaan-outlet-constraints.test.ts                         PASS
pembayaran-alokasi-metode-constraints.test.ts                  PASS   <- BARU
pesanan-state-machine-snapshot-constraints.test.ts             PASS
prisma-client-shape-auth-pin.test.ts                           PASS
prisma-client-shape-dapur.test.ts                              PASS
prisma-client-shape-pembayaran-qris.test.ts                    PASS   <- BARU
prisma-client-shape-pesanan.test.ts                            PASS
prisma-client-shape-platform-infra.test.ts                     PASS
prisma-client-shape-tenant-outlet.test.ts                      PASS
prisma-client-shape.test.ts                                    PASS
qris-konfigurasi-constraints.test.ts                           PASS   <- BARU
sesi-auth-pin-constraints.test.ts                              PASS
tenant-outlet-composite-constraints.test.ts                    PASS
---
PASS=15 FAIL=0 TOTAL=15
```

Dijalankan lewat `node --experimental-strip-types <file>` (runner vitest masih
DIBLOKIR, lihat `ALT-DEF-027`).

### 6. Satu kegagalan yang muncul - dianalisis, terbukti FALSE-POSITIVE FORMATTING

Setelah perubahan schema + `prisma format`, **satu** test lama gagal:

```
pesanan-state-machine-snapshot-constraints.test.ts             FAIL
Error: ASSERTION GAGAL: Pesanan harus punya relasi list ke PesananPerubahan.
Tidak ditemukan: "perubahan      PesananPerubahan[]"
```

**Analisis (BUKAN langsung menyesuaikan needle):** dibandingkan langsung dengan
isi `model Pesanan` setelah format:

```
  perubahan         PesananPerubahan[]     <- 9 spasi (setelah batch ini)
  perubahan      PesananPerubahan[]        <- 6 spasi (needle di test)
```

Field `alokasiPembayaran` yang BARU ditambahkan ke model `Pesanan` lebih
panjang daripada nama field mana pun sebelumnya, sehingga `prisma format`
melebarkan kolom perataan untuk SELURUH baris di blok relasi tersebut -
termasuk `perubahan PesananPerubahan[]` yang **tidak disentuh sama sekali**.
Relasi `Pesanan.perubahan` sendiri masih ada, masih bertipe list, dan tidak
berubah secara semantik.

**Ini persis kelas kegagalan yang dicatat `ALT-DEF-033`** (architecture test
whitespace-brittle), bukan regresi nyata. Penanganan: file tersebut diberi
helper `normalisasiSpasiHorizontal()` yang sudah dipakai
`dapur-kds-multi-stasiun.test.ts` sejak batch sebelumnya - **tidak ada satu pun
needle atau semantik assertion yang diubah/dilonggarkan**. Ketiga file test baru
pada batch ini memakai helper yang sama sejak awal, plus parsing nilai enum/nama
field (bukan substring atas teks blok mentah) agar penyebutan nama kolom di
dalam komentar dokumentasi tidak menghasilkan false positive.

Tidak ada kegagalan lain. Sebelas test lama sisanya lulus tanpa perubahan
apa pun.

### 7. Bukti bahwa test baru TIDAK vacuous (mutation testing)

Setiap mutasi di bawah dilakukan pada `schema.prisma`/filesystem, test
dijalankan, lalu perubahan DIPULIHKAN sepenuhnya (`git diff --stat` bersih
setelahnya).

| # | Mutasi | Hasil |
|---|---|---|
| 1 | Kembalikan `EWALLET` ke `enum KodeMetodeBayar` | **GAGAL** - `KodeMetodeBayar harus punya PERSIS 4 nilai ... Diharapkan: 4, aktual: 5` |
| 2 | Kembalikan kolom `pesananId` ke `model Pembayaran` | **GAGAL** (dua lapis) - assertion teks: `Pembayaran TIDAK boleh lagi punya kolom pesananId ... Field aktual: [id, tenantId, outletId, pesananId, ...]`; DAN `tsc`: `TS2578: Unused '@ts-expect-error' directive` + `TS1360: Property 'pesananId' is missing ...` |
| 3 | Ganti `@@unique([tenantId, outletId, fingerprint])` menjadi `@@unique([tenantId, outletId, status])` (constraint palsu) | **GAGAL** - assertion `assertNotContains` atas constraint palsu tsb menyala |
| 4 | Tambahkan kolom `payload String` (plaintext) ke `KonfigurasiQris` | **GAGAL** - `KonfigurasiQris TIDAK boleh punya kolom "payload" - payload QRIS mentah TIDAK PERNAH boleh ditulis ke kolom mana pun` |
| 5 | Hapus `prisma/migrations/manual/001_konfigurasi_qris_partial_unique.sql` | **GAGAL** - `file SQL partial unique index tidak ditemukan ... Tanpa file ini, aturan "satu KonfigurasiQris AKTIF per outlet" tidak punya penegak apa pun` |

Catatan proses: mutasi #2 pada percobaan PERTAMA tidak menghasilkan kegagalan -
tetapi setelah diperiksa, ternyata string replacement-nya sendiri yang tidak
cocok (perataan spasi hasil `prisma format`), sehingga schema **tidak
termutasi sama sekali**. Diulang dengan string yang benar dan test langsung
gagal seperti seharusnya. Dicatat di sini karena "mutasi tidak menghasilkan
kegagalan" wajib diselidiki, bukan dilaporkan sebagai bukti non-vacuous palsu.

### 8. Verifikasi purge metode bayar di luar scope (ALT-DEF-004)

```
$ grep -rn "KARTU_DEBIT\|KARTU_KREDIT\|EWALLET\|kartu kredit\|kartu debit\|dompet digital\|e-wallet\|CAMPURAN" \
    --include="*.md" --include="*.ts" --include="*.prisma" --include="*.sql" . | grep -v node_modules
```

Seluruh hasil yang tersisa adalah **pernyataan larangan/dokumentasi
penghapusan** (komentar schema, `09-pembayaran-kasir.md`, `16-qris.md`,
`API-CONTRACT.md` bagian 11.3, `MASTER-CHECKLIST.md` `ALT-QRS-010`,
`DEFECT-LEDGER.md`, `DECISION-LOG.md`, dan assertion negatif di file test).
**Tidak ada satu pun** nilai enum aktif, opsi yang ditawarkan, atau kolom yang
tersisa. Nilai `CAMPURAN` diverifikasi tidak pernah ada di schema sejak awal
dan tidak ditambahkan.

### 9. Katalog izin

`prisma/seed/izin.seed.ts`: **54 -> 69 kode**, nol duplikat (diverifikasi
`grep -o 'kode: "[^"]*"' | sort | uniq -d` -> kosong, dan oleh assertion di
kedua file test baru). Rincian: +8 `pembayaran.*`, +4 `kasir.*`, +3 `qris.*`,
dan `qris.kelola` -> `qris.konfigurasi.kelola` (ganti nama, bukan tambah -
lihat `ALT-DEF-034`).

### 10. Migrasi Postgres nyata - MASIH DIBLOKIR

`prisma migrate dev` tetap tidak dijalankan (tidak ada Postgres di environment
ini, `ALT-DEF-029`). **Konsekuensi yang HARUS disebut eksplisit untuk batch
ini:** partial unique index di
`prisma/migrations/manual/001_konfigurasi_qris_partial_unique.sql` **belum
pernah dieksekusi**, sehingga aturan "satu `KonfigurasiQris` AKTIF per outlet"
(`ALT-QRS-001`) saat ini HANYA dijaga guard level-aplikasi dan **tidak aman
terhadap race condition** dua request bersamaan. Jangan menganggap aturan itu
terjamin sebelum index-nya benar-benar ada di database.

### Kesimpulan status

Schema untuk ALT-DEF-004/ALT-DEF-014/ALT-DEF-015 sudah benar secara sintaks
(`format` + `validate`), tipe yang dihasilkan sudah benar secara bentuk
(`generate` + `tsc --noEmit --strict`), seluruh model/field/enum/constraint yang
diklaim di ADR-019/ADR-020/ADR-021 sudah dibuktikan ada lewat test struktur DAN
test tipe yang keduanya terbukti non-vacuous, dan tidak ada regresi nyata pada
12 test arsitektur sebelumnya (satu kegagalan yang muncul terbukti
false-positive formatting dan ditangani dengan memperbaiki matcher-nya, bukan
melonggarkan assertion).

**Belum ada:** migrasi Postgres nyata, eksekusi partial unique index,
implementasi enkripsi/dekripsi AES-GCM nyata, parser EMV/validator CRC16,
handler/service pembayaran nyata, penegakan runtime invariant jumlah, dan
integration test `pembayaran_invariant_*`. `PesananSplit` (split bill per item,
`ALT-PES-014`) juga tetap terbuka. Karena itu status ALT-DEF-004, ALT-DEF-014,
ALT-DEF-015, dan ALT-DEF-034 adalah `SIAP_DIVERIFIKASI`, BUKAN `DITUTUP`.

## Pass correction-loop 2026-07-25 (lanjutan): perbaikan ALT-DEF-007

Cakupan: `ALT-DEF-007` (versi resep, resep per varian, subresep/bahan setengah
jadi, yield & penyusutan, modifier-yang-mengubah-resep, konversi satuan, proses
produksi & batch) — lihat **ADR-022** di `docs/engineering/DECISION-LOG.md`.
Requirement terkait: `ALT-RSP-001` s.d. `ALT-RSP-013`.

### Commit

| Commit | Judul |
|---|---|
| `df5457a` | `fix(recipe): tambahkan versi resep dan produksi` (schema + ADR-022 + ERD + kontrak API + permission matrix + seed izin + traceability + 2 file SQL manual) |
| `80cfbba` | `test(architecture): tambah test versi resep dan produksi` (2 file test baru) |
| (lihat `git log`) | `docs(engineering): perbarui status ALT-DEF-007` (ledger + bukti ini) |

### Perubahan schema (ringkas)

**Model BARU (7):** `KonversiSatuan`, `VersiResep`, `KomponenResep`,
`KomponenResepModifier`, `ProsesProduksi`, `ProsesProduksiBaris`,
`BatchProduksi`.
**Enum BARU (5):** `JenisBahan`, `StatusVersiResep`, `AksiKomponenModifier`,
`StatusProsesProduksi`, `StatusBatchProduksi`.
**Model DIHAPUS (1):** `ResepBahan` (beserta tabel `resep_bahan`).
**Model diubah:** `Bahan` (+`jenis`), `Satuan` (+`@@unique([tenantId, id])`),
`Resep` (`itemMenuId @unique` dan `versi String` DIHAPUS; +`nama`,
+3 sasaran nullable, +`@@unique([tenantId, id])`), `ItemMenu`
(`resep Resep?` -> `resep Resep[]`), `VarianMenu`/`ModifierOpsi`/`Tenant`/
`Outlet`/`Pengguna` (back-relation), `ItemPesanan` (`resepVersiId` menjadi FK
sungguhan).

### Bukti command yang BENAR-BENAR dijalankan

```
$ npx prisma format --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
Formatted prisma/schema/schema.prisma in 73ms 🚀

$ DATABASE_URL="postgresql://u:p@localhost:5432/dummy" \
    npx prisma validate --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
The schema at prisma/schema/schema.prisma is valid 🚀

$ DATABASE_URL="postgresql://u:p@localhost:5432/dummy" \
    npx prisma generate --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 815ms

$ npx tsc --noEmit -p packages/test-support
(tanpa output)  TSC_EXIT=0
```

Seluruh composite-FK yang dicoba di batch ini **berhasil** — tidak ada fallback
ke scalar+guard yang diperlukan, termasuk composite-FK dengan komponen nullable
(`Resep.itemMenu` memakai `[tenantId, itemMenuId]` dengan `itemMenuId String?`;
`KomponenResepModifier.bahanPengganti` memakai `[tenantId, bahanPenggantiId]`
dengan `bahanPenggantiId String?`). Prisma 5.20 menerima keduanya sebagai
relasi opsional.

### Bukti test arsitektur (nyata, `node --experimental-strip-types`)

**Sebelum batch ini: 15 file test.** **Sesudah: 17 file** (2 file baru:
`resep-versi-produksi-constraints.test.ts`,
`prisma-client-shape-resep-produksi.test.ts`).

Hasil re-run SELURUH 17 file setelah perubahan schema + `prisma format`:

```
dapur-kds-multi-stasiun.test.ts                            PASS
idempotency-outbox-notification-constraints.test.ts        PASS
keanggotaan-outlet-constraints.test.ts                     PASS
pembayaran-alokasi-metode-constraints.test.ts              PASS
pesanan-state-machine-snapshot-constraints.test.ts         PASS
prisma-client-shape-auth-pin.test.ts                       PASS
prisma-client-shape-dapur.test.ts                          PASS
prisma-client-shape-pembayaran-qris.test.ts                PASS
prisma-client-shape-pesanan.test.ts                        PASS
prisma-client-shape-platform-infra.test.ts                 PASS
prisma-client-shape-resep-produksi.test.ts                 PASS
prisma-client-shape-tenant-outlet.test.ts                  PASS
prisma-client-shape.test.ts                                PASS
qris-konfigurasi-constraints.test.ts                       PASS
resep-versi-produksi-constraints.test.ts                   PASS
sesi-auth-pin-constraints.test.ts                          PASS
tenant-outlet-composite-constraints.test.ts                PASS
TOTAL: 17 file, PASS=17 FAIL=0
```

**Kegagalan yang muncul di run pertama dan bagaimana ia diklasifikasi.**
Tepat SATU dari 15 file lama gagal setelah perubahan schema:
`pesanan-state-machine-snapshot-constraints.test.ts`, pada assertion
`assertNotContains(itemPesananBody, "\n  resepVersi VersiResep", ...)`.

Ia **BUKAN false-positive formatting** (tidak ada satu pun false-positive
formatting pada pass ini — matcher whitespace-robust `normalisasiSpasiHorizontal()`
yang ditambahkan ALT-DEF-033 sudah dipakai di seluruh file yang menyentuh
schema, dan `prisma format` kali ini tidak memicu satu pun kegagalan palsu).
Ia juga **bukan regresi**. Ia adalah assertion yang **sengaja bersifat
sementara**: ADR-017 Keputusan 8 menyatakan eksplisit "pada batch ini" karena
model `VersiResep` belum ada, dan mencatat TODO di `schema.prisma` untuk
menyambungkan FK-nya begitu model itu dibuat. Batch ini membuat model tersebut,
sehingga assertion lama kini menegakkan keadaan yang justru SALAH. Ia **dibalik
arahnya** menjadi assertion positif yang LEBIH KUAT (relasi WAJIB ada dan wajib
menunjuk `VersiResep` lewat `resepVersiId`) — ini pemenuhan follow-up yang
memang dijanjikan, bukan pelonggaran assertion.

### Bukti non-vacuity (mutation test)

Disiplin dari batch sebelumnya diterapkan: setiap mutasi **diverifikasi
benar-benar mengubah file** (`diff` terhadap backup, jumlah baris berubah
dicetak) SEBELUM hasil "test gagal" dipercaya. Tidak ada mutasi no-op pada pass
ini. Schema dipulihkan dan diverifikasi `IDENTIK` terhadap backup setelah
seluruh mutasi selesai.

| # | Mutasi atas `schema.prisma` | Baris berubah | Hasil |
|---|---|---|---|
| M1 | `KomponenResep.versiResepId` -> `resepId` | 4 | GAGAL: "KomponenResep HARUS punya kolom `versiResepId`" |
| M2 | Model `ResepBahan` dikembalikan | 10 | GAGAL: "model `ResepBahan` MASIH ADA di schema.prisma" |
| M3 | `Resep.itemMenuId String?` -> `String @unique` | 2 | GAGAL: "Resep TIDAK boleh lagi punya `itemMenuId String @unique`" |
| M4 | `VersiResep` diberi `@@unique([resepId, status])` | 1 | GAGAL: "constraint itu tidak menegakkan 'satu versi AKTIF per resep' dan justru SALAH" |
| M5 | Relasi `ItemPesanan.resepVersi` dihapus | 2 | GAGAL: "ItemPesanan.resepVersi WAJIB berupa relasi FK sungguhan ke VersiResep" |
| M6 | `VersiResep.snapshotBiaya Int?` -> `Decimal?` | 2 | GAGAL: "snapshotBiaya harus Int (rupiah bulat, ADR-005)" |
| M7 | `ItemMenu.resep Resep[]` -> `Resep?` | 2 | GAGAL: "ItemMenu.resep harus berupa list `Resep[]`, BUKAN `Resep?`" |
| M8 | `@@unique([tenantId, id])` dihapus dari `Satuan` | 2 | GAGAL: "Satuan harus punya @@unique([tenantId, id])" |

**Mutasi atas lapis TIPE (bukan teks).** Relasi `ItemPesanan.resepVersi`
dihapus dari schema, `prisma generate` dijalankan ulang, lalu
`tsc --noEmit -p packages/test-support`:

```
prisma-client-shape-resep-produksi.test.ts(205,3): error TS2353: Object literal
  may only specify known properties, and 'itemPesanan' does not exist in type
  'VersiResepInclude<DefaultArgs>'.
prisma-client-shape-resep-produksi.test.ts(210,3): error TS2353: Object literal
  may only specify known properties, and 'resepVersi' does not exist in type
  'ItemPesananInclude<DefaultArgs>'.
```

Setelah schema dipulihkan dan client di-generate ulang: `TSC_EXIT=0`. Ini
membuktikan assertion tipe `satisfies Prisma.VersiResepInclude` /
`Prisma.ItemPesananInclude` bukan formalitas — ia benar-benar mendeteksi FK yang
tidak tersambung, yang persis merupakan keadaan sebelum batch ini.

### KETERBATASAN YANG WAJIB DIBACA SEBELUM MENGANGGAP DEFECT INI SELESAI

**Dua invariant utama domain ini TIDAK ditegakkan di level data saat ini.**
Kedua file SQL di bawah **belum pernah dieksekusi terhadap Postgres mana pun**
(tidak ada database di environment ini — `ALT-DEF-029`), sama seperti
`001_konfigurasi_qris_partial_unique.sql` yang sudah ada sejak batch QRIS dan
juga belum pernah dijalankan:

1. `prisma/migrations/manual/002_resep_target_xor_check.sql` — CHECK constraint
   "Resep menargetkan TEPAT SATU dari itemMenu/varianMenu/bahanHasil".
2. `prisma/migrations/manual/003_versi_resep_satu_aktif.sql` — partial unique
   index "satu `VersiResep` AKTIF per `Resep`".

Konsekuensi konkret yang tidak boleh diabaikan: dua request
`POST /api/v1/resep/{id}/aktifkan-versi` yang tiba bersamaan **dapat**
menghasilkan dua versi `AKTIF` sekaligus; dan sebuah baris `Resep` dengan nol
atau tiga sasaran terisi **dapat** tersimpan. `Idempotency-Key` pada endpoint
aktivasi melindungi dari retry klien yang sama, **bukan** dari dua aktor
berbeda yang bersamaan. Jangan menganggap kedua aturan ini terjamin sebelum
kedua file SQL benar-benar dijalankan.

### Kesimpulan status

Schema untuk `ALT-DEF-007` sudah benar secara sintaks (`format` + `validate`),
tipe yang dihasilkan sudah benar secara bentuk (`generate` +
`tsc --noEmit`), seluruh model/field/enum/constraint yang diklaim ADR-022 sudah
dibuktikan ada lewat test struktur DAN test tipe yang **keduanya terbukti
non-vacuous** (8 mutasi teks + 1 mutasi tipe), dan tidak ada regresi pada 15
test arsitektur sebelumnya (satu kegagalan yang muncul adalah assertion
eksplisit-sementara dari ADR-017 Keputusan 8 yang batch ini memang bertugas
membalikkannya — bukan regresi, bukan false-positive formatting).

**Belum ada:** migrasi Postgres nyata, eksekusi kedua file SQL manual,
perhitungan HPP nyata (`ALT-RSP-012` — kolom `snapshotBiaya` sudah ada, tetapi
perhitungannya butuh model harga bahan terbaru yang BELUM ADA di skema),
pemotongan & reversal stok dari resep (`ALT-RSP-011`/`ALT-RSP-013` — teritori
`ALT-DEF-008`, seam didokumentasikan ADR-022 Keputusan 8), konversi satuan
khusus-per-bahan, service/handler/endpoint resep & produksi nyata, dan
penegakan runtime invariant XOR/satu-versi-aktif. Karena itu status
`ALT-DEF-007` adalah `SIAP_DIVERIFIKASI`, **BUKAN** `DITUTUP`.

## Pass correction-loop 2026-07-25 (lanjutan): perbaikan ALT-DEF-008

Cakupan: `ALT-DEF-008` (model persediaan tidak lengkap) — ledger stok sebagai
sumber kebenaran tunggal, `LokasiStok`, `BatchStok` + seam ke `BatchProduksi`,
`ReservasiStok`, `PenyesuaianStok`, `TransferStok`(+baris), `CatatanWaste`/
`AlasanWaste`, `KebijakanPemesananUlang`, `PengaturanPersediaanOutlet`, dan
state machine opname penuh. Lihat ADR-023/ADR-024/ADR-025 di
`docs/engineering/DECISION-LOG.md`. Sekaligus menutup gap `ALT-DEF-032`
(endpoint transfer stok tidak pernah ada di kontrak API).

Commit: `37f4998` (schema+dokumen), `ef5ee1c` (test), dan commit dokumen
status yang memuat entri ini.

### 1. Toolchain Prisma (nyata, output disalin apa adanya)

```
$ npx prisma format --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
Formatted prisma/schema/schema.prisma in 85ms 🚀

$ DATABASE_URL="postgresql://u:p@localhost:5432/db" npx prisma validate --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
The schema at prisma/schema/schema.prisma is valid 🚀

$ DATABASE_URL="postgresql://u:p@localhost:5432/db" npx prisma generate --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 1.16s

$ npx tsc --noEmit -p packages/test-support
(tanpa output)  TSC_EXIT=0

$ git status --short          # setelah `prisma format` dijalankan ulang
(tanpa output — format idempoten, tidak ada drift tersisa)
```

`DATABASE_URL` di atas adalah **string dummy**; tidak ada Postgres yang
dihubungi. `validate`/`generate` memang tidak memerlukan koneksi — lihat
`ALT-DEF-029`.

**Seluruh composite-FK yang dicoba di batch ini berhasil**, termasuk dua pola
yang baru dipakai pertama kali di sini:

1. **Dua composite-FK outlet-level pada SATU model.** `TransferStok` memakai
   `(outletAsalId, gudangAsalId) -> Gudang(outletId, id)` DAN
   `(outletTujuanId, gudangTujuanId) -> Gudang(outletId, id)` sekaligus.
   Prisma 5.20 menerimanya setelah `Gudang` diberi `@@unique([outletId, id])`
   baru. Inilah yang menjamin di level database bahwa gudang asal benar-benar
   milik outlet asal — pada operasi yang justru menyeberangi outlet.
2. **Composite-FK 1:1 dengan komponen nullable.** `BatchStok.batchProduksi`
   memakai `[tenantId, batchProduksiId]` dengan `batchProduksiId String?`,
   didukung `@@unique([tenantId, batchProduksiId])`. Inilah seam yang
   dijanjikan ADR-022 Keputusan 8 poin 4.

Tidak ada fallback ke scalar+guard aplikasi yang diperlukan untuk composite-FK
mana pun di batch ini. Fallback yang ADA di batch ini seluruhnya untuk
invariant yang memang di luar jangkauan DSL Prisma — lihat bagian 4.

### 2. Bukti test arsitektur (nyata, `node --experimental-strip-types`, Node v25.5.0)

**Sebelum batch ini: 17 file test. Sesudah: 19 file** (2 file baru:
`persediaan-ledger-reservasi-constraints.test.ts`,
`prisma-client-shape-persediaan.test.ts`).

Suite 17 file lama dijalankan **sebelum** perubahan apa pun (baseline: 17/17
PASS) dan **sesudah** perubahan schema + `prisma format` (tetap 17/17 PASS).
Karena itu 17 -> 19 adalah penambahan murni.

```
$ for f in packages/test-support/src/architecture/*.test.ts; do node --experimental-strip-types "$f"; done

dapur-kds-multi-stasiun.test.ts                                PASS
idempotency-outbox-notification-constraints.test.ts            PASS
keanggotaan-outlet-constraints.test.ts                         PASS
pembayaran-alokasi-metode-constraints.test.ts                  PASS
persediaan-ledger-reservasi-constraints.test.ts                PASS
pesanan-state-machine-snapshot-constraints.test.ts             PASS
prisma-client-shape-auth-pin.test.ts                           PASS
prisma-client-shape-dapur.test.ts                              PASS
prisma-client-shape-pembayaran-qris.test.ts                    PASS
prisma-client-shape-persediaan.test.ts                         PASS
prisma-client-shape-pesanan.test.ts                            PASS
prisma-client-shape-platform-infra.test.ts                     PASS
prisma-client-shape-resep-produksi.test.ts                     PASS
prisma-client-shape-tenant-outlet.test.ts                      PASS
prisma-client-shape.test.ts                                    PASS
qris-konfigurasi-constraints.test.ts                           PASS
resep-versi-produksi-constraints.test.ts                       PASS
sesi-auth-pin-constraints.test.ts                              PASS
tenant-outlet-composite-constraints.test.ts                    PASS
TOTAL: 19 file, PASS=19 FAIL=0
```

**Tidak ada regresi DAN tidak ada false-positive formatting pada batch ini.**
Ini dinyatakan eksplisit karena batch sebelumnya (`ALT-DEF-033`) mengalami
kegagalan palsu akibat `prisma format` menyelaraskan ulang lebar kolom
antar-field. Sebab hal itu tidak terjadi di sini: seluruh assertion berbasis
teks — baik 17 file lama maupun file baru — memakai helper
`normalisasiSpasiHorizontal()`. Tidak ada satu pun needle assertion lama yang
perlu disesuaikan di batch ini.

### 3. Mutation testing (14 mutasi, setiap diff diverifikasi)

Setiap mutasi menjalani DUA pemeriksaan sebelum hasilnya dipercaya:
**(1) diff harus non-kosong** — batch sebelumnya pernah menemukan mutasi no-op
yang menghasilkan "gagal dengan benar" palsu — dan **(2) test harus gagal.**

```
=== BASELINE (harus LULUS) ===
✅ baseline lulus

=== MUTASI ===
✅ M1  ledger append-only: tambah updatedAt ke MutasiStok      diff 1 baris, test GAGAL dengan benar
✅ M2  enum lama dihidupkan kembali (KELUAR_PENJUALAN)         diff 1 baris, test GAGAL dengan benar
✅ M3  status opname lama dihidupkan (BERLANGSUNG)             diff 1 baris, test GAGAL dengan benar
✅ M4  kuantitasFisik dijadikan non-null lagi                  diff 2 baris, test GAGAL dengan benar
✅ M5  seam BatchProduksi diputus (@@unique dihapus)           diff 2 baris, test GAGAL dengan benar
✅ M6  BatchStok diberi kolom cache sisa                       diff 1 baris, test GAGAL dengan benar
✅ M7  ReservasiStok digantung pada Pesanan, bukan baris       diff 2 baris, test GAGAL dengan benar
✅ M8  CatatanWaste.alasanWasteId dijadikan nullable           diff 2 baris, test GAGAL dengan benar
✅ M9  stok negatif diizinkan secara default                   diff 2 baris, test GAGAL dengan benar
✅ M10 composite-FK transfer diturunkan ke tenant-level        diff 2 baris, test GAGAL dengan benar
✅ M11 indeks FEFO dihapus                                     diff 2 baris, test GAGAL dengan benar
✅ M12 kode izin koarse lama dihidupkan kembali                diff 1 baris, test GAGAL dengan benar
✅ M13 izin sistem spekulatif ditambahkan                      diff 1 baris, test GAGAL dengan benar
✅ M14 partial index NULL-semantics kehilangan klausa WHERE    diff 2 baris, test GAGAL dengan benar

=== VERIFIKASI PEMULIHAN (harus LULUS lagi) ===
✅ pulih, lulus
```

**M14 menemukan assertion VACUOUS yang nyata pada run pertama** — dicatat di
sini karena inilah nilai sesungguhnya mutation testing pada batch ini. Versi
awal test memeriksa `"ON stok_bahan"` dan `'WHERE "lokasiStokId" IS NULL'`
sebagai DUA needle terpisah. File SQL 004 memuat **dua** partial index yang
keduanya berklausa `WHERE "lokasiStokId" IS NULL` (satu untuk `stok_bahan`,
satu untuk `stok_opname_baris`), sehingga menghapus klausa `WHERE` dari index
PERTAMA tetap LOLOS — needle-nya dipenuhi index KEDUA. Output run pertama:

```
❌ M14 partial index NULL-semantics kehilangan klausa WHERE: diff 2 baris DITERAPKAN, tetapi test tetap LULUS -> ASSERTION VACUOUS
```

Perbaikan: setiap index kini diperiksa sebagai SATU pernyataan utuh
(`ON stok_bahan ("gudangId", "bahanId") WHERE "lokasiStokId" IS NULL;`),
bukan potongan-potongan yang bisa saling menutupi. Setelah perbaikan 14/14
mutasi tertangkap. Tanpa langkah verifikasi-diff + mutasi ini, test akan tampak
lulus sambil sesungguhnya **tidak menjaga sama sekali** satu-satunya penegak
level-data untuk keunikan baris saldo agregat.

Verifikasi tidak ada residu mutasi yang tertinggal di working tree:

```
$ git status --short
?? packages/test-support/src/architecture/persediaan-ledger-reservasi-constraints.test.ts
?? packages/test-support/src/architecture/prisma-client-shape-persediaan.test.ts
```

(hanya dua file test baru — tidak ada modifikasi tak terduga pada
schema/seed/SQL.)

### 4. KETERBATASAN YANG WAJIB DINYATAKAN — invariant yang TIDAK dijamin database

Ini bagian terpenting dari entri ini. Domain persediaan punya invariant
level-aplikasi jauh lebih banyak daripada domain mana pun sebelumnya, dan
**tidak satu pun dari daftar di bawah dijamin database pada saat ini.**

Dua file SQL manual **baru** ditambahkan dan, seperti tiga file sebelumnya,
**BELUM PERNAH DIEKSEKUSI terhadap Postgres mana pun** (`ALT-DEF-029`):

1. `prisma/migrations/manual/004_stok_bahan_agregat_gudang_unik.sql` — dua
   partial unique index yang menutup celah NULL-semantics pada `stok_bahan`
   dan `stok_opname_baris`.
2. `prisma/migrations/manual/005_mutasi_stok_append_only_dan_pembalik.sql` —
   trigger append-only (`BEFORE UPDATE OR DELETE`) dan trigger kesepadanan
   mutasi pembalik.

| # | Invariant | Penegak yang direncanakan | Status |
|---|---|---|---|
| 1 | `mutasi_stok` append-only | trigger, SQL manual `005` | BELUM DIJALANKAN |
| 2 | Pembalik berlawanan tanda & sepadan (tenant/gudang/bahan) | trigger, SQL manual `005` | BELUM DIJALANKAN |
| 3 | Satu baris `StokBahan` agregat per (gudang, bahan) | partial unique index, SQL manual `004` | BELUM DIJALANKAN |
| 4 | Satu baris opname agregat per (opname, bahan) | partial unique index, SQL manual `004` | BELUM DIJALANKAN |
| 5 | `StokBahan.kuantitas == SUM(MutasiStok.jumlah)` | job rekonsiliasi (kode, belum ditulis) | **TIDAK PERNAH DB-ENFORCED** |
| 6 | `SUM(ReservasiStok AKTIF) <= saldo fisik` | guard transaksi + `SELECT ... FOR UPDATE` | **TIDAK PERNAH DB-ENFORCED** |
| 7 | Stok tidak negatif (bila `izinkanStokNegatif = false`) | guard transaksi + `SELECT ... FOR UPDATE` | **TIDAK PERNAH DB-ENFORCED** |
| 8 | Setiap `BatchProduksi` bahan setengah jadi melahirkan satu `BatchStok` | guard transaksi produksi | **TIDAK PERNAH DB-ENFORCED** |
| 9 | `lokasiSumber`/`lokasiTujuan` wajib sesuai jenis mutasi | validasi service-layer | TIDAK DITEGAKKAN |
| 10 | `gudangAsal != gudangTujuan`; `diterima <= dikirim <= diminta` | validasi service-layer | UTANG CHECK constraint |
| 11 | `penghitungId != penyetujuId` pada opname | validasi service-layer | UTANG CHECK constraint |

**Baris 5–9 TIDAK akan menjadi DB-enforced meski SELURUH lima file SQL manual
dijalankan.** Ia invariant agregat (`SUM` lintas-baris) atau kondisional
per-nilai-enum, yang memang berada di luar jangkauan constraint deklaratif
Postgres maupun DSL Prisma. Dinyatakan eksplisit agar "jalankan migrasi" tidak
disalahartikan sebagai penutup seluruh daftar ini.

Konsekuensi konkret yang tidak boleh diabaikan:

- Satu `UPDATE` langsung lewat `psql` — atau satu bug service layer — **dapat**
  menulis ulang sejarah stok tanpa jejak apa pun. Append-only saat ini adalah
  disiplin level-aplikasi semata.
- Dua request pemakaian stok yang tiba bersamaan **dapat** membuat saldo
  menjadi negatif meski `izinkanStokNegatif = false`, karena guard-nya adalah
  baca-lalu-tulis tanpa penguncian yang terjamin di level data.
- Sebuah mutasi "pembalik" dengan tanda yang SAMA (bukan berlawanan) **dapat**
  tersimpan, dan ia akan MENGGANDAKAN pengurangan stok alih-alih
  membatalkannya.

Yang **DIJAMIN DB** pada integritas reversal hanyalah kardinalitasnya: satu
mutasi dibalik paling banyak sekali (kolom `dibalikOlehId` tunggal, tidak ada
tempat untuk pembalik kedua), dan satu pembalik membalik paling banyak satu
mutasi asal (`@unique`). **Besaran dan tandanya tidak dijamin sama sekali.**

### 5. Kesimpulan status

Schema untuk `ALT-DEF-008` sudah benar secara sintaks (`format` + `validate`),
tipe yang dihasilkan sudah benar secara bentuk (`generate` + `tsc --noEmit`),
seluruh model/field/enum/constraint yang diklaim ADR-023/024/025 sudah
dibuktikan ada lewat test struktur DAN test tipe yang **terbukti non-vacuous**
(14 mutasi, satu di antaranya menemukan assertion vacuous nyata yang kemudian
diperbaiki), dan **tidak ada regresi** pada 17 test arsitektur sebelumnya.

**Belum ada:** migrasi Postgres nyata, eksekusi kelima file SQL manual, job
rekonsiliasi cache-dari-ledger, algoritma alokasi FEFO/FIFO (skema sudah
membawa seluruh kolom yang dibutuhkan — diverifikasi kolom per kolom di
ADR-025 Keputusan 3 — tetapi algoritmanya adalah kode), service/handler/
endpoint persediaan nyata, dan penegakan runtime seluruh invariant di tabel
bagian 4. Karena itu status `ALT-DEF-008` adalah `SIAP_DIVERIFIKASI`,
**BUKAN** `DITUTUP`.

## Format entri rilis (dipakai mulai rilis pertama yang sesungguhnya)

```
## Rilis vX.Y.Z - {tanggal}

### Cakupan
- Requirement ID yang termasuk: ALT-XXX-###, ...

### Bukti test otomatis
- Unit test: {jumlah lulus}/{jumlah total}, command: `pnpm test`, log: {tautan/lampiran}
- Test e2e: {jumlah lulus}/{jumlah total}, command: `pnpm test:e2e`, log: {tautan/lampiran}

### Bukti test manual
- Skenario: {deskripsi}, dilakukan oleh: {nama/peran}, hasil: {LULUS/GAGAL}, screenshot: {tautan}

### Bukti build per platform
- Web: {status build, tautan deploy preview}
- Android/iOS (Capacitor): {status build, lihat PLATFORM-BUILD-MATRIX.md}
- Windows/macOS/Linux (Tauri): {status build, lihat PLATFORM-BUILD-MATRIX.md}

### Defect terbuka saat rilis
- Rujuk ke docs/engineering/DEFECT-LEDGER.md
```

## Aturan integritas bukti

1. Tidak boleh ada baris berstatus `LULUS` tanpa log/output nyata yang bisa
   ditelusuri (command yang dijalankan + hasil aktual, bukan ringkasan yang
   diasumsikan).
2. Jika suatu pemeriksaan tidak bisa dijalankan pada suatu sesi kerja (mis. tidak
   ada akses Xcode/Android SDK), itu dicatat sebagai **keterbatasan lingkungan**,
   bukan sebagai "LULUS" atau dilewati diam-diam - lihat
   `docs/engineering/PLATFORM-BUILD-MATRIX.md`.
3. Setiap defect yang ditemukan selama verifikasi rilis wajib masuk
   `docs/engineering/DEFECT-LEDGER.md` sebelum rilis dianggap selesai.
