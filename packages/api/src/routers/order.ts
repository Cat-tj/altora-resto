/**
 * Order tRPC router for Altora Resto.
 *
 * Endpoints:
 * - order.create: Create a new order in DRAF status
 * - order.list: List orders with filtering and pagination
 * - order.get: Get a single order with full details
 * - order.item.add: Add an item to an order
 * - order.item.remove: Remove an item from an order
 * - order.status.update: Transition order status (validated by state machine)
 * - order.payment.create: Create a payment and allocate to orders
 * - order.split: Split an order into multiple new orders
 * - order.cancel: Cancel an order
 * - order.reject: Reject an order (from MENUNGGU_PERSETUJUAN)
 */

import { router, outletProcedure, TRPCError } from "../trpc"
import {
  createPesanan,
  addItem,
  removeItem,
  updateStatus,
  createPayment,
  splitBill,
  listPesanan,
  getPesanan,
  OrderError,
  // Schemas (re-imported here for router-level validation)
  createPesananSchema,
  addItemSchema,
  removeItemSchema,
  updateStatusSchema,
  createPaymentSchema,
  splitBillSchema,
  cancelOrderSchema,
  rejectOrderSchema,
  listPesananSchema,
  getPesananSchema,
} from "@altora/order";
import { z } from "zod";

// ─── Helper ─────────────────────────────────────────────────────────────────

function handleOrderError(error: unknown): never {
  if (error instanceof OrderError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN" | "CONFLICT"> = {
      PESANAN_NOT_FOUND: "NOT_FOUND",
      ITEM_NOT_FOUND: "NOT_FOUND",
      ITEM_MENU_NOT_FOUND: "NOT_FOUND",
      PESANAN_IS_TERMINAL: "BAD_REQUEST",
      INVALID_TRANSITION: "BAD_REQUEST",
      CANNOT_ADD_ITEMS: "BAD_REQUEST",
      ITEM_NOT_IN_ORDER: "BAD_REQUEST",
      OUTLET_NOT_IN_TENANT: "FORBIDDEN",
      MEJA_NOT_IN_OUTLET: "BAD_REQUEST",
      PAYMENT_INVARIANT_FAILED: "BAD_REQUEST",
      GILIRAN_KASIR_NOT_OPEN: "BAD_REQUEST",
      GILIRAN_KASIR_NOT_FOUND: "NOT_FOUND",
      PEMBAYARAN_NOT_FOUND: "NOT_FOUND",
      ALREADY_FULLY_PAID: "CONFLICT",
      VERSION_CONFLICT: "CONFLICT",
      SPLIT_REQUIRES_MULTIPLE_ITEMS: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }
  throw error;
}

// ─── Input Schemas (router-level) ───────────────────────────────────────────

const createPesananInput = createPesananSchema;
const addItemInput = addItemSchema;
const removeItemInput = removeItemSchema;

const updateStatusInput = z.object({
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
  statusBaru: z.enum([
    "DRAF", "DIKIRIM", "MENUNGGU_PERSETUJUAN", "DITERIMA", "DITOLAK",
    "MENUNGGU_PEMBAYARAN", "DIKONFIRMASI", "DIKIRIM_KE_DAPUR",
    "SEDANG_DISIAPKAN", "SIAP", "DISAJIKAN", "SELESAI", "DIBATALKAN",
  ]),
  alasan: z.string().max(500).optional(),
});

const createPaymentInput = z.object({
  alokasi: z.array(
    z.object({
      pesananId: z.string().min(1),
      jumlah: z.number().int().min(1),
    }),
  ).min(1, "Minimal satu alokasi"),
  metodeBayar: z.array(
    z.object({
      metodeBayarId: z.string().min(1),
      jumlah: z.number().int().min(1),
    }),
  ).min(1, "Minimal satu metode bayar"),
  totalDiterima: z.number().int().min(0),
});

const splitBillInput = splitBillSchema;
const cancelOrderInput = cancelOrderSchema;
const rejectOrderInput = rejectOrderSchema;
const listPesananInput = listPesananSchema;
const getPesananInput = getPesananSchema;

// ─── Router ─────────────────────────────────────────────────────────────────

