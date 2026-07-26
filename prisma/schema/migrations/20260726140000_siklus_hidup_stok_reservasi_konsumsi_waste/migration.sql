-- ADR-037: aturan tunggal siklus hidup stok reservasi-konsumsi-waste.
-- Menggantikan bunyi ambigu "reservasi/pengurangan stok" di STATE-MACHINES.md
-- dengan satu aturan tegas:
--   Pesanan DITERIMA                         -> ReservasiStok dibuat (AKTIF)
--   Pesanan DIKIRIM_KE_DAPUR (tiket dibuat)   -> ReservasiStok AKTIF -> DIKONSUMSI
--                                                + MutasiStok(PEMAKAIAN_RESEP) ditulis
--                                                + ditautkan lewat mutasiStokId
--   Pesanan DIBATALKAN sebelum produksi       -> ReservasiStok AKTIF -> DILEPAS,
--                                                TIDAK ADA MutasiStok
--   Void SETELAH produksi (ADR-036)           -> CatatanWaste + MutasiStok(WASTE)
--                                                (mutasiStokId CatatanWaste sudah ada
--                                                sejak ALT-DEF-008, tidak berubah)
--
-- Bagian 1: linkage ReservasiStok <-> MutasiStok (kolom mutasiStokId, nullable,
-- unique, FK composite (tenantId, mutasiStokId) -> mutasi_stok(tenantId, id)) +
-- idempotency (itemPesananId unique - satu ItemPesanan paling banyak SATU
-- reservasi sepanjang hidupnya). Diff ini dihasilkan
-- `prisma migrate diff --from-schema-datasource --to-schema-datamodel` (lihat
-- catatan proses migrasi manual di CLAUDE.md/README), diterapkan ke
-- altora_resto_dev via psql, di-resolve --applied.

-- AlterTable
ALTER TABLE "reservasi_stok" ADD COLUMN     "mutasiStokId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "reservasi_stok_mutasiStokId_key" ON "reservasi_stok"("mutasiStokId");

-- CreateIndex
CREATE UNIQUE INDEX "reservasi_stok_itemPesananId_key" ON "reservasi_stok"("itemPesananId");

-- CreateIndex
CREATE UNIQUE INDEX "reservasi_stok_tenantId_mutasiStokId_key" ON "reservasi_stok"("tenantId", "mutasiStokId");

-- AddForeignKey
ALTER TABLE "reservasi_stok" ADD CONSTRAINT "reservasi_stok_tenantId_mutasiStokId_fkey" FOREIGN KEY ("tenantId", "mutasiStokId") REFERENCES "mutasi_stok"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bagian 2 (ADR-037): trigger "kunci konsumsi" - sekali ReservasiStok.mutasiStokId
-- terisi (baris berpindah AKTIF -> DIKONSUMSI), kolom itu TIDAK BOLEH diubah lagi
-- ke nilai lain (mis. percobaan "konsumsi ulang" yang salah alur menulis mutasi
-- kedua dan menunjuknya ke reservasi yang sama). @unique pada mutasiStokId saja
-- HANYA mencegah dua reservasi menunjuk SATU mutasi yang sama - ia TIDAK mencegah
-- SATU reservasi yang sama dipindah-tunjuk dari mutasi A ke mutasi B lewat UPDATE
-- kedua. Trigger BEFORE UPDATE inilah yang menutup celah itu.
CREATE FUNCTION reservasi_stok_kunci_konsumsi() RETURNS trigger AS $$
BEGIN
  IF OLD."mutasiStokId" IS NOT NULL AND NEW."mutasiStokId" IS DISTINCT FROM OLD."mutasiStokId" THEN
    RAISE EXCEPTION 'ReservasiStok % sudah dikonsumsi (mutasiStokId=%) - tidak boleh dikonsumsi ulang atau ditautkan ke mutasi lain (ADR-037)', OLD.id, OLD."mutasiStokId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reservasi_stok_kunci_konsumsi
  BEFORE UPDATE ON "reservasi_stok"
  FOR EACH ROW
  EXECUTE FUNCTION reservasi_stok_kunci_konsumsi();

-- Bagian 3 (ADR-037, ADR-025 Keputusan 4): penegakan kebijakan stok negatif
-- PER OUTLET (`pengaturan_persediaan_outlet.izinkanStokNegatif`, sudah ada sejak
-- ALT-DEF-008) di level trigger, bukan CHECK statis - CHECK constraint biasa
-- TIDAK BISA membaca kolom di tabel lain (kebijakan per outlet), jadi
-- "stok_bahan.kuantitas >= 0" murni tidak dapat mengekspresikan pengecualian
-- kondisional per-outlet. Trigger ini membaca kebijakan SAAT TULIS (bukan
-- SAAT BACA), sehingga tetap benar meski kebijakan berubah di antara waktu.
--
-- CATATAN JUJUR soal konkurensi (lihat ADR-037 untuk pembahasan penuh): trigger
-- ini menolak COMMIT APA PUN yang membuat kuantitas negatif TANPA IZIN,
-- terlepas dari race - PERSIS karena Postgres mengunci baris yang di-UPDATE
-- (row lock implisit), dua UPDATE bersamaan atas baris StokBahan YANG SAMA
-- otomatis diserialkan selama aplikasi menulis lewat SATU pernyataan atomik
-- (`UPDATE stok_bahan SET kuantitas = kuantitas - $1 WHERE id = $2`), BUKAN
-- pola baca-lalu-tulis (SELECT kuantitas lalu UPDATE dengan nilai literal
-- terhitung di aplikasi). Trigger TIDAK BISA menyelamatkan pola baca-lalu-tulis
-- yang salah - itu tetap murni tanggung jawab service layer (SELECT ... FOR
-- UPDATE, lihat ADR-037 bagian row-locking), dan trigger ini adalah lapisan
-- KEDUA (defense-in-depth), bukan pengganti disiplin transaksi aplikasi.
CREATE FUNCTION cek_stok_bahan_negatif() RETURNS trigger AS $$
DECLARE
  v_outlet_id TEXT;
  v_izinkan BOOLEAN;
BEGIN
  IF NEW.kuantitas < 0 THEN
    SELECT g."outletId" INTO v_outlet_id FROM "gudang" g WHERE g.id = NEW."gudangId";
    SELECT p."izinkanStokNegatif" INTO v_izinkan
      FROM "pengaturan_persediaan_outlet" p
      WHERE p."tenantId" = NEW."tenantId" AND p."outletId" = v_outlet_id;
    -- Tidak ada baris pengaturan sama sekali = belum dikonfigurasi eksplisit,
    -- default TOLAK (sama seperti default kolom Prisma `@default(false)`).
    IF v_izinkan IS NOT TRUE THEN
      RAISE EXCEPTION 'StokBahan bahan % di gudang % tidak boleh negatif (kuantitas=%) - kebijakan outlet izinkanStokNegatif=false atau belum diatur (default tolak, ADR-025/ADR-037)', NEW."bahanId", NEW."gudangId", NEW.kuantitas;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stok_bahan_cek_negatif
  BEFORE INSERT OR UPDATE ON "stok_bahan"
  FOR EACH ROW
  EXECUTE FUNCTION cek_stok_bahan_negatif();
