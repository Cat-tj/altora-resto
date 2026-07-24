# @altora/web

Aplikasi Next.js (App Router) yang menjadi:

- Web app internal untuk staf: kasir, dapur, pelayan, persediaan, pembelian, karyawan, analitik, administrasi (`/resto/*`).
- PWA yang sama juga dibungkus oleh `apps/mobile` (Capacitor) dan `apps/desktop` (Tauri).
- API backend versi `/api/v1` untuk semua paket domain di `packages/*`.
- Halaman publik pemesanan pelanggan lewat QR (`/pesan/{token}`).

## Domain boundary

`apps/web` adalah lapisan komposisi (composition layer): mengimpor paket bisnis dari `packages/*` dan merangkainya jadi route/halaman/endpoint. Tidak boleh berisi logika domain inti - logika domain harus tinggal di `packages/*` agar bisa dipakai ulang oleh scheduler/worker/CLI di masa depan.

Lihat `docs/ui-ux/ROUTE-MAP.md` untuk peta route lengkap dan `docs/api/` untuk kontrak API.

## Status

Scaffold awal - belum ada implementasi halaman/route.
