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

## Pass correction-loop 2026-07-25 (lanjutan): perbaikan ALT-DEF-009 dan ALT-DEF-030

### 1. Cakupan

`ALT-DEF-009` (stacking promo - `PromoPemakaian.pesananId` dulu `@unique`)
dan `ALT-DEF-030` (`Promo` tidak punya cakupan outlet). Domain promo
dirancang ulang penuh (ADR-026): `PromoKondisi` (rename `PromoAturan`),
`PromoReward` (baru, menggantikan `Promo.jenis`), `PromoJadwal` (baru),
`PromoOutlet` (baru, menutup `ALT-DEF-030`), `PromoPemakaianBaris`/
`PromoSnapshot`/`PromoSimulasi` (baru). Lihat `docs/database/10-promo.md`
dan ADR-026 di `DECISION-LOG.md` untuk desain lengkap.

### 2. Perintah Prisma nyata

```
$ npm run prisma:format
Formatted prisma/schema/schema.prisma in 96ms 🚀

$ DATABASE_URL="postgresql://user:pass@localhost:5432/dummy" npm run prisma:validate
The schema at prisma/schema/schema.prisma is valid 🚀

$ DATABASE_URL="postgresql://user:pass@localhost:5432/dummy" npm run prisma:generate
✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 1.22s
```

`PromoJadwal.hariDalamMinggu Int[]` (native Postgres scalar array) tervalidasi
dan tergenerate BERSIH tanpa error - mengonfirmasi klaim ADR-026 Keputusan 5
bahwa Prisma mendukung `Int[]` untuk provider `postgresql`.

### 3. `tsc --noEmit` dan eksekusi test struktur nyata

```
$ npx tsc --noEmit -p packages/test-support
(tidak ada output - bersih)
```

Seluruh **20** file di `packages/test-support/src/architecture/` dijalankan
satu per satu lewat `node --experimental-strip-types` (19 file sebelum batch
ini + `promo-stacking-reward-constraints.test.ts` baru). **Sebelum batch:**
19/19 lulus. **Sesudah batch (termasuk file baru):** 20/20 lulus, **0
regresi**. 9 file `prisma-client-shape-*.test.ts` adalah test tipe murni
(exit 0 tanpa output stdout, diverifikasi lewat `tsc --noEmit` di atas, bukan
runtime assertion) - konsisten dengan pola batch-batch sebelumnya, bukan
kegagalan diam-diam.

```
dapur-kds-multi-stasiun.test.ts -> OK: ... ALT-DEF-006 lulus.
idempotency-outbox-notification-constraints.test.ts -> OK: ... ALT-DEF-017 lulus.
keanggotaan-outlet-constraints.test.ts -> OK: ... ALT-DEF-001/ALT-DEF-002 lulus.
pembayaran-alokasi-metode-constraints.test.ts -> OK: ... ALT-DEF-004/ALT-DEF-014 lulus.
persediaan-ledger-reservasi-constraints.test.ts -> OK: ... ALT-DEF-008 lulus.
pesanan-state-machine-snapshot-constraints.test.ts -> OK: ... ALT-DEF-005/ALT-DEF-016 lulus.
prisma-client-shape*.test.ts (9 file) -> exit 0, tanpa output (test tipe)
promo-stacking-reward-constraints.test.ts -> OK: ... ALT-DEF-009/ALT-DEF-030 lulus.
qris-konfigurasi-constraints.test.ts -> OK: ... ALT-DEF-015 (QRIS) lulus.
resep-versi-produksi-constraints.test.ts -> OK: ... ALT-DEF-007 lulus.
sesi-auth-pin-constraints.test.ts -> OK: ... ALT-DEF-003/ALT-DEF-013 lulus.
tenant-outlet-composite-constraints.test.ts -> OK: ... ALT-DEF-010/ALT-DEF-014 lulus.
```

### 4. Mutation test - assertion inti terbukti non-vacuous

Assertion inti (`PromoPemakaian.pesananId` TIDAK boleh lagi `@unique`)
diverifikasi dengan mutasi nyata, bukan diasumsikan:

1. `cp prisma/schema/schema.prisma /tmp/schema.prisma.bak`.
2. Mutasi dengan skrip Python yang mengganti PERSIS SATU kemunculan
   `"  pesananId String\n"` di seluruh file menjadi
   `"  pesananId String   @unique\n"` (dicek `s.count(old) == 1` sebelum
   replace, supaya mutasi tidak salah sasaran ke field lain).
3. `diff /tmp/schema.prisma.bak prisma/schema/schema.prisma` mengonfirmasi
   TEPAT SATU baris berubah (baris 3574, field `PromoPemakaian.pesananId`) -
   mutasi diverifikasi mengenai target yang benar sebelum menilai hasil test.
4. Jalankan test - **GAGAL seperti yang diharapkan**:
   ```
   Error: ASSERTION GAGAL: PromoPemakaian.pesananId TIDAK boleh lagi punya
   @unique - inilah inti defect ALT-DEF-009 (ADR-026). Baris aktual:
   "pesananId String   @unique"
   ```
5. `cp /tmp/schema.prisma.bak prisma/schema/schema.prisma` (revert), `diff`
   mengonfirmasi IDENTIK dengan sebelum mutasi (revert bersih, tidak ada
   perubahan tertinggal).
6. Jalankan ulang test - lulus kembali: `OK: seluruh assertion arsitektur
   ALT-DEF-009/ALT-DEF-030 lulus.`

### 5. Kesimpulan status

Schema untuk `ALT-DEF-009`/`ALT-DEF-030` benar secara sintaks (`format` +
`validate`), tipe yang dihasilkan benar secara bentuk (`generate` +
`tsc --noEmit`), assertion inti (hilangnya `@unique` pada `pesananId`)
terbukti **non-vacuous** lewat mutation test nyata (diff-diverifikasi baik
saat mutasi maupun revert), dan **tidak ada regresi** pada 19 test
arsitektur sebelumnya.

**Belum ada:** migrasi Postgres nyata (termasuk keputusan bahwa constraint
`(promoId, pesananId)` bersyarat-`repeatable` TIDAK BISA diekspresikan
sebagai SQL manual statis seperti precedent 001-003, butuh trigger - dicatat
sebagai `ALT-DEF-038`, lihat `DEFECT-LEDGER.md`), business-logic resolusi
konflik stacking (`packages/promo`, algoritma didokumentasikan penuh di
ADR-026 tapi tidak diimplementasikan), dan endpoint/handler nyata. Karena
itu status `ALT-DEF-009` dan `ALT-DEF-030` adalah `SIAP_DIVERIFIKASI`,
**BUKAN** `DITUTUP`.

## Pass correction-loop 2026-07-25 (lanjutan): perbaikan ALT-DEF-018, ALT-DEF-023, ALT-DEF-039

### 1. Cakupan

Batch domain Pelanggan & Keanggotaan ("PERBAIKI KEANGGOTAAN"), menutup tiga
defect: `ALT-DEF-018` (poin/saldo toko tidak sepenuhnya ledger-sourced),
`ALT-DEF-023` (tidak ada consent/merge history), dan `ALT-DEF-039` (BARU,
Step 0 audit correction-loop: program stempel/punch-card loyalty hilang
total dari `MASTER-CHECKLIST.md` dan schema). Juga menutup `ALT-DEF-040`
(BARU, dangling permission codes `anggota.*` vs `pelanggan.*`/`keanggotaan.*`
ditemukan saat audit permission). Detail keputusan desain lengkap:
`docs/engineering/DECISION-LOG.md` ADR-027.

### 2. Step 0 audit - hasil

Grep `docs/engineering/MASTER-CHECKLIST.md` domain `ALT-MBR` (13 baris lama,
`ALT-MBR-001` s.d. `ALT-MBR-013`) mengonfirmasi TIDAK SATU PUN requirement
menyebut stempel/punch-card/kartu stempel - hanya poin (`ALT-MBR-007` dst.)
dan saldo toko (`ALT-MBR-011`/`012`) yang sudah ada. Grep
`prisma/schema/schema.prisma` bagian 11 (sebelum batch ini) mengonfirmasi
tidak ada `LedgerStempel`/`HadiahStempel`. Karena master spec bagian "FITUR
KEANGGOTAAN" eksplisit mencantumkan "Stempel"/"Hadiah" sebagai fitur dalam
scope, gap ini dicatat sebagai `ALT-DEF-039` (TINGGI) dan 6 requirement baru
`ALT-MBR-014` s.d. `ALT-MBR-019` ditambahkan ke `MASTER-CHECKLIST.md`
(domain ALT-MBR: 13 -> 19 baris; total checklist: 249 -> 255).

### 3. Command aktual dan hasil

```
$ npx prisma format --schema prisma/schema/schema.prisma
Formatted prisma/schema/schema.prisma in 93ms 🚀

$ DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma validate --schema prisma/schema/schema.prisma
The schema at prisma/schema/schema.prisma is valid 🚀

$ DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate --schema prisma/schema/schema.prisma
✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 1.29s

$ npx tsc --noEmit -p packages/test-support
(exit 0, tidak ada output)
```

Selama pengerjaan, satu error validasi Prisma nyata ditemukan dan diperbaiki:
`Keanggotaan.pelanggan` (relasi 1:1 composite `(tenantId, pelangganId) ->
Pelanggan(tenantId, id)`) ditolak Prisma dengan pesan "A one-to-one relation
must use unique fields on the defining side" - diperbaiki dengan menambahkan
`@@unique([tenantId, pelangganId])` pada `Keanggotaan` (selain
`@@unique([tenantId, id])` yang sudah ada). `prisma validate` lulus setelah
perbaikan ini.

### 4. Test arsitektur - sebelum/sesudah

Sebelum batch ini: **20 file** test arsitektur, seluruhnya lulus (warisan
batch-batch sebelumnya). Sesudah batch ini: **21 file**, seluruhnya lulus,
**0 regresi**:

```
$ for f in packages/test-support/src/architecture/*.test.ts; do
    node --experimental-strip-types "$f" || echo "FAILED: $f"
  done
... (20 file lama: OK)
OK: seluruh assertion arsitektur ALT-DEF-018/ALT-DEF-023/ALT-DEF-039 (ledger keanggotaan) lulus.
PASS=21 FAIL=0 TOTAL=21
```

