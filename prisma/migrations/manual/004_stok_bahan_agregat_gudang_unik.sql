-- ALT-DEF-008 / ALT-PSD-004 / ALT-PSD-007 / ADR-023 Keputusan 3
--
-- Partial unique index: "tepat satu baris StokBahan AGREGAT LEVEL-GUDANG
-- (lokasiStokId IS NULL) per pasangan (gudangId, bahanId)".
--
-- MENGAPA FILE SQL TERPISAH, BUKAN CUKUP @@unique DI schema.prisma:
-- schema.prisma SUDAH memuat `@@unique([gudangId, bahanId, lokasiStokId])`,
-- dan constraint itu benar-benar berguna - TETAPI ia TIDAK menutup kasus
-- lokasiStokId NULL. Postgres (mengikuti SQL standard) memperlakukan NULL
-- sebagai nilai yang SELALU BERBEDA di dalam unique index, sehingga DUA baris
-- (gudang G, bahan B, NULL) sama-sama diterima tanpa keluhan apa pun.
--
-- Konsekuensi kalau dibiarkan: DUA baris cache saldo level-gudang untuk bahan
-- yang sama. Pembaca yang memakai `findFirst` akan mengambil salah satu secara
-- non-deterministik dan melaporkan saldo yang SALAH SEBAGIAN - kelas bug yang
-- paling sulit dilacak, karena angkanya masuk akal tetapi kurang.
--
-- Alternatif yang DITOLAK:
--   (a) Menjadikan `lokasiStokId` NOT NULL dan mewajibkan setiap Gudang punya
--       satu LokasiStok "DEFAULT". DITOLAK: memaksa seluruh tenant yang tidak
--       peduli sub-lokasi untuk mengelola entitas boneka, dan memindahkan
--       kompleksitas ke setiap query saldo level-gudang.
--   (b) Kolom sentinel (mis. lokasiStokId = '-' untuk agregat). DITOLAK:
--       ia membuat FK ke LokasiStok mustahil, menukar satu masalah dengan
--       masalah referential-integrity yang lebih besar.
--   (c) Menuliskan @@unique yang TAMPAK menutup kasus ini. Tidak ada bentuk
--       @@unique Prisma yang bisa - dan constraint yang tampak menegakkan
--       aturan padahal tidak, mematikan kewaspadaan reviewer berikutnya
--       (prinsip yang sama dengan ADR-021 Keputusan 3 dan ADR-022 Keputusan 3).
--
-- STATUS EKSEKUSI: BELUM PERNAH DIJALANKAN terhadap Postgres mana pun
-- (ALT-DEF-029). Sampai kedua index di bawah benar-benar ada di database,
-- aturan ini HANYA dijaga guard level-aplikasi (upsert dengan where yang
-- memperlakukan NULL secara eksplisit) yang TIDAK aman terhadap race condition
-- dua request bersamaan.
--
-- CATATAN NAMA KOLOM: nama kolom nyata di Postgres camelCase (lihat
-- 001_konfigurasi_qris_partial_unique.sql) dan HARUS dikutip ganda.

CREATE UNIQUE INDEX IF NOT EXISTS stok_bahan_agregat_gudang_unik
    ON stok_bahan ("gudangId", "bahanId")
    WHERE "lokasiStokId" IS NULL;

-- Masalah NULL-semantics yang PERSIS SAMA pada baris opname: schema.prisma
-- memuat `@@unique([stokOpnameId, bahanId, lokasiStokId])`, yang juga tidak
-- menutup kasus lokasiStokId NULL (baris hitung level-gudang). Dua baris
-- opname untuk bahan yang sama menghasilkan DUA mutasi KOREKSI_OPNAME dan
-- karena itu koreksi saldo GANDA saat posting.
CREATE UNIQUE INDEX IF NOT EXISTS stok_opname_baris_agregat_gudang_unik
    ON stok_opname_baris ("stokOpnameId", "bahanId")
    WHERE "lokasiStokId" IS NULL;
