# Correction Loop Status - Altora Resto

Status dokumen: **LAPORAN STATUS, BUKAN LAPORAN PENYELESAIAN.**

Dokumen ini adalah laporan penutup dari batch verifikasi konsolidasi akhir
(2026-07-25) yang mengakhiri rangkaian correction-loop (14 batch koreksi
domain + 1 batch sinkronisasi traceability + batch verifikasi ini). Tujuannya
menyatakan **di mana posisi correction loop sekarang**, bukan menyatakan
project atau correction loop ini "selesai". Correction loop ini secara sadar
belum menyentuh implementasi kode aplikasi (service/handler) di domain
manapun - seluruh pekerjaan sejauh ini ada di lapisan schema, kontrak, dan
dokumentasi, sesuai instruksi eksplisit yang mengarahkan correction loop ini
untuk TIDAK membangun fitur produksi terlebih dahulu.

Jangan membaca dokumen ini sebagai tanda project siap rilis. Baca bagian
"Blocker" di bawah sebelum menyimpulkan apapun.

## 1. Defect yang dikerjakan (seluruh loop)

Seluruh 42 defect di `docs/engineering/DEFECT-LEDGER.md` (`ALT-DEF-001` s.d.
`ALT-DEF-042`) sudah diverifikasi langsung dari schema/dokumen (tidak ada
status `BARU`). Dari 42 itu, defect berikut sudah punya **perbaikan
schema+dokumen+test struktur nyata** (bukan sekadar dicatat) - commit
perbaikan tercatat di kolom "Commit perbaikan" masing-masing baris ledger:

`ALT-DEF-001, ALT-DEF-002, ALT-DEF-003, ALT-DEF-004, ALT-DEF-005,
ALT-DEF-006, ALT-DEF-007, ALT-DEF-008, ALT-DEF-009, ALT-DEF-010,
ALT-DEF-012 (gejala saja), ALT-DEF-013, ALT-DEF-014, ALT-DEF-015,
ALT-DEF-016, ALT-DEF-017, ALT-DEF-018, ALT-DEF-019, ALT-DEF-022,
ALT-DEF-023, ALT-DEF-024, ALT-DEF-025, ALT-DEF-030, ALT-DEF-032,
ALT-DEF-034, ALT-DEF-037, ALT-DEF-039, ALT-DEF-040, ALT-DEF-041`

(29 defect - cocok dengan jumlah `SIAP_DIVERIFIKASI` pada breakdown status
di bagian 3.)

## 2. Defect yang ditutup (`DITUTUP`)

**NOL (0).** Ini bukan kekurangan batch ini - ini kepatuhan sengaja terhadap
aturan closure correction-loop sendiri: `DITUTUP` membutuhkan SEMUA 10
kriteria (a) s.d. (j) terpenuhi, termasuk kriteria (e) "migrasi dari database
kosong lulus" DAN kriteria (f)/(g) test/typecheck yang relevan lulus secara
INTEGRASI (bukan hanya struktur) DAN kriteria (j) tidak ada defect turunan
yang belum dicatat.

