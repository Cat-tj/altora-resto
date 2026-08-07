/**
 * Zod validation schemas for the persediaan (inventory) domain.
 *
 * Used by both the service layer (input validation) and the tRPC router
 * (procedure input schemas).
 */

import { z } from "zod";

// ─── Shared Enums ───────────────────────────────────────────────────────────

export const statusAktifNonaktifSchema = z.enum(["AKTIF", "NONAKTIF"]);

export const jenisMutasiStokSchema = z.enum([
  "PEMBELIAN_MASUK",
  "RETUR_PENJUALAN",
  "TRANSFER_MASUK",
  "PRODUKSI_MASUK",
  "PEMAKAIAN_RESEP",
  "RETUR_SUPPLIER",
  "TRANSFER_KELUAR",
  "PRODUKSI_KELUAR",
  "WASTE",
  "PEMAKAIAN_INTERNAL",
  "PENYESUAIAN",
  "KOREKSI_OPNAME",
]);

export const referensiJenisMutasiSchema = z.enum([
  "PEMBELIAN",
  "PESANAN",
  "OPNAME",
  "TRANSFER",
  "PRODUKSI",
  "WASTE",
  "PENYESUAIAN",
  "RETUR_PEMBELIAN",
  "PEMAKAIAN_INTERNAL",
]);

export const statusStokOpnameSchema = z.enum([
  "DRAF",
  "SEDANG_DIHITUNG",
  "DIKUNCI",
  "MENUNGGU_PERSETUJUAN",
  "DISETUJUI",
  "DIPOSTING",
  "DIBATALKAN",
]);

export const statusPurchaseOrderSchema = z.enum([
  "DRAFT",
  "DIAJUKAN",
  "DISETUJUI",
  "DIKIRIM_SUPPLIER",
  "DITERIMA_SEBAGIAN",
  "DITERIMA_PENUH",
  "DIBATALKAN",
]);

// ─── Check Stock ────────────────────────────────────────────────────────────

export const checkStockSchema = z.object({
  bahanId: z.string().min(1, "ID bahan tidak valid"),
  gudangId: z.string().min(1, "ID gudang tidak valid"),
  lokasiStokId: z.string().optional(),
});

// ─── Deduct Stock ───────────────────────────────────────────────────────────

export const deductStockSchema = z.object({
  outletId: z.string().min(1, "ID outlet tidak valid"),
  gudangId: z.string().min(1, "ID gudang tidak valid"),
  bahanId: z.string().min(1, "ID bahan tidak valid"),
  jumlah: z.number().positive("Jumlah harus positif"),
  alasan: z
    .string()
    .min(1, "Alasan tidak boleh kosong")
    .max(500, "Alasan maksimal 500 karakter"),
  catatan: z.string().max(1000, "Catatan maksimal 1000 karakter").optional(),
  referensiJenis: referensiJenisMutasiSchema,
  referensiId: z.string().min(1, "ID referensi tidak valid"),
  lokasiSumberId: z.string().optional(),
  lokasiTujuanId: z.string().optional(),
  satuanId: z.string().optional(),
  batchStokId: z.string().optional(),
  hargaPerolehan: z.number().int().min(0).optional(),
});

// ─── Stok Opname ────────────────────────────────────────────────────────────

export const createStokOpnameSchema = z.object({
  gudangId: z.string().min(1, "ID gudang tidak valid"),
  dijadwalkanPada: z.date(),
  alasan: z.string().max(500).optional(),
});

export const hitungStokOpnameSchema = z.object({
  stokOpnameId: z.string().min(1, "ID stok opname tidak valid"),
  items: z
    .array(
      z.object({
        bahanId: z.string().min(1),
        lokasiStokId: z.string().optional(),
        kuantitasFisik: z.number().min(0),
        alasan: z.string().max(500).optional(),
      }),
    )
    .min(1, "Minimal satu item harus dihitung"),
});

export const lockStokOpnameSchema = z.object({
  stokOpnameId: z.string().min(1, "ID stok opname tidak valid"),
});

export const approveStokOpnameSchema = z.object({
  stokOpnameId: z.string().min(1, "ID stok opname tidak valid"),
});

// ─── Purchase Order ─────────────────────────────────────────────────────────

