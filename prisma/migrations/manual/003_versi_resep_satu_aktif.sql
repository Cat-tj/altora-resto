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

-- ALT-DEF-007 / ALT-RSP-002 / ADR-022 Keputusan 3
--
-- Partial unique index: "tepat satu VersiResep berstatus AKTIF per Resep".
--
-- MENGAPA FILE SQL TERPISAH, BUKAN DI schema.prisma:
-- Persis masalah yang sama dengan ADR-021 Keputusan 3 (satu KonfigurasiQris
-- AKTIF per outlet): DSL Prisma (v5.x) tidak dapat mengekspresikan
-- partial/filtered unique index (`WHERE ...`). Alternatif
-- `@@unique([resepId, status])` di model VersiResep DITOLAK TEGAS - constraint
-- itu TIDAK menegakkan aturan yang dimaksud dan justru SALAH: ia akan melarang
-- satu resep punya lebih dari satu versi berstatus NONAKTIF/ARSIP, padahal
-- riwayat versi lama justru WAJIB boleh menumpuk (tidak ada hard-delete,
-- ADR-006) dan JUSTRU merupakan seluruh alasan keberadaan model VersiResep.
-- Constraint palsu yang tampak menegakkan aturan lebih berbahaya daripada
-- tidak ada constraint sama sekali, karena ia mematikan kewaspadaan reviewer
-- berikutnya.
--
-- Yang benar-benar ADA di schema.prisma adalah `@@unique([resepId, nomorVersi])`
-- (nomor versi tidak pernah dipakai ulang dalam satu resep) - constraint yang
-- BERBEDA dan TIDAK menggantikan aturan satu-AKTIF.
--
-- STATUS EKSEKUSI: BELUM PERNAH DIJALANKAN terhadap Postgres nyata
-- (ALT-DEF-029). Sampai index di bawah benar-benar ada di database, aturan
-- "satu versi AKTIF per resep" HANYA dijaga guard level-aplikasi (nonaktifkan
-- versi lama + aktifkan versi baru dalam SATU transaksi) yang TIDAK aman
-- terhadap race condition dua request bersamaan.
--
-- CATATAN NAMA KOLOM: nama kolom nyata di Postgres camelCase (lihat
-- 001_konfigurasi_qris_partial_unique.sql) dan HARUS dikutip ganda.

CREATE UNIQUE INDEX IF NOT EXISTS versi_resep_satu_aktif_per_resep
    ON versi_resep ("resepId")
    WHERE status = 'AKTIF';
