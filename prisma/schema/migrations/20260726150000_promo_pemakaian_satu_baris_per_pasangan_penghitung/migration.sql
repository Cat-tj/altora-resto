-- ALT-DEF-038 (menutup): redesain PromoPemakaian - SELALU tepat satu baris
-- per pasangan (pesananId, promoId), dengan `jumlahPenerapan` sebagai
-- penghitung berapa kali promo repeatable itu efektif terpicu dalam SATU
-- pesanan (bukan lagi banyak baris PromoPemakaian untuk promo yang sama).
-- Lihat catatan desain panjang di schema.prisma pada model PromoPemakaian,
-- ADR-038 di docs/engineering/DECISION-LOG.md, dan DEFECT-LEDGER.md
-- ALT-DEF-038 untuk rasional lengkap. Diff bagian AlterTable/CreateIndex di
-- bawah dihasilkan `prisma migrate diff --from-schema-datasource
-- --to-schema-datamodel` (lihat catatan proses migrasi manual di
-- CLAUDE.md/README), diterapkan ke altora_resto_dev via psql, di-resolve
-- --applied.

-- DropIndex
-- Indeks non-unik lama (promoId, pesananId) - diganti oleh unique index di
-- bawah yang urutan kolomnya (pesananId, promoId) juga melayani query yang
-- sama ("promo apa saja sudah dipakai di pesanan ini" - WHERE pesananId = $1),
-- jadi tidak ada indeks yang hilang secara fungsional.
DROP INDEX "promo_pemakaian_promoId_pesananId_idx";

-- AlterTable
ALTER TABLE "promo_pemakaian" ADD COLUMN     "jumlahPenerapan" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "totalDiskon" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "promo_pemakaian_baris" ADD COLUMN     "nomorPenerapan" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
-- ALT-DEF-038 INTI PERBAIKAN: constraint STATIS murni dalam satu tabel -
-- SELALU tepat satu baris PromoPemakaian per pasangan (pesananId, promoId),
-- tanpa pengecualian repeatable (lihat catatan desain di schema.prisma).
CREATE UNIQUE INDEX "promo_pemakaian_pesananId_promoId_key" ON "promo_pemakaian"("pesananId", "promoId");

-- ============================================================================
-- Trigger: batas jumlahPenerapan lintas-tabel (ALT-DEF-038 sisi DB, INV-008)
-- ============================================================================
-- Predicate ini butuh membaca `Promo.repeatable`/`Promo.usageLimitPerOrder` di
-- tabel LAIN - kategori yang sama seperti `cek_stok_bahan_negatif` (ADR-037,
-- migrasi 20260726140000) yang membaca `pengaturan_persediaan_outlet` dari
-- tabel `stok_bahan`. Trigger di sini JAUH lebih sederhana daripada trigger
-- lintas-tabel yang tadinya dianggap perlu untuk ALT-DEF-038 versi LAMA
-- (mendeteksi "apakah INSERT ini secara konseptual adalah insert ke-N dari
-- baris yang berulang") - di sini cukup membandingkan SATU integer
-- (`jumlahPenerapan`) terhadap batas yang dibaca dari `Promo`, karena bentuk
-- datanya sudah direstrukturisasi supaya selalu satu baris per pasangan.
--
-- Aturan:
--   (a) `Promo.repeatable = false` -> `jumlahPenerapan` TIDAK BOLEH > 1.
--   (b) `Promo.usageLimitPerOrder` (nullable = tak terbatas) -> jika terisi,
--       `jumlahPenerapan` TIDAK BOLEH melebihinya, terlepas dari repeatable.
--   (c) `jumlahPenerapan` TIDAK BOLEH < 1 (baris ini merepresentasikan promo
--       yang SUDAH diterapkan minimal sekali - kalau belum diterapkan sama
--       sekali, baris headernya semestinya belum ada).
--
-- CATATAN JUJUR soal konkurensi (sama seperti `cek_stok_bahan_negatif`
-- ADR-037): trigger ini menolak COMMIT APA PUN yang melanggar batas SAAT
-- TULIS, terlepas dari race, PERSIS karena Postgres mengunci baris yang
-- di-UPDATE - dua UPDATE bersamaan atas baris PromoPemakaian YANG SAMA
-- otomatis diserialkan selama service-layer menulis lewat SATU pernyataan
-- atomik (`UPDATE promo_pemakaian SET "jumlahPenerapan" = "jumlahPenerapan" + 1
-- WHERE id = $1`), bukan pola baca-lalu-tulis. Trigger ini adalah lapisan
-- KEDUA (defense-in-depth) terhadap bug/race, BUKAN pengganti disiplin
-- transaksi aplikasi (lihat INV-023 untuk separuh app-level: baca
-- `Promo.repeatable` SEBELUM increment).
CREATE FUNCTION promo_pemakaian_cek_batas_penerapan() RETURNS trigger AS $$
DECLARE
  v_repeatable BOOLEAN;
  v_limit INTEGER;
BEGIN
  IF NEW."jumlahPenerapan" < 1 THEN
    RAISE EXCEPTION 'PromoPemakaian %: jumlahPenerapan harus >= 1 (dapat %), promo % pesanan %', NEW.id, NEW."jumlahPenerapan", NEW."promoId", NEW."pesananId";
  END IF;

  SELECT p.repeatable, p."usageLimitPerOrder" INTO v_repeatable, v_limit
    FROM "promo" p
    WHERE p.id = NEW."promoId" AND p."tenantId" = NEW."tenantId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PromoPemakaian %: promoId % tidak ditemukan di tenant %', NEW.id, NEW."promoId", NEW."tenantId";
  END IF;

  IF v_repeatable IS NOT TRUE AND NEW."jumlahPenerapan" > 1 THEN
    RAISE EXCEPTION 'PromoPemakaian %: promo % repeatable=false tidak boleh jumlahPenerapan > 1 (dapat %) - ALT-DEF-038/INV-008', NEW.id, NEW."promoId", NEW."jumlahPenerapan";
  END IF;

  IF v_limit IS NOT NULL AND NEW."jumlahPenerapan" > v_limit THEN
    RAISE EXCEPTION 'PromoPemakaian %: promo % usageLimitPerOrder=% dilampaui oleh jumlahPenerapan=% - ALT-DEF-038/INV-008', NEW.id, NEW."promoId", v_limit, NEW."jumlahPenerapan";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_promo_pemakaian_cek_batas_penerapan
  BEFORE INSERT OR UPDATE ON "promo_pemakaian"
  FOR EACH ROW
  EXECUTE FUNCTION promo_pemakaian_cek_batas_penerapan();
