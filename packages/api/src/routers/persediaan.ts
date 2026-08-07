/**
 * Persediaan (Inventory) tRPC router for Altora Resto.
 *
 * Endpoints:
 * - persediaan.gudang.list: List warehouses
 * - persediaan.stock.check: Check stock level
 * - persediaan.stock.deduct: Deduct stock with mutation logging
 * - persediaan.opname.create: Create stock opname
 * - persediaan.opname.list: List stock opname records
 * - persediaan.opname.get: Get single stock opname
 * - persediaan.opname.count: Record physical count
 * - persediaan.opname.lock: Lock stock opname
 * - persediaan.opname.approve: Approve and post stock opname
 * - persediaan.po.create: Create purchase order
 * - persediaan.po.list: List purchase orders
 * - persediaan.po.get: Get single purchase order
 * - persediaan.po.updateStatus: Update PO status
 * - persediaan.receive: Receive goods against PO
 * - persediaan.alerts.lowStock: Get low stock alerts
 */

import { z } from "zod";
import { router, tenantProcedure, TRPCError } from "../trpc.js";
import {
  listGudang,
  checkStock,
  deductStock,
  createStokOpname,
  getStokOpname,
  listStokOpname,
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrder,
  receiveGoods,
  getLowStockAlerts,
  PersediaanError,
} from "@altora/persediaan";

// ─── Input Schemas ──────────────────────────────────────────────────────────

const listGudangSchema = z.object({
  outletId: z.string().optional(),
  includeStok: z.boolean().default(false),
});

const checkStockSchema = z.object({
  bahanId: z.string().min(1, "ID bahan tidak valid"),
  gudangId: z.string().min(1, "ID gudang tidak valid"),
  lokasiStokId: z.string().optional(),
});

const deductStockSchema = z.object({
  outletId: z.string().min(1, "ID outlet tidak valid"),
  gudangId: z.string().min(1, "ID gudang tidak valid"),
  bahanId: z.string().min(1, "ID bahan tidak valid"),
  jumlah: z.number().positive("Jumlah harus positif"),
  alasan: z
    .string()
    .min(1, "Alasan tidak boleh kosong")
    .max(500, "Alasan maksimal 500 karakter"),
  catatan: z.string().max(1000, "Catatan maksimal 1000 karakter").optional(),
  referensiJenis: z.enum([
    "PEMBELIAN",
    "PESANAN",
    "OPNAME",
    "TRANSFER",
    "PRODUKSI",
    "WASTE",
    "PENYESUAIAN",
    "RETUR_PEMBELIAN",
    "PEMAKAIAN_INTERNAL",
  ]),
  referensiId: z.string().min(1, "ID referensi tidak valid"),
  lokasiSumberId: z.string().optional(),
  lokasiTujuanId: z.string().optional(),
  satuanId: z.string().optional(),
  batchStokId: z.string().optional(),
  hargaPerolehan: z.number().int().min(0).optional(),
});

const createStokOpnameSchema = z.object({
  gudangId: z.string().min(1, "ID gudang tidak valid"),
  dijadwalkanPada: z.date(),
  alasan: z.string().max(500).optional(),
});

const getStokOpnameSchema = z.object({
  id: z.string().min(1, "ID stok opname tidak valid"),
});

const listStokOpnameSchema = z.object({
  gudangId: z.string().optional(),
  status: z.enum([
    "DRAF",
    "SEDANG_DIHITUNG",
    "DIKUNCI",
    "MENUNGGU_PERSETUJUAN",
    "DISETUJUI",
    "DIPOSTING",
    "DIBATALKAN",
  ]).optional(),
});

