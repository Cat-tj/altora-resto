/**
 * Pembayaran (Payments) tRPC router for Altora Resto.
 *
 * Endpoints:
 * - pembayaran.create: Create payment with split methods and allocate to orders
 * - pembayaran.list: List payments with filters
 * - pembayaran.get: Get single payment with all relations
 * - pembayaran.summary: Get payment summary for an order
 * - pembayaran.qris.confirm: Manual QRIS confirmation by cashier
 * - pembayaran.metodeBayar.list: List available payment methods
 */

import { z } from "zod";
import { router, tenantProcedure, outletProcedure, TRPCError } from "../trpc"
import {
  createPayment,
  confirmQris,
  getPaymentSummary,
  listPembayaran,
  getPembayaran,
  listMetodeBayar,
  PembayaranError,
} from "@altora/pembayaran";

// ─── Input Schemas ──────────────────────────────────────────────────────────

const createPaymentSchema = z.object({
  alokasi: z
    .array(
      z.object({
        pesananId: z.string().min(1, "ID pesanan tidak valid"),
        jumlah: z.number().int().min(1, "Jumlah harus positif"),
      }),
    )
    .min(1, "Minimal satu alokasi harus ada"),
  metodeBayar: z
    .array(
      z.object({
        metodeBayarId: z.string().min(1, "ID metode bayar tidak valid"),
        jumlah: z.number().int().min(1, "Jumlah harus positif"),
      }),
    )
    .min(1, "Minimal satu metode bayar harus ada"),
  totalDiterima: z.number().int().min(0, "Total diterima tidak boleh negatif"),
});

const listPembayaranSchema = z.object({
  outletId: z.string().optional(),
  status: z.enum([
    "DRAF",
    "MENUNGGU",
    "MENUNGGU_KONFIRMASI",
    "DIBAYAR",
    "GAGAL",
    "DIBATALKAN",
    "DIKOREKSI",
    "DIKEMBALIKAN_SEBAGIAN",
    "DIKEMBALIKAN",
  ]).optional(),
  dariTanggal: z.date().optional(),
  sampaiTanggal: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

const getPembayaranSchema = z.object({
  id: z.string().min(1, "ID pembayaran tidak valid"),
});

const getPaymentSummarySchema = z.object({
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
});

const confirmQrisSchema = z.object({
  pembayaranId: z.string().min(1, "ID pembayaran tidak valid"),
  catatanKasir: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

const listMetodeBayarSchema = z.object({
  includeNonActive: z.boolean().default(false),
});

// ─── Helper ─────────────────────────────────────────────────────────────────

function handlePembayaranError(error: unknown): never {
  if (error instanceof PembayaranError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN" | "CONFLICT"> = {
      PEMBAYARAN_NOT_FOUND: "NOT_FOUND",
      PESANAN_NOT_FOUND: "NOT_FOUND",
      METODE_BAYAR_NOT_FOUND: "NOT_FOUND",
      INVALID_TRANSITION: "BAD_REQUEST",
      PAYMENT_INVARIANT_FAILED: "BAD_REQUEST",
      ALREADY_FULLY_PAID: "CONFLICT",
      AMOUNT_MISMATCH: "BAD_REQUEST",
      QRIS_NOT_CONFIRMED: "BAD_REQUEST",
      QRIS_ALREADY_CONFIRMED: "CONFLICT",
      VERSION_CONFLICT: "CONFLICT",
      OUTLET_NOT_IN_TENANT: "FORBIDDEN",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }
  throw error;
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const pembayaranRouter = router({
  /** Create a payment with split methods and allocate to orders. */
  create: outletProcedure
    .input(createPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createPayment(ctx.db, ctx.ctx.tenantId!, {
          outletId: ctx.ctx.outletId!,
          alokasi: input.alokasi,
          metodeBayar: input.metodeBayar,
          totalDiterima: input.totalDiterima,
          dikonfirmasiOlehId: ctx.ctx.keanggotaanOutlet!.id,
        });
      } catch (error) {
        handlePembayaranError(error);
      }
    }),

  /** List payments with filters. */
  list: tenantProcedure
    .input(listPembayaranSchema)
    .query(async ({ ctx, input }) => {
      const opts: Parameters<typeof listPembayaran>[1] = {
        ...(input.outletId ? { outletId: input.outletId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.dariTanggal ? { dariTanggal: input.dariTanggal } : {}),
        ...(input.sampaiTanggal ? { sampaiTanggal: input.sampaiTanggal } : {}),
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
      };
      return listPembayaran(ctx.db, opts);
    }),

  /** Get single payment with all relations. */
  get: tenantProcedure
    .input(getPembayaranSchema)
    .query(async ({ ctx, input }) => {
      const pembayaran = await getPembayaran(ctx.db, input.id);
      if (!pembayaran) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pembayaran tidak ditemukan",
        });
      }
      return pembayaran;
    }),

  /** Get payment summary for an order. */
  summary: tenantProcedure
    .input(getPaymentSummarySchema)
    .query(async ({ ctx, input }) => {
      const summary = await getPaymentSummary(ctx.db, input.pesananId);
      if (!summary) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pesanan tidak ditemukan",
        });
      }
      return summary;
    }),

  // ─── QRIS ─────────────────────────────────────────────────────────────
  qris: router({
    /** Manual QRIS confirmation by cashier. */
    confirm: tenantProcedure
      .input(confirmQrisSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await confirmQris(ctx.db, ctx.ctx.tenantId!, {
            pembayaranId: input.pembayaranId,
            catatanKasir: input.catatanKasir,
            diverifikasiOlehId: ctx.ctx.keanggotaanTenant!.id,
          });
        } catch (error) {
          handlePembayaranError(error);
        }
      }),
  }),

  // ─── Metode Bayar ─────────────────────────────────────────────────────
  metodeBayar: router({
    /** List available payment methods. */
    list: tenantProcedure
      .input(listMetodeBayarSchema)
      .query(async ({ ctx, input }) => {
        return listMetodeBayar(ctx.db, input);
      }),
  }),
});
