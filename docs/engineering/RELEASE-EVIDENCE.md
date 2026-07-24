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
