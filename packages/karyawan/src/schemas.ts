/**
 * Zod validation schemas for the karyawan (employee) domain.
 *
 * Used by both the service layer (input validation) and the tRPC router
 * (procedure input schemas).
 */

import { z } from "zod";

// ─── Shared Enums ───────────────────────────────────────────────────────────

export const statusKaryawanSchema = z.enum(["AKTIF", "CUTI", "NONAKTIF"]);

export const metodeAbsensiSchema = z.enum([
  "QR",
  "PIN",
  "GPS",
  "MANUAL_SUPERVISOR",
]);

export const statusAbsensiSchema = z.enum([
  "TEPAT_WAKTU",
  "TERLAMBAT",
  "PULANG_AWAL",
  "LEMBUR",
]);

// ─── Clock In ───────────────────────────────────────────────────────────────

export const clockInSchema = z.object({
  karyawanId: z.string().min(1, "ID karyawan tidak valid"),
  outletId: z.string().min(1, "ID outlet tidak valid"),
  metode: metodeAbsensiSchema,
  perangkatId: z.string().optional(),
  lokasiLat: z.number().min(-90).max(90).optional(),
  lokasiLng: z.number().min(-180).max(180).optional(),
  jarakDariOutletMeter: z.number().min(0).optional(),
});

// ─── Clock Out ──────────────────────────────────────────────────────────────

export const clockOutSchema = z.object({
  karyawanId: z.string().min(1, "ID karyawan tidak valid"),
  outletId: z.string().min(1, "ID outlet tidak valid"),
});

// ─── List Employees ─────────────────────────────────────────────────────────

export const listKaryawanSchema = z.object({
  outletId: z.string().optional(),
  status: statusKaryawanSchema.optional(),
  includeRelations: z.boolean().default(false),
});

// ─── Get Employee ───────────────────────────────────────────────────────────

export const getKaryawanSchema = z.object({
  id: z.string().min(1, "ID karyawan tidak valid"),
});

// ─── Attendance Report ──────────────────────────────────────────────────────

export const absensiReportSchema = z.object({
  outletId: z.string().min(1, "ID outlet tidak valid"),
  dariTanggal: z.date(),
  sampaiTanggal: z.date(),
});

// ─── List Attendance ────────────────────────────────────────────────────────

export const listAbsensiSchema = z.object({
  outletId: z.string().optional(),
  karyawanId: z.string().optional(),
  dariTanggal: z.date().optional(),
  sampaiTanggal: z.date().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

// ─── Infer Types ────────────────────────────────────────────────────────────

export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type ListKaryawanQuery = z.infer<typeof listKaryawanSchema>;
export type GetKaryawanInput = z.infer<typeof getKaryawanSchema>;
export type AbsensiReportQuery = z.infer<typeof absensiReportSchema>;
export type ListAbsensiQuery = z.infer<typeof listAbsensiSchema>;