Batch verifikasi ini menemukan sesuatu yang perlu digarisbawahi jujur:
migrasi `prisma migrate dev` **berhasil diapply ke database Postgres kosong
sungguhan** di environment eksekusi batch ini (134 tabel dibuat, lihat
`docs/engineering/RELEASE-EVIDENCE.md` bagian "Pass correction-loop 2026-07-25
(final)" poin 6). Ini secara literal memenuhi kriteria (e) untuk PERTAMA
KALINYA sepanjang loop. **Namun ini tidak cukup untuk menutup satu defect
pun**, karena:
- Kriteria (g) "test terkait lulus" berarti test INTEGRASI yang benar-benar
  menulis/membaca data lewat database yang sudah dimigrasikan dan
  memverifikasi perilaku - test yang ada hari ini seluruhnya STRUKTUR
  (parsing teks schema / bentuk tipe Prisma Client), bukan test yang
  dijalankan terhadap database nyata.
- 5 file SQL manual (`prisma/migrations/manual/*.sql`) yang menegakkan
  invariant bisnis kritis (partial unique index, XOR check, append-only)
  **masih belum pernah dieksekusi** - dikonfirmasi ulang pada batch ini.
- Kriteria (j) tidak bisa dipastikan terpenuhi untuk domain yang belum
  pernah diaudit sama sekali (lihat bagian 4 di bawah) - defect turunan di
  sana mungkin belum ditemukan.
- Tidak ada kode aplikasi untuk memverifikasi kriteria (a)/(c) secara
  penuh terhadap perilaku runtime nyata.

Kesimpulannya konsisten dengan seluruh 14 batch sebelumnya: **status
`DIBLOKIR` bertahan untuk keperluan closure**, meski salah satu penyebab
teknisnya (tidak ada Postgres) ternyata sudah tidak berlaku di environment
ini. Lihat bagian "Blocker" untuk detail.

## 3. Defect siap diverifikasi (`SIAP_DIVERIFIKASI`)

**29 defect:**

`ALT-DEF-001, ALT-DEF-002, ALT-DEF-003, ALT-DEF-004, ALT-DEF-005,
ALT-DEF-006, ALT-DEF-007, ALT-DEF-008, ALT-DEF-009, ALT-DEF-010,
ALT-DEF-012, ALT-DEF-013, ALT-DEF-014, ALT-DEF-015, ALT-DEF-016,
ALT-DEF-017, ALT-DEF-018, ALT-DEF-019, ALT-DEF-022, ALT-DEF-023,
ALT-DEF-024, ALT-DEF-025, ALT-DEF-030, ALT-DEF-032, ALT-DEF-034,
ALT-DEF-037, ALT-DEF-039, ALT-DEF-040, ALT-DEF-041`

## 4. Defect yang masih `DIKONFIRMASI` (belum dikerjakan)

**13 defect:**

`ALT-DEF-011, ALT-DEF-020, ALT-DEF-021, ALT-DEF-026, ALT-DEF-027,
ALT-DEF-028, ALT-DEF-029, ALT-DEF-031, ALT-DEF-033, ALT-DEF-035,
ALT-DEF-036, ALT-DEF-038, ALT-DEF-042`

Ini konsisten dengan gap 7 domain yang tidak pernah mendapat batch koreksi
khusus (ditemukan oleh batch sinkronisasi traceability sebelumnya):
**Menu (ALT-MNU)**, **Pembelian (ALT-BEL)**, sebagian besar **Meja lanjutan
(ALT-MJ, di luar ALT-DEF-011)**, **Pelayan (ALT-PLY)**, **Analitik
(ALT-ANL)**, **UI/UX (ALT-UX)**, dan sebagian besar **Security (ALT-SEC)**
tetap scaffold-only di `MASTER-CHECKLIST.md`/`TRACEABILITY-MATRIX.md` tanpa
perbaikan schema/model nyata. `ALT-DEF-035` (composite-FK `VarianMenu`/
`ModifierOpsi`) dan `ALT-DEF-042` (3 model Platform: `UndanganTenant`,
`BackupJob`, `AntrianCetak`, + eventType outbox) sudah punya rencana koreksi
tertulis tapi sengaja ditunda ke batch domain Menu/Platform berikutnya yang
belum pernah dijalankan.

## 5. Defect baru yang ditemukan (running total)

Total ditemukan sepanjang loop: **42** (mulai dari 22 temuan audit awal di
commit `f955a61`, bertambah lewat batch-batch berikutnya hingga
`ALT-DEF-042`). Batch verifikasi final ini **tidak menambah defect baru**
ke ledger - satu-satunya temuan signifikan (Postgres lokal ternyata
tersedia di environment ini) bukan defect arsitektur/schema, jadi dicatat
sebagai catatan lingkungan di `RELEASE-EVIDENCE.md`, bukan baris
`DEFECT-LEDGER.md` baru.

Catatan jujur soal angka target: instruksi draft batch ini mengasumsikan
"44 entries" - jumlah aktual yang diverifikasi langsung dari tabel ledger
adalah **42** (`ALT-DEF-001` s.d. `ALT-DEF-042`, tanpa gap nomor). Dicatat
apa adanya, bukan dipaksakan ke 44.

## 6. Breakdown status x severity (42 defect)

| Severity | DIKONFIRMASI | SEDANG_DIPERBAIKI | SIAP_DIVERIFIKASI | DITUTUP | DITUNDA_DENGAN_ALASAN | TIDAK_VALID | Total |
|---|---|---|---|---|---|---|---|
| KRITIS | 0 | 0 | 9 | 0 | 0 | 0 | 9 |
| TINGGI | 3 | 0 | 10 | 0 | 0 | 0 | 13 |
| SEDANG | 9 | 0 | 8 | 0 | 0 | 0 | 17 |
| RENDAH | 1 | 0 | 2 | 0 | 0 | 0 | 3 |
| **Total** | **13** | **0** | **29** | **0** | **0** | **0** | **42** |

## 7. Commit

Lihat `git log` pada `main` untuk daftar SHA lengkap - dari commit pertama
correction loop `f955a61` (`docs(defect): catat 22 temuan audit arsitektur
correction loop`) sampai commit terakhir batch ini (lihat SHA commit yang
memuat pesan `docs(engineering): laporan akhir correction loop dan
verifikasi konsolidasi`, tepat setelah `06541ef`). Sekitar 40+ commit,
seluruhnya `fix(...)`/`test(...)`/`docs(...)` bergantian per domain -
tidak dilist satu per satu di sini karena `git log` adalah sumber
kebenaran yang lebih baik daripada salinan statis yang bisa basi.

## 8. File yang berubah (cakupan kasar, seluruh loop)

- `prisma/schema/schema.prisma` (schema utama - model baru, rename, composite-FK)
- `prisma/migrations/manual/*.sql` (5 file constraint SQL mentah, belum dieksekusi)
- `docs/database/*.md` (ERD per domain, termasuk `16-qris.md` baru)
- `docs/api/API-CONTRACT.md`
- `docs/keamanan/PERMISSION-MATRIX.md`
- `docs/arsitektur/STATE-MACHINES.md`
- `prisma/seed/izin.seed.ts`
- `packages/test-support/src/architecture/*.test.ts` (22 file test struktur)
- `docs/engineering/DEFECT-LEDGER.md`, `MASTER-CHECKLIST.md`,
  `TRACEABILITY-MATRIX.md`, `RISK-REGISTER.md`, `RELEASE-EVIDENCE.md`,
  `DECISION-LOG.md` (ADR-001 s.d. ADR-029)

## 9. Model baru (ringkas)

Schema sekarang punya **133 model** dan **71 enum** (dihitung langsung,
lihat `RELEASE-EVIDENCE.md` bagian verifikasi final poin 10). Tidak
dienumerasi satu per satu di sini (133 model terlalu banyak untuk daftar
yang berguna) - lihat `prisma/schema/schema.prisma` langsung atau
`docs/database/README.md` untuk indeks per domain.

## 10. Model yang dihapus / di-rename

Dikonfirmasi ulang terhadap schema aktual pada batch ini (`grep -c "^model
<Nama> "` = 0 untuk nama lama, = 1 untuk nama baru):

| Nama lama | Nama baru / status | ADR |
|---|---|---|
| `ResepBahan` | **DIHAPUS** (diganti `KomponenResep`, bukan rename 1:1) | ADR-022 Keputusan 4 |
| `PenggunaOutlet` | rename -> `KeanggotaanOutlet` | ADR terkait ALT-DEF-001 |
| `PenggunaPeran` | rename -> `KeanggotaanPeran` | ADR terkait ALT-DEF-001/002 |
| `JadwalShift` | rename -> `TemplateShift` | ADR terkait ALT-DEF-024 |
| `PenugasanShift` | rename -> `JadwalKerja` | ADR terkait ALT-DEF-024 |
| `PromoAturan` | rename -> `PromoKondisi` | Keputusan 6, batch ALT-DEF-009 |
| `TierMembership` | rename -> `TierKeanggotaan` | Keputusan 1, batch ALT-DEF-018/023/039 |

Seluruh 7 nama lama dikonfirmasi **nol** kemunculan sebagai `model <Nama>`
di schema saat ini; seluruh 7 nama baru dikonfirmasi **tepat satu**
kemunculan.

## 11. Constraint baru

- **Pola composite-FK tenant/outlet** (`@@unique([tenantId, id])` pada
  model induk + FK majemuk `(tenantId, xId) -> X(tenantId, id)` pada model
  anak) diterapkan lintas puluhan model tenant-scoped mengikuti ADR-013 -
  mulai dari batch `ALT-DEF-010`/`ALT-DEF-014` dan diperluas di hampir
  setiap batch domain berikutnya. Belum diterapkan penuh pada `VarianMenu`/
  `ModifierOpsi` (`ALT-DEF-035`, ditunda ke batch domain Menu).
- **Pola partial-unique-index lewat SQL manual** (Postgres tidak mendukung
  partial unique index native di Prisma schema language) - 5 kasus di
  `prisma/migrations/manual/` (lihat bagian 7 di atas), seluruhnya BELUM
  dieksekusi. Referensi: ADR-013 (rasional composite-FK), ADR-021 Keputusan
  3 (partial index QRIS), ADR-022 (XOR check dan satu-versi-aktif Resep).

## 12. Status migrasi

**DIBLOKIR** untuk keperluan closure defect, dengan catatan penting yang
WAJIB dibaca: `prisma migrate dev` (create-only DAN apply) berhasil
dijalankan penuh terhadap database Postgres kosong sungguhan di environment
eksekusi batch verifikasi ini (134 tabel dibuat dari migrasi generated,
tanpa SQL manual). Lihat `RELEASE-EVIDENCE.md` bagian "Pass correction-loop
2026-07-25 (final)" poin 6 untuk command dan output lengkap, dan bagian 2 di
atas untuk kenapa ini tidak cukup untuk closure. Alasan `DIBLOKIR` tetap
berlaku: test integrasi nyata belum ada, constraint SQL manual belum
dieksekusi, kode aplikasi belum ada untuk diverifikasi, dan sejumlah domain
belum pernah diaudit sama sekali (kriteria (j) tidak bisa dipastikan).

## 13. Status `prisma validate`

**LULUS.** `npx prisma validate --schema=prisma/schema/schema.prisma` ->
`The schema at prisma/schema/schema.prisma is valid`. Lihat
`RELEASE-EVIDENCE.md` poin 2.

## 14. Status typecheck

**LULUS.** `npx tsc --noEmit -p packages/test-support` -> exit 0, tanpa
error. Lihat `RELEASE-EVIDENCE.md` poin 4.

## 15. Status test

**22/22 file test arsitektur LULUS** (`packages/test-support/src/architecture/`,
dijalankan satu per satu dengan `node --experimental-strip-types`, tidak ada
runner terpusat). Ini test STRUKTUR (bentuk schema/tipe Prisma Client), BUKAN
test integrasi runtime. Lihat `RELEASE-EVIDENCE.md` poin 5.

## 16. Status traceability

**255/255 baris ada** di `TRACEABILITY-MATRIX.md`, sinkron dengan 255 ID unik
di `MASTER-CHECKLIST.md` (diverifikasi ulang dengan `grep -oE` + `sort -u`
pada batch ini, lihat `RELEASE-EVIDENCE.md` poin 11). **Namun** gap jujur dari
batch sinkronisasi traceability sebelumnya tetap berlaku: 7 domain (Menu,
Pembelian, sebagian Meja, Pelayan, Analitik, UI/UX, sebagian besar Security)
punya baris traceability yang ADA secara struktural tapi belum diverifikasi
string-per-string terhadap `API-CONTRACT.md`/`PERMISSION-MATRIX.md`/route map,
dan belum punya perbaikan schema/model yang sesuai (lihat bagian 4).
Kelengkapan baris tabel tidak sama dengan kelengkapan implementasi.

## 17. Blocker

a. **Tidak ada akses PostgreSQL live yang terjamin di semua environment.**
   Batch ini menemukan Postgres LOKAL tersedia di environment eksekusinya
   sendiri dan migrasi berhasil diapply penuh (lihat bagian 2/12) - tapi ini
   TIDAK terverifikasi sebagai kondisi permanen atau berlaku di CI/environment
   lain. Ini masih memblokir test integrasi/isolasi-tenant PENUH karena test
   semacam itu belum ditulis sama sekali, terlepas dari ketersediaan database.

b. **7 dari 17 domain correction-loop yang dimandatkan tidak pernah mendapat
   batch koreksi khusus** dan tetap scaffold-only: Menu (ALT-MNU), Pembelian
   (ALT-BEL), sebagian besar Meja lanjutan (ALT-MJ), Pelayan (ALT-PLY),
   Analitik (ALT-ANL), UI/UX (ALT-UX), sebagian besar Security (ALT-SEC).
   Defect yang belum ditemukan di domain-domain ini kemungkinan besar masih
   ada - ledger 42 defect BUKAN daftar lengkap seluruh masalah yang mungkin
   ada di scope Altora Resto, hanya daftar yang SUDAH ditemukan lewat audit
   yang sudah dilakukan.

c. **Tidak ada kode aplikasi/handler sama sekali di repo ini.** Seluruh
   correction loop (14 batch domain + traceability-sync + verifikasi final
   ini) beroperasi murni di lapisan schema/kontrak/dokumentasi, sesuai
   instruksi eksplisit correction-loop untuk TIDAK membangun fitur produksi
   dulu. Ini berarti kriteria closure (a) "commit perbaikan tersedia" hanya
   benar untuk perbaikan schema/dokumen, TIDAK untuk perbaikan
   kode/perilaku runtime - karena kode/perilaku runtime itu belum ada untuk
   diperbaiki.

d. **Constraint database kritis belum pernah dieksekusi.** 5 file SQL
   manual (partial unique index, XOR check, append-only guard) yang
   menegakkan invariant bisnis penting hanya ada sebagai file `.sql` yang
   belum pernah dijalankan terhadap database manapun - invariant terkait
   HANYA ditegakkan di level aplikasi (yang belum ada kodenya, lihat (c)),
   sehingga saat ini TIDAK ditegakkan sama sekali secara nyata.

e. **Test yang ada seluruhnya test struktur, bukan test integrasi.** 22
   file test arsitektur memverifikasi BENTUK schema/tipe Prisma Client
   (lewat parsing teks atau pengecekan tipe TypeScript), bukan perilaku
   runtime nyata terhadap data. Tidak ada assertion yang menulis/membaca
   baris database dan memverifikasi hasilnya.

f. **69 kode permission belum diaudit penuh untuk konsistensi tiga sumber**
   (`MASTER-CHECKLIST.md`, `PERMISSION-MATRIX.md`, `prisma/seed/izin.seed.ts`) -
   sisa pekerjaan terbuka dari `ALT-DEF-034`.

Correction loop ini menyatakan status, bukan penyelesaian. Batch berikutnya
(jika ada) perlu memutuskan: (1) apakah melanjutkan audit ke 7 domain yang
belum tersentuh, (2) apakah mulai menjalankan test integrasi nyata memakai
Postgres lokal yang sekarang terbukti tersedia, atau (3) apakah mulai
menulis kode aplikasi pertama - ketiganya keputusan produk/prioritas yang
di luar cakupan dokumen status ini.
