# @altora/analitik

Read-model & dashboard analitik lintas domain. HANYA boleh membaca dari read-model (tabel/tipe read-model Prisma atau modul */read-model), TIDAK PERNAH mengakses tabel transaksional mentah secara langsung.

## Status

Scaffold awal - belum ada implementasi. Lihat `docs/engineering/ENGINEERING-LOOP-PLAN.md` untuk urutan pengerjaan.

## Boleh diimpor oleh

Ditentukan oleh `.dependency-cruiser.cjs` di root repo. Jalankan `pnpm depcheck` untuk memvalidasi.
