# @altora/test-support

Utilitas bersama untuk pengujian (factory data uji, mock tenant/outlet, helper Playwright/Vitest). Hanya boleh diimpor dari file test (*.test.ts, *.spec.ts, e2e/**), tidak dari kode produksi.

## Status

`src/architecture/` berisi test struktur/arsitektur pertama (ALT-DEF-001,
ALT-DEF-002):

- `keanggotaan-outlet-constraints.test.ts` - membaca teks
  `prisma/schema/schema.prisma` dan memverifikasi constraint composite-FK
  tenant-outlet serta model Izin/Peran/PeranIzin ternormalisasi benar-benar
  ada. Dijalankan nyata via `node --experimental-strip-types` pada pass ini
  (lihat `docs/engineering/RELEASE-EVIDENCE.md`) karena `vitest` belum
  terinstal di environment ini (tidak ada pnpm) - DIBLOKIR untuk dijalankan
  lewat `pnpm test` sampai harness test tersedia (ALT-DEF-027).
- `prisma-client-shape.test.ts` - type-check compile-time (`tsc --noEmit`)
  atas tipe `Prisma.*CreateInput` yang di-generate untuk model baru.

Selain itu, paket ini masih scaffold awal untuk kebutuhan test lain (factory
data uji, mock tenant/outlet, helper Playwright/Vitest) - lihat
`docs/engineering/ENGINEERING-LOOP-PLAN.md` untuk urutan pengerjaan.

## Boleh diimpor oleh

Ditentukan oleh `.dependency-cruiser.cjs` di root repo. Jalankan `pnpm depcheck` untuk memvalidasi.
