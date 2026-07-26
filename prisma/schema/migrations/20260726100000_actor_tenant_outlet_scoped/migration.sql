-- DropForeignKey
ALTER TABLE "biaya_operasional" DROP CONSTRAINT "biaya_operasional_dicatatOlehId_fkey";

-- DropForeignKey
ALTER TABLE "catatan_waste" DROP CONSTRAINT "catatan_waste_dicatatOlehId_fkey";

-- DropForeignKey
ALTER TABLE "catatan_waste" DROP CONSTRAINT "catatan_waste_disetujuiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "cuti_izin" DROP CONSTRAINT "cuti_izin_disetujuiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "gelombang_dapur" DROP CONSTRAINT "gelombang_dapur_dipicuOlehId_fkey";

-- DropForeignKey
ALTER TABLE "giliran_kasir" DROP CONSTRAINT "giliran_kasir_penggunaId_fkey";

-- DropForeignKey
ALTER TABLE "izin_sementara" DROP CONSTRAINT "izin_sementara_diberikanOlehId_fkey";

-- DropForeignKey
ALTER TABLE "izin_sementara" DROP CONSTRAINT "izin_sementara_keanggotaanTenantId_fkey";

-- DropForeignKey
ALTER TABLE "karyawan" DROP CONSTRAINT "karyawan_penggunaId_fkey";

-- DropForeignKey
ALTER TABLE "konfigurasi_qris" DROP CONSTRAINT "konfigurasi_qris_dibuatOlehId_fkey";

-- DropForeignKey
ALTER TABLE "konfigurasi_qris" DROP CONSTRAINT "konfigurasi_qris_diverifikasiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "koreksi_absensi" DROP CONSTRAINT "koreksi_absensi_diajukanOlehId_fkey";

-- DropForeignKey
ALTER TABLE "koreksi_absensi" DROP CONSTRAINT "koreksi_absensi_disetujuiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "koreksi_pembayaran" DROP CONSTRAINT "koreksi_pembayaran_dikoreksiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "ledger_saldo_toko" DROP CONSTRAINT "ledger_saldo_toko_dicatatOlehId_fkey";

-- DropForeignKey
ALTER TABLE "ledger_stempel" DROP CONSTRAINT "ledger_stempel_dicatatOlehId_fkey";

-- DropForeignKey
ALTER TABLE "mutasi_stok" DROP CONSTRAINT "mutasi_stok_dibuatOlehId_fkey";

-- DropForeignKey
ALTER TABLE "notification" DROP CONSTRAINT "notification_penggunaId_fkey";

-- DropForeignKey
ALTER TABLE "pembayaran" DROP CONSTRAINT "pembayaran_dikonfirmasiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "pembayaran_refund" DROP CONSTRAINT "pembayaran_refund_disetujuiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "penerimaan_barang" DROP CONSTRAINT "penerimaan_barang_diterimaOlehId_fkey";

-- DropForeignKey
ALTER TABLE "penilaian_kinerja" DROP CONSTRAINT "penilaian_kinerja_dinilaiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "penyesuaian_stok" DROP CONSTRAINT "penyesuaian_stok_dicatatOlehId_fkey";

-- DropForeignKey
ALTER TABLE "penyesuaian_stok" DROP CONSTRAINT "penyesuaian_stok_disetujuiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "permintaan_lembur" DROP CONSTRAINT "permintaan_lembur_disetujuiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "permintaan_persetujuan" DROP CONSTRAINT "permintaan_persetujuan_disetujuiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "permintaan_tukar_shift" DROP CONSTRAINT "permintaan_tukar_shift_disetujuiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "pesanan" DROP CONSTRAINT "pesanan_dibuatOlehId_fkey";

-- DropForeignKey
ALTER TABLE "pesanan_pembatalan" DROP CONSTRAINT "pesanan_pembatalan_dibatalkanOlehId_fkey";

