/**
 * Table management (Meja) tRPC router for Altora Resto.
 *
 * Endpoints:
 * - meja.list: List tables with status (available/occupied/reserved)
 * - meja.get: Get a single table with full details
 * - meja.create: Create a new table
 * - meja.update: Update a table
 * - meja.assign: Assign a table to an order
 * - meja.release: Release a table (set back to available)
 * - meja.area.list: List table areas
 * - meja.area.create: Create a new area
 * - meja.area.update: Update an area
 * - meja.reservasi.create: Create a reservation
 * - meja.reservasi.list: List reservations
 * - meja.reservasi.updateStatus: Update reservation status
 * - meja.reservasi.cancel: Cancel a reservation
 */

import { z } from "zod";
import { router, tenantProcedure, outletProcedure, TRPCError } from "../trpc"
import {
  // Area
  listArea,
  createArea,
  updateArea,
  // Meja
  listMeja,
  getMeja,
  createMeja,
  updateMeja,
  assignTable,
  releaseTable,
  // Reservasi
  listReservasi,
  createReservasi,
  updateReservasiStatus,
  cancelReservasi,
  // Errors
  MejaError,
} from "@altora/meja";

// ─── Input Schemas ──────────────────────────────────────────────────────────

const listAreaSchema = z.object({
  outletId: z.string().optional(),
  includeMeja: z.boolean().default(false),
});

const createAreaSchema = z.object({
  outletId: z.string().min(1, "ID outlet tidak valid"),
  nama: z
    .string()
    .min(1, "Nama area tidak boleh kosong")
    .max(100, "Nama area maksimal 100 karakter"),
});

const updateAreaSchema = z.object({
  id: z.string().min(1, "ID area tidak valid"),
  nama: z
    .string()
    .min(1, "Nama area tidak boleh kosong")
    .max(100, "Nama area maksimal 100 karakter")
    .optional(),
});

const listMejaSchema = z.object({
  outletId: z.string().optional(),
  areaMejaId: z.string().optional(),
  status: z
    .enum(["TERSEDIA", "TERPAKAI", "DIPESAN", "PERLU_DIBERSIHKAN", "NONAKTIF"])
    .optional(),
  includeArea: z.boolean().default(false),
});

const getMejaSchema = z.object({
  id: z.string().min(1, "ID meja tidak valid"),
});

const createMejaSchema = z.object({
  outletId: z.string().min(1, "ID outlet tidak valid"),
  areaMejaId: z.string().min(1, "ID area tidak valid"),
  nomor: z
    .string()
    .min(1, "Nomor meja tidak boleh kosong")
    .max(20, "Nomor meja maksimal 20 karakter"),
  kapasitas: z.number().int().min(1, "Kapasitas minimal 1 orang"),
});

const updateMejaSchema = z.object({
  id: z.string().min(1, "ID meja tidak valid"),
  areaMejaId: z.string().min(1, "ID area tidak valid").optional(),
  nomor: z
    .string()
    .min(1, "Nomor meja tidak boleh kosong")
    .max(20, "Nomor meja maksimal 20 karakter")
    .optional(),
  kapasitas: z.number().int().min(1, "Kapasitas minimal 1 orang").optional(),
  status: z
    .enum(["TERSEDIA", "TERPAKAI", "DIPESAN", "PERLU_DIBERSIHKAN", "NONAKTIF"])
    .optional(),
});

const assignMejaSchema = z.object({
  mejaId: z.string().min(1, "ID meja tidak valid"),
  pesananId: z.string().min(1, "ID pesanan tidak valid"),
});

const releaseMejaSchema = z.object({
  mejaId: z.string().min(1, "ID meja tidak valid"),
});

const createReservasiSchema = z.object({
  outletId: z.string().min(1, "ID outlet tidak valid"),
  mejaId: z.string().optional(),
  pelangganId: z.string().min(1, "ID pelanggan tidak valid"),
  jumlahTamu: z.number().int().min(1, "Jumlah tamu minimal 1 orang"),
  waktuReservasi: z.coerce.date(),
});

const listReservasiSchema = z.object({
  outletId: z.string().optional(),
  status: z
    .enum(["DIAJUKAN", "DIKONFIRMASI", "TIBA", "SELESAI", "TIDAK_HADIR", "DIBATALKAN"])
    .optional(),
  dariTanggal: z.coerce.date().optional(),
  sampaiTanggal: z.coerce.date().optional(),
  includeMeja: z.boolean().default(false),
});

const updateReservasiStatusSchema = z.object({
  id: z.string().min(1, "ID reservasi tidak valid"),
  status: z.enum([
    "DIAJUKAN",
    "DIKONFIRMASI",
    "TIBA",
    "SELESAI",
    "TIDAK_HADIR",
    "DIBATALKAN",
  ]),
});

const cancelReservasiSchema = z.object({
  id: z.string().min(1, "ID reservasi tidak valid"),
});

// ─── Helper ─────────────────────────────────────────────────────────────────

