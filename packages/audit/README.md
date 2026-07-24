# @altora/audit

Audit log lintas domain (siapa melakukan apa, kapan, di outlet mana). Semua paket bisnis menulis ke sini lewat kontrak audit, bukan menulis tabel audit langsung.

## Status

Scaffold awal - belum ada implementasi. Lihat `docs/engineering/ENGINEERING-LOOP-PLAN.md` untuk urutan pengerjaan.

## Boleh diimpor oleh

Ditentukan oleh `.dependency-cruiser.cjs` di root repo. Jalankan `pnpm depcheck` untuk memvalidasi.