-- DropForeignKey
ALTER TABLE "pesanan_penolakan" DROP CONSTRAINT "pesanan_penolakan_ditolakOlehId_fkey";

-- DropForeignKey
ALTER TABLE "pesanan_perubahan" DROP CONSTRAINT "pesanan_perubahan_diubahOlehId_fkey";

-- DropForeignKey
ALTER TABLE "poin_riwayat" DROP CONSTRAINT "poin_riwayat_dicatatOlehId_fkey";

-- DropForeignKey
ALTER TABLE "promo_simulasi" DROP CONSTRAINT "promo_simulasi_disimulasikanOlehId_fkey";

-- DropForeignKey
ALTER TABLE "proses_produksi" DROP CONSTRAINT "proses_produksi_dibuatOlehId_fkey";

-- DropForeignKey
ALTER TABLE "purchase_order" DROP CONSTRAINT "purchase_order_dibuatOlehId_fkey";

-- DropForeignKey
ALTER TABLE "qris_konfirmasi_manual" DROP CONSTRAINT "qris_konfirmasi_manual_diverifikasiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "rekap_kas_harian" DROP CONSTRAINT "rekap_kas_harian_diverifikasiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "riwayat_gabung_pelanggan" DROP CONSTRAINT "riwayat_gabung_pelanggan_digabungOlehId_fkey";

-- DropForeignKey
ALTER TABLE "riwayat_konfigurasi_qris" DROP CONSTRAINT "riwayat_konfigurasi_qris_dilakukanOlehId_fkey";

-- DropForeignKey
ALTER TABLE "riwayat_status_tiket_dapur" DROP CONSTRAINT "riwayat_status_tiket_dapur_diubahOlehId_fkey";

-- DropForeignKey
ALTER TABLE "stok_opname" DROP CONSTRAINT "stok_opname_dibuatOlehId_fkey";

-- DropForeignKey
ALTER TABLE "stok_opname" DROP CONSTRAINT "stok_opname_penghitungId_fkey";

-- DropForeignKey
ALTER TABLE "stok_opname" DROP CONSTRAINT "stok_opname_pengunciId_fkey";

-- DropForeignKey
ALTER TABLE "stok_opname" DROP CONSTRAINT "stok_opname_penyetujuId_fkey";

-- DropForeignKey
ALTER TABLE "transfer_stok" DROP CONSTRAINT "transfer_stok_dibuatOlehId_fkey";

-- DropForeignKey
ALTER TABLE "transfer_stok" DROP CONSTRAINT "transfer_stok_dikirimOlehId_fkey";

-- DropForeignKey
ALTER TABLE "transfer_stok" DROP CONSTRAINT "transfer_stok_disetujuiOlehId_fkey";

-- DropForeignKey
ALTER TABLE "transfer_stok" DROP CONSTRAINT "transfer_stok_diterimaOlehId_fkey";

-- DropIndex
DROP INDEX "karyawan_penggunaId_key";

-- DropIndex
DROP INDEX "notification_penggunaId_dibacaPada_idx";

-- AlterTable
ALTER TABLE "audit_log" ADD COLUMN     "keanggotaanTenantId" TEXT;

-- AlterTable
ALTER TABLE "izin_sementara" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "karyawan" DROP COLUMN "penggunaId",
ADD COLUMN     "keanggotaanTenantId" TEXT;

-- AlterTable
ALTER TABLE "notification" DROP COLUMN "penggunaId",
ADD COLUMN     "keanggotaanTenantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "karyawan_keanggotaanTenantId_key" ON "karyawan"("keanggotaanTenantId");

-- CreateIndex
CREATE UNIQUE INDEX "keanggotaan_outlet_tenantId_outletId_id_key" ON "keanggotaan_outlet"("tenantId", "outletId", "id");

-- CreateIndex
CREATE INDEX "notification_keanggotaanTenantId_dibacaPada_idx" ON "notification"("keanggotaanTenantId", "dibacaPada");

