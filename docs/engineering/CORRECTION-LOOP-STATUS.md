# Correction Loop Status - Altora Resto

Status dokumen: **LAPORAN STATUS PENUTUP DEEP CORRECTION LOOP (2026-07-27),
BUKAN LAPORAN PENYELESAIAN PROJECT.** Dokumen ini menggantikan seluruhnya versi
sebelumnya (yang membekukan snapshot 2026-07-25, sebelum fase DEEP CORRECTION
LOOP dimulai, dan sudah stale sejak batch ADR-030). Angka di dokumen ini
diverifikasi ulang secara langsung (query `pg_catalog`, `grep -c`, eksekusi
suite test nyata) pada tanggal penulisan, bukan disalin dari batch sebelumnya.

**JANGAN membaca dokumen ini sebagai tanda project atau correction loop
"selesai".** Baca bagian "Apa yang masih terbuka dan kenapa" sebelum
menyimpulkan apa pun tentang kesiapan produksi.

---

## 1. Apa yang berubah sejak versi lama dokumen ini

Versi lama dibekukan setelah correction loop PERTAMA (non-deep, 14 batch
domain + sinkronisasi traceability), sebelum satu baris pun Postgres nyata
tersentuh. Sejak itu, fase **DEEP CORRECTION LOOP** (dimulai 2026-07-25,
ADR-030 dst., 13+ batch substantif: preflight, migration-folding,
ledger-reversal-redesign, actor-audit, money-BigInt-migration,
optimistic-concurrency, order/payment/retur-redesign, stock-lifecycle,
promo-repeatable-redesign, outbox-hardening, notification-targeting,
concurrency-test-audit, concurrency-race-fixes, CI-pipeline, dan batch
verifikasi final ini) mengubah landasan secara fundamental:

- **Postgres 16 nyata ditemukan tersedia** di environment kerja
  (`altora_resto_dev`, ALT-DEF-029/044) - correction loop pertama beroperasi
  dengan asumsi tidak ada Postgres sama sekali.
- **15 migrasi resmi** sekarang ada di `prisma/schema/migrations/` (sebelumnya:
  0 migrasi resmi, hanya 5 file SQL manual yang tidak pernah dieksekusi).
- **32 trigger bisnis + 4 CHECK constraint + 3 constraint trigger deferred +
  273 unique index** benar-benar TERPASANG di database dan TERUJI lewat test
  integrasi nyata (bukan lagi "trigger yang direncanakan di dokumen").
- **3 race condition konkurensi nyata ditemukan DAN diperbaiki** lewat lock DB
  (ALT-DEF-051 kuota promo, ALT-DEF-052 reservasi stok, ALT-DEF-053 alokasi
  pembayaran) - dibuktikan dan diperbaiki dengan dua koneksi `pg` fisik
  konkuren, bukan simulasi satu koneksi.
- **Pipeline CI GitHub Actions** (`​.github/workflows/ci.yml`) ditambahkan -
  11+ job, termasuk job yang jujur dipasang MERAH (lint) karena gap tooling
  yang belum diperbaiki (ALT-DEF-056), bukan disembunyikan.
- Ledger bertambah dari 42 defect (`ALT-DEF-001` s.d. `ALT-DEF-042`) menjadi
  **56 defect** (`ALT-DEF-001` s.d. `ALT-DEF-056`); `DECISION-LOG.md`
  bertambah dari sekitar ADR-029 menjadi **43 ADR**.

## 2. Defect accounting - angka final, diverifikasi langsung dari `DEFECT-LEDGER.md`

Total baris: **56** (`ALT-DEF-001` s.d. `ALT-DEF-056`, tanpa gap nomor).

### 2.1 Breakdown status x severity

| Severity | DIKONFIRMASI | SEDANG_DIPERBAIKI | SIAP_DIVERIFIKASI | DITUTUP | DITUNDA_DENGAN_ALASAN | TIDAK_VALID | Total |
|---|---|---|---|---|---|---|---|
| KRITIS | 1 | 0 | 10 | 0 | 0 | 0 | 11 |
| TINGGI | 4 | 0 | 10 | 3 | 0 | 0 | 17 |
| SEDANG | 8 | 0 | 10 | 3 | 0 | 0 | 21 |
| RENDAH | 2 | 0 | 1 | 4 | 0 | 0 | 7 |
| **Total** | **15** | **0** | **31** | **10** | **0** | **0** | **56** |

