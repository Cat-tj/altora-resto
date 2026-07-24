# Altora Resto

Altora Resto adalah sistem operasional restoran/F&B **multi-tenant, multi-outlet**: kasir (POS), pesanan, dapur (KDS), aplikasi pelayan, manajemen meja & reservasi, persediaan & pembelian, resep & menu, promo & keanggotaan, karyawan & absensi, keuangan internal, analitik, serta pemesanan mandiri pelanggan via QR (`/pesan/{token}`).

> Status: **tahap scaffold**. Repo ini baru berisi struktur monorepo, dokumen perencanaan wajib, dan skema database awal. Implementasi fitur akan dikerjakan bertahap per loop, dimulai dari alur inti Kasir → Pesanan → Dapur → Meja → Pembayaran (QRIS manual). Lihat `docs/engineering/ENGINEERING-LOOP-PLAN.md`.

## Arsitektur singkat

- **Monorepo**: pnpm workspaces + turborepo, TypeScript strict di semua paket.
- **apps/web**: Next.js (App Router) — melayani web, PWA, dan API backend (`/api/v1`).
- **apps/mobile**: pembungkus Capacitor (Android/iOS) di atas `apps/web`.
- **apps/desktop**: pembungkus Tauri (Windows/macOS/Linux) di atas `apps/web`.
- **packages/**: domain bisnis terpisah per paket (kasir, pesanan, dapur, persediaan, dst) plus paket lintas domain (`platform`, `autentikasi`, `tenant`, `otorisasi`, `audit`, `desain`, `ui`, ...).
- **Database**: PostgreSQL via Prisma (`prisma/schema`).
- **Validasi**: Zod. **Unit/integration test**: Vitest. **E2E**: Playwright.

Detail lebih lanjut ada di `docs/arsitektur/`, `docs/database/`, `docs/api/`, dan dokumen lain di `docs/`.

## Menjalankan proyek (setelah implementasi dimulai)

```bash
pnpm install
cp .env.example .env        # isi DATABASE_URL, dsb.
pnpm prisma:generate
pnpm dev
```

Perintah berguna lain:

```bash
pnpm lint          # lint semua paket
pnpm typecheck      # cek tipe TypeScript
pnpm test           # unit/integration test (Vitest)
pnpm test:e2e        # E2E (Playwright)
pnpm depcheck        # cek aturan boundary antar paket (dependency-cruiser)
pnpm prisma:validate # validasi skema Prisma
```

## Struktur direktori

```
apps/{web,mobile,desktop}
packages/{platform,autentikasi,tenant,otorisasi,audit,pengaturan,desain,ui,
          kasir,pesanan,pembayaran,qris,meja,reservasi,dapur,pelayan,
          menu,resep,persediaan,pembelian,promo,keanggotaan,
          karyawan,absensi,keuangan,analitik,notifikasi,perangkat,
          dukungan,test-support}
prisma/{schema,migrations,seed}
docs/{arsitektur,keputusan,database,api,keamanan,pengujian,ui-ux,
      operasional,rilis,bukti,engineering}
```

Setiap paket memiliki `README.md` yang menjelaskan batas domainnya (apa yang boleh dan tidak boleh diimpor).
