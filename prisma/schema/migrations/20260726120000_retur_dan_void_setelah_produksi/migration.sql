-- CreateEnum
CREATE TYPE "StatusRetur" AS ENUM ('DRAF', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'DIPROSES', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusRingkasanRetur" AS ENUM ('TANPA_RETUR', 'RETUR_SEBAGIAN', 'RETUR_PENUH');

-- CreateEnum
CREATE TYPE "JenisPembatalan" AS ENUM ('SEBELUM_PRODUKSI', 'SETELAH_PRODUKSI');

-- AlterEnum
BEGIN;
CREATE TYPE "StatusPesanan_new" AS ENUM ('DRAF', 'DIKIRIM', 'MENUNGGU_PERSETUJUAN', 'DITERIMA', 'DITOLAK', 'MENUNGGU_PEMBAYARAN', 'DIKONFIRMASI', 'DIKIRIM_KE_DAPUR', 'SEDANG_DISIAPKAN', 'SIAP', 'DISAJIKAN', 'SELESAI', 'DIBATALKAN');
ALTER TABLE "pesanan" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "pesanan" ALTER COLUMN "status" TYPE "StatusPesanan_new" USING ("status"::text::"StatusPesanan_new");
ALTER TABLE "pesanan_riwayat_status" ALTER COLUMN "statusSebelumnya" TYPE "StatusPesanan_new" USING ("statusSebelumnya"::text::"StatusPesanan_new");
ALTER TABLE "pesanan_riwayat_status" ALTER COLUMN "statusBaru" TYPE "StatusPesanan_new" USING ("statusBaru"::text::"StatusPesanan_new");
ALTER TYPE "StatusPesanan" RENAME TO "StatusPesanan_old";
ALTER TYPE "StatusPesanan_new" RENAME TO "StatusPesanan";
DROP TYPE "StatusPesanan_old";
ALTER TABLE "pesanan" ALTER COLUMN "status" SET DEFAULT 'DRAF';
COMMIT;

-- AlterTable
ALTER TABLE "pesanan" ADD COLUMN     "statusRetur" "StatusRingkasanRetur" NOT NULL DEFAULT 'TANPA_RETUR';

-- AlterTable
ALTER TABLE "pesanan_pembatalan" ADD COLUMN     "disetujuiOlehId" TEXT,
ADD COLUMN     "jenisPembatalan" "JenisPembatalan" NOT NULL DEFAULT 'SEBELUM_PRODUKSI';

-- AlterTable
ALTER TABLE "tiket_dapur" ADD COLUMN     "alasanPembatalan" TEXT;

-- CreateTable
CREATE TABLE "pesanan_retur" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "pesananId" TEXT NOT NULL,
    "nomorRetur" TEXT NOT NULL,
    "status" "StatusRetur" NOT NULL DEFAULT 'DRAF',
    "alasan" TEXT NOT NULL,
    "diajukanOlehId" TEXT NOT NULL,
    "disetujuiOlehId" TEXT,
    "totalNilaiRetur" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "pesanan_retur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pesanan_retur_baris" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pesananReturId" TEXT NOT NULL,
    "itemPesananId" TEXT NOT NULL,
    "kuantitasDikembalikan" INTEGER NOT NULL,
    "nilaiPengembalian" BIGINT NOT NULL,
    "alasanBaris" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pesanan_retur_baris_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pesanan_retur_tenantId_outletId_nomorRetur_key" ON "pesanan_retur"("tenantId", "outletId", "nomorRetur");

-- CreateIndex
CREATE UNIQUE INDEX "pesanan_retur_tenantId_id_key" ON "pesanan_retur"("tenantId", "id");

-- AddForeignKey
ALTER TABLE "pesanan_pembatalan" ADD CONSTRAINT "pesanan_pembatalan_tenantId_disetujuiOlehId_fkey" FOREIGN KEY ("tenantId", "disetujuiOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_retur" ADD CONSTRAINT "pesanan_retur_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_retur" ADD CONSTRAINT "pesanan_retur_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_retur" ADD CONSTRAINT "pesanan_retur_tenantId_pesananId_fkey" FOREIGN KEY ("tenantId", "pesananId") REFERENCES "pesanan"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_retur" ADD CONSTRAINT "pesanan_retur_tenantId_outletId_diajukanOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "diajukanOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_retur" ADD CONSTRAINT "pesanan_retur_tenantId_outletId_disetujuiOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "disetujuiOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_retur_baris" ADD CONSTRAINT "pesanan_retur_baris_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_retur_baris" ADD CONSTRAINT "pesanan_retur_baris_tenantId_pesananReturId_fkey" FOREIGN KEY ("tenantId", "pesananReturId") REFERENCES "pesanan_retur"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_retur_baris" ADD CONSTRAINT "pesanan_retur_baris_itemPesananId_fkey" FOREIGN KEY ("itemPesananId") REFERENCES "item_pesanan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================================
-- ADR-036 (sub-problem D): "tiket batal doesn't block order-ready" butuh, sebagai
-- prasyarat, bahwa tiket DIBATALKAN SELALU membawa alasan (tidak bisa dikecualikan
-- dari guard order-ready secara diam-diam tanpa jejak kenapa). Prisma DSL tidak bisa
-- menyatakan "NOT NULL hanya ketika status = X" secara deklaratif - CHECK manual di
-- bawah menegakkannya di level database (kategori A, lihat
-- INVARIAN-BELUM-DITEGAKKAN.md). Predikat "order ready" itu sendiri
-- (NOT EXISTS tiket aktif yang bukan SIAP/DISAJIKAN/DIBATALKAN) didokumentasikan di
-- STATE-MACHINES.md - TIDAK bisa jadi CHECK constraint (butuh join lintas
-- baris/tabel), murni query-logic level-aplikasi yang didokumentasikan sebagai
-- kontrak, bukan ditegakkan struktural.
-- =====================================================================================
ALTER TABLE "tiket_dapur"
  ADD CONSTRAINT "tiket_dapur_alasan_wajib_saat_dibatalkan"
  CHECK (status <> 'DIBATALKAN'::"StatusTiketDapur" OR "alasanPembatalan" IS NOT NULL);

-- =====================================================================================
-- ADR-036 (sub-problem C): void setelah produksi WAJIB approval supervisor - dicatat
-- di `disetujuiOlehId`. CHECK di bawah menegakkan "wajib diisi HANYA ketika
-- jenisPembatalan = SETELAH_PRODUKSI" di level database (kondisional-per-enum yang
-- sama seperti tiket_dapur di atas) - lebih kuat daripada murni invariant aplikasi.
-- =====================================================================================
ALTER TABLE "pesanan_pembatalan"
  ADD CONSTRAINT "pesanan_pembatalan_approval_wajib_setelah_produksi"
  CHECK ("jenisPembatalan" <> 'SETELAH_PRODUKSI'::"JenisPembatalan" OR "disetujuiOlehId" IS NOT NULL);

-- =====================================================================================
-- ADR-036 (sub-problem B): trigger yang merawat CACHE `Pesanan.statusRetur` secara
-- OTOMATIS setiap kali sebuah `PesananRetur` mencapai status SELESAI - dipilih
-- (bukan app-computed murni) mengikuti pola cache-terjaga-trigger yang sama dengan
-- ledger/saldo lain di proyek ini (lihat ADR-023/ADR-027). CATATAN PENTING (dicatat
-- juga di ADR-036/INVARIAN-BELUM-DITEGAKKAN.md): UPDATE ke tabel `pesanan` di dalam
-- trigger ini SENDIRI memicu trigger `trg_pesanan_bump_version` (ADR-035) - artinya
-- Pesanan.version BERTAMBAH sebagai efek samping penyelesaian retur, bukan hanya
-- karena command yang secara eksplisit mengubah Pesanan. Command layer yang membawa
-- `expectedVersion` dari SEBELUM retur selesai akan gagal optimistic-lock check-nya
-- (WHERE version = expectedVersion) pada percobaan update berikutnya - ini PERILAKU
-- YANG BENAR (mencegah command lama menimpa efek retur), tapi harus diketahui
-- eksplisit oleh pemanggil, bukan mengejutkan.
-- =====================================================================================
CREATE FUNCTION recompute_status_retur_pesanan()
RETURNS TRIGGER AS $$
DECLARE
  v_total_item INTEGER;
  v_item_penuh INTEGER;
  v_ada_retur INTEGER;
BEGIN
  IF NEW.status <> 'SELESAI' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_total_item
  FROM item_pesanan ip
  WHERE ip."pesananId" = NEW."pesananId";

  SELECT count(*) INTO v_item_penuh
  FROM item_pesanan ip
  WHERE ip."pesananId" = NEW."pesananId"
    AND ip.kuantitas <= COALESCE((
      SELECT SUM(prb."kuantitasDikembalikan")
      FROM pesanan_retur_baris prb
      JOIN pesanan_retur pr ON pr.id = prb."pesananReturId"
      WHERE prb."itemPesananId" = ip.id AND pr.status = 'SELESAI'
    ), 0);

  SELECT count(*) INTO v_ada_retur
  FROM pesanan_retur_baris prb
  JOIN pesanan_retur pr ON pr.id = prb."pesananReturId"
  WHERE pr."pesananId" = NEW."pesananId" AND pr.status = 'SELESAI';

  UPDATE pesanan
  SET "statusRetur" = CASE
      WHEN v_ada_retur = 0 THEN 'TANPA_RETUR'
      WHEN v_total_item > 0 AND v_item_penuh >= v_total_item THEN 'RETUR_PENUH'
      ELSE 'RETUR_SEBAGIAN'
    END::"StatusRingkasanRetur"
  WHERE id = NEW."pesananId" AND "tenantId" = NEW."tenantId";

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recompute_status_retur_pesanan
    AFTER UPDATE ON pesanan_retur
    FOR EACH ROW
    WHEN (NEW.status = 'SELESAI' AND OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION recompute_status_retur_pesanan();