(Beberapa baris ledger memakai status majemuk bertele-tele di kolom Status,
mis. "SIAP_DIVERIFIKASI (SEBAGIAN DITUTUP...)" untuk ALT-DEF-042/044, dan
"DIKONFIRMASI, deferred" untuk ALT-DEF-047/048/056. Baris ini dihitung sesuai
kata status PALING AWAL/UTAMA di kolomnya - tidak satu pun dihitung sebagai
`DITUTUP` kecuali kolom Status secara literal berbunyi `DITUTUP` tanpa
kualifikasi "SEBAGIAN"/"sebagian".)

### 2.2 Definition-of-Done check: "Tidak ada defect KRITIS atau TINGGI terbuka"

**GAGAL secara eksplisit.** Defect terbuka (status apa pun SELAIN `DITUTUP`)
pada severity KRITIS atau TINGGI:

- **KRITIS terbuka: 11 dari 11** (nol KRITIS DITUTUP sama sekali):
  `ALT-DEF-001, 002, 004, 005, 006, 009, 010, 015, 017` (status
  `SIAP_DIVERIFIKASI` - perbaikan schema+migrasi+test ARSITEKTUR nyata ada,
  tapi kode aplikasi/handler yang memakainya tidak ada untuk diverifikasi
  penuh terhadap perilaku runtime, dan test integrasi tenant-isolation penuh
  lintas SEMUA domain belum ada), `ALT-DEF-044` (migrasi/trigger/index inti
  terpasang dan teruji, tapi tetap `SIAP_DIVERIFIKASI` bukan `DITUTUP` karena
  sejumlah item closure checklist - concurrency test waktu itu, cakupan
  domain lain - masih di scope batch lain), `ALT-DEF-047` (`DIKONFIRMASI,
  deferred` - transisi atomik pembayaran->pesanan FUNDAMENTAL butuh kode
  handler transaksi yang belum ada; INV-052/ADR-036 sudah menutup SATU sisi
  DB-level dari masalah ini lewat deferred constraint trigger, tapi
  ALT-DEF-047 sendiri tetap terbuka karena mensyaratkan orkestrasi
  command/service yang belum ditulis).

- **TINGGI terbuka: 14 dari 17** (3 TINGGI sudah `DITUTUP`:
  `ALT-DEF-051, 052, 053` - kuota promo/reservasi stok/alokasi pembayaran,
  ketiganya ditutup batch ADR-042 lewat trigger DB + proof dua-koneksi
  nyata). 14 yang MASIH terbuka:
  `ALT-DEF-003, 007, 008, 012, 013, 014, 016` (`SIAP_DIVERIFIKASI` - pola
  sama seperti KRITIS di atas: schema+test struktur ada, integrasi
  runtime/handler belum), `ALT-DEF-011, 020, 029` (`DIKONFIRMASI` - belum
  dikerjakan sama sekali pada batch mana pun; ALT-DEF-029 secara eksplisit
  TIDAK PERNAH dinaikkan ke status lain meski Postgres kini tersedia, karena
  poin defect-nya - migrasi/test integrasi PENUH belum terpasang/terverifikasi
  lintas SEMUA environment - tetap 100% benar sebagai caveat generalisasi
  environment), `ALT-DEF-023, 024, 039` (`SIAP_DIVERIFIKASI`), dan
  `ALT-DEF-045` (`DIKONFIRMASI` - gap runtime/handler, bukan schema).

**Total defect KRITIS+TINGGI terbuka: 25.** Ini angka yang paling penting di
laporan ini - correction loop TIDAK memenuhi kriteria closure-nya sendiri, dan
ini dinyatakan secara sadar, bukan disembunyikan.

### 2.3 Defect yang genuinely `DITUTUP` (10 total, daftar lengkap diverifikasi dari ledger)

`ALT-DEF-038` (promo pemakaian satu baris per pasangan + trigger batas,
ADR-038), `ALT-DEF-043` (ledger append-only + pembalik 3 tabel keanggotaan,
ADR-032), `ALT-DEF-046` (migrasi uang Int->BigInt, ADR-034), `ALT-DEF-049`
(regresi typecheck diverifikasi tidak terkait), `ALT-DEF-050` (koreksi
ringkasan angka dokumen invariant), `ALT-DEF-051` (kuota promo lintas
pelanggan, ADR-042), `ALT-DEF-052` (validasi ketersediaan stok saat insert
reservasi, ADR-042), `ALT-DEF-053` (SUM alokasi pembayaran lintas-Pembayaran
vs totalAkhir, ADR-042), `ALT-DEF-054` dan `ALT-DEF-055` (config
dependency-cruiser diperbaiki: schema JSON tidak valid, lalu regex
"unsafe" menurut `safe-regex` - keduanya batch CI/ADR-043).