const createPoSchema = z.object({
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

const getPoSchema = z.object({
  id: z.string().min(1, "ID PO tidak valid"),
});

const listPoSchema = z.object({
  outletId: z.string().optional(),
  status: z.enum([
    "DRAFT",
    "DIAJUKAN",
    "DISETUJUI",
    "DIKIRIM_SUPPLIER",
    "DITERIMA_SEBAGIAN",
    "DITERIMA_PENUH",
    "DIBATALKAN",
  ]).optional(),
  supplierId: z.string().optional(),
});

const receiveGoodsSchema = z.object({
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

const lowStockAlertSchema = z.object({
  gudangId: z.string().optional(),
  ambangBatas: z.number().int().min(0).default(10),
});

// ─── Helper ─────────────────────────────────────────────────────────────────

function handlePersediaanError(error: unknown): never {
  if (error instanceof PersediaanError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN" | "CONFLICT"> = {
      GUDANG_NOT_FOUND: "NOT_FOUND",
      STOK_NOT_FOUND: "NOT_FOUND",
      INSUFFICIENT_STOCK: "BAD_REQUEST",
      BAHAN_NOT_FOUND: "NOT_FOUND",
      SUPPLIER_NOT_FOUND: "NOT_FOUND",
      PO_NOT_FOUND: "NOT_FOUND",
      PO_INVALID_STATUS: "BAD_REQUEST",
      PO_NO_ITEMS: "BAD_REQUEST",
      PENERIMAAN_NOT_FOUND: "NOT_FOUND",
      OPNAME_NOT_FOUND: "NOT_FOUND",
      OPNAME_INVALID_STATUS: "BAD_REQUEST",
      OUTLET_NOT_IN_TENANT: "FORBIDDEN",
      VERSION_CONFLICT: "CONFLICT",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }
  throw error;
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const persediaanRouter = router({
  // ─── Gudang ───────────────────────────────────────────────────────────
  gudang: router({
    /** List warehouses for the tenant. */
    list: tenantProcedure
      .input(listGudangSchema)
      .query(async ({ ctx, input }) => {
        return listGudang(ctx.db, {
          outletId: input.outletId,
          includeStok: input.includeStok,
        });
      }),
  }),

  // ─── Stock Operations ─────────────────────────────────────────────────
  stock: router({
    /** Check current stock level. */
    check: tenantProcedure
      .input(checkStockSchema)
      .query(async ({ ctx, input }) => {
        const result = await checkStock(ctx.db, input);
        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Data stok tidak ditemukan",
          });
        }
        return result;
      }),

    /** Deduct stock with mutation logging. */
    deduct: tenantProcedure
      .input(deductStockSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await deductStock(ctx.db, ctx.ctx.tenantId!, {
            ...input,
            dibuatOlehId: ctx.ctx.keanggotaanOutlet!.id,
          });
        } catch (error) {
          handlePersediaanError(error);
        }
      }),
  }),

  // ─── Stok Opname ──────────────────────────────────────────────────────
  opname: router({
    /** Create a stock opname. */
    create: tenantProcedure
      .input(createStokOpnameSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await createStokOpname(ctx.db, ctx.ctx.tenantId!, {
            ...input,
            dibuatOlehId: ctx.ctx.keanggotaanTenant!.id,
          });
        } catch (error) {
          handlePersediaanError(error);
        }
      }),

    /** List stock opname records. */
    list: tenantProcedure
      .input(listStokOpnameSchema)
      .query(async ({ ctx, input }) => {
        return listStokOpname(ctx.db, input);
      }),

    /** Get single stock opname. */
    get: tenantProcedure
      .input(getStokOpnameSchema)
      .query(async ({ ctx, input }) => {
        const opname = await getStokOpname(ctx.db, input.id);
        if (!opname) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Stok opname tidak ditemukan",
          });
        }
        return opname;
      }),
  }),

  // ─── Purchase Order ───────────────────────────────────────────────────
  po: router({
    /** Create a purchase order. */
    create: tenantProcedure
      .input(createPoSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await createPurchaseOrder(ctx.db, ctx.ctx.tenantId!, {
            ...input,
            dibuatOlehId: ctx.ctx.keanggotaanOutlet!.id,
          });
        } catch (error) {
          handlePersediaanError(error);
        }
      }),

    /** List purchase orders. */
    list: tenantProcedure
      .input(listPoSchema)
      .query(async ({ ctx, input }) => {
        return listPurchaseOrder(ctx.db, input);
      }),

    /** Get single purchase order. */
    get: tenantProcedure
      .input(getPoSchema)
      .query(async ({ ctx, input }) => {
        const po = await getPurchaseOrder(ctx.db, input.id);
        if (!po) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase order tidak ditemukan",
          });
        }
        return po;
      }),
  }),

  // ─── Receive Goods ────────────────────────────────────────────────────
  /** Receive goods against a PO. */
  receive: tenantProcedure
    .input(receiveGoodsSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await receiveGoods(ctx.db, ctx.ctx.tenantId!, {
          ...input,
          diterimaOlehId: ctx.ctx.keanggotaanTenant!.id,
        });
      } catch (error) {
        handlePersediaanError(error);
      }
    }),

  // ─── Alerts ───────────────────────────────────────────────────────────
  alerts: router({
    /** Get low stock alerts. */
    lowStock: tenantProcedure
      .input(lowStockAlertSchema)
      .query(async ({ ctx, input }) => {
        return getLowStockAlerts(ctx.db, ctx.ctx.tenantId!, input);
      }),
  }),
});
