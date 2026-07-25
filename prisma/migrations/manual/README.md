# ARSIP HISTORIS — folder ini TIDAK dijalankan oleh tooling apa pun

Konten kelima file di folder ini (`001` s.d. `005`) sudah dipindahkan — diaudit ulang,
satu bug logika diperbaiki (lihat `docs/engineering/DECISION-LOG.md` ADR-031) — ke
migrasi resmi Prisma:

```
prisma/schema/migrations/20260725154310_harden_manual_invariants/migration.sql
```

Migrasi resmi di atas sudah diterapkan ke `altora_resto_dev` dan diverifikasi lewat
test integrasi database nyata di `packages/test-support/src/database-integration/`.

Folder ini dipertahankan (bukan dihapus) karena dua alasan:

1. **Jejak audit** — mencatat siapa menulis rasional desain apa dan kapan (ADR-021
   s.d. ADR-024 merujuk file-file ini secara eksplisit).
2. **Referensi test arsitektur yang sudah ada** — beberapa test di
   `packages/test-support/src/architecture/` (`qris-konfigurasi-constraints.test.ts`,
   `resep-versi-produksi-constraints.test.ts`,
   `persediaan-ledger-reservasi-constraints.test.ts`) membaca file-file ini sebagai teks
   untuk memverifikasi draft desain awal (sebelum migrasi resmi ada). Test-test itu
   TIDAK dipindahkan ke sumber baru pada batch ini karena scope batch ini adalah
   database-integration, bukan menulis ulang test arsitektur yang sudah lulus.

**JANGAN** menjalankan file `.sql` di folder ini secara manual (`psql -f ...`) terhadap
database mana pun — Prisma CLI tidak tahu folder ini ada sama sekali (`prisma migrate
deploy`/`prisma migrate dev` hanya membaca `prisma/schema/migrations/`), dan
menjalankannya manual akan menerapkan versi SEBELUM-audit yang mengandung bug rantai
pembalik-dari-pembalik yang sudah diperbaiki di migrasi resmi (lihat ADR-031).
