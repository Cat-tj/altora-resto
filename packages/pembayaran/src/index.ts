/**
 * @altora/pembayaran — Payments domain package for Altora Resto.
 *
 * Provides:
 * - TypeScript types for the payment aggregate
 * - Zod validation schemas for all payment operations
 * - Service layer with tenant-scoped Prisma queries
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type {
  StatusAktifNonaktif,
  KodeMetodeBayar,
  StatusPembayaran,
  StatusKonfigurasiQris,
  MetodeBayar,
  Pembayaran,
  PembayaranMetodeBaris,
  AlokasiPembayaran,
  QrisKonfirmasiManual,
  KoreksiPembayaran,
  PembayaranRefund,
  KonfigurasiQris,
  PembayaranLengkap,
  RingkasanPembayaran,
  CreatePaymentInput,
  ConfirmQrisInput,
  ListPembayaranOptions,
  ListMetodeBayarOptions,
} from "./types"

// ─── Schemas ────────────────────────────────────────────────────────────────

export {
  // Enums
  kodeMetodeBayarSchema,
  statusPembayaranSchema,
  // Create Payment
  createPaymentSchema,
  // Confirm QRIS
  confirmQrisSchema,
  // Summary
  getPaymentSummarySchema,
  // List
  listPembayaranSchema,
  getPembayaranSchema,
  // Metode Bayar
  listMetodeBayarSchema,
  // QRIS Config
  getKonfigurasiQrisSchema,
} from "./schemas"

// ─── Service ────────────────────────────────────────────────────────────────

export {
  // Errors
  PembayaranError,
  type PembayaranErrorCode,
  // Create Payment
  createPayment,
  // QRIS
  confirmQris,
  // Summary
  getPaymentSummary,
  // List / Get
  listPembayaran,
  getPembayaran,
  listMetodeBayar,
} from "./pembayaran"