Catatan penting: SEMUA 10 defect `DITUTUP` ini adalah defect **schema/tooling/
test-struktur**, bukan defect yang membuktikan kode aplikasi/handler bekerja
benar (karena kode aplikasi/handler tidak ada sama sekali di repo ini pada
titik penulisan dokumen ini).

## 3. Apa yang masih terbuka dan kenapa

Dikelompokkan sesuai instruksi batch final, bukan diulang datar:

**(a) Legitimately deferred menunggu kode handler/application yang belum
ada** (MAYORITAS dari 25 KRITIS+TINGGI terbuka di atas, plus banyak SEDANG/
RENDAH): `ALT-DEF-001, 002, 003, 004, 005, 006, 007, 008, 009, 010, 012, 013,
014, 015, 016, 017, 023, 024, 039, 044, 045, 047, 048, 056` dan sebagian
besar sisanya. Pola yang sama berulang di HAMPIR SETIAP baris ini: schema
sudah benar, migrasi resmi sudah terpasang di `altora_resto_dev`, test
ARSITEKTUR (bentuk schema) dan/atau test DATABASE-INTEGRATION (perilaku
trigger/constraint terhadap data) sudah lulus nyata - tapi tidak ada satu
baris kode service/handler/command di repo ini untuk memverifikasi bahwa
*aplikasi* memakai constraint tersebut dengan benar (mis. apakah endpoint
checkout benar-benar membungkus perubahan Pembayaran+Pesanan dalam satu
transaksi - lihat ALT-DEF-047). Closure penuh untuk kelompok ini menunggu
batch implementasi kode aplikasi pertama, di luar scope seluruh correction
loop (baik pertama maupun deep) sampai titik ini.

**(b) Gap nyata yang butuh batch dedicated ke depan (bukan menunggu kode
aplikasi, tapi juga belum dikerjakan)**:
- `ALT-DEF-042` - 3 model Platform yang requirement-nya sudah ada di
  checklist tapi tidak pernah dibuat: `UndanganTenant`, `BackupJob`,
  `AntrianCetak`, plus 7 eventType outbox yang belum masuk katalog
  (retur/split/reopen/merge pesanan, refund kasir, tukar poin/stempel).
  SEBAGIAN ditutup ADR-039 (katalog eventType diperluas), TAPI 3 model masih
  tidak ada - status tetap `SIAP_DIVERIFIKASI` bukan `DITUTUP`.
- `ALT-DEF-056` - job CI `lint` dipasang tapi DIPASTIKAN gagal: `eslint`
  bukan devDependency di 30 `package.json` paket manapun, dan tidak ada satu
  pun `eslint.config.*`/`.eslintrc.*` di seluruh repo. Butuh batch tooling
  tersendiri (instalasi eslint + config per paket) sebelum job ini bisa
  hijau secara jujur.
- `ALT-DEF-011, 020` - meja/QR token mentah, traceability lama - belum
  disentuh batch domain manapun di deep loop (deep loop fokus ke
  tenant/outlet/money/concurrency lintas domain, bukan audit per-domain
  Meja/QR baru).

**(c) Caveat generalisasi environment (bukan defect yang bisa "diperbaiki"
dengan kode, murni batasan bukti)**:
- `ALT-DEF-029` - Postgres 16 di `altora_resto_dev` terbukti tersedia DI
  ENVIRONMENT EKSEKUSI SESI INI. Ini TIDAK membuktikan Postgres tersedia di
  environment lain (mesin developer lain, CI). Status defect ini SENGAJA
  TIDAK dinaikkan ke `DITUTUP`/`TIDAK_VALID` meski migrasi+trigger+test
  integrasi kini benar-benar berjalan di sini - poin defect aslinya (belum
  ada bukti migrasi+test integrasi terverifikasi LINTAS environment) tetap
  100% benar.
- CI (`.github/workflows/ci.yml`) ditambahkan batch ADR-043 tapi **belum
  pernah benar-benar dijalankan oleh GitHub Actions** sampai titik penulisan
  dokumen ini - lihat `RELEASE-EVIDENCE.md` bagian ADR-043 poin 9
  ("UNVERIFIED - butuh GitHub Actions run sungguhan") untuk daftar 5 asumsi
  yang plausible-but-unproven (pnpm install resolve bersih, postgres service
  container health-check, turbo menemukan seluruh script paket, dll).
  Pipeline CI ini secara jujur berstatus **desain yang belum dieksekusi**,
  bukan "sudah terbukti hijau di CI".

