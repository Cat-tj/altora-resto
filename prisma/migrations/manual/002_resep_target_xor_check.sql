-- ============================================================================
-- ARSIP HISTORIS - TIDAK DIJALANKAN OLEH TOOLING APA PUN.
-- Konten file ini sudah dipindahkan (diaudit ulang, satu bug diperbaiki - lihat
-- ADR-031) ke migrasi resmi Prisma:
--   prisma/schema/migrations/20260725154310_harden_manual_invariants/migration.sql
-- Folder prisma/migrations/manual/ dipertahankan HANYA sebagai jejak audit siapa
-- menulis apa dan kapan (dan karena beberapa test arsitektur di
-- packages/test-support/src/architecture/ masih membaca file ini sebagai teks
-- untuk memverifikasi draft desain awal). JANGAN jalankan file ini secara manual
-- terhadap database mana pun - migrasi resmi di atas adalah satu-satunya sumber
-- kebenaran yang benar-benar diterapkan.
-- ============================================================================

-- ALT-DEF-007 / ALT-RSP-001 / ALT-RSP-003 / ALT-RSP-005 / ADR-022 Keputusan 2
--
-- CHECK constraint: sebuah `Resep` menargetkan TEPAT SATU dari tiga sasaran
-- (item menu, varian menu, atau bahan hasil/subresep) - invariant XOR.
--
-- MENGAPA FILE SQL TERPISAH, BUKAN DI schema.prisma:
-- DSL Prisma (v5.x) tidak dapat mengekspresikan CHECK constraint sama sekali.
-- Alternatif yang SEMPAT dipertimbangkan dan DITOLAK:
--   (a) Tiga model terpisah (`ResepItemMenu`/`ResepVarian`/`ResepSubresep`) -
--       XOR menjadi terjamin struktural, TAPI `VersiResep`, `KomponenResep`,
--       `ProsesProduksi`, dan `ItemPesanan.resepVersiId` harus bercabang tiga
--       kali (tiga FK nullable atau tiga tabel versi), memindahkan masalah XOR
--       satu lapis ke bawah dan memperbanyaknya, bukan menghilangkannya.
--   (b) Kolom diskriminator `jenisSasaran` + satu kolom `sasaranId` polimorfik -
--       DITOLAK karena membuang FK sungguhan (tidak ada referential integrity
--       ke tabel mana pun), yang justru pelanggaran yang lebih berat daripada
--       XOR yang tak tertegakkan.
--
-- STATUS EKSEKUSI: BELUM PERNAH DIJALANKAN terhadap Postgres nyata. Tidak ada
-- database di environment correction-loop ini (lihat ALT-DEF-029 di
-- docs/engineering/DEFECT-LEDGER.md). Sama seperti
-- 001_konfigurasi_qris_partial_unique.sql, file ini WAJIB disertakan pada
-- migrasi pertama yang benar-benar dijalankan; sampai saat itu invariant XOR
-- HANYA dijaga guard level-aplikasi dan TIDAK terjamin di level data. Jangan
-- menganggapnya sudah ditegakkan.
--
-- CATATAN NAMA KOLOM: skema memakai `@@map` di level MODEL saja (nama tabel
-- snake_case), TIDAK memakai `@map` di level field - nama kolom nyata di
-- Postgres tetap camelCase dan HARUS dikutip ganda.

ALTER TABLE resep
    ADD CONSTRAINT resep_sasaran_xor CHECK (
        (
            (CASE WHEN "itemMenuId"   IS NULL THEN 0 ELSE 1 END)
          + (CASE WHEN "varianMenuId" IS NULL THEN 0 ELSE 1 END)
          + (CASE WHEN "bahanHasilId" IS NULL THEN 0 ELSE 1 END)
        ) = 1
    );
