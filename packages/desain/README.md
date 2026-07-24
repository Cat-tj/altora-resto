# @altora/desain

Design tokens murni (CSS variable / objek TS): warna aksen per app, spacing, radius, tipografi, breakpoint. TIDAK BOLEH mengimpor paket lain apa pun di monorepo ini (lihat .dependency-cruiser.cjs).

## Status

Scaffold awal - belum ada implementasi. Lihat `docs/engineering/ENGINEERING-LOOP-PLAN.md` untuk urutan pengerjaan.

## Boleh diimpor oleh

Ditentukan oleh `.dependency-cruiser.cjs` di root repo. Jalankan `pnpm depcheck` untuk memvalidasi.