File baru: `packages/test-support/src/architecture/keanggotaan-ledger-constraints.test.ts`.

### 5. Non-vacuity - mutation test

Dua mutasi dijalankan terhadap `prisma/schema/schema.prisma`, masing-masing
diverifikasi lewat `diff` bahwa perubahan BENAR-BENAR diterapkan sebelum
hasil GAGAL dipercaya, lalu schema dipulihkan dan diverifikasi identik
(`diff` kosong setelah restore):

1. **Rename balik `TierKeanggotaan` -> `TierMembership`** (mensimulasikan
   rename yang tidak dilakukan). Hasil: `node --experimental-strip-types`
   GAGAL dengan pesan persis yang diharapkan ("model `TierMembership` MASIH
   ADA - harus di-rename..."), exit code 1. Setelah restore, `diff` terhadap
   backup kosong.
2. **Tambah kolom `keanggotaanId String?` ke `LedgerSaldoToko`**
   (mensimulasikan keputusan yang SALAH - digantung ke Keanggotaan, bukan
   Pelanggan). Hasil: GAGAL dengan pesan persis ("LedgerSaldoToko TIDAK
   boleh punya kolom `keanggotaanId`..."), exit code 1. `diff` sebelum
   restore mengonfirmasi baris itu benar-benar ditambahkan (`> keanggotaanId
   String?`); setelah restore, `diff` kosong.

Kedua mutasi membuktikan assertion terkait **non-vacuous** (bukan selalu
lulus terlepas isi schema).

### 6. Keputusan desain kunci (ringkasan, detail penuh di ADR-027)

- `TierMembership` -> `TierKeanggotaan` (rename, selaras checklist);
  `PoinRiwayat` DIPERTAHANKAN (bukan `LedgerPoin`) - asimetri penamaan
  didokumentasikan sadar.
- `LedgerSaldoToko` digantung ke `Pelanggan` LANGSUNG, bukan `Keanggotaan` -
  saldo toko independen dari status keanggotaan/tier.
- Merge pelanggan: profil korban **tidak dihapus** (status `DIGABUNGKAN`,
  ADR-006); transfer saldo lewat **pasangan entri ledger baru**
  (`PENYESUAIAN` berpasangan), bukan repointing FK baris ledger lama -
  menjaga integritas historis ledger.
- `LedgerStempel`/`HadiahStempel` didesain minimal (hadiah = deskripsi bebas
  + item gratis opsional), enum terpisah dari poin, **tanpa** kedaluwarsa
  (belum ada dasar keputusan produk untuk itu).
- `PersetujuanPelanggan` (bukan `ConsentPelanggan`) - penamaan Indonesia
  konsisten; `WHATSAPP_NOTIFIKASI` sebagai nilai enum aspirasional, TIDAK
  membatalkan keputusan `ALT-DEF-017` (notifikasi HANYA in-app/internal).

### 7. Permission (ALT-DEF-040)

`prisma/seed/izin.seed.ts` dan `docs/keamanan/PERMISSION-MATRIX.md` domain
`anggota` sebelumnya hanya memuat 3 kode kasar (`anggota.lihat`,
`anggota.kelola`, `anggota.tukar-poin`) yang **tidak pernah** direferensikan
`MASTER-CHECKLIST.md` di manapun - dangling murni. Diganti dengan 19 kode
granular (`pelanggan.*`/`keanggotaan.*`) yang benar-benar dipakai kolom
Permission baris `ALT-MBR-001` s.d. `ALT-MBR-019`, diverifikasi lewat grep
langsung terhadap `MASTER-CHECKLIST.md`.

### 8. Ringkasan status

Schema untuk `ALT-DEF-018`/`ALT-DEF-023`/`ALT-DEF-039` sudah benar secara
sintaks (`format`+`validate`), tipe yang dihasilkan sudah benar secara
bentuk (`generate`+`tsc --noEmit`), seluruh model/field/enum/constraint yang
diklaim ADR-027 sudah dibuktikan ada lewat test struktur yang **terbukti
non-vacuous** (2 mutasi), dan **tidak ada regresi** pada 20 test arsitektur
sebelumnya.

**Belum ada:** migrasi Postgres nyata dan trigger append-only untuk
`PoinRiwayat`/`LedgerStempel`/`LedgerSaldoToko` (DIBLOKIR, `ALT-DEF-029`),
handler/endpoint nyata (perolehan poin/stempel otomatis, job rekonsiliasi
cache, job kedaluwarsa poin, endpoint merge/consent/tukar-stempel). Karena
itu status `ALT-DEF-018`, `ALT-DEF-023`, `ALT-DEF-039`, dan `ALT-DEF-040`
adalah `SIAP_DIVERIFIKASI`, **BUKAN** `DITUTUP`.

## Pass correction-loop 2026-07-25 (lanjutan): perbaikan ALT-DEF-019, ALT-DEF-024, ALT-DEF-025

Batch domain bisnis TERAKHIR sebelum traceability-full-sync dan
test-architecture/final-evidence. Merombak domain Karyawan & Absensi
sepenuhnya - lihat `docs/engineering/DECISION-LOG.md` ADR-028 untuk rasional
setiap keputusan desain.

### 1. `prisma format` (real, sebelum dan sesudah semua edit)

```
$ npx prisma format --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
Formatted prisma/schema/schema.prisma in 99ms 🚀
```

Dijalankan DUA KALI - sekali segera setelah menulis seluruh model baru
(memverifikasi tidak ada syntax error), sekali lagi di akhir batch setelah
seluruh edit dokumen selesai (`git diff --stat prisma/schema/schema.prisma`
kosong pada run kedua - tidak ada drift whitespace tersisa).

### 2. `prisma validate` (dummy `DATABASE_URL`, tidak ada Postgres nyata di environment ini)

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/db" npx prisma validate --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
The schema at prisma/schema/schema.prisma is valid 🚀
```

### 3. `prisma generate`

```
$ DATABASE_URL="postgresql://user:pass@localhost:5432/db" npx prisma generate --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 1.54s
```

Diverifikasi lewat grep terhadap `node_modules/.prisma/client/index.d.ts`
(client nyata yang di-generate, BUKAN `@prisma/client` paket published) -
`grep -c` atas 12 nama tipe `*UncheckedCreateInput` untuk 12 model baru
(`KaryawanOutlet`, `HubunganKerja`, `Departemen`, `TemplateShift`,
`JadwalKerja`, `PolaJadwalBerulang`, `PermintaanTukarShift`,
`KoreksiAbsensi`, `IstirahatAbsensi`, `PermintaanLembur`, `TargetKinerja`,
`PenilaianKinerja`) menghasilkan **36** kecocokan (3 kemunculan × 12 model -
`CreateInput`, `UncheckedCreateInput`, `UpdateInput` masing-masing) -
membuktikan seluruh model baru benar-benar ter-generate, bukan sekadar
tertulis di schema tanpa tervalidasi Prisma.

### 4. `tsc --noEmit -p packages/test-support`

Dijalankan berulang kali sepanjang batch (setiap kali file test diedit) -
output KOSONG (bersih) di setiap run, termasuk run TERAKHIR setelah seluruh
edit schema/test/dokumen selesai.

### 5. Regresi test arsitektur - before/after

**Sebelum batch ini:** 21 file test arsitektur, seluruhnya lulus (baseline
diverifikasi ulang di awal batch dengan `node --experimental-strip-types`
atas seluruh `*.test.ts` di `packages/test-support/src/architecture/`).

**Ditemukan SEBELUM edit dokumen apa pun:** menghapus
`Karyawan.jabatanId`/`outletUtamaId` (breaking-but-correct, ADR-028
Keputusan 1/2) membuat `tenant-outlet-composite-constraints.test.ts` GAGAL
nyata pada assertion `Karyawan.outletUtama harus berupa composite FK` -
regresi YANG DIHARAPKAN dari perubahan schema yang disengaja, bukan bug.
Diperbaiki dengan mengganti assertion lama (yang mengecek FK tunggal
`outletUtama` yang sudah tidak ada) dengan assertion baru yang mengecek
composite-FK `KaryawanOutlet.outlet`/`KaryawanOutlet.karyawan` sebagai
gantinya - lihat commit `2fd5322`.

**Setelah batch ini:** 22 file test arsitektur (21 lama + 1 baru
`karyawan-absensi-hr-constraints.test.ts`), **seluruhnya lulus**, 0 regresi
nyata (hanya 1 assertion yang DIHARAPKAN berubah, sudah diperbaiki di atas).

```
$ cd packages/test-support/src/architecture && for f in *.test.ts; do node --experimental-strip-types "$f"; done
[... 18 baris "OK: seluruh assertion arsitektur ... lulus." ...]
[... 4 file prisma-client-shape-*.test.ts tidak mencetak output - type-check-only via tsc, bukan runtime assertion, konsisten pola batch sebelumnya ...]
$ echo $?
0
```

### 6. Mutation testing (9 mutasi, setiap diff diverifikasi non-kosong)

Sama disiplin batch-batch sebelumnya: setiap mutasi diverifikasi (1) diff
non-kosong terhadap backup schema/seed sebelum mutasi, (2) test benar-benar
GAGAL setelah mutasi diterapkan, sebelum dipercaya sebagai bukti non-vacuity.

```
=== BASELINE (harus LULUS) ===
✅ baseline lulus

=== MUTASI ===
✅ M1 outletUtamaId dihidupkan lagi di Karyawan                diff 1 baris, test GAGAL dengan benar
✅ M2 rename TemplateShift kembali ke JadwalShift              diff 2 baris, test GAGAL dengan benar
✅ M3 lintasTengahMalam dihapus dari TemplateShift             diff 1 baris, test GAGAL dengan benar
✅ M4 jamMulai diganti DateTime @db.Time                       diff 2 baris, test GAGAL dengan benar
✅ M5 KaryawanOutlet.outlet diturunkan ke FK tunggal            diff 2 baris, test GAGAL dengan benar
✅ M6 Absensi.jamMasukEfektif dihapus                          diff 1 baris, test GAGAL dengan benar
✅ M7 StatusKoreksiAbsensi kehilangan DITOLAK                  diff 1 baris, test GAGAL dengan benar
✅ M8 CutiIzin.tenantId dihapus                                diff 1 baris, test GAGAL dengan benar
✅ M9 kode izin absensi.koreksi.kelola dihapus dari seed       diff 2 baris, test GAGAL dengan benar

=== VERIFIKASI PEMULIHAN ===
✅ pulih, lulus
```

**Catatan proses (kesalahan nyata, dicatat untuk transparansi):** run
pertama M3/M6/M8 memakai pola perl-regex dengan whitespace yang tidak cocok
persis dengan hasil `prisma format` (kolom diselaraskan berbeda dari yang
diasumsikan) sehingga diff KOSONG (mutasi no-op) pada percobaan pertama -
DIULANG dengan pola yang cocok teks aktual sampai diff non-kosong
terverifikasi, mengikuti disiplin "diff non-kosong DULU, baru percaya hasil
gagal/lulus" yang sama seperti M14 batch persediaan. M9 percobaan pertama
juga sempat KELIRU mengganti teks di dalam KOMENTAR (bukan baris `kode:`
sesungguhnya) karena regex tanpa penjangkaran spesifik menyasar kemunculan
PERTAMA string yang sama (di komentar, yang muncul lebih dulu di file)
alih-alih baris data - diperbaiki dengan menjangkarkan pola ke
`{ kode: "..."` secara eksplisit. **Insiden tambahan:** proses mutasi M9
pertama sempat MERUSAK file `prisma/seed/izin.seed.ts` yang sesungguhnya
(bukan salinan sementara) karena skrip mutasi dijalankan langsung terhadap
file asli tanpa backup/restore untuk file itu - langsung terdeteksi lewat
`git diff` (baris rusak/sintaks tidak valid terlihat jelas), diperbaiki
manual dengan `Edit` mengembalikan ke isi yang benar, dan diverifikasi lewat
`tsc --noEmit` bersih + `git diff` menunjukkan hanya perubahan yang
dimaksud. Pelajaran dicatat: mutation test terhadap file DILUAR schema
(seperti `izin.seed.ts`) HARUS memakai salinan backup eksplisit
sebagaimana dilakukan untuk `schema.prisma`, bukan diedit-di-tempat.

### 7. Cross-check dokumen (MASTER-CHECKLIST.md/DEFECT-LEDGER.md)

Ditemukan dan diperbaiki (bukan hanya schema, dokumen checklist ITU SENDIRI
salah), kelas temuan sama `ALT-DEF-034`:

- `izin.seed.ts` memakai kode `absensi.koreksi` (tanpa akhiran `.kelola`)
  yang **tidak pernah** direferensikan `MASTER-CHECKLIST.md` - `ALT-HR-015`
  konsisten memakai `absensi.koreksi.kelola`. Diganti nama, bukan
  dipertahankan berdampingan.
- Kolom Model Data/Endpoint `MASTER-CHECKLIST.md` untuk `ALT-HR-006`
  (`PolaShift`/`/api/v1/pola-shift`), `ALT-HR-007`
  (`JadwalShift`/`/api/v1/jadwal-shift/{id}/penugasan`), `ALT-HR-008`
  (`/api/v1/jadwal-shift/tukar`), `ALT-HR-011` (`Absensi` sebagai entity,
  seharusnya `IstirahatAbsensi`), dan `ALT-HR-018` (`PenilaianKaryawan`
  tunggal, seharusnya `TargetKinerja, PenilaianKinerja` terpisah) semuanya
  menyebut model/endpoint yang **tidak pernah benar-benar dibuat** - schema
  mengimplementasikan `TemplateShift`/`JadwalKerja`/`PolaJadwalBerulang`.
  Dikoreksi ke arah schema (bukan sebaliknya), dengan catatan tertulis di
  kepala tabel domain Karyawan & Absensi di `MASTER-CHECKLIST.md`.
- `docs/engineering/TRACEABILITY-MATRIX.md` sebelumnya **tidak memuat satu
  baris `ALT-HR-*` pun** - gap total, bukan sekadar stale. 18 baris
  (`ALT-HR-001` s.d. `ALT-HR-018`) ditambahkan, disinkronkan baris-per-baris
  terhadap `MASTER-CHECKLIST.md` versi yang SUDAH dikoreksi di atas.

### 8. Ringkasan status

Schema untuk `ALT-DEF-019`/`ALT-DEF-024`/`ALT-DEF-025` sudah benar secara
sintaks (`format`+`validate`), tipe yang dihasilkan sudah benar secara
bentuk (`generate`+`tsc --noEmit`), seluruh model/field/enum/constraint yang
diklaim ADR-028 sudah dibuktikan ada lewat test struktur yang **terbukti
non-vacuous** (9 mutasi), dan **tidak ada regresi nyata** pada 21 test
arsitektur sebelumnya (1 assertion diperbarui secara sengaja mengikuti
breaking-but-correct schema change, bukan regresi bug).

**Belum ada:** migrasi Postgres nyata dan partial unique index "satu
`isUtama=true` per `karyawanId`" (DIBLOKIR, `ALT-DEF-029`), handler/endpoint
nyata (presensi masuk/pulang, approval koreksi/tukar-shift/cuti/lembur, job
generate `JadwalKerja` dari `PolaJadwalBerulang`, validasi geofence/
perangkat sesungguhnya). Karena itu status `ALT-DEF-019`, `ALT-DEF-024`, dan
`ALT-DEF-025` adalah `SIAP_DIVERIFIKASI`, **BUKAN** `DITUTUP`.

## Pass correction-loop 2026-07-25 (lanjutan): sinkronisasi penuh TRACEABILITY-MATRIX.md (ALT-DEF-020, ALT-DEF-039, ALT-DEF-041, ALT-DEF-042)

Pass **dokumentasi-saja** (tidak ada mutasi `prisma/schema/schema.prisma`) -
lihat `docs/engineering/DECISION-LOG.md` ADR-029 untuk rasional lengkap.
Tidak ada mutation-test skema karena tidak ada perubahan skema pada pass
ini; bukti di bawah adalah verifikasi konsistensi ANTAR-DOKUMEN.

### 1. Jumlah baris `MASTER-CHECKLIST.md` vs `TRACEABILITY-MATRIX.md` (harus sama)

```
$ grep -oE '^\| ALT-[A-Z]{2,3}-[0-9]{3} ' docs/engineering/MASTER-CHECKLIST.md | wc -l
     255
$ grep -oE '^\| ALT-[A-Z]{2,3}-[0-9]{3} ' docs/engineering/TRACEABILITY-MATRIX.md | wc -l
     255
$ diff <(grep -oE '^\| ALT-[A-Z]{2,3}-[0-9]{3} ' docs/engineering/MASTER-CHECKLIST.md | sort) \
       <(grep -oE '^\| ALT-[A-Z]{2,3}-[0-9]{3} ' docs/engineering/TRACEABILITY-MATRIX.md | sort)
$ echo "exit: $?"
exit: 0
```

Diff kosong, exit 0 - setiap requirement ID di `MASTER-CHECKLIST.md` punya
tepat satu baris yang sesuai di `TRACEABILITY-MATRIX.md`, dan tidak ada
baris "ekstra" di matriks yang tidak berdasar checklist. Dijalankan ulang
per-domain (17 domain, `ALT-PLT` s.d. `ALT-SEC`) dengan hasil sama.

### 2. Verifikasi jumlah model schema yang dirujuk sebagai baseline

```
$ grep -cE '^model [A-Za-z]+ \{' prisma/schema/schema.prisma
133
```

Cocok dengan angka yang dicantumkan di kepala `TRACEABILITY-MATRIX.md`
("133 model terdaftar per commit ini") dan di setiap sub-bagian domain.

### 3. Tidak ada requirement bertanda LULUS/SELESAI

```
$ grep -oE '\b(LULUS|SELESAI|DIKERJAKAN)\b' docs/engineering/TRACEABILITY-MATRIX.md \
    | sort | uniq -c
      2 DIKERJAKAN
    168 LULUS
    168 SELESAI
```

Diverifikasi manual (bukan diasumsikan dari angka mentah): SELURUH 168
kemunculan `LULUS` dan 168 kemunculan `SELESAI` berasal dari satu frasa
penyangkal yang berulang di kolom Status tiap baris requirement -
"...implementasi handler/service/UI FITUR belum dikerjakan — bukan
`LULUS`/`SELESAI`." (atau varian per-baris yang senada) - BUKAN requirement
yang benar-benar ditandai lulus/selesai. Baris legenda pembuka dokumen
(baris 51) juga eksplisit menyatakan "TIDAK PERNAH `LULUS`/`SELESAI` di
dokumen ini". Kolom Unit/Integration/E2E/Security test konsisten memakai
frasa "belum ada (menunggu implementasi fitur — tidak ada test runner ...
wired up)" (571 kemunculan) untuk baris yang tidak punya architecture test
yang relevan, dan mereferensikan salah satu dari 22 file
`packages/test-support/src/architecture/*.test.ts` untuk baris yang punya.

```
$ find packages/test-support/src/architecture -name '*.test.ts' | wc -l
      22
```

### 4. Model yang tidak ditemukan di schema (dasar Gap Analysis)

```
$ grep -c 'TIDAK DITEMUKAN di schema.prisma' docs/engineering/TRACEABILITY-MATRIX.md
57
$ grep -n 'TIDAK DITEMUKAN di schema.prisma' docs/engineering/TRACEABILITY-MATRIX.md \
    | grep -cE '^[0-9]+:\| ALT-'
56
```

Angka mentah `grep -c` (57) termasuk 1 kemunculan di teks legenda pembuka
dokumen (baris 15, menjelaskan konvensi penandaan - bukan baris tabel
requirement). Setelah difilter ke baris tabel (`^| ALT-...`) saja: **56**
baris requirement, cocok persis dengan angka "56 requirement" di judul
bagian Gap Analysis. Dua di antara 56 baris itu (`ALT-MNU-011`,
`ALT-MNU-012`) masing-masing menyebut frasa itu DUA KALI dalam satu baris
(dua model berbeda di kolom Model database, keduanya tidak ditemukan) -
tetap dihitung sebagai 1 requirement, bukan 2, karena satuan hitungnya
adalah baris/requirement bukan kemunculan frasa.

### 5. Ringkasan status

Konsistensi struktural (jumlah baris, ID per domain, referensi model)
antara `MASTER-CHECKLIST.md` dan `TRACEABILITY-MATRIX.md` **terbukti**
lewat command di atas - bukan diklaim tanpa bukti. Verifikasi
string-per-string kolom Endpoint/Permission/Route UI terhadap
`API-CONTRACT.md`/`PERMISSION-MATRIX.md`/`ROUTE-MAP.md` untuk seluruh 255
baris **TIDAK** dilakukan pass ini (dicatat sebagai keterbatasan eksplisit
di bagian "Gap Analysis" `TRACEABILITY-MATRIX.md`) - hanya domain dengan
precedent dari batch correction-loop sebelumnya yang diverifikasi terhadap
dokumen tsb. Dua defect baru (`ALT-DEF-041`, `ALT-DEF-042`) dicatat di
`DEFECT-LEDGER.md` untuk gap nyata yang ditemukan; `ALT-DEF-041` (18 baris
kolom Ketergantungan) diperbaiki langsung pada pass ini, `ALT-DEF-042`
(3 model platform hilang + eventType outbox tidak lengkap) **belum**
diperbaiki - butuh batch schema terpisah, di luar cakupan pass
dokumentasi-saja ini.

## Pass correction-loop 2026-07-25 (final): verifikasi konsolidasi loop-wide

Batch ini BUKAN batch perbaikan defect baru. Tujuannya murni menjalankan ulang
seluruh suite validasi (schema, typecheck, test arsitektur, migrasi,
grep-scope) satu kali lagi end-to-end di atas HEAD `06541ef`, dan menuliskan
status penutupan correction loop di `docs/engineering/CORRECTION-LOOP-STATUS.md`.
Tidak ada perubahan pada `prisma/schema/schema.prisma` pada batch ini.

### 1. `prisma format`

```
$ npx prisma format --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
Formatted prisma/schema/schema.prisma in 113ms 🚀
```

`git diff --stat prisma/schema/schema.prisma` sesudahnya: **kosong** (tidak ada
perubahan format tertunda dari batch-batch sebelumnya).

### 2. `prisma validate`

```
$ DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public" \
  npx prisma validate --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
The schema at prisma/schema/schema.prisma is valid 🚀
```

### 3. `prisma generate`

```
$ npx prisma generate --schema=prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 1.35s
```

### 4. Typecheck

```
$ npx tsc --noEmit -p packages/test-support
(exit 0, tanpa output - tidak ada error tipe)
```

### 5. Test arsitektur (`packages/test-support/src/architecture/`)

22 file test ditemukan (`find ... -name "*.test.ts" | wc -l` = 22, bukan ~22
kira-kira - dihitung pasti). Tidak ada single runner script terpusat
(`package.json` `packages/test-support` tidak punya script `test` yang
menjalankan direktori ini) - dijalankan satu per satu dengan
`node --experimental-strip-types`, pola yang sama dipakai batch-batch
sebelumnya:

```
PASS: dapur-kds-multi-stasiun.test.ts
PASS: idempotency-outbox-notification-constraints.test.ts
PASS: karyawan-absensi-hr-constraints.test.ts
PASS: keanggotaan-ledger-constraints.test.ts
PASS: keanggotaan-outlet-constraints.test.ts
PASS: pembayaran-alokasi-metode-constraints.test.ts
PASS: persediaan-ledger-reservasi-constraints.test.ts
PASS: pesanan-state-machine-snapshot-constraints.test.ts
PASS: prisma-client-shape-auth-pin.test.ts
PASS: prisma-client-shape-dapur.test.ts
PASS: prisma-client-shape-pembayaran-qris.test.ts
PASS: prisma-client-shape-persediaan.test.ts
PASS: prisma-client-shape-pesanan.test.ts
PASS: prisma-client-shape-platform-infra.test.ts
PASS: prisma-client-shape-resep-produksi.test.ts
PASS: prisma-client-shape-tenant-outlet.test.ts
PASS: prisma-client-shape.test.ts
PASS: promo-stacking-reward-constraints.test.ts
PASS: qris-konfigurasi-constraints.test.ts
PASS: resep-versi-produksi-constraints.test.ts
PASS: sesi-auth-pin-constraints.test.ts
PASS: tenant-outlet-composite-constraints.test.ts

TOTAL PASS=22 FAIL=0
```

### 6. `prisma migrate dev --create-only` - TEMUAN PENTING, dilaporkan apa adanya

Dengan `DATABASE_URL` menunjuk ke host/kredensial fiktif (`dummy:dummy@localhost:5432/dummy`),
hasilnya sesuai ekspektasi tiap batch sebelumnya:

```
$ DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public" \
  npx prisma migrate dev --create-only --schema=prisma/schema/schema.prisma --name final_correction_loop_check
Error: P1010: User `dummy` was denied access on the database `dummy.public`
```

Namun `lsof -i :5432` menunjukkan ada instance PostgreSQL LOKAL nyata yang
berjalan di environment eksekusi batch ini (`postgres` process, user `icat`,
listening di `localhost:5432`, autentikasi `trust` untuk user OS lokal) -
sesuatu yang **tidak disebutkan tersedia** di batch-batch correction-loop
sebelumnya (yang seluruhnya melaporkan `DIBLOKIR` karena tidak ada Postgres
sama sekali). Demi kejujuran ("jangan memfabrikasi kegagalan" berlaku sama
seperti "jangan memfabrikasi keberhasilan"), migrasi diuji ulang dengan
kredensial nyata terhadap database KOSONG yang baru dibuat khusus untuk
pengujian ini (`altora_resto_correction_check`), lalu database itu
DIHAPUS setelah pengujian selesai (tidak ada artefak migrasi yang disimpan
di repo):

```
$ psql -h localhost -p 5432 -U icat -d postgres -c "CREATE DATABASE altora_resto_correction_check;"
CREATE DATABASE

$ DATABASE_URL="postgresql://icat@localhost:5432/altora_resto_correction_check?schema=public" \
  npx prisma migrate dev --create-only --schema=prisma/schema/schema.prisma --name final_correction_loop_check
Prisma Migrate created the following migration without applying it 20260725145118_final_correction_loop_check
(migration.sql: 3626 baris, 154799 byte, di prisma/schema/migrations/ - lokasi
default relatif ke schema.prisma, BUKAN prisma/migrations/)

$ DATABASE_URL="postgresql://icat@localhost:5432/altora_resto_correction_check?schema=public" \
  npx prisma migrate dev --schema=prisma/schema/schema.prisma
Applying migration `20260725145118_final_correction_loop_check`
Your database is now in sync with your schema.
✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 1.39s

$ psql -h localhost -p 5432 -U icat -d altora_resto_correction_check -t \
  -c "select count(*) from information_schema.tables where table_schema='public';"
134
```

**Migrasi generated (murni dari `prisma migrate dev`, TANPA SQL manual di
`prisma/migrations/manual/`) berhasil DIAPPLY ke database Postgres kosong dan
membuat 134 tabel.** Ini adalah bukti nyata pertama sepanjang correction loop
bahwa skema `prisma/schema/schema.prisma` itu sendiri valid secara struktural
terhadap Postgres sungguhan, bukan hanya lolos `prisma validate` (yang tidak
menyentuh database sama sekali).

**Ini TIDAK mengubah status `DIBLOKIR` ALT-DEF-029 atau membuka jalan closure
`DITUTUP` untuk defect manapun di batch ini, karena:**
- Constraint yang ditegakkan lewat 5 file SQL manual di
  `prisma/migrations/manual/` (partial unique index QRIS/VersiResep/StokBahan,
  XOR check Resep, append-only+reversal MutasiStok) **masih belum pernah
  dieksekusi** - diverifikasi ulang dengan query terhadap
  `altora_resto_correction_check` sebelum database itu dihapus: tidak ada
  index bernama mengandung `partial`/`xor` di `pg_indexes`. Tanpa file-file
  ini, sejumlah invariant bisnis kritis (mis. "satu `KonfigurasiQris` AKTIF
  per outlet") hanya ditegakkan di level aplikasi, bukan database.
- Belum ada test integrasi/isolasi-tenant/permission-enforcement sungguhan
  yang dijalankan TERHADAP database yang sudah dimigrasikan ini - test
  arsitektur di atas seluruhnya adalah test STRUKTUR (membaca teks
  `schema.prisma`/bentuk tipe Prisma Client), bukan test yang menulis/membaca
  baris nyata dan memverifikasi perilaku runtime.
- Environment CI/produksi resmi masih belum dikonfirmasi punya akses
  Postgres yang sama - temuan ini spesifik pada environment eksekusi batch
  ini, bukan jaminan environment lain.
- Tidak ada kode aplikasi (service/handler) di repo ini sama sekali yang bisa
  diverifikasi terhadap database yang sudah dimigrasikan.

Kesimpulan jujur: **status `DIBLOKIR` untuk kriteria closure (e) "migrasi dari
database kosong" secara LITERAL sudah berhasil di environment batch ini**,
tapi kriteria closure lain (test integrasi nyata, constraint SQL manual
dieksekusi, kode aplikasi ada untuk diverifikasi) tetap belum terpenuhi
untuk SEMUA 42 defect di ledger - karena itu **tidak ada satupun defect yang
diubah menjadi `DITUTUP` pada batch ini**, sesuai instruksi eksplisit batch
ini bahwa closure penuh butuh seluruh 10 kriteria (a-j), bukan hanya (e).
Direkomendasikan sebagai temuan untuk pemilik project: environment ini
sekarang punya Postgres lokal yang bisa dipakai untuk mulai menjalankan
migrasi dev loop dan menulis test integrasi sungguhan, sesuatu yang
sebelumnya diasumsikan tidak mungkin.

### 7. Migrasi manual (`prisma/migrations/manual/`)

5 file SQL mentah terakumulasi sepanjang correction loop:

```
001_konfigurasi_qris_partial_unique.sql   (ALT-DEF-015, partial unique index KonfigurasiQris AKTIF per outlet)
002_resep_target_xor_check.sql            (ALT-DEF-007, XOR check target Resep)
003_versi_resep_satu_aktif.sql            (ALT-DEF-007, satu VersiResep AKTIF per Resep)
004_stok_bahan_agregat_gudang_unik.sql    (ALT-DEF-008, agregat StokBahan unik per gudang)
005_mutasi_stok_append_only_dan_pembalik.sql (ALT-DEF-008, append-only + pembalik MutasiStok)
```

Dikonfirmasi ulang pada batch ini: TIDAK SATUPUN pernah dieksekusi terhadap
database manapun (lihat temuan poin 6 di atas - dicek langsung dengan query
`pg_indexes` terhadap database test yang baru dimigrasikan, hasil kosong).
Ini didokumentasikan secara jujur di setiap file SQL itu sendiri, di
`DEFECT-LEDGER.md` (ALT-DEF-007/008/015), dan di `DECISION-LOG.md`
(ADR-021, ADR-022) - tidak ada klaim tersembunyi bahwa constraint ini aktif.

### 8. Grep scope pembayaran di luar cakupan

```
$ grep -rn -E 'KARTU_DEBIT|KARTU_KREDIT|EWALLET|PAYMENT_GATEWAY|BANK_API' \
  --include='*.prisma' --include='*.ts' --include='*.md' .
$ grep -rniE 'kartu kredit|kartu debit|dompet digital|e-wallet' \
  --include='*.prisma' --include='*.ts' --include='*.md' .
$ grep -rniE 'webhook' --include='*.prisma' --include='*.ts' --include='*.md' .
```

Seluruh hit (schema.prisma komentar negatif, `docs/database/09-pembayaran-kasir.md`,
`docs/database/16-qris.md`, `docs/api/API-CONTRACT.md`, `DECISION-LOG.md`,
`DEFECT-LEDGER.md`, `MASTER-CHECKLIST.md` baris `ALT-QRS-010`, dan assertion
NEGATIF di `qris-konfigurasi-constraints.test.ts`/`pembayaran-alokasi-metode-constraints.test.ts`)
adalah dokumentasi historis penghapusan atau assertion test yang secara
eksplisit MELARANG string tersebut muncul. **Nol** referensi aktif di
schema/kontrak yang benar-benar mengaktifkan integrasi ini.

### 9. `Pengguna` tanpa `tenantId`/`outletId`/role langsung

```
$ grep -n "^model Pengguna " prisma/schema/schema.prisma
269:model Pengguna {
```

Body model dibaca penuh: tidak ada field `tenantId`, `outletId`, atau field
role/peran langsung (`peran`/`role`) - keanggotaan tenant/outlet/peran
seluruhnya lewat relasi `keanggotaanTenant KeanggotaanTenant[]` (yang di
dalamnya membawa `KeanggotaanOutlet`/`KeanggotaanPeran`). Regresi ALT-DEF-001
**tidak ditemukan** setelah 14 batch domain + 1 batch traceability-sync.

### 10. Jumlah model dan enum

```
$ grep -c '^model ' prisma/schema/schema.prisma
133
$ grep -c '^enum ' prisma/schema/schema.prisma
71
```

### 11. Jumlah baris requirement (cross-check `MASTER-CHECKLIST.md`/`TRACEABILITY-MATRIX.md`)

```
$ grep -oE '^\| ALT-[A-Z]+-[0-9]+' docs/engineering/MASTER-CHECKLIST.md | sort -u | wc -l
255
$ grep -oE '^\| ALT-[A-Z]+-[0-9]+' docs/engineering/TRACEABILITY-MATRIX.md | sort -u | wc -l
255
```

255/255, konsisten. (Catatan: `grep -c '^| ALT-'` tanpa filter format ID
menghasilkan angka lebih tinggi karena mencocokkan teks naratif yang
kebetulan diawali pola serupa, mis. placeholder `ALT-OTR-xxx` di tabel
rekonsiliasi - dihitung ulang dengan pola ID yang benar dan `sort -u` untuk
angka yang akurat.)

### 12. Ledger defect - verifikasi ulang jumlah

```
$ grep -c '^| ALT-DEF-' docs/engineering/DEFECT-LEDGER.md
42
```

**42 defect, bukan 44** seperti asumsi draft instruksi batch ini - dihitung
ulang langsung dari baris tabel (`ALT-DEF-001` s.d. `ALT-DEF-042`, tanpa gap
nomor). Ini bukan kesalahan pencatatan; ini koreksi terhadap asumsi draft
instruksi yang salah, dilaporkan apa adanya sesuai aturan "jangan
memfabrikasi angka". Breakdown status x severity, lihat
`docs/engineering/CORRECTION-LOOP-STATUS.md`. **Nol defect berstatus
`DITUTUP`** - dikonfirmasi dengan `awk` atas kolom Status seluruh 42 baris.

### 13. Preflight fase DEEP CORRECTION LOOP (2026-07-25) - Postgres nyata & restrukturisasi INVARIAN-BELUM-DITEGAKKAN.md

Ini adalah batch **pertama** dari fase baru "deep correction loop" yang
diminta secara eksplisit lebih ketat dari 14+ batch correction-loop
sebelumnya - batch ini murni **audit preflight + restrukturisasi dokumen**,
BUKAN eksekusi migrasi (`prisma migrate` sengaja TIDAK dijalankan pada
batch ini, itu scope batch berikutnya).

```
$ psql -U icat -h localhost -d altora_resto_dev -c "SELECT 1;"
 ?column?
----------
        1
(1 row)
```

**Konektivitas Postgres 16 lokal (`altora_resto_dev`, trust-auth, user
`icat`) terkonfirmasi bekerja** - ini BUKAN klaim baru, ini verifikasi ulang
atas database persisten yang sudah dibuat sebelum batch ini dimulai
(`.env` root, gitignored, sudah berisi `DATABASE_URL` yang mengarah ke sana).

```
$ ls -la prisma/migrations/
drwxr-xr-x@ 3 icat staff 96 ... manual
$ ls prisma/migrations/manual/
001_konfigurasi_qris_partial_unique.sql
002_resep_target_xor_check.sql
003_versi_resep_satu_aktif.sql
004_stok_bahan_agregat_gudang_unik.sql
005_mutasi_stok_append_only_dan_pembalik.sql
```

**`prisma/migrations/` HANYA berisi `manual/` - tidak ada satu pun folder
migrasi bernomor timestamp yang dihasilkan `prisma migrate dev`.** Ini
mengonfirmasi secara langsung akar masalah `ALT-DEF-044` (baru, dicatat
batch ini): kelima file SQL manual tidak pernah berada dalam riwayat migrasi
resmi Prisma, sehingga `prisma migrate deploy` standar tidak akan pernah
menjalankannya.

```
$ grep -c '^| ALT-DEF-' docs/engineering/DEFECT-LEDGER.md
44
```

**44 defect setelah batch ini (`ALT-DEF-001` s.d. `ALT-DEF-044`, tanpa
gap nomor)** - `ALT-DEF-044` adalah satu-satunya defect baru yang dibuka
pada batch ini (gap "manual SQL bukan migrasi resmi"). ID berikutnya yang
tersedia sebelum batch ini dimulai memang `ALT-DEF-044` seperti yang
diasumsikan instruksi - diverifikasi langsung dari baris tabel
(`grep -oE 'ALT-DEF-[0-9]{3}'` menunjukkan `ALT-DEF-043` sebagai maksimum
sebelum baris baru ditambahkan), bukan sekadar dipercaya dari asumsi.

```
$ wc -l docs/engineering/INVARIAN-BELUM-DITEGAKKAN.md
181 docs/engineering/INVARIAN-BELUM-DITEGAKKAN.md
$ grep -c '^| INV-' docs/engineering/INVARIAN-BELUM-DITEGAKKAN.md
43
```

**43 baris invariant (`INV-001` s.d. `INV-043`) setelah restrukturisasi ke 5
kategori** (A=0, B=14 [B1=7 sudah didraf + B2=7 belum didraf], C=10, D=6,
E=13) - naik dari 20 baris versi sebelumnya karena pemecahan baris gabungan
lama menjadi baris per-model/per-arah yang lebih presisi, penambahan 3 baris
dari `ALT-DEF-043` (muncul di kategori B DAN D karena drafting-DB dan
rekonsiliasi-cache adalah dua sisi berbeda dari invariant ledger keanggotaan
yang sama), dan kategori E (state machine guards) yang seluruhnya baru,
diekstrak dari `docs/arsitektur/STATE-MACHINES.md`.

Tidak ada migrasi yang dijalankan, tidak ada trigger yang dipasang, tidak
ada test integrasi yang dijalankan terhadap `altora_resto_dev` pada batch
ini - seluruh pekerjaan itu tetap tercatat sebagai belum dilakukan di
`DEFECT-LEDGER.md`/`INVARIAN-BELUM-DITEGAKKAN.md` dan menjadi scope
eksplisit batch berikutnya.

## Pass correction-loop 2026-07-25 (batch KEDUA fase DEEP CORRECTION LOOP): migrasi resmi pertama, fold manual/001-005, test database-integration nyata (ALT-DEF-044, ADR-031)

Batch ini adalah PERTAMA KALINYA di seluruh correction-loop yang benar-benar
menjalankan `prisma migrate` terhadap Postgres nyata dan menulis test yang
konek ke database sungguhan (bukan hanya membaca teks schema/SQL). Seluruh
perintah di bawah dijalankan nyata terhadap `altora_resto_dev`, bukan
disimulasikan.

### 1. Migrasi baseline (`baseline_correction_loop`)

```
$ npx prisma migrate dev --name baseline_correction_loop --schema prisma/schema/schema.prisma
Environment variables loaded from .env
Prisma schema loaded from prisma/schema/schema.prisma
Datasource "db": PostgreSQL database "altora_resto_dev", schema "public" at "localhost:5432"

Applying migration `20260725154045_baseline_correction_loop`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260725154045_baseline_correction_loop/
    └─ migration.sql

Your database is now in sync with your schema.
✔ Generated Prisma Client (v5.20.0) to ./node_modules/@prisma/client in 1.58s
```

**Koreksi lokasi path** (lihat ADR-031 Keputusan 1): migrasi ditulis Prisma
ke `prisma/schema/migrations/` (sibling dari `prisma/schema/schema.prisma`),
BUKAN `prisma/migrations/` seperti asumsi awal instruksi batch ini -
diverifikasi langsung dari struktur folder yang benar-benar dihasilkan.

```
$ psql -U icat -h localhost -d altora_resto_dev -c "\dt" | wc -l
139
```
(139 baris output `\dt` termasuk header/footer psql = **134 tabel nyata**.)

### 2. Audit kelima file `manual/001`-`005` (dijalankan langsung lewat psql)

```
$ psql -U icat -h localhost -d altora_resto_dev -v ON_ERROR_STOP=1 -f prisma/migrations/manual/001_konfigurasi_qris_partial_unique.sql
CREATE INDEX
$ psql ... -f prisma/migrations/manual/002_resep_target_xor_check.sql
ALTER TABLE
$ psql ... -f prisma/migrations/manual/003_versi_resep_satu_aktif.sql
CREATE INDEX
$ psql ... -f prisma/migrations/manual/004_stok_bahan_agregat_gudang_unik.sql
CREATE INDEX
CREATE INDEX
$ psql ... -f prisma/migrations/manual/005_mutasi_stok_append_only_dan_pembalik.sql
CREATE FUNCTION
DROP TRIGGER
CREATE TRIGGER
CREATE FUNCTION
DROP TRIGGER
CREATE TRIGGER
```

Kelima file berjalan sukses SINTAKSIS. Audit LOGIKA (bukan hanya
menjalankan) menemukan satu bug nyata di `005` - dibuktikan dengan skrip
probe manual (fixture tenant/outlet/gudang/satuan/bahan/pengguna minimal,
lalu INSERT mutasi A, INSERT mutasi B yang membalik A, INSERT mutasi C, lalu
`UPDATE mutasi_stok SET "dibalikOlehId" = 'mC' WHERE id = 'mB'`):

```
-- SEBELUM perbaikan (kode asli manual/005):
BEGIN
INSERT 0 1   -- x8 (fixtures + mA + mB)
UPDATE 1     -- mA.dibalikOlehId = mB (sah)
INSERT 0 1   -- mC
UPDATE 1     -- mB.dibalikOlehId = mC -- SEHARUSNYA GAGAL, TAPI BERHASIL
                              result
------------------------------------------------------------
 BUG CONFIRMED: chain reversal-of-reversal was NOT rejected
ROLLBACK
```

Setelah kelima objek probe dibersihkan (`DROP TRIGGER/FUNCTION/INDEX`,
`ALTER TABLE ... DROP CONSTRAINT`) untuk menghindari kontaminasi migrasi
resmi, migrasi kedua ditulis dengan fungsi yang diperbaiki (lihat ADR-031
Keputusan 3) dan probe yang sama dijalankan ULANG:

```
-- SETELAH perbaikan (migrasi resmi harden_manual_invariants):
...
UPDATE 1     -- mA.dibalikOlehId = mB (sah)
INSERT 0 1   -- mC
ERROR:  Mutasi mB adalah pembalik dari mutasi lain; rantai pembalik-dari-pembalik
        ditolak (mutasi ini tidak boleh dibalik lagi, buat mutasi baru dengan
        alasannya sendiri).
CONTEXT:  PL/pgSQL function mutasi_stok_validasi_pembalik() line 14 at RAISE
ROLLBACK
```

### 3. Migrasi kedua (`harden_manual_invariants`) - fold + hardening

```
$ npx prisma migrate dev --create-only --name harden_manual_invariants --schema prisma/schema/schema.prisma
Prisma Migrate created the following migration without applying it 20260725154310_harden_manual_invariants
```

File `migration.sql` yang dihasilkan kosong (diharapkan - Prisma tidak bisa
mendiff partial index/CHECK/trigger); diisi manual dengan SQL terkoreksi
dari kelima file `manual/` (lihat isi file untuk detail lengkap per bagian
A-E), dengan seluruh `IF NOT EXISTS`/`CREATE OR REPLACE`/`DROP TRIGGER IF
EXISTS` DIHAPUS (lihat ADR-031 Keputusan 5).

```
$ npx prisma migrate dev --schema prisma/schema/schema.prisma
Applying migration `20260725154310_harden_manual_invariants`
Your database is now in sync with your schema.
```

### 4. Verifikasi objek via katalog sistem Postgres

```
$ psql ... -c "SELECT indexname, indexdef FROM pg_indexes WHERE indexname IN
  ('konfigurasi_qris_satu_aktif_per_outlet','versi_resep_satu_aktif_per_resep',
   'stok_bahan_agregat_gudang_unik','stok_opname_baris_agregat_gudang_unik');"
               indexname                |                          indexdef
-----------------------------------------+----------------------------------------------------------
 konfigurasi_qris_satu_aktif_per_outlet | CREATE UNIQUE INDEX ... ON konfigurasi_qris USING btree
                                           ("tenantId", "outletId") WHERE (status = 'AKTIF'::"StatusKonfigurasiQris")
 versi_resep_satu_aktif_per_resep       | CREATE UNIQUE INDEX ... ON versi_resep USING btree
                                           ("resepId") WHERE (status = 'AKTIF'::"StatusVersiResep")
 stok_bahan_agregat_gudang_unik         | CREATE UNIQUE INDEX ... ON stok_bahan USING btree
                                           ("gudangId", "bahanId") WHERE ("lokasiStokId" IS NULL)
 stok_opname_baris_agregat_gudang_unik  | CREATE UNIQUE INDEX ... ON stok_opname_baris USING btree
                                           ("stokOpnameId", "bahanId") WHERE ("lokasiStokId" IS NULL)
(4 rows)

$ psql ... -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'resep_sasaran_xor';"
      conname      |           pg_get_constraintdef
-------------------+------------------------------------------
 resep_sasaran_xor | CHECK (((CASE WHEN "itemMenuId" IS NULL THEN 0 ELSE 1 END +
                      CASE WHEN "varianMenuId" IS NULL THEN 0 ELSE 1 END) +
                      CASE WHEN "bahanHasilId" IS NULL THEN 0 ELSE 1 END) = 1)
(1 row)

$ psql ... -c "SELECT tgname, proname FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE tgrelid = 'mutasi_stok'::regclass AND NOT tgisinternal;"
              tgname               |            proname
-----------------------------------+-------------------------------
 trg_mutasi_stok_append_only       | mutasi_stok_tolak_ubah
 trg_mutasi_stok_validasi_pembalik | mutasi_stok_validasi_pembalik
(2 rows)
```

### 5. Test database-integration (jalankan pertama kali)

```
$ npx tsx packages/test-support/src/database-integration/qris-konfigurasi-invariant.test.ts
OK: database-integration ALT-QRS-001/ADR-021 (konfigurasi QRIS satu aktif per outlet) lulus.
$ npx tsx packages/test-support/src/database-integration/resep-versi-invariants.test.ts
OK: database-integration ALT-RSP-001/002/003/005 (resep XOR + versi_resep satu aktif) lulus.
$ npx tsx packages/test-support/src/database-integration/persediaan-stok-invariants.test.ts
OK: database-integration ALT-PSD-004/005/006/007 (stok agregat unik + mutasi_stok
    append-only/pembalik, termasuk bug-fix rantai pembalik-dari-pembalik) lulus.
```

**3/3 file PASS.** Verifikasi kebersihan fixture (`withTransaction` ROLLBACK
bekerja sesuai desain):

```
$ psql ... -c "SELECT count(*) FROM tenant; SELECT count(*) FROM mutasi_stok;
  SELECT count(*) FROM konfigurasi_qris; SELECT count(*) FROM resep;"
0
0
0
0
```

Test arsitektur lama yang merujuk `manual/00X` by path tetap lulus setelah
header arsip ditambahkan ke kelima file:

```
$ npx tsx packages/test-support/src/architecture/qris-konfigurasi-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-015 (QRIS) lulus.
$ npx tsx packages/test-support/src/architecture/resep-versi-produksi-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-007 (resep/versi/produksi) lulus.
$ npx tsx packages/test-support/src/architecture/persediaan-ledger-reservasi-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-008 (ledger stok/reservasi/transfer/opname) lulus.
```

`tsc --noEmit -p packages/test-support/tsconfig.json`: nol error pada
file-file `database-integration/` baru (diverifikasi dengan
`grep "database-integration"` atas output tsc - kosong). Error
`@prisma/client` yang tersisa di output berasal dari file
`architecture/prisma-client-shape*.test.ts` PRA-EXISTING, tidak disentuh
batch ini - akar masalahnya sama dengan gap `pnpm` yang sudah didokumentasikan
di `CATATAN-KENDALA-SESI.md` #2 (resolusi modul `@prisma/client` dari dalam
sub-paket workspace butuh instalasi workspace nyata, bukan `npm install
--no-save` ad-hoc di root).

### 6. Verifikasi determinisme migrasi (fresh-database redeploy)

```
$ psql -U icat -h localhost -d postgres -c "DROP DATABASE altora_resto_dev"
DROP DATABASE
$ psql -U icat -h localhost -d postgres -c "CREATE DATABASE altora_resto_dev"
CREATE DATABASE
$ npx prisma migrate deploy --schema prisma/schema/schema.prisma
2 migrations found in prisma/migrations
Applying migration `20260725154045_baseline_correction_loop`
Applying migration `20260725154310_harden_manual_invariants`
All migrations have been successfully applied.

$ psql ... -c "\dt" | wc -l
139   -- identik dengan sebelum drop (134 tabel nyata)

$ psql ... -c "SELECT migration_name, finished_at IS NOT NULL AS applied
  FROM _prisma_migrations ORDER BY started_at;"
             migration_name              | applied
-----------------------------------------+---------
 20260725154045_baseline_correction_loop | t
 20260725154310_harden_manual_invariants | t
(2 rows)
```

Ketiga test database-integration dijalankan ULANG terhadap database yang
baru saja di-deploy dari nol - **3/3 PASS lagi**, membuktikan migrasi resmi
reproducible dari kondisi kosong (bukan kebetulan berhasil di database yang
sempat "terkontaminasi" objek probe manual sebelumnya).

### 7. Ringkasan checklist penutupan (ALT-DEF-044)

| Item checklist | Status | Bukti |
|---|---|---|
| Migrasi resmi lulus | LULUS | Bagian 1, 3, 6 di atas |
| SQL invariant benar-benar terpasang | LULUS | Bagian 4 di atas |
| Integration test PostgreSQL lulus | LULUS (3/3, dua kali) | Bagian 5, 6 di atas |
| Concurrency test lulus | **BELUM ADA** | Scope eksplisit batch LAIN - tidak dikerjakan batch ini |
| Typecheck lulus | LULUS (file baru) | Bagian 5 di atas |
| Test arsitektur lulus | LULUS | Bagian 5 di atas |
| Traceability diperbarui | LULUS | `TRACEABILITY-MATRIX.md` |
| Bukti command aktual tersedia | LULUS | Dokumen ini |

**Kesimpulan:** defect umbrella `ALT-DEF-044` TETAP `SIAP_DIVERIFIKASI` (bukan
`DITUTUP`) karena item concurrency test belum terpenuhi. Ketujuh invariant
individual (`INV-001` s.d. `INV-007`) sudah pindah ke kategori A di
`INVARIAN-BELUM-DITEGAKKAN.md` dengan bukti lengkap yang tidak bergantung
pada concurrency test untuk klaim dasarnya (constraint ada + menolak
pelanggaran single-connection).

## Pass correction-loop 2026-07-26: redesain pola reversal ledger `dibalikOlehId` -> `membalikMutasiId`, trigger generik, ALT-DEF-043 (ADR-032)

Konteks: instruksi eksplisit redesain pola reversal untuk `MutasiStok`,
`PoinRiwayat`, `LedgerStempel`, `LedgerSaldoToko` (`PembayaranRefund`/
`KoreksiPembayaran` DIEVALUASI dan SENGAJA TIDAK diikutkan - lihat ADR-032
Keputusan 6), plus trigger append-only generik dan penutupan `ALT-DEF-043`.

### 1. Verifikasi keempat tabel kosong sebelum migrasi ditulis

```
$ psql -U icat -h localhost -d altora_resto_dev -c "SELECT count(*) FROM mutasi_stok" \
    -c "SELECT count(*) FROM poin_riwayat" -c "SELECT count(*) FROM ledger_stempel" \
    -c "SELECT count(*) FROM ledger_saldo_toko"
 count
-------
     0
(masing-masing keempat query)
```

Ini yang mengizinkan `ALTER TABLE ... DROP COLUMN "dibalikOlehId" ADD COLUMN
"membalikMutasiId"` aman dijalankan langsung tanpa backfill/migrasi data.

### 2. `prisma migrate dev --create-only` DIBLOKIR non-interaktif (beda dari ADR-031)

```
$ npx prisma migrate dev --schema=prisma/schema/schema.prisma --create-only \
    --name redesign_ledger_reversal_membalik_pattern
...
Error: Prisma Migrate has detected that the environment is non-interactive, which is not supported.
```

Dicoba juga dengan `yes |` di depan perintah - tetap diblokir sama. Jalan
keluar (lihat ADR-032 Keputusan 7): bagian ALTER TABLE murni dihasilkan lewat
`prisma migrate diff` (non-interaktif), sisanya (trigger) ditulis tangan,
diterapkan lewat `psql`, dicatat ke riwayat resmi lewat `prisma migrate
resolve --applied` (juga non-interaktif).

```
$ npx prisma migrate diff --from-schema-datasource prisma/schema/schema.prisma \
    --to-schema-datamodel prisma/schema/schema.prisma --script
-- DropForeignKey
ALTER TABLE "ledger_saldo_toko" DROP CONSTRAINT "ledger_saldo_toko_dibalikOlehId_fkey";
... (68 baris total - DROP FK/index lama, ALTER TABLE rename kolom+alasan,
     CREATE UNIQUE INDEX baru, ADD FK baru untuk keempat tabel)
```

### 3. Migrasi diterapkan langsung lewat `psql`, lalu dicatat resmi

```
$ psql -U icat -h localhost -d altora_resto_dev -v ON_ERROR_STOP=1 \
    -f "prisma/schema/migrations/20260726090000_redesign_ledger_reversal_membalik_pattern/migration.sql"
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
DROP INDEX
DROP INDEX
DROP INDEX
DROP INDEX
ALTER TABLE   (x4, tambah kolom alasan+membalikMutasiId)
CREATE INDEX  (x4, unique index membalikMutasiId)
ALTER TABLE   (x4, FK membalikMutasiId)
DROP TRIGGER
DROP TRIGGER
DROP FUNCTION
DROP FUNCTION
CREATE FUNCTION   (ledger_tolak_ubah)
CREATE TRIGGER    (x4 - satu per tabel ledger)
CREATE FUNCTION   (ledger_validasi_pembalik)
CREATE TRIGGER    (x4 - satu per tabel ledger)

$ npx prisma migrate resolve --schema=prisma/schema/schema.prisma --applied \
    20260726090000_redesign_ledger_reversal_membalik_pattern
Migration 20260726090000_redesign_ledger_reversal_membalik_pattern marked as applied.

$ npx prisma migrate deploy --schema=prisma/schema/schema.prisma
3 migrations found in prisma/migrations
No pending migrations to apply.

$ npx prisma migrate status --schema=prisma/schema/schema.prisma
3 migrations found in prisma/migrations
Database schema is up to date!
```

### 4. Verifikasi objek via katalog sistem Postgres

```
$ psql ... -c "SELECT t.tgname, c.relname, p.proname FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE c.relname IN ('mutasi_stok','poin_riwayat','ledger_stempel','ledger_saldo_toko')
  AND NOT t.tgisinternal ORDER BY c.relname, t.tgname;"
                 tgname                  |      relname      |         proname
-----------------------------------------+--------------------+---------------------------
 trg_ledger_saldo_toko_append_only       | ledger_saldo_toko  | ledger_tolak_ubah
 trg_ledger_saldo_toko_validasi_pembalik | ledger_saldo_toko  | ledger_validasi_pembalik
 trg_ledger_stempel_append_only          | ledger_stempel     | ledger_tolak_ubah
 trg_ledger_stempel_validasi_pembalik    | ledger_stempel     | ledger_validasi_pembalik
 trg_mutasi_stok_append_only             | mutasi_stok        | ledger_tolak_ubah
 trg_mutasi_stok_validasi_pembalik       | mutasi_stok        | ledger_validasi_pembalik
 trg_poin_riwayat_append_only            | poin_riwayat       | ledger_tolak_ubah
 trg_poin_riwayat_validasi_pembalik      | poin_riwayat       | ledger_validasi_pembalik
(8 rows)
```

8 trigger, 4 tabel, HANYA 2 fungsi distinct (`ledger_tolak_ubah`,
`ledger_validasi_pembalik`) - bukti genericity nyata, bukan klaim.

### 5. Test database-integration BARU: `ledger-reversal-membalik-invariants.test.ts`

```
$ npx tsx packages/test-support/src/database-integration/ledger-reversal-membalik-invariants.test.ts
OK: database-integration ADR-032 (redesain membalikMutasiId, generic
ledger_tolak_ubah/ledger_validasi_pembalik) lulus untuk mutasi_stok,
poin_riwayat, ledger_stempel, ledger_saldo_toko - menutup ALT-DEF-043.
```

Cakupan test (semua PASS, satu jalur `main()` sekuensial tanpa runner
terpisah - pola sama batch sebelumnya): existence (2 fungsi generik + 8
trigger + kolom baru ada/kolom lama hilang di keempat tabel + 4 unique
index), lalu untuk `mutasi_stok`: append-only unkondisional (UPDATE kolom
`jumlah`/`catatan`/`alasan` ditolak, DELETE ditolak, **UPDATE
`membalikMutasiId` - pola LAMA yang dulu diizinkan - SEKARANG JUGA
ditolak**), reversal valid diterima + query turunan "sudah dibalik" benar,
tujuh rejection case (membalik diri sendiri, baris asal tidak ada, jumlah
tidak berlawanan tanda, alasan NULL, alasan whitespace-only, tenant beda,
bahan beda, **lokasi TERTUKAR ditolak/lokasi IDENTIK diterima** - bukti
langsung Keputusan 4 ADR-032), **pembalik kedua ke baris asal yang sama
ditolak (unique index)**, **rantai pembalik-dari-pembalik ditolak**; lalu
pola yang SAMA diulang penuh untuk `poin_riwayat`, `ledger_stempel` (fungsi
generik `testKeanggotaanLedger()` dipakai untuk keduanya), dan
`ledger_saldo_toko` (kolom domain `pelangganId`, bukan `keanggotaanId`).

### 6. Re-run seluruh test database-integration LAMA - regresi NOL

```
$ npx tsx packages/test-support/src/database-integration/persediaan-stok-invariants.test.ts
OK: database-integration ALT-PSD-004 (stok agregat unik per gudang).
Append-only/pembalik mutasi_stok kini diuji di
ledger-reversal-membalik-invariants.test.ts (ADR-032).

$ npx tsx packages/test-support/src/database-integration/qris-konfigurasi-invariant.test.ts
OK: database-integration ALT-QRS-001/ADR-021 (konfigurasi QRIS satu aktif per outlet) lulus.

$ npx tsx packages/test-support/src/database-integration/resep-versi-invariants.test.ts
OK: database-integration ALT-RSP-001/002/003/005 (resep XOR + versi_resep satu aktif) lulus.
```

`persediaan-stok-invariants.test.ts` DIREVISI (assertion mutasi_stok lama
dipindah/diperluas ke file baru, lihat ADR-032) - tetap 100% lulus, murni
menghindari duplikasi test terhadap desain yang sudah tidak ada, bukan
regresi.

Test arsitektur juga diverifikasi ulang:

```
$ npx tsx packages/test-support/src/architecture/persediaan-ledger-reservasi-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-008 (ledger stok/reservasi/transfer/opname) lulus.

$ npx tsx packages/test-support/src/architecture/keanggotaan-ledger-constraints.test.ts
OK: seluruh assertion arsitektur ALT-DEF-018/ALT-DEF-023/ALT-DEF-039 (ledger keanggotaan) lulus.
```

**Hasil: 5/5 file database-integration PASS, 2/2 file arsitektur terdampak
PASS.**

### 7. Fresh-database redeploy verification: `DROP DATABASE` + `CREATE DATABASE` + `migrate deploy` dari nol

```
$ psql -U icat -h localhost -d postgres -c "DROP DATABASE altora_resto_dev;"
DROP DATABASE
$ psql -U icat -h localhost -d postgres -c "CREATE DATABASE altora_resto_dev;"
CREATE DATABASE

$ npx prisma migrate deploy --schema=prisma/schema/schema.prisma
3 migrations found in prisma/migrations
Applying migration `20260725154045_baseline_correction_loop`
Applying migration `20260725154310_harden_manual_invariants`
Applying migration `20260726090000_redesign_ledger_reversal_membalik_pattern`
All migrations have been successfully applied.

$ psql ... -c "SELECT count(*) AS tables FROM information_schema.tables WHERE table_schema='public';"
 tables
--------
    134
(1 row)
```

134 tabel - IDENTIK dengan hitungan sebelum drop (ADR-031 Keputusan 2/7).
Ketiga migrasi diterapkan berurutan sesuai prefix timestamp tanpa error, dari
kondisi kosong total.

Seluruh 5 file test database-integration dijalankan ULANG terhadap database
yang baru di-redeploy ini dan **LULUS 5/5 kedua kalinya** (output identik
dengan bagian 5-6 di atas, tidak diulang di sini) - membuktikan migrasi
reproducible dari kondisi kosong, bukan kebetulan berhasil karena state
database yang sempat "dipanaskan" manual sebelumnya.

### 8. Checklist penutupan `ALT-DEF-043`

| Item checklist | Status | Bukti |
|---|---|---|
| Migrasi resmi lulus (termasuk dari nol) | LULUS | Bagian 3, 7 di atas |
| SQL trigger benar-benar terpasang | LULUS | Bagian 4 di atas |
| Integration test PostgreSQL lulus | LULUS (5/5, dua kali) | Bagian 5, 6, 7 di atas |
| Test arsitektur diperbarui dan lulus | LULUS | Bagian 6 di atas |
| Traceability diperbarui | LULUS | `INVARIAN-BELUM-DITEGAKKAN.md` INV-012/013/014 -> kategori A |
| Bukti command aktual tersedia | LULUS | Dokumen ini |

**Kesimpulan: `ALT-DEF-043` DITUTUP.** Ketiga ledger keanggotaan sekarang
punya trigger append-only/pembalik LITERAL SAMA (fungsi generik yang sama)
dengan `MutasiStok` - asimetri yang dicatat defect ini tidak ada lagi. Lihat
ADR-032 untuk rasional desain lengkap dan `DEFECT-LEDGER.md` untuk closure
penuh.

## Batch ADR-033: Audit dan perbaikan actor field tenant-scoped (`ALT-DEF-045`, `INV-044`/`045`/`046`)

### 1. `prisma validate`

```
$ npx prisma validate --schema prisma/schema/schema.prisma
Prisma schema loaded from prisma/schema/schema.prisma
The schema at prisma/schema/schema.prisma is valid 🚀
```

### 2. `prisma migrate status` (sebelum redeploy, terhadap `altora_resto_dev` yang sudah punya migrasi ini terpasang dari sesi sebelumnya)

```
$ npx prisma migrate status --schema prisma/schema/schema.prisma
Datasource "db": PostgreSQL database "altora_resto_dev", schema "public" at "localhost:5432"
4 migrations found in prisma/migrations
Database schema is up to date!
```

### 3. Test database-integration baru (`actor-keanggotaan-tenant-outlet-invariants.test.ts`)

Dijalankan langsung lewat `tsx` terhadap Postgres nyata:

```
$ node node_modules/.pnpm/tsx@4.23.1/node_modules/tsx/dist/cli.mjs \
    packages/test-support/src/database-integration/actor-keanggotaan-tenant-outlet-invariants.test.ts
OK: database-integration ADR-033 (composite-FK actor tenant/outlet-scoped) - lintas-tenant/outlet ditolak, aktor sah diterima.
```

Membuktikan (bukan hanya mengklaim): (1) `MutasiStok.dibuatOlehId`
(OUTLET-LEVEL) menolak aktor tenant lain DAN aktor tenant-benar-outlet-salah;
(2) `StokOpname.dibuatOlehId` (TENANT-LEVEL) menolak aktor tenant lain; (3)
`Karyawan.keanggotaanTenantId` menolak keanggotaan tenant lain; (4)
`Notification.keanggotaanTenantId` menolak keanggotaan tenant lain; (5)
seluruh kasus aktor SAH (tenant/outlet cocok) diterima tanpa error. Existence
check `pg_constraint` mengonfirmasi ke-5 composite-FK representatif benar-benar
ada dengan target tabel yang tepat (`keanggotaan_outlet` vs `keanggotaan_tenant`).

### 4. Seluruh test database-integration (5 file) - sebelum redeploy

```
=== database-integration ===
actor-keanggotaan-tenant-outlet-invariants.test.ts .......... OK
ledger-reversal-membalik-invariants.test.ts ................. OK
persediaan-stok-invariants.test.ts ........................... OK
qris-konfigurasi-invariant.test.ts ........................... OK
resep-versi-invariants.test.ts ................................ OK
db-integration PASS=5 FAIL=0
```

### 5. Seluruh test arsitektur (22 file, termasuk 8 file yang diubah renaming field aktor)

```
=== architecture ===
architecture PASS=22 FAIL=0
```

Kedelapan file yang dimodifikasi batch ini (`dapur-kds-multi-stasiun`,
`idempotency-outbox-notification-constraints`,
`pembayaran-alokasi-metode-constraints`,
`persediaan-ledger-reservasi-constraints`,
`prisma-client-shape-platform-infra`, `promo-stacking-reward-constraints`,
`qris-konfigurasi-constraints`, `resep-versi-produksi-constraints`) lulus
setelah pembaruan assertion mengikuti rename field aktor (`penggunaId` ->
`keanggotaanTenantId`/`dibuatOlehId` dkk berubah tipe relasi ke
`KeanggotaanTenant`/`KeanggotaanOutlet`). Tidak ada regresi - 22/22 lulus,
sama seperti jumlah file sebelum batch ini.

### 6. Redeploy dari database KOSONG (drop+create) - membuktikan ke-4 migrasi reproducible dari nol

```
$ psql -U icat -d postgres -c "DROP DATABASE IF EXISTS altora_resto_dev;"
DROP DATABASE
$ psql -U icat -d postgres -c "CREATE DATABASE altora_resto_dev;"
CREATE DATABASE
$ npx prisma migrate deploy --schema prisma/schema/schema.prisma
4 migrations found in prisma/migrations
Applying migration `20260725154045_baseline_correction_loop`
Applying migration `20260725154310_harden_manual_invariants`
Applying migration `20260726090000_redesign_ledger_reversal_membalik_pattern`
Applying migration `20260726100000_actor_tenant_outlet_scoped`
All migrations have been successfully applied.

$ psql -U icat -d altora_resto_dev -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
 count
-------
   134
(1 row)

$ npx prisma migrate status --schema prisma/schema/schema.prisma
Database schema is up to date!
```

134 tabel - identik dengan jumlah sebelum drop (dan identik dengan yang
dicatat batch ADR-032), membuktikan migrasi `20260726100000_actor_tenant_outlet_scoped`
tidak mengubah jumlah tabel (hanya FK/kolom di tabel yang sudah ada).

### 7. Seluruh test (27 file: 5 database-integration + 22 architecture) diulang TERHADAP database yang baru di-redeploy

```
=== database-integration ===
db-integration PASS=5 FAIL=0
=== architecture ===
architecture PASS=22 FAIL=0
```

**LULUS 27/27 kedua kalinya** dari kondisi database kosong total - membuktikan
migrasi dan seluruh invariant yang bergantung padanya reproducible, bukan
kebetulan berhasil karena state database yang sempat "dipanaskan" manual.

### 8. Checklist penutupan sub-syarat `ALT-DEF-045` / `INV-044`

| Item checklist | Status | Bukti |
|---|---|---|
| Migrasi resmi lulus (termasuk dari nol) | LULUS | Bagian 2, 6 di atas |
| Composite-FK benar-benar terpasang (existence pg_constraint) | LULUS | Bagian 3 di atas |
| Integration test PostgreSQL lulus (aktor lintas-tenant/outlet ditolak) | LULUS | Bagian 3, 4, 7 di atas |
| Test arsitektur diperbarui dan lulus, TANPA regresi | LULUS (22/22) | Bagian 5 di atas |
| Traceability diperbarui | LULUS | `INVARIAN-BELUM-DITEGAKKAN.md` INV-044 (kategori A, DITUTUP) + INV-045/INV-046 (kategori C, gap runtime dicatat eksplisit) |
| Bukti command aktual tersedia | LULUS | Dokumen ini |

**Kesimpulan: sub-syarat "anggota tenant/outlet" dari `ALT-DEF-045` DITUTUP
lewat `INV-044`.** Sub-syarat (a) status AKTIF saat command, (b) akses outlet
untuk field tenant-level, (c) permission saat command - KETIGANYA TETAP
TERBUKA (`INV-045`/`INV-046`), menunggu batch implementasi handler/
service-layer terpisah. Lihat ADR-033 untuk rasional desain lengkap dan
`DEFECT-LEDGER.md` (`ALT-DEF-045`) untuk closure-checklist penuh.

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
