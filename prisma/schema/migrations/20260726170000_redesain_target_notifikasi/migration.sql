-- ADR-040 (redesain target Notification - menutup deferral eksplisit
-- ADR-033 Keputusan 4): menambah kolom `peranId`+`lingkupTarget`,
-- mempromosikan `outletId` (sudah ada sejak ADR-016, sebelumnya
-- informational-only) menjadi composite-FK tervalidasi ke Outlet, dan
-- menambah CHECK constraint yang menegakkan matriks kombinasi
-- lingkupTarget <-> (keanggotaanTenantId, outletId, peranId) di level
-- database. Lihat docs/engineering/DECISION-LOG.md ADR-040 untuk rasional
-- lengkap dan komentar model Notification/Peran di prisma/schema/schema.prisma.
--
-- Bagian CreateEnum/AlterTable/CreateIndex/AddForeignKey di bawah dihasilkan
-- `prisma migrate diff --from-schema-datasource --to-schema-datamodel`
-- (lihat catatan proses migrasi manual di CLAUDE.md) lalu ditinjau manual;
-- bagian CHECK constraint (C) ditulis tangan karena Prisma DSL tidak punya
-- cara menyatakan CHECK constraint multi-kolom.
--
-- CATATAN AMAN-TANPA-BACKFILL: `notification` KOSONG (0 baris) di database
-- dev saat migrasi ini ditulis (tidak ada handler notifikasi nyata yang
-- menulis ke tabel ini - lihat ALT-DEF-017/ADR-016) - kolom `lingkupTarget`
-- NOT NULL TANPA DEFAULT aman ditambahkan langsung tanpa backfill di
-- lingkungan ini. Bila tabel ini SUDAH berisi baris di lingkungan lain
-- sebelum migrasi ini dijalankan, migrasi ini AKAN GAGAL KERAS pada baris
-- ADD COLUMN NOT NULL - itu perilaku yang DIINGINKAN, bukan bug.

-- =====================================================================================
-- (A) CreateEnum: deklarasi eksplisit niat targeting - lihat enum
-- LingkupTargetNotifikasi di schema.prisma untuk arti tiap nilai.
-- =====================================================================================
CREATE TYPE "LingkupTargetNotifikasi" AS ENUM ('PENGGUNA_SPESIFIK', 'OUTLET', 'PERAN_DI_TENANT', 'PERAN_DI_OUTLET', 'SELURUH_TENANT');

-- =====================================================================================
-- (B) AlterTable + CreateIndex + AddForeignKey: kolom baru, index baru, dan
-- composite-FK baru (peranId -> Peran, outletId -> Outlet - outletId SUDAH
-- ADA sejak ADR-016 tapi belum pernah punya FK, dipromosikan di sini).
-- =====================================================================================
ALTER TABLE "notification" ADD COLUMN     "lingkupTarget" "LingkupTargetNotifikasi" NOT NULL,
ADD COLUMN     "peranId" TEXT;

CREATE INDEX "notification_tenantId_outletId_peranId_idx" ON "notification"("tenantId", "outletId", "peranId");

CREATE INDEX "notification_tenantId_lingkupTarget_idx" ON "notification"("tenantId", "lingkupTarget");

CREATE UNIQUE INDEX "peran_tenantId_id_key" ON "peran"("tenantId", "id");

ALTER TABLE "notification" ADD CONSTRAINT "notification_tenantId_outletId_fkey" FOREIGN KEY ("tenantId", "outletId") REFERENCES "outlet"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification" ADD CONSTRAINT "notification_tenantId_peranId_fkey" FOREIGN KEY ("tenantId", "peranId") REFERENCES "peran"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================================
-- (C) CHECK CONSTRAINT: matriks kombinasi lingkupTarget <-> field targeting.
-- Ini bagian PALING kritis dari batch ini - menegaskan level-DATABASE bahwa
-- NULL-ness keanggotaanTenantId/outletId/peranId adalah KONSEKUENSI dari
-- lingkupTarget yang dipilih, bukan kebetulan/default diam-diam (menutup
-- "jangan hanya memakai penggunaId = NULL" dari instruksi batch ini).
--
--   PENGGUNA_SPESIFIK: keanggotaanTenantId WAJIB ada, outletId+peranId WAJIB null.
--   OUTLET:            outletId WAJIB ada, keanggotaanTenantId+peranId WAJIB null.
--   PERAN_DI_TENANT:   peranId WAJIB ada, keanggotaanTenantId+outletId WAJIB null.
--   PERAN_DI_OUTLET:   outletId+peranId WAJIB ada, keanggotaanTenantId WAJIB null.
--   SELURUH_TENANT:    ketiganya WAJIB null.
-- =====================================================================================
ALTER TABLE "notification" ADD CONSTRAINT "notification_lingkup_target_kombinasi_check" CHECK (
    (
        "lingkupTarget" = 'PENGGUNA_SPESIFIK'
        AND "keanggotaanTenantId" IS NOT NULL
        AND "outletId" IS NULL
        AND "peranId" IS NULL
    ) OR (
        "lingkupTarget" = 'OUTLET'
        AND "keanggotaanTenantId" IS NULL
        AND "outletId" IS NOT NULL
        AND "peranId" IS NULL
    ) OR (
        "lingkupTarget" = 'PERAN_DI_TENANT'
        AND "keanggotaanTenantId" IS NULL
        AND "outletId" IS NULL
        AND "peranId" IS NOT NULL
    ) OR (
        "lingkupTarget" = 'PERAN_DI_OUTLET'
        AND "keanggotaanTenantId" IS NULL
        AND "outletId" IS NOT NULL
        AND "peranId" IS NOT NULL
    ) OR (
        "lingkupTarget" = 'SELURUH_TENANT'
        AND "keanggotaanTenantId" IS NULL
        AND "outletId" IS NULL
        AND "peranId" IS NULL
    )
);
