-- AlterTable
ALTER TABLE "alokasi_pembayaran" ALTER COLUMN "jumlah" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "batas_izin" ALTER COLUMN "maksimumDiskonNominal" SET DATA TYPE BIGINT,
ALTER COLUMN "maksimumRefund" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "batch_stok" ALTER COLUMN "hargaPerolehan" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "biaya_operasional" ALTER COLUMN "jumlah" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "catatan_waste" ALTER COLUMN "nilaiKerugian" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "harga_item_outlet" ALTER COLUMN "harga" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "item_pesanan" ALTER COLUMN "hargaSatuan" SET DATA TYPE BIGINT,
ALTER COLUMN "hargaDasarSnapshot" SET DATA TYPE BIGINT,
ALTER COLUMN "hargaVarianSnapshot" SET DATA TYPE BIGINT,
ALTER COLUMN "hargaModifierSnapshot" SET DATA TYPE BIGINT,
ALTER COLUMN "diskonSnapshot" SET DATA TYPE BIGINT,
ALTER COLUMN "pajakSnapshot" SET DATA TYPE BIGINT,
ALTER COLUMN "serviceChargeSnapshot" SET DATA TYPE BIGINT,
ALTER COLUMN "totalBarisSnapshot" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "item_pesanan_modifier" ALTER COLUMN "hargaTambahan" SET DATA TYPE BIGINT,
ALTER COLUMN "hargaSnapshot" SET DATA TYPE BIGINT,
ALTER COLUMN "totalSnapshot" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "koreksi_pembayaran" ALTER COLUMN "jumlahSebelum" SET DATA TYPE BIGINT,
ALTER COLUMN "jumlahSesudah" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "ledger_saldo_toko" ALTER COLUMN "jumlah" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "modifier_opsi" ALTER COLUMN "hargaTambahan" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "mutasi_stok" ALTER COLUMN "hargaPerolehan" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "pelanggan" ALTER COLUMN "saldoTokoCache" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "pembayaran" ALTER COLUMN "jumlah" SET DATA TYPE BIGINT,
ALTER COLUMN "totalDiterima" SET DATA TYPE BIGINT,
ALTER COLUMN "kembalian" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "pembayaran_metode_baris" ALTER COLUMN "jumlah" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "pembayaran_refund" ALTER COLUMN "jumlah" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "penerimaan_barang_baris" ALTER COLUMN "hargaSatuanAktual" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "pesanan" ALTER COLUMN "subtotal" SET DATA TYPE BIGINT,
ALTER COLUMN "totalDiskon" SET DATA TYPE BIGINT,
ALTER COLUMN "totalPajak" SET DATA TYPE BIGINT,
ALTER COLUMN "totalServiceCharge" SET DATA TYPE BIGINT,
ALTER COLUMN "totalAkhir" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "promo_pemakaian_baris" ALTER COLUMN "nilaiDiskon" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "promo_reward" ALTER COLUMN "nilaiNominal" SET DATA TYPE BIGINT,
ALTER COLUMN "hargaPaket" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "purchase_order" ALTER COLUMN "totalEstimasi" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "purchase_order_baris" ALTER COLUMN "hargaSatuan" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "rekap_kas_harian" ALTER COLUMN "totalPenjualan" SET DATA TYPE BIGINT,
ALTER COLUMN "totalRefund" SET DATA TYPE BIGINT,
ALTER COLUMN "totalDiskon" SET DATA TYPE BIGINT,
ALTER COLUMN "selisihKas" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "rm_kinerja_karyawan_harian" ALTER COLUMN "totalPenjualanDitangani" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "rm_penjualan_harian" ALTER COLUMN "totalPenjualan" SET DATA TYPE BIGINT,
ALTER COLUMN "totalDiskon" SET DATA TYPE BIGINT,
ALTER COLUMN "totalRefund" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "rm_penjualan_item_harian" ALTER COLUMN "totalPenjualan" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "transaksi_kasir" ALTER COLUMN "jumlah" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "varian_menu" ALTER COLUMN "hargaTambahan" SET DATA TYPE BIGINT;

