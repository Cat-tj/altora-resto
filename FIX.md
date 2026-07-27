# FIX.md — Yang Masih Perlu Dikerjakan (Altora Resto)

Dokumen ini untuk agent/developer yang melanjutkan project ini nanti. Baca ini
dulu sebelum menyentuh apa pun — supaya tidak mengulang analisis yang sudah
pernah dilakukan atau salah asumsi soal apa yang sudah beres.

## Orientasi cepat: dokumen mana yang harus dibaca dulu

1. `docs/engineering/CORRECTION-LOOP-STATUS.md` — status akhir correction loop terakhir (paling penting, baca ini duluan).
2. `docs/engineering/DEFECT-LEDGER.md` — 56 defect tercatat, per ID, dengan status dan rencana koreksi.
3. `docs/engineering/MASTER-CHECKLIST.md` — 255 requirement granular, status `BELUM DIKERJAKAN` semua (belum ada fitur yang diimplementasi).
4. `docs/engineering/INVARIAN-BELUM-DITEGAKKAN.md` — daftar invariant bisnis dan status penegakannya (DB-enforced vs app-level vs belum sama sekali).
5. `docs/engineering/DECISION-LOG.md` — ADR-001 sampai ADR-043, semua keputusan arsitektur dengan alasannya.

**Jangan percaya buta ke dokumen-dokumen di atas** — sepanjang correction loop berulang kali ditemukan dokumen (termasuk `DEFECT-LEDGER.md` dan `MASTER-CHECKLIST.md` sendiri) punya kesalahan (rencana koreksi yang salah, referensi menggantung, model yang disebut tapi tidak pernah dibuat). Selalu verifikasi silang ke schema/kode nyata sebelum bertindak.

## State environment (penting sebelum menjalankan apa pun)

- **PostgreSQL 16 lokal tersedia** di environment eksekusi (Homebrew, trust-auth, user `icat`). Database dev persisten: `altora_resto_dev`.
- `.env` di root **tidak ter-commit** (gitignored). Isinya harus:
  ```
  DATABASE_URL="postgresql://icat@localhost:5432/altora_resto_dev?schema=public"
  ```
  Kalau pindah environment/mesin lain: buat Postgres baru, `createdb altora_resto_dev`, lalu `pnpm prisma:migrate:deploy` (menjalankan 15 migrasi resmi dari `prisma/schema/migrations/`).
- `pnpm` sekarang **sudah** ter-install dan `pnpm-lock.yaml` **sudah** ter-commit (sempat kehapus di satu batch correction-loop sebagai "artefak nyasar" — itu keputusan salah, sudah diperbaiki 2026-07-27, jangan dihapus lagi).
- Migrasi resmi ada di `prisma/schema/migrations/` (BUKAN `prisma/migrations/` — lokasi ini keputusan sadar, lihat ADR-031).
- Workaround yang sudah terbukti kalau `prisma migrate dev --create-only` diblokir non-interactive: pakai `prisma migrate diff --from-schema-datasource --to-schema-datamodel` → review SQL → apply manual via `psql` → `prisma migrate resolve --applied <name>`.

## Yang sudah ADA (jangan dibangun ulang)

- Schema Prisma lengkap: 135 model, 75 enum, 15 migrasi resmi, semua tervalidasi & teraplikasi ke `altora_resto_dev`.
- 32 trigger + 12 fungsi + 4 CHECK constraint + 273 unique index — **terpasang nyata**, bukan cuma didesain di kertas (diverifikasi lewat query `pg_catalog` langsung).
- 39 file test: 22 test arsitektur (`packages/test-support/src/architecture/`, jalankan `pnpm test:architecture`) + 17 test integrasi Postgres nyata (`packages/test-support/src/database-integration/`, jalankan `pnpm test:database-integration`).
- CI pipeline di `.github/workflows/ci.yml` (11 job) — **belum pernah benar-benar dijalankan oleh GitHub Actions sungguhan**, baru diverifikasi sebagai proxy lokal.
- Deploy Vercel untuk `apps/web` sudah diperbaiki (`vercel.json` men-scope build ke `@altora/web` saja) dan ada satu halaman placeholder (`apps/web/src/app/page.tsx`) yang sudah terbukti build & jalan.
- 10 defect benar-benar `DITUTUP` dengan bukti migrasi+test+redeploy lengkap: `ALT-DEF-038, 043, 046, 049, 050, 051, 052, 053, 054, 055`.

## PRIORITAS — urutkan dari yang paling mendesak

### 1. Tidak ada kode aplikasi sama sekali
Ini yang paling fundamental. Semua yang dibangun sejauh ini adalah lapisan schema/database/kontrak/dokumentasi — **nol** endpoint API, nol handler transaksi, nol layar kasir/dapur/dll yang benar-benar berfungsi. `apps/web` cuma punya satu halaman placeholder statis. Sebelum fitur apa pun bisa dibangun, putuskan titik masuk pertama — biasanya autentikasi (login + sesi) jadi fondasi paling masuk akal karena hampir semua fitur lain butuh identitas pengguna yang tervalidasi.

