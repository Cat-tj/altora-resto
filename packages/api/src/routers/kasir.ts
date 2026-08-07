/**
 * POS (Kasir) tRPC router for Altora Resto.
 *
 * Endpoints:
 * - kasir.getActiveOrders: Get all active orders for POS display
 * - kasir.checkout: Full POS checkout (validate, pay, close order)
 *
 * This router provides the cashier-facing endpoints. It is separate
 * from the order router because POS workflows have different
 * authorization patterns and combine multiple service calls into
 * single atomic operations.
 */

import { router, outletProcedure, TRPCError } from "../trpc.js";
import {
  getActiveOrders,
  kasirCheckout,
  OrderError,
  getActiveOrdersSchema,
  kasirCheckoutSchema,
} from "@altora/order";
import { z } from "zod";

// ─── Helper ─────────────────────────────────────────────────────────────────

function handleKasirError(error: unknown): never {
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

// ─── Input Schemas ──────────────────────────────────────────────────────────

const getActiveOrdersInput = getActiveOrdersSchema;

const kasirCheckoutInput = z.object({
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
  metodeBayar: z.array(
    z.object({
      metodeBayarId: z.string().min(1, "ID metode bayar tidak valid"),
      jumlah: z.number().int().min(1, "Jumlah minimal 1"),
    }),
  ).min(1, "Minimal satu metode bayar"),
  totalDiterima: z.number().int().min(0, "Total diterima tidak boleh negatif"),
  giliranKasirId: z.string().optional(),
});

// ─── Router ─────────────────────────────────────────────────────────────────

export const kasirRouter = router({
  /**
   * Get all active (non-terminal) orders for the POS/KDS display.
   * Shows orders in DIKONFIRMASI through DISAJIKAN statuses,
   * ordered by creation time (oldest first = FIFO).
   */
  getActiveOrders: outletProcedure
    .input(getActiveOrdersInput)
    .query(async ({ ctx, input }) => {
      return getActiveOrders(ctx.db, {
        ...(input.outletId && { outletId: input.outletId }),
        ...(input.kanal && { kanal: input.kanal }),
      });
    }),

  /**
   * Full POS checkout: validates the order is payable, creates payment,
   * transitions the order to SELESAI, and records the cashier transaction.
   *
   * This is a single atomic operation — if any step fails, the entire
   * checkout is rolled back.
   *
   * Payment invariant enforced:
   * - SUM(PembayaranMetodeBaris.jumlah) == Pembayaran.jumlah
   * - SUM(AlokasiPembayaran.jumlah) == Pembayaran.jumlah
   * - SUM(allocations per pesanan) <= Pesanan.totalAkhir
   */
  checkout: outletProcedure
    .input(kasirCheckoutInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await kasirCheckout(ctx.db, ctx.ctx!.tenantId!, {
          pesananId: input.pesananId,
          metodeBayar: input.metodeBayar,
          totalDiterima: input.totalDiterima,
          ...(input.giliranKasirId && { giliranKasirId: input.giliranKasirId }),
        });
      } catch (error) {
        handleKasirError(error);
      }
    }),
});