export const createPurchaseOrderSchema = z.object({
  outletId: z.string().min(1, "ID outlet tidak valid"),
  supplierId: z.string().min(1, "ID supplier tidak valid"),
  nomorPo: z
    .string()
    .min(1, "Nomor PO tidak boleh kosong")
    .max(50, "Nomor PO maksimal 50 karakter"),
  items: z
    .array(
      z.object({
        bahanId: z.string().min(1),
        jumlahDipesan: z.number().positive("Jumlah harus positif"),
        hargaSatuan: z.number().int().min(0, "Harga tidak boleh negatif"),
      }),
    )
    .min(1, "Minimal satu item harus dipesan"),
});

export const updateStatusPoSchema = z.object({
  purchaseOrderId: z.string().min(1, "ID PO tidak valid"),
  status: statusPurchaseOrderSchema,
});

// ─── Receive Goods ──────────────────────────────────────────────────────────

export const receiveGoodsSchema = z.object({
  purchaseOrderId: z.string().min(1, "ID PO tidak valid"),
  gudangId: z.string().min(1, "ID gudang tidak valid"),
  nomorPenerimaan: z
    .string()
    .min(1, "Nomor penerimaan tidak boleh kosong")
    .max(50, "Nomor penerimaan maksimal 50 karakter"),
  items: z
    .array(
      z.object({
        bahanId: z.string().min(1),
        jumlahDiterima: z.number().positive("Jumlah harus positif"),
        hargaSatuanAktual: z.number().int().min(0, "Harga tidak boleh negatif"),
      }),
    )
    .min(1, "Minimal satu item harus diterima"),
});

// ─── List Query Schemas ─────────────────────────────────────────────────────

export const listGudangSchema = z.object({
  outletId: z.string().optional(),
  includeStok: z.boolean().default(false),
});

export const listMutasiStokSchema = z.object({
  gudangId: z.string().optional(),
  bahanId: z.string().optional(),
  jenis: jenisMutasiStokSchema.optional(),
  dariTanggal: z.date().optional(),
  sampaiTanggal: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const listPurchaseOrderSchema = z.object({
  outletId: z.string().optional(),
  status: statusPurchaseOrderSchema.optional(),
  supplierId: z.string().optional(),
  dariTanggal: z.date().optional(),
  sampaiTanggal: z.date().optional(),
});

export const listStokOpnameSchema = z.object({
  gudangId: z.string().optional(),
  status: statusStokOpnameSchema.optional(),
});

// ─── Get Single Item ────────────────────────────────────────────────────────

export const getPurchaseOrderSchema = z.object({
  id: z.string().min(1, "ID PO tidak valid"),
});

export const getStokOpnameSchema = z.object({
  id: z.string().min(1, "ID stok opname tidak valid"),
});

// ─── Low Stock Alerts ───────────────────────────────────────────────────────

export const lowStockAlertSchema = z.object({
  gudangId: z.string().optional(),
  ambangBatas: z.number().int().min(0).default(10),
});

// ─── Infer Types ────────────────────────────────────────────────────────────

export type CheckStockInput = z.infer<typeof checkStockSchema>;
export type DeductStockInput = z.infer<typeof deductStockSchema>;
export type CreateStokOpnameInput = z.infer<typeof createStokOpnameSchema>;
export type HitungStokOpnameInput = z.infer<typeof hitungStokOpnameSchema>;
export type LockStokOpnameInput = z.infer<typeof lockStokOpnameSchema>;
export type ApproveStokOpnameInput = z.infer<typeof approveStokOpnameSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdateStatusPoInput = z.infer<typeof updateStatusPoSchema>;
export type ReceiveGoodsInput = z.infer<typeof receiveGoodsSchema>;
export type ListGudangQuery = z.infer<typeof listGudangSchema>;
export type ListMutasiStokQuery = z.infer<typeof listMutasiStokSchema>;
export type ListPurchaseOrderQuery = z.infer<typeof listPurchaseOrderSchema>;
export type ListStokOpnameQuery = z.infer<typeof listStokOpnameSchema>;
export type GetPurchaseOrderInput = z.infer<typeof getPurchaseOrderSchema>;
export type GetStokOpnameInput = z.infer<typeof getStokOpnameSchema>;
export type LowStockAlertQuery = z.infer<typeof lowStockAlertSchema>;
