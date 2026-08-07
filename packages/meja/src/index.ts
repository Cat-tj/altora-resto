/**
 * @altora/meja — Table management domain package for Altora Resto.
 *
 * Provides:
 * - TypeScript types for the table management aggregate
 * - Zod validation schemas for all table operations
 * - Service layer with tenant-scoped Prisma queries
 *   - Table listing with status (available/occupied/reserved)
 *   - Table assignment and release
 *   - Reservation management with time slot conflict detection
 *
 * @example
 * ```ts
 * import {
 *   listMeja,
 *   assignTable,
 *   releaseTable,
 *   createReservasi,
 *   listMejaQuerySchema,
 *   type Meja,
 * } from "@altora/meja";
 *
 * // List available tables
 * const tables = await listMeja(db, {
 *   outletId: "...",
 *   status: "TERSEDIA",
 *   includeArea: true,
 * });
 *
 * // Assign a table to an order
 * await assignTable(db, { mejaId: "...", pesananId: "..." });
 *
 * // Create a reservation
 * await createReservasi(db, tenantId, {
 *   outletId: "...",
 *   pelangganId: "...",
 *   jumlahTamu: 4,
 *   waktuReservasi: new Date("2025-01-15T19:00:00"),
 * });
 * ```
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type {
  StatusMeja,
  StatusReservasi,
  AreaMeja,
  Meja,
  Reservasi,
  MejaDenganArea,
  MejaLengkap,
  ReservasiDenganMeja,
  CreateAreaInput,
  UpdateAreaInput,
  CreateMejaInput,
  UpdateMejaInput,
  CreateReservasiInput,
  UpdateReservasiInput,
  ListMejaOptions,
  ListReservasiOptions,
  ListAreaOptions,
} from "./types"

// ─── Schemas ────────────────────────────────────────────────────────────────

export {
  // Enums
  statusMejaSchema,
  statusReservasiSchema,
  // Area
  createAreaSchema,
  updateAreaSchema,
  // Meja
  createMejaSchema,
  updateMejaSchema,
  assignMejaSchema,
  releaseMejaSchema,
  // Reservasi
  createReservasiSchema,
  updateReservasiSchema,
  cancelReservasiSchema,
  // List queries
  listMejaQuerySchema,
  listReservasiQuerySchema,
  listAreaQuerySchema,
} from "./schemas"

// ─── Service ────────────────────────────────────────────────────────────────

export {
  // Errors
  MejaError,
  type MejaErrorCode,
  // Area
  listArea,
  getArea,
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
} from "./meja"
