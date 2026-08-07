/**
 * Karyawan (Employee) tRPC router for Altora Resto.
 *
 * Endpoints:
 * - karyawan.list: List employees for the tenant
 * - karyawan.get: Get single employee with relations
 * - karyawan.attendance.clockIn: Clock in an employee
 * - karyawan.attendance.clockOut: Clock out an employee
 * - karyawan.attendance.list: List attendance records
 * - karyawan.attendance.report: Get attendance report for date range
 */

import { z } from "zod";
import { router, tenantProcedure, TRPCError } from "../trpc"
import {
  listKaryawan,
  getKaryawan,
  clockIn,
  clockOut,
  listAbsensi,
  getAttendanceReport,
  KaryawanError,
} from "@altora/karyawan";

// ─── Input Schemas ──────────────────────────────────────────────────────────

const listKaryawanSchema = z.object({
  outletId: z.string().optional(),
  status: z.enum(["AKTIF", "CUTI", "NONAKTIF"]).optional(),
  includeRelations: z.boolean().default(false),
});

const getKaryawanSchema = z.object({
  id: z.string().min(1, "ID karyawan tidak valid"),
});

const clockInSchema = z.object({
  karyawanId: z.string().min(1, "ID karyawan tidak valid"),
  outletId: z.string().min(1, "ID outlet tidak valid"),
  metode: z.enum(["QR", "PIN", "GPS", "MANUAL_SUPERVISOR"]),
  perangkatId: z.string().optional(),
  lokasiLat: z.number().min(-90).max(90).optional(),
  lokasiLng: z.number().min(-180).max(180).optional(),
  jarakDariOutletMeter: z.number().min(0).optional(),
});

const clockOutSchema = z.object({
  karyawanId: z.string().min(1, "ID karyawan tidak valid"),
  outletId: z.string().min(1, "ID outlet tidak valid"),
});

const listAbsensiSchema = z.object({
  outletId: z.string().optional(),
  karyawanId: z.string().optional(),
  dariTanggal: z.date().optional(),
  sampaiTanggal: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

const absensiReportSchema = z.object({
  outletId: z.string().min(1, "ID outlet tidak valid"),
  dariTanggal: z.date(),
  sampaiTanggal: z.date(),
});

// ─── Helper ─────────────────────────────────────────────────────────────────

function handleKaryawanError(error: unknown): never {
  if (error instanceof KaryawanError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN" | "CONFLICT"> = {
      KARYAWAN_NOT_FOUND: "NOT_FOUND",
      ABSENSI_NOT_FOUND: "NOT_FOUND",
      ALREADY_CLOCKED_IN: "CONFLICT",
      NOT_CLOCKED_IN: "BAD_REQUEST",
      ALREADY_CLOCKED_OUT: "CONFLICT",
      OUTLET_NOT_IN_TENANT: "FORBIDDEN",
      DUPLICATE_NOMOR_INDUK: "CONFLICT",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }
  throw error;
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const karyawanRouter = router({
  /** List employees for the tenant. */
  list: tenantProcedure
    .input(listKaryawanSchema)
    .query(async ({ ctx, input }) => {
      return listKaryawan(ctx.db, input);
    }),

  /** Get single employee with relations. */
  get: tenantProcedure
    .input(getKaryawanSchema)
    .query(async ({ ctx, input }) => {
      const karyawan = await getKaryawan(ctx.db, input.id);
      if (!karyawan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Karyawan tidak ditemukan",
        });
      }
      return karyawan;
    }),

  // ─── Attendance ───────────────────────────────────────────────────────
  attendance: router({
    /** Clock in an employee. */
    clockIn: tenantProcedure
      .input(clockInSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await clockIn(ctx.db, ctx.ctx.tenantId!, input);
        } catch (error) {
          handleKaryawanError(error);
        }
      }),

    /** Clock out an employee. */
    clockOut: tenantProcedure
      .input(clockOutSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          return await clockOut(ctx.db, ctx.ctx.tenantId!, input);
        } catch (error) {
          handleKaryawanError(error);
        }
      }),

    /** List attendance records. */
    list: tenantProcedure
      .input(listAbsensiSchema)
      .query(async ({ ctx, input }) => {
        return listAbsensi(ctx.db, input);
      }),

    /** Get attendance report for date range. */
    report: tenantProcedure
      .input(absensiReportSchema)
      .query(async ({ ctx, input }) => {
        return getAttendanceReport(ctx.db, ctx.ctx.tenantId!, input);
      }),
  }),
});