## 4. Status test/migrasi/CI - angka final (diverifikasi ulang batch ini)

- **Schema**: `npx prisma format` - tidak ada diff. `npx prisma validate` -
  lulus. `npx prisma generate` - lulus.
- **135 model**, **75 enum** (`grep -c "^model "`/`"^enum "` langsung
  terhadap `prisma/schema/schema.prisma`).
- **15 migrasi resmi** di `prisma/schema/migrations/`, seluruhnya diterapkan
  bersih dari database KOSONG (`DROP DATABASE` + `CREATE DATABASE` +
  `prisma migrate deploy` -> "All migrations have been successfully
  applied.").
- **`tsc --noEmit -p packages/test-support`**: exit 0, bersih.
- **22/22 file test arsitektur** (`packages/test-support/src/architecture/`)
  lulus, dijalankan lewat `scripts/test-architecture.sh`
  (`node --experimental-strip-types`).
- **17/17 file test database-integration**
  (`packages/test-support/src/database-integration/`, plus 1 file helper
  `_pg-helper.ts` bersama, bukan test tersendiri) lulus terhadap
  `altora_resto_dev` sungguhan, dijalankan lewat
  `scripts/test-database-integration.sh` (`tsx`, karena resolusi modul
  `.js`->`.ts` native Node tidak menangani impor lintas-file tanpa bundler/
  loader tambahan - `tsx` sudah jadi devDependency `packages/test-support`
  untuk kasus ini).
- **Total suite: 39/39 file test lulus**, dikonfirmasi IDENTIK sebelum dan
  sesudah fresh-database redeploy penuh pada batch ini.
- **`prisma migrate diff --from-schema-datasource --to-schema-datamodel
  --script`**: output persis `-- This is an empty migration.` - NOL drift
  antara migration history dan schema.prisma live.
- **`depcruise --config .dependency-cruiser.cjs --output-type err packages
  apps`**: exit 0, "29 dependency violations (0 errors, 0 warnings)" (hanya
  info-level orphan notice) - dikonfirmasi lulus, sesuai perbaikan
  ALT-DEF-054/055.
- **Objek database nyata** (query `pg_catalog`/`information_schema`
  langsung terhadap `altora_resto_dev` setelah redeploy penuh):
  - 136 tabel di schema `public`.
  - 32 trigger bisnis buatan-tangan (semua berprefix `trg_*`), termasuk 3
    yang berjenis `CONSTRAINT TRIGGER ... DEFERRABLE` (konsistensi
    pembayaran-pesanan, ADR-036).
  - 12 fungsi PL/pgSQL di schema `public`.
  - 4 CHECK constraint bernama eksplisit.
  - 389 foreign key constraint, 136 primary key constraint (`pg_constraint`,
    schema `public`).
  - 284 index total di schema `public`, 273 di antaranya unique
    (kombinasi `@@unique` Prisma generik + partial unique index bisnis
    kritis manual).
- **CI**: `.github/workflows/ci.yml` ada (524 baris, 11+ job), belum pernah
  dijalankan oleh GitHub Actions sungguhan sampai titik ini (lihat bagian 3c
  di atas).

## 5. 7 domain yang tidak pernah mendapat batch koreksi khusus - STATUS TETAP SAMA

Correction loop pertama (non-deep) menemukan 7 domain yang tetap
scaffold-only: **Menu (ALT-MNU)**, **Pembelian (ALT-BEL)**, sebagian besar
**Meja lanjutan (ALT-MJ, di luar ALT-DEF-011)**, **Pelayan (ALT-PLY)**,
**Analitik (ALT-ANL)**, **UI/UX (ALT-UX)**, dan sebagian besar **Security
(ALT-SEC)**.

**Dikonfirmasi ulang pada batch final ini: KETUJUHNYA MASIH TRUE.** Deep
correction loop TIDAK memberikan satu pun dari ketujuh domain ini batch
dedicated. Batch-batch deep-loop (actor-audit, money-BigInt,
optimistic-concurrency, ledger-redesign, stock-lifecycle, promo-redesign,
outbox-hardening, notification-targeting, concurrency-race-fixes) menyentuh
tenant/outlet isolation dan model uang/actor secara LINTAS-domain (yang
kebetulan menyentuh SEBAGIAN kolom/model di banyak domain termasuk ketujuh
domain di atas), dan `ALT-SEC` secara tidak langsung tersentuh lewat
composite-FK actor (ADR-033) - tapi tidak ada satu batch pun yang secara
EKSPLISIT dan MENYELURUH mengaudit Menu/Pembelian/Meja-lanjutan/Pelayan/
Analitik/UI-UX/Security sebagai domain fokus tunggal, sebagaimana 14 batch
domain di correction loop pertama melakukannya untuk domain lain. Defect yang
belum ditemukan di ketujuh domain ini kemungkinan besar masih ada - daftar 56
defect BUKAN daftar lengkap seluruh masalah yang mungkin ada di scope Altora
Resto.

## 6. Traceability - STALE, dikonfirmasi jujur

`TRACEABILITY-MATRIX.md` (255 baris, sinkron dengan 255 requirement ID unik
di `MASTER-CHECKLIST.md`) **belum disinkronkan ulang** dengan perubahan
schema deep-loop. Bukti konkret: baris pembuka dokumen tersebut masih
menyebut **"133 model"** sebagai jumlah model schema - angka aktual sekarang
**135 model**. Deep-loop batches (money BigInt, actor composite-FK, ledger
reversal redesign, model `PesananRetur`/`PesananReturBaris`, dsb.) hampir
seluruhnya memperbarui `INVARIAN-BELUM-DITEGAKKAN.md` dan `DEFECT-LEDGER.md`
(dan `DECISION-LOG.md` untuk rasional ADR), BUKAN `TRACEABILITY-MATRIX.md`
yang 592 baris itu sendiri. Ini gap jujur, bukan diklaim sinkron - re-sync
penuh 255 baris adalah usaha dedicated tersendiri, di luar scope batch final
ini (sesuai instruksi eksplisit untuk TIDAK mencoba re-sync di batch ini).

## 7. Commit

Lihat `git log` pada `main` untuk daftar SHA lengkap - 98 commit total per
penulisan dokumen ini, dari commit pertama correction loop
(`docs(defect): catat 22 temuan audit arsitektur correction loop`) sampai
commit batch final ini (`docs(engineering): laporan akhir deep correction
loop dan verifikasi konsolidasi final`). `DECISION-LOG.md` memuat **43 ADR**
(`ADR-001` s.d. `ADR-043`) yang mendokumentasikan rasional setiap keputusan
desain signifikan.

## 8. Pernyataan penutup eksplisit

**Correction loop ini (baik loop pertama maupun deep loop) TIDAK dinyatakan
selesai ("selesai") di sini atau di mana pun.** Yang genuinely benar hari ini:

1. Schema, 15 migrasi resmi, dan seluruh constraint/trigger/index bisnis
   kritis TERPASANG dan TERUJI nyata terhadap Postgres 16 di
   `altora_resto_dev` (39/39 test, drift nol, redeploy fresh-database
   identik).
2. **25 defect KRITIS/TINGGI masih terbuka** - correction loop TIDAK
   memenuhi Definition-of-Done-nya sendiri ("tidak ada defect KRITIS/TINGGI
   terbuka"), dan ini dinyatakan apa adanya, bukan dibulatkan ke bawah.
3. **Tidak ada satu baris kode aplikasi/handler/service pun** di repo ini -
   seluruh 13+ batch deep-loop beroperasi murni di lapisan schema/migrasi/
   test-struktur/test-integrasi-database, sesuai batas eksplisit yang
   mengarahkan correction loop untuk TIDAK membangun fitur produksi.
4. **7 domain tidak pernah diaudit dedicated** - defect yang belum ditemukan
   di sana kemungkinan besar ada.
5. **Traceability matrix stale** terhadap perubahan schema deep-loop.
6. **CI belum pernah dijalankan sungguhan oleh GitHub Actions** - desain ada,
   eksekusi nyata belum terverifikasi.
7. **Ketersediaan Postgres tidak digeneralisasi** - terbukti di environment
   sesi ini saja.

Sebelum codebase ini bisa mendukung pengembangan fitur/handler nyata,
minimal dibutuhkan: (a) keputusan eksplisit soal 25 defect KRITIS/TINGGI
terbuka - apakah ditutup lewat implementasi kode pertama atau didorong lebih
jauh, (b) audit dedicated untuk 7 domain yang belum tersentuh, (c) instalasi
eslint sungguhan (ALT-DEF-056) dan pembuatan 3 model Platform yang hilang
(ALT-DEF-042), (d) verifikasi CI nyata lewat GitHub Actions run pertama, dan
(e) re-sync penuh `TRACEABILITY-MATRIX.md`. Tidak satu pun dari kelima ini
diselesaikan oleh batch final ini - batch ini murni memverifikasi ulang dan
melaporkan status apa adanya.