export const orderRouter = router({
  /** Create a new order. */
  create: outletProcedure
    .input(createPesananInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createPesanan(ctx.db, ctx.ctx!.tenantId!, {
          outletId: input.outletId,
          ...(input.mejaId && { mejaId: input.mejaId }),
          ...(input.pelangganId && { pelangganId: input.pelangganId }),
          kanal: input.kanal,
          dibuatOlehId: ctx.ctx!.keanggotaanOutlet!.id,
        });
      } catch (error) {
        handleOrderError(error);
      }
    }),

  /** List orders with filtering and pagination. */
  list: outletProcedure
    .input(listPesananInput)
    .query(async ({ ctx, input }) => {
      return listPesanan(ctx.db, {
        ...(input.outletId && { outletId: input.outletId }),
        ...(input.status && { status: input.status }),
        ...(input.kanal && { kanal: input.kanal }),
        ...(input.mejaId && { mejaId: input.mejaId }),
        ...(input.dariTanggal && { dariTanggal: input.dariTanggal }),
        ...(input.sampaiTanggal && { sampaiTanggal: input.sampaiTanggal }),
        includeItems: input.includeItems,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /** Get a single order with full details. */
  get: outletProcedure
    .input(getPesananInput)
    .query(async ({ ctx, input }) => {
      const pesanan = await getPesanan(ctx.db, input.id, {
        includeItems: input.includeItems,
        includePembayaran: input.includePembayaran,
        includeRiwayat: input.includeRiwayat,
      });
      if (!pesanan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pesanan tidak ditemukan",
        });
      }
      return pesanan;
    }),

  /** Item operations. */
  item: router({
    /** Add an item to an order. */
    add: outletProcedure
      .input(addItemInput)
      .mutation(async ({ ctx, input }) => {
        try {
          return await addItem(ctx.db, {
            pesananId: input.pesananId,
            itemMenuId: input.itemMenuId,
            ...(input.varianMenuId && { varianMenuId: input.varianMenuId }),
            kuantitas: input.kuantitas,
            ...(input.catatan && { catatan: input.catatan }),
            ...(input.modifier && { modifier: input.modifier }),
          });
        } catch (error) {
          handleOrderError(error);
        }
      }),

    /** Remove an item from an order. */
    remove: outletProcedure
      .input(removeItemInput)
      .mutation(async ({ ctx, input }) => {
        try {
          return await removeItem(ctx.db, {
            pesananId: input.pesananId,
            itemPesananId: input.itemPesananId,
          });
        } catch (error) {
          handleOrderError(error);
        }
      }),
  }),

  /** Update order status (validated by state machine). */
  status: router({
    update: outletProcedure
      .input(updateStatusInput)
      .mutation(async ({ ctx, input }) => {
        try {
          return await updateStatus(ctx.db, {
            pesananId: input.pesananId,
            statusBaru: input.statusBaru,
            diubahOlehId: ctx.ctx!.keanggotaanOutlet!.id,
            ...(input.alasan && { alasan: input.alasan }),
          });
        } catch (error) {
          handleOrderError(error);
        }
      }),
  }),

  /** Payment operations. */
  payment: router({
    /** Create a payment and allocate to orders. */
    create: outletProcedure
      .input(createPaymentInput)
      .mutation(async ({ ctx, input }) => {
        try {
          return await createPayment(ctx.db, ctx.ctx!.tenantId!, {
            outletId: ctx.ctx!.outletId!,
            alokasi: input.alokasi.map((a) => ({
              pesananId: a.pesananId,
              jumlah: a.jumlah,
            })),
            metodeBayar: input.metodeBayar.map((m) => ({
              metodeBayarId: m.metodeBayarId,
              jumlah: m.jumlah,
            })),
            totalDiterima: input.totalDiterima,
            dikonfirmasiOlehId: ctx.ctx!.keanggotaanOutlet!.id,
          });
        } catch (error) {
          handleOrderError(error);
        }
      }),
  }),

  /** Split an order into multiple new orders. */
  split: outletProcedure
    .input(splitBillInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await splitBill(ctx.db, ctx.ctx!.tenantId!, {
          pesananId: input.pesananId,
          splits: input.splits.map((s) => ({
            itemPesananIds: s.itemPesananIds,
            ...(s.targetMejaId && { targetMejaId: s.targetMejaId }),
          })),
        });
      } catch (error) {
        handleOrderError(error);
      }
    }),

  /** Cancel an order. */
  cancel: outletProcedure
    .input(cancelOrderInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateStatus(ctx.db, {
          pesananId: input.pesananId,
          statusBaru: "DIBATALKAN",
          diubahOlehId: ctx.ctx!.keanggotaanOutlet!.id,
          alasan: input.alasan,
        });
      } catch (error) {
        handleOrderError(error);
      }
    }),

  /** Reject an order (from MENUNGGU_PERSETUJUAN). */
  reject: outletProcedure
    .input(rejectOrderInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateStatus(ctx.db, {
          pesananId: input.pesananId,
          statusBaru: "DITOLAK",
          diubahOlehId: ctx.ctx!.keanggotaanOutlet!.id,
          alasan: input.alasan,
        });
      } catch (error) {
        handleOrderError(error);
      }
    }),
});
