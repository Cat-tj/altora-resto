# @altora/pesanan

Domain pesanan (order) lintas kanal (kasir, pelayan, QR pelanggan). Mengekspos read-contract 'kontrak-dapur' khusus untuk dibaca packages/dapur. Paket lain tidak boleh menulis pesanan lewat jalur lain.

## Status

Scaffold awal - belum ada implementasi. Lihat `docs/engineering/ENGINEERING-LOOP-PLAN.md` untuk urutan pengerjaan.

## Boleh diimpor oleh

Ditentukan oleh `.dependency-cruiser.cjs` di root repo. Jalankan `pnpm depcheck` untuk memvalidasi.