### 2. 25 defect KRITIS/TINGGI masih terbuka (`DEFECT-LEDGER.md`)
Sebagian besar (`SIAP_DIVERIFIKASI`/`DIKONFIRMASI`) memang menunggu kode handler yang belum ada — itu wajar, bukan bug. Tapi beberapa berdiri sendiri dan bisa dikerjakan sekarang:
- **`ALT-DEF-056` (TINGGI?, cek severity asli)** — ESLint rusak total. Direferensikan di `lint` script setiap package tapi **tidak pernah ter-install** dan tidak ada `eslint.config.*` di repo. CI job `lint` dijamin merah. Butuh setup ESLint nyata lintas ~30 package.
- **`ALT-DEF-042` (SEDANG, sub-gap masih terbuka)** — 3 model direferensikan requirement tapi tidak pernah dibuat: `UndanganTenant` (undang pengguna ke tenant), `BackupJob` (backup/restore), `AntrianCetak` (printer queue).
- **`ALT-DEF-047`, `ALT-DEF-045`, `ALT-DEF-029`, dll** — baca satu-satu di ledger, banyak yang butuh keputusan implementasi (bukan cuma "tunggu kode"), misalnya `ALT-DEF-029` soal Postgres yang tersedia di environment INI tapi tidak menjamin tersedia di environment lain (CI, production).

Baca ledger lengkap, jangan cuma percaya ringkasan ini — daftar di atas bukan daftar lengkap 25 defect, cuma contoh yang paling actionable.

### 3. 7 dari 17 domain belum pernah diaudit sama sekali
Domain berikut TIDAK PERNAH dapat batch correction-loop khusus (cuma tersentuh insidental lewat perubahan lintas-domain seperti isolasi tenant/field uang):
- Menu (`ALT-MNU`)
- Pembelian (`ALT-BEL`)
- Meja & Reservasi — sebagian besar, di luar isolasi tenant dasar (`ALT-MJ`)
- Pelayan (`ALT-PLY`)
- Analitik (`ALT-ANL`)
- UI/UX (`ALT-UX`)
- Security — sebagian besar (`ALT-SEC`)

**3 race condition finansial nyata ditemukan dan diperbaiki** di domain yang SUDAH diaudit (kuota promo, reservasi stok, alokasi pembayaran ganda — lihat `ALT-DEF-051/052/053`, sudah `DITUTUP`). Itu bukan bukti cuma ada 3 — kemungkinan besar masih ada bug/race serupa yang tersembunyi di 7 domain yang belum pernah disentuh sama sekali. Kalau mau audit lanjutan, pola kerja yang sudah terbukti efektif: baca `docs/engineering/DECISION-LOG.md` ADR-032 s.d. ADR-042 untuk pola trigger/lock yang sudah dipakai, lalu terapkan disiplin yang sama (migrasi resmi + test integrasi Postgres nyata dengan dua koneksi konkuren, bukan cuma test baca teks schema) ke domain yang belum tersentuh.

### 4. CI belum pernah dijalankan oleh GitHub Actions sungguhan
`.github/workflows/ci.yml` sudah dibuat dan setiap job sudah diverifikasi SEBAGAI PROXY lokal (jalankan command yang sama secara manual). Tapi belum ada satu run asli dari GitHub Actions. Push ke GitHub dan cek tab Actions — kemungkinan ada masalah environment-spesifik (pnpm lockfile resolution, versi Node, service container Postgres) yang cuma ketahuan dari run sungguhan.

### 5. `TRACEABILITY-MATRIX.md` (255 baris) sudah basi
Header-nya sendiri masih bilang "133 model" padahal sekarang 135 — bukti dia tidak pernah disentuh sepanjang deep correction loop (yang update `INVARIAN-BELUM-DITEGAKKAN.md`/`DEFECT-LEDGER.md` sebagai gantinya). Butuh sinkronisasi ulang penuh kalau mau dipakai sebagai referensi akurat.

### 6. Halaman placeholder belum pakai design system
`apps/web/src/app/page.tsx` masih inline style polos. `packages/desain` dan `packages/ui` sudah dibuat di scaffold awal (token warna/spacing/tipografi per section 9 master prompt) tapi belum pernah dipakai oleh halaman nyata mana pun.

## Kendala teknis yang perlu diketahui sebelum lanjut

Baca `docs/engineering/CATATAN-KENDALA-SESI.md` untuk daftar lengkap kendala yang sudah pernah terjadi dan cara menanganinya — termasuk:
- Test arsitektur rentan false-positive setelah `prisma format` (whitespace shift).
- Constraint yang terlihat benar tapi sebenarnya salah (mis. `@@unique` yang seharusnya partial index) — pola ini muncul berkali-kali, selalu pertimbangkan NULL-semantics dan cross-row invariant sebelum percaya sebuah `@@unique` benar-benar menegakkan aturan yang dimaksud.
- Sesi agent bisa terputus rate-limit di tengah kerja — selalu commit bertahap (commit as you go), jangan simpan semua perubahan sampai akhir batch.
- Baca `docs/engineering/AUDIT-CONCURRENCY-COVERAGE.md` untuk pola test dua-koneksi-konkuren yang sudah terbukti efektif menemukan race condition nyata.

## Cara verifikasi sebelum klaim "beres"

Jangan pernah menyatakan sesuatu "lulus"/"beres" tanpa menjalankannya nyata. Command yang harus dijalankan dan hasilnya dilaporkan apa adanya:
```bash
pnpm prisma:format
pnpm prisma:validate
pnpm prisma:generate
pnpm test:architecture
pnpm test:database-integration
pnpm depcheck
npx tsc --noEmit -p packages/test-support
```
Kalau mengubah schema: buat migrasi resmi (bukan SQL manual di luar `prisma/schema/migrations/`), lalu verifikasi dengan drop+recreate database kosong + `pnpm prisma:migrate:deploy` untuk memastikan migrasi benar-benar reproducible dari nol.

**Jangan pernah menyatakan project "selesai".** Baca `docs/engineering/CORRECTION-LOOP-STATUS.md` untuk daftar lengkap kondisi yang harus terpenuhi sebelum ada klaim seperti itu.
