# @altora/ui

Pustaka komponen UI generik (button, table, modal, form field, dsb) memakai token dari packages/desain. TIDAK BOLEH mengimpor paket bisnis apa pun (kasir, persediaan, pesanan, dst) - lihat aturan dependency-cruiser.

## Status

Scaffold awal - belum ada implementasi. Lihat `docs/engineering/ENGINEERING-LOOP-PLAN.md` untuk urutan pengerjaan.

## Boleh diimpor oleh

Ditentukan oleh `.dependency-cruiser.cjs` di root repo. Jalankan `pnpm depcheck` untuk memvalidasi.