-- AddForeignKey
ALTER TABLE "izin_sementara" ADD CONSTRAINT "izin_sementara_tenantId_keanggotaanTenantId_fkey" FOREIGN KEY ("tenantId", "keanggotaanTenantId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "izin_sementara" ADD CONSTRAINT "izin_sementara_tenantId_diberikanOlehId_fkey" FOREIGN KEY ("tenantId", "diberikanOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_persetujuan" ADD CONSTRAINT "permintaan_persetujuan_tenantId_disetujuiOlehId_fkey" FOREIGN KEY ("tenantId", "disetujuiOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenantId_keanggotaanTenantId_fkey" FOREIGN KEY ("tenantId", "keanggotaanTenantId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proses_produksi" ADD CONSTRAINT "proses_produksi_tenantId_outletId_dibuatOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "dibuatOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mutasi_stok" ADD CONSTRAINT "mutasi_stok_tenantId_outletId_dibuatOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "dibuatOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penyesuaian_stok" ADD CONSTRAINT "penyesuaian_stok_tenantId_outletId_disetujuiOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "disetujuiOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penyesuaian_stok" ADD CONSTRAINT "penyesuaian_stok_tenantId_outletId_dicatatOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "dicatatOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok" ADD CONSTRAINT "transfer_stok_tenantId_dibuatOlehId_fkey" FOREIGN KEY ("tenantId", "dibuatOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok" ADD CONSTRAINT "transfer_stok_tenantId_disetujuiOlehId_fkey" FOREIGN KEY ("tenantId", "disetujuiOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok" ADD CONSTRAINT "transfer_stok_tenantId_dikirimOlehId_fkey" FOREIGN KEY ("tenantId", "dikirimOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_stok" ADD CONSTRAINT "transfer_stok_tenantId_diterimaOlehId_fkey" FOREIGN KEY ("tenantId", "diterimaOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catatan_waste" ADD CONSTRAINT "catatan_waste_tenantId_outletId_dicatatOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "dicatatOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catatan_waste" ADD CONSTRAINT "catatan_waste_tenantId_outletId_disetujuiOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "disetujuiOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_tenantId_dibuatOlehId_fkey" FOREIGN KEY ("tenantId", "dibuatOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_tenantId_penghitungId_fkey" FOREIGN KEY ("tenantId", "penghitungId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_tenantId_pengunciId_fkey" FOREIGN KEY ("tenantId", "pengunciId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_tenantId_penyetujuId_fkey" FOREIGN KEY ("tenantId", "penyetujuId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_tenantId_outletId_dibuatOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "dibuatOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penerimaan_barang" ADD CONSTRAINT "penerimaan_barang_tenantId_diterimaOlehId_fkey" FOREIGN KEY ("tenantId", "diterimaOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan" ADD CONSTRAINT "pesanan_tenantId_outletId_dibuatOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "dibuatOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_perubahan" ADD CONSTRAINT "pesanan_perubahan_tenantId_diubahOlehId_fkey" FOREIGN KEY ("tenantId", "diubahOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_penolakan" ADD CONSTRAINT "pesanan_penolakan_tenantId_ditolakOlehId_fkey" FOREIGN KEY ("tenantId", "ditolakOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pesanan_pembatalan" ADD CONSTRAINT "pesanan_pembatalan_tenantId_dibatalkanOlehId_fkey" FOREIGN KEY ("tenantId", "dibatalkanOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_status_tiket_dapur" ADD CONSTRAINT "riwayat_status_tiket_dapur_tenantId_diubahOlehId_fkey" FOREIGN KEY ("tenantId", "diubahOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gelombang_dapur" ADD CONSTRAINT "gelombang_dapur_tenantId_dipicuOlehId_fkey" FOREIGN KEY ("tenantId", "dipicuOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "giliran_kasir" ADD CONSTRAINT "giliran_kasir_tenantId_outletId_penggunaId_fkey" FOREIGN KEY ("tenantId", "outletId", "penggunaId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_tenantId_outletId_dikonfirmasiOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "dikonfirmasiOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koreksi_pembayaran" ADD CONSTRAINT "koreksi_pembayaran_tenantId_dikoreksiOlehId_fkey" FOREIGN KEY ("tenantId", "dikoreksiOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qris_konfirmasi_manual" ADD CONSTRAINT "qris_konfirmasi_manual_tenantId_diverifikasiOlehId_fkey" FOREIGN KEY ("tenantId", "diverifikasiOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran_refund" ADD CONSTRAINT "pembayaran_refund_tenantId_disetujuiOlehId_fkey" FOREIGN KEY ("tenantId", "disetujuiOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konfigurasi_qris" ADD CONSTRAINT "konfigurasi_qris_tenantId_outletId_dibuatOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "dibuatOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konfigurasi_qris" ADD CONSTRAINT "konfigurasi_qris_tenantId_outletId_diverifikasiOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "diverifikasiOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_konfigurasi_qris" ADD CONSTRAINT "riwayat_konfigurasi_qris_tenantId_outletId_dilakukanOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "dilakukanOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_simulasi" ADD CONSTRAINT "promo_simulasi_tenantId_disimulasikanOlehId_fkey" FOREIGN KEY ("tenantId", "disimulasikanOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poin_riwayat" ADD CONSTRAINT "poin_riwayat_tenantId_dicatatOlehId_fkey" FOREIGN KEY ("tenantId", "dicatatOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_stempel" ADD CONSTRAINT "ledger_stempel_tenantId_dicatatOlehId_fkey" FOREIGN KEY ("tenantId", "dicatatOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_saldo_toko" ADD CONSTRAINT "ledger_saldo_toko_tenantId_dicatatOlehId_fkey" FOREIGN KEY ("tenantId", "dicatatOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riwayat_gabung_pelanggan" ADD CONSTRAINT "riwayat_gabung_pelanggan_tenantId_digabungOlehId_fkey" FOREIGN KEY ("tenantId", "digabungOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karyawan" ADD CONSTRAINT "karyawan_tenantId_keanggotaanTenantId_fkey" FOREIGN KEY ("tenantId", "keanggotaanTenantId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_tukar_shift" ADD CONSTRAINT "permintaan_tukar_shift_tenantId_disetujuiOlehId_fkey" FOREIGN KEY ("tenantId", "disetujuiOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koreksi_absensi" ADD CONSTRAINT "koreksi_absensi_tenantId_diajukanOlehId_fkey" FOREIGN KEY ("tenantId", "diajukanOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koreksi_absensi" ADD CONSTRAINT "koreksi_absensi_tenantId_disetujuiOlehId_fkey" FOREIGN KEY ("tenantId", "disetujuiOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuti_izin" ADD CONSTRAINT "cuti_izin_tenantId_disetujuiOlehId_fkey" FOREIGN KEY ("tenantId", "disetujuiOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permintaan_lembur" ADD CONSTRAINT "permintaan_lembur_tenantId_disetujuiOlehId_fkey" FOREIGN KEY ("tenantId", "disetujuiOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penilaian_kinerja" ADD CONSTRAINT "penilaian_kinerja_tenantId_dinilaiOlehId_fkey" FOREIGN KEY ("tenantId", "dinilaiOlehId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rekap_kas_harian" ADD CONSTRAINT "rekap_kas_harian_tenantId_outletId_diverifikasiOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "diverifikasiOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biaya_operasional" ADD CONSTRAINT "biaya_operasional_tenantId_outletId_dicatatOlehId_fkey" FOREIGN KEY ("tenantId", "outletId", "dicatatOlehId") REFERENCES "keanggotaan_outlet"("tenantId", "outletId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_tenantId_keanggotaanTenantId_fkey" FOREIGN KEY ("tenantId", "keanggotaanTenantId") REFERENCES "keanggotaan_tenant"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

