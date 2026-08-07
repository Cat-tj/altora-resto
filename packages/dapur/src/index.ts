/**
 * @altora/dapur — Kitchen (Dapur) domain package for Altora Resto.
 *
 * Provides:
 * - TypeScript types for the kitchen display system aggregate
 * - Zod validation schemas for all kitchen operations
 * - Service layer with tenant-scoped Prisma queries
 *   - Multi-station routing (Bar/Dapur/Grill/Dessert)
 *   - Ticket creation from orders
 *   - Status transitions with validation
 *
 * @example
 * ```ts
 * import {
 *   createTicketFromOrder,
 *   updateTicketStatus,
 *   listTiket,
 *   createStasiunSchema,
 *   type TiketDapur,
 * } from "@altora/dapur";
 *
 * // Create tickets from an order
 * const tickets = await createTicketFromOrder(db, tenantId, {
 *   pesananId: "...",
 *   outletId: "...",
 * });
 *
 * // Update ticket status (validated by state machine)
 * await updateTicketStatus(db, {
 *   tiketDapurId: "...",
 *   status: "SEDANG_DISIAPKAN",
 * });
 * ```
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type {
  StatusAktifNonaktif,
  StatusTiketDapur,
  StatusMasakBaris,
  StasiunDapur,
  AturanRoutingDapur,
  TiketDapur,
  TiketDapurBaris,
  RiwayatStatusTiketDapur,
  TiketDapurLengkap,
  StasiunDapurDenganAturan,
  CreateStasiunInput,
  UpdateStasiunInput,
  CreateAturanRoutingInput,
  UpdateAturanRoutingInput,
  ListTiketOptions,
  ListStasiunOptions,
} from "./types"

// ─── Schemas ────────────────────────────────────────────────────────────────

export {
  // Enums
  statusTiketDapurSchema,
  statusMasakBarisSchema,
  // Stasiun
  createStasiunSchema,
  updateStasiunSchema,
  // Aturan Routing
  createAturanRoutingSchema,
  updateAturanRoutingSchema,
  deleteAturanRoutingSchema,
  // Tiket
  createTiketFromOrderSchema,
  updateTiketStatusSchema,
  updateBarisStatusSchema,
  getTiketSchema,
  // List queries
  listTiketQuerySchema,
  listStasiunQuerySchema,
} from "./schemas"

// ─── Service ────────────────────────────────────────────────────────────────

export {
  // Errors
  DapurError,
  type DapurErrorCode,
  // Stasiun
  listStasiun,
  getStasiun,
  createStasiun,
  updateStasiun,
  // Aturan Routing
  listAturanRouting,
  createAturanRouting,
  deleteAturanRouting,
  // Tiket
  createTicketFromOrder,
  listTiket,
  getTiket,
  updateTicketStatus,
  updateBarisStatus,
  // Helpers
  resolveStasiunUntukItem,
  getItemPrepTime,
} from "./dapur"
