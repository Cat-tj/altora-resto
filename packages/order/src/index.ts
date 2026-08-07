/**
 * @altora/order — Order domain package for Altora Resto.
 *
 * Provides:
 * - TypeScript types for the order aggregate (Pesanan, ItemPesanan, Pembayaran, etc.)
 * - Zod validation schemas for all order operations
 * - Status machine guards (13-status order, 9-status payment, item-level status)
 * - Service layer (CRUD, status transitions, payments, split bill) with
 *   tenant-scoped Prisma queries
 *
 * @example
 * ```ts
 * import {
 *   createPesanan,
 *   addItem,
 *   updateStatus,
 *   createPayment,
 *   createPesananSchema,
 *   validateTransition,
 *   type Pesanan,
 * } from "@altora/order";
 *
 * // Validate a status transition
 * validateTransition("DRAF", "DIKIRIM"); // OK
 * validateTransition("SELESAI", "DRAF"); // throws InvalidTransitionError
 *
 * // Create an order (validated by Zod)
 * const input = createPesananSchema.parse({ outletId: "...", kanal: "KASIR" });
 * const pesanan = await createPesanan(db, tenantId, input);
 * ```
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type {
  // Enums
  KanalPesanan,
  StatusPesanan,
  StatusItemPesanan,
  JenisPerubahanPesanan,
  StatusPembayaran,
  KodeMetodeBayar,
  StatusRetur,
  StatusRingkasanRetur,
  JenisPembatalan,
  StatusGiliranKasir,
  JenisTransaksiKasir,
  // Entities
  Pesanan,
  ItemPesanan,
  ItemPesananModifier,
  Pembayaran,
  AlokasiPembayaran,
  PembayaranMetodeBaris,
  Struk,
  PesananRiwayatStatus,
  PesananPerubahan,
  PesananPenolakan,
  PesananPembatalan,
  GiliranKasir,
  TransaksiKasir,
  // Combined
  PesananLengkap,
  PembayaranLengkap,
  // Input
  CreatePesananInput,
  AddItemInput,
  RemoveItemInput,
  UpdateItemQuantityInput,
  UpdateStatusInput,
  CreatePaymentInput,
  SplitBillInput,
  // Query
  ListPesananOptions,
  GetPesananOptions,
} from "./types"

// ─── Schemas ────────────────────────────────────────────────────────────────

export {
  // Enums
  kanalPesananSchema,
  statusPesananSchema,
  statusItemPesananSchema,
  statusPembayaranSchema,
  kodeMetodeBayarSchema,
  jenisPembatalanSchema,
  // Create
  createPesananSchema,
  addItemSchema,
  removeItemSchema,
  updateItemQuantitySchema,
  updateStatusSchema,
  createPaymentSchema,
  splitBillSchema,
  cancelOrderSchema,
  rejectOrderSchema,
  // Query
  listPesananSchema,
  getPesananSchema,
  getActiveOrdersSchema,
  // POS
  kasirCheckoutSchema,
} from "./schemas"

// ─── Status Machine ─────────────────────────────────────────────────────────

export {
  // Constants
  TRANSITIONS,
  PEMBAYARAN_TRANSITIONS,
  ITEM_TRANSITIONS,
  // Errors
  InvalidTransitionError,
  // Guards
  canTransition,
  validateTransition,
  getValidTransitions,
  isTerminal,
  isActive,
  canAddItems,
  isCancelable,
  requiresApprovalForCancel,
  canPembayaranTransition,
  validatePembayaranTransition,
  canItemTransition,
} from "./status-machine"

// ─── Service ────────────────────────────────────────────────────────────────

export {
  // Errors
  OrderError,
  type OrderErrorCode,
  // CRUD
  createPesanan,
  addItem,
  removeItem,
  updateStatus,
  // Payment
  createPayment,
  // Split
  splitBill,
  // Queries
  listPesanan,
  getPesanan,
  // POS
  getActiveOrders,
  kasirCheckout,
} from "./order"
