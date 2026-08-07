/**
 * Kitchen (Dapur) tRPC router for Altora Resto.
 *
 * Endpoints:
 * - kitchen.tiket.list: List kitchen tickets with filters
 * - kitchen.tiket.get: Get a single ticket with full details
 * - kitchen.tiket.createFromOrder: Create tickets from an order
 * - kitchen.tiket.updateStatus: Update ticket status (validated by state machine)
 * - kitchen.tiket.updateBarisStatus: Update individual item cooking status
 * - kitchen.stasiun.list: List kitchen stations
 * - kitchen.stasiun.create: Create a new station
 * - kitchen.stasiun.update: Update a station
 * - kitchen.aturanRouting.create: Create a routing rule
 * - kitchen.aturanRouting.delete: Delete a routing rule
 */

import { z } from "zod";
import { router, tenantProcedure, outletProcedure, TRPCError } from "../trpc.js";
import {
  // Stasiun
  listStasiun,
  createStasiun,
  updateStasiun,
  // Aturan Routing
  createAturanRouting,
  deleteAturanRouting,
  // Tiket
  createTicketFromOrder,
  listTiket,
  getTiket,
  updateTicketStatus,
  updateBarisStatus,
  // Errors
  DapurError,
} from "@altora/dapur";

// ─── Input Schemas ──────────────────────────────────────────────────────────

const listStasiunSchema = z.object({
  outletId: z.string().optional(),
  includeAturan: z.boolean().default(false),
});

const createStasiunSchema = z.object({
  outletId: z.string().min(1, "ID outlet tidak valid"),
  nama: z
    .string()
    .min(1, "Nama stasiun tidak boleh kosong")
    .max(100, "Nama stasiun maksimal 100 karakter"),
});

const updateStasiunSchema = z.object({
  id: z.string().min(1, "ID stasiun tidak valid"),
  nama: z
    .string()
    .min(1, "Nama stasiun tidak boleh kosong")
    .max(100, "Nama stasiun maksimal 100 karakter")
    .optional(),
});

const createAturanRoutingSchema = z.object({
  outletId: z.string().min(1, "ID outlet tidak valid"),
  itemMenuId: z.string().optional(),
  kategoriMenuId: z.string().optional(),
  stasiunDapurId: z.string().min(1, "ID stasiun dapur tidak valid"),
  prioritas: z.number().int().min(0).optional(),
});

const deleteAturanRoutingSchema = z.object({
  id: z.string().min(1, "ID aturan routing tidak valid"),
});

const createTiketFromOrderSchema = z.object({
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
  outletId: z.string().min(1, "ID outlet tidak valid"),
  nomorGelombang: z.number().int().min(1).optional(),
});

const listTiketSchema = z.object({
  outletId: z.string().optional(),
  stasiunDapurId: z.string().optional(),
  status: z
    .enum([
      "BARU",
      "DITERIMA",
      "DITAHAN",
      "SEDANG_DISIAPKAN",
      "SELESAI_SEBAGIAN",
      "SIAP",
      "DISAJIKAN",
      "DIBATALKAN",
    ])
    .optional(),
  includeBaris: z.boolean().default(false),
  includeRiwayat: z.boolean().default(false),
});

const getTiketSchema = z.object({
  id: z.string().min(1, "ID tiket tidak valid"),
});

const updateTiketStatusSchema = z.object({
  tiketDapurId: z.string().min(1, "ID tiket dapur tidak valid"),
  status: z.enum([
    "BARU",
    "DITERIMA",
    "DITAHAN",
    "SEDANG_DISIAPKAN",
    "SELESAI_SEBAGIAN",
    "SIAP",
    "DISAJIKAN",
    "DIBATALKAN",
  ]),
  alasanPembatalan: z
    .string()
    .max(500, "Alasan maksimal 500 karakter")
    .optional(),
});

const updateBarisStatusSchema = z.object({
  tiketDapurBarisId: z.string().min(1, "ID baris tiket tidak valid"),
  statusMasak: z.enum(["MENUNGGU", "DIMASAK", "SIAP"]),
});

// ─── Helper ─────────────────────────────────────────────────────────────────

