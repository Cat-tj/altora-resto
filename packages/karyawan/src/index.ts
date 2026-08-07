/**
 * @altora/karyawan — Employee domain package for Altora Resto.
 *
 * Provides:
 * - TypeScript types for the employee aggregate
 * - Zod validation schemas for all employee operations
 * - Service layer with tenant-scoped Prisma queries
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type {
  StatusAktifNonaktif,
  StatusKaryawan,
  MetodeAbsensi,
  StatusAbsensi,
  TipeHubunganKerja,
  Karyawan,
  KaryawanOutlet,
  HubunganKerja,
  Absensi,
  PinOutlet,
  KaryawanLengkap,
  KaryawanDenganAbsensi,
  LaporanAbsensi,
  ClockInInput,
  ClockOutInput,
  ListKaryawanOptions,
  AbsensiReportOptions,
} from "./types.js";

// ─── Schemas ────────────────────────────────────────────────────────────────

export {
  // Enums
  statusKaryawanSchema,
  metodeAbsensiSchema,
  statusAbsensiSchema,
  // Clock In/Out
  clockInSchema,
  clockOutSchema,
  // List / Get
  listKaryawanSchema,
  getKaryawanSchema,
  // Attendance
  absensiReportSchema,
  listAbsensiSchema,
} from "./schemas.js";

// ─── Service ────────────────────────────────────────────────────────────────

export {
  // Errors
  KaryawanError,
  type KaryawanErrorCode,
  // List / Get
  listKaryawan,
  getKaryawan,
  // Clock In/Out
  clockIn,
  clockOut,
  // Attendance
  getAttendanceReport,
  listAbsensi,
} from "./karyawan.js";
