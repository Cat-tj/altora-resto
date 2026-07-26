-- AlterTable
ALTER TABLE "giliran_kasir" ALTER COLUMN "modalAwal" SET DATA TYPE BIGINT,
ALTER COLUMN "modalAkhirDihitung" SET DATA TYPE BIGINT,
ALTER COLUMN "modalAkhirSistem" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "promo" ALTER COLUMN "maximumDiscount" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "versi_resep" ALTER COLUMN "snapshotBiaya" SET DATA TYPE BIGINT;