function handleMejaError(error: unknown): never {
  if (error instanceof MejaError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN" | "CONFLICT"> = {
      AREA_NOT_FOUND: "NOT_FOUND",
      MEJA_NOT_FOUND: "NOT_FOUND",
      RESERVASI_NOT_FOUND: "NOT_FOUND",
      MEJA_NOT_AVAILABLE: "BAD_REQUEST",
      MEJA_NOT_IN_OUTLET: "BAD_REQUEST",
      AREA_NOT_IN_OUTLET: "BAD_REQUEST",
      DUPLICATE_NAMA: "CONFLICT",
      DUPLICATE_NOMOR_MEJA: "CONFLICT",
      MEJA_HAS_ACTIVE_ORDER: "BAD_REQUEST",
      MEJA_HAS_ACTIVE_RESERVATION: "BAD_REQUEST",
      OUTLET_NOT_IN_TENANT: "FORBIDDEN",
      INVALID_TRANSITION: "BAD_REQUEST",
      RESERVASI_CONFLICT: "CONFLICT",
      PELANGGAN_NOT_IN_TENANT: "FORBIDDEN",
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

export const mejaRouter = router({
  // ─── Area ────────────────────────────────────────────────────────────
  area: router({
    /** List table areas. */
    list: tenantProcedure
      .input(listAreaSchema)
      .query(async ({ ctx, input }) => {
        return listArea(ctx.db, {
          ...(input.outletId && { outletId: input.outletId }),
          includeMeja: input.includeMeja,
        });
      }),

    /** Create a new table area. */
    create: tenantProcedure
      .input(createAreaSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await createArea(ctx.db, ctx.ctx.tenantId!, input.outletId, {
            nama: input.nama,
          });
        } catch (error) {
          handleMejaError(error);
        }
      }),

    /** Update an existing table area. */
    update: tenantProcedure
      .input(updateAreaSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const { id, ...data } = input;
          return await updateArea(ctx.db, id, data);
        } catch (error) {
          handleMejaError(error);
        }
      }),
  }),

  // ─── Meja ────────────────────────────────────────────────────────────
  /** List tables with status filters. */
  list: tenantProcedure
    .input(listMejaSchema)
    .query(async ({ ctx, input }) => {
      const opts: Parameters<typeof listMeja>[1] = {
        ...(input.areaMejaId ? { areaMejaId: input.areaMejaId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.includeArea !== undefined ? { includeArea: input.includeArea } : {}),
      };
      return listMeja(ctx.db, opts);
    }),

  /** Get a single table with full details. */
  get: tenantProcedure
    .input(getMejaSchema)
    .query(async ({ ctx, input }) => {
      const meja = await getMeja(ctx.db, input.id);
      if (!meja) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meja tidak ditemukan",
        });
      }
      return meja;
    }),

  /** Create a new table. */
  create: tenantProcedure
    .input(createMejaSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createMeja(ctx.db, ctx.ctx.tenantId!, input.outletId, {
          areaMejaId: input.areaMejaId,
          nomor: input.nomor,
          kapasitas: input.kapasitas,
        });
      } catch (error) {
        handleMejaError(error);
      }
    }),

  /** Update an existing table. */
  update: tenantProcedure
    .input(updateMejaSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        return await updateMeja(ctx.db, id, data);
      } catch (error) {
        handleMejaError(error);
      }
    }),

  /** Assign a table to an order. */
  assign: tenantProcedure
    .input(assignMejaSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await assignTable(ctx.db, {
          mejaId: input.mejaId,
          pesananId: input.pesananId,
        });
      } catch (error) {
        handleMejaError(error);
      }
    }),

  /** Release a table (set back to available). */
  release: tenantProcedure
    .input(releaseMejaSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await releaseTable(ctx.db, input.mejaId);
      } catch (error) {
        handleMejaError(error);
      }
    }),

  // ─── Reservasi ───────────────────────────────────────────────────────
  reservasi: router({
    /** Create a new reservation. */
    create: tenantProcedure
      .input(createReservasiSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await createReservasi(ctx.db, ctx.ctx.tenantId!, {
            outletId: input.outletId,
            ...(input.mejaId != null && { mejaId: input.mejaId }),
            pelangganId: input.pelangganId,
            jumlahTamu: input.jumlahTamu,
            waktuReservasi: input.waktuReservasi,
          });
        } catch (error) {
          handleMejaError(error);
        }
      }),

    /** List reservations with filters. */
    list: tenantProcedure
      .input(listReservasiSchema)
      .query(async ({ ctx, input }) => {
        return listReservasi(ctx.db, {
          ...(input.outletId && { outletId: input.outletId }),
          ...(input.status && { status: input.status }),
          ...(input.dariTanggal && { dariTanggal: input.dariTanggal }),
          ...(input.sampaiTanggal && { sampaiTanggal: input.sampaiTanggal }),
          includeMeja: input.includeMeja,
        });
      }),

    /** Update reservation status. */
    updateStatus: tenantProcedure
      .input(updateReservasiStatusSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await updateReservasiStatus(ctx.db, {
            id: input.id,
            status: input.status,
          });
        } catch (error) {
          handleMejaError(error);
        }
      }),

    /** Cancel a reservation. */
    cancel: tenantProcedure
      .input(cancelReservasiSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await cancelReservasi(ctx.db, input.id);
        } catch (error) {
          handleMejaError(error);
        }
      }),
  }),
});