function handleDapurError(error: unknown): never {
  if (error instanceof DapurError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN" | "CONFLICT"> = {
      STASIUN_NOT_FOUND: "NOT_FOUND",
      ATURAN_ROUTING_NOT_FOUND: "NOT_FOUND",
      TIKET_NOT_FOUND: "NOT_FOUND",
      BARIS_NOT_FOUND: "NOT_FOUND",
      PESANAN_NOT_FOUND: "NOT_FOUND",
      OUTLET_NOT_IN_TENANT: "FORBIDDEN",
      DUPLICATE_NAMA: "CONFLICT",
      INVALID_TRANSITION: "BAD_REQUEST",
      ATURAN_ROUTING_INVALID_XOR: "BAD_REQUEST",
      ITEM_NOT_IN_TENANT: "FORBIDDEN",
      KATEGORI_NOT_IN_TENANT: "FORBIDDEN",
      STASIUN_NOT_IN_OUTLET: "BAD_REQUEST",
      ALASAN_WAJIB_Saat_DIBATALKAN: "BAD_REQUEST",
      TIKET_BELUM_SIAP: "BAD_REQUEST",
      SEMUA_BARIS_BELUM_SIAP: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }
  throw error;
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const kitchenRouter = router({
  // ─── Tiket ───────────────────────────────────────────────────────────
  tiket: router({
    /** List kitchen tickets with optional filters. */
    list: tenantProcedure
      .input(listTiketSchema)
      .query(async ({ ctx, input }) => {
        return listTiket(ctx.db, {
          ...(input.outletId && { outletId: input.outletId }),
          ...(input.stasiunDapurId && { stasiunDapurId: input.stasiunDapurId }),
          ...(input.status && { status: input.status }),
          includeBaris: input.includeBaris,
          includeRiwayat: input.includeRiwayat,
        });
      }),

    /** Get a single ticket with full details. */
    get: tenantProcedure
      .input(getTiketSchema)
      .query(async ({ ctx, input }) => {
        const tiket = await getTiket(ctx.db, input.id);
        if (!tiket) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tiket dapur tidak ditemukan",
          });
        }
        return tiket;
      }),

    /** Create kitchen tickets from an order. */
    createFromOrder: tenantProcedure
      .input(createTiketFromOrderSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await createTicketFromOrder(ctx.db, ctx.ctx.tenantId!, {
            pesananId: input.pesananId,
            outletId: input.outletId,
            ...(input.nomorGelombang != null && {
              nomorGelombang: input.nomorGelombang,
            }),
          });
        } catch (error) {
          handleDapurError(error);
        }
      }),

    /** Update ticket status (validated by state machine). */
    updateStatus: tenantProcedure
      .input(updateTiketStatusSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await updateTicketStatus(ctx.db, {
            tiketDapurId: input.tiketDapurId,
            status: input.status,
            ...(input.alasanPembatalan != null && {
              alasanPembatalan: input.alasanPembatalan,
            }),
          });
        } catch (error) {
          handleDapurError(error);
        }
      }),

    /** Update individual item cooking status. */
    updateBarisStatus: tenantProcedure
      .input(updateBarisStatusSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await updateBarisStatus(
            ctx.db,
            input.tiketDapurBarisId,
            input.statusMasak,
          );
        } catch (error) {
          handleDapurError(error);
        }
      }),
  }),

  // ─── Stasiun ─────────────────────────────────────────────────────────
  stasiun: router({
    /** List kitchen stations. */
    list: tenantProcedure
      .input(listStasiunSchema)
      .query(async ({ ctx, input }) => {
        return listStasiun(ctx.db, {
          ...(input.outletId && { outletId: input.outletId }),
          includeAturan: input.includeAturan,
        });
      }),

    /** Create a new kitchen station. */
    create: tenantProcedure
      .input(createStasiunSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await createStasiun(ctx.db, ctx.ctx.tenantId!, input.outletId, {
            nama: input.nama,
          });
        } catch (error) {
          handleDapurError(error);
        }
      }),

    /** Update an existing kitchen station. */
    update: tenantProcedure
      .input(updateStasiunSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const { id, ...data } = input;
          return await updateStasiun(ctx.db, id, data);
        } catch (error) {
          handleDapurError(error);
        }
      }),
  }),

  // ─── Aturan Routing ──────────────────────────────────────────────────
  aturanRouting: router({
    /** Create a routing rule. */
    create: tenantProcedure
      .input(createAturanRoutingSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await createAturanRouting(ctx.db, ctx.ctx.tenantId!, {
            outletId: input.outletId,
            ...(input.itemMenuId != null && { itemMenuId: input.itemMenuId }),
            ...(input.kategoriMenuId != null && {
              kategoriMenuId: input.kategoriMenuId,
            }),
            stasiunDapurId: input.stasiunDapurId,
            ...(input.prioritas != null && { prioritas: input.prioritas }),
          });
        } catch (error) {
          handleDapurError(error);
        }
      }),

    /** Delete a routing rule (soft-delete). */
    delete: tenantProcedure
      .input(deleteAturanRoutingSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await deleteAturanRouting(ctx.db, input.id);
        } catch (error) {
          handleDapurError(error);
        }
      }),
  }),
});
