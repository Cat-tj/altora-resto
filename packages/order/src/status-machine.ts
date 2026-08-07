/**
 * Status machine guards for order lifecycle (StatusPesanan).
 *
 * Implements the 13-status state machine (ALT-DEF-005 minus DIRETUR per
 * ADR-036). Each transition has:
 * - A set of valid source statuses
 * - Guard function for additional invariants
 * - Required actor roles
 *
 * Transition table is derived from docs/arsitektur/STATE-MACHINES.md.
 * The guard functions receive the current Pesanan and can perform
 * async checks (e.g., checking payment status, stock availability).
 */

import type { StatusPesanan } from "./types.js";

// ─── Transition Map ─────────────────────────────────────────────────────────

/**
 * Defines all valid status transitions.
 * Key = source status, Value = set of valid target statuses.
 */
export const TRANSITIONS: Record<StatusPesanan, readonly StatusPesanan[]> = {
  DRAF: ["DIKIRIM", "DIBATALKAN"],
  DIKIRIM: ["MENUNGGU_PERSETUJUAN", "DITERIMA", "DITOLAK", "MENUNGGU_PEMBAYARAN", "DIKONFIRMASI", "DIBATALKAN"],
  MENUNGGU_PERSETUJUAN: ["DITERIMA", "DITOLAK", "DIBATALKAN"],
  DITERIMA: ["DIKONFIRMASI", "MENUNGGU_PEMBAYARAN", "DIKIRIM_KE_DAPUR", "DIBATALKAN"],
  DITOLAK: ["DIKIRIM", "DIBATALKAN"],
  MENUNGGU_PEMBAYARAN: ["DIKONFIRMASI", "DIBATALKAN"],
  DIKONFIRMASI: ["DIKIRIM_KE_DAPUR", "SEDANG_DISIAPKAN", "DIBATALKAN"],
  DIKIRIM_KE_DAPUR: ["SEDANG_DISIAPKAN", "DIBATALKAN"],
  SEDANG_DISIAPKAN: ["SIAP", "DIBATALKAN"],
  SIAP: ["DISAJIKAN", "DIBATALKAN"],
  DISAJIKAN: ["SELESAI", "DIBATALKAN"],
  SELESAI: [],
  DIBATALKAN: [],
};

// ─── Guards ─────────────────────────────────────────────────────────────────

/**
 * Error type for invalid transitions.
 */
export class InvalidTransitionError extends Error {
  public readonly from: string;
  public readonly to: string;
  constructor(
    from: string,
    to: string,
    message?: string,
  ) {
    super(message ?? `Transisi tidak valid: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
    this.from = from;
    this.to = to;
  }
}

/**
 * Check whether a status transition is valid.
 */
export function canTransition(from: StatusPesanan, to: StatusPesanan): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Validate a transition, throwing InvalidTransitionError if invalid.
 */
export function validateTransition(from: StatusPesanan, to: StatusPesanan): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

/**
 * Get all valid target statuses from a given source status.
 */
export function getValidTransitions(from: StatusPesanan): readonly StatusPesanan[] {
  return TRANSITIONS[from];
}

/**
 * Check whether a status is terminal (no outgoing transitions).
 */
export function isTerminal(status: StatusPesanan): boolean {
  return TRANSITIONS[status].length === 0;
}

/**
 * Check whether a status represents an active/in-progress order.
 * Active statuses are those between DIKONFIRMASI and SELESAI.
 */
export function isActive(status: StatusPesanan): boolean {
  const ACTIVE_STATUSES: StatusPesanan[] = [
    "DIKONFIRMASI",
    "DIKIRIM_KE_DAPUR",
    "SEDANG_DISIAPKAN",
    "SIAP",
    "DISAJIKAN",
  ];
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Check whether an order can receive new items (only DRAF, DIKIRIM, or
 * DITOLAK statuses — the last allows retry/resend).
 */
export function canAddItems(status: StatusPesanan): boolean {
  return status === "DRAF" || status === "DIKIRIM" || status === "DITOLAK";
}

/**
 * Check whether an order is cancelable from the given status.
 * SELESAI and DIBATALKAN are terminal — no outgoing transitions at all.
 * SEDANG_DISIAPKAN, SIAP, DISAJIKAN can only be cancelled via
 * SETELAH_PRODUKSI (requires approval), handled at service layer.
 */
export function isCancelable(status: StatusPesanan): boolean {
  return canTransition(status, "DIBATALKAN");
}

/**
 * Determine whether cancellation requires supervisor approval.
 * Only needed when cancelling from post-production statuses.
 */
export function requiresApprovalForCancel(status: StatusPesanan): boolean {
  const POST_PRODUCTION_STATUSES: StatusPesanan[] = [
    "DIKONFIRMASI",
    "DIKIRIM_KE_DAPUR",
    "SEDANG_DISIAPKAN",
    "SIAP",
    "DISAJIKAN",
  ];
  return POST_PRODUCTION_STATUSES.includes(status);
}

// ─── Payment Status Guards ──────────────────────────────────────────────────

import type { StatusPembayaran } from "./types.js";

/**
 * Payment state machine transitions.
 * Key = source status, Value = set of valid target statuses.
 */
export const PEMBAYARAN_TRANSITIONS: Record<StatusPembayaran, readonly StatusPembayaran[]> = {
  DRAF: ["MENUNGGU", "MENUNGGU_KONFIRMASI", "DIBAYAR", "GAGAL", "DIBATALKAN"],
  MENUNGGU: ["MENUNGGU_KONFIRMASI", "DIBAYAR", "GAGAL", "DIBATALKAN"],
  MENUNGGU_KONFIRMASI: ["DIBAYAR", "GAGAL", "DIBATALKAN"],
  DIBAYAR: ["DIKOREKSI", "DIKEMBALIKAN_SEBAGIAN", "DIKEMBALIKAN"],
  GAGAL: [],
  DIBATALKAN: [],
  DIKOREKSI: [],
  DIKEMBALIKAN_SEBAGIAN: ["DIKEMBALIKAN"],
  DIKEMBALIKAN: [],
};

export function canPembayaranTransition(from: StatusPembayaran, to: StatusPembayaran): boolean {
  return PEMBAYARAN_TRANSITIONS[from].includes(to);
}

export function validatePembayaranTransition(from: StatusPembayaran, to: StatusPembayaran): void {
  if (!canPembayaranTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

// ─── Item Status Guards ─────────────────────────────────────────────────────

import type { StatusItemPesanan } from "./types.js";

/**
 * Item-level status transitions.
 * Key = source status, Value = set of valid target statuses.
 */
export const ITEM_TRANSITIONS: Record<StatusItemPesanan, readonly StatusItemPesanan[]> = {
  DRAF: ["DITERIMA", "DIKIRIM_KE_DAPUR", "DITAHAN", "DIBATALKAN"],
  DITERIMA: ["DIKIRIM_KE_DAPUR", "DITAHAN", "DIBATALKAN"],
  DIKIRIM_KE_DAPUR: ["SEDANG_DISIAPKAN", "DIBATALKAN"],
  DITAHAN: ["DIKIRIM_KE_DAPUR", "DIBATALKAN"],
  SEDANG_DISIAPKAN: ["SIAP", "DIBATALKAN"],
  SIAP: ["DISAJIKAN", "DIBATALKAN"],
  DISAJIKAN: ["DIBATALKAN"],
  DIBATALKAN: [],
  DIRETUR: [],
};

export function canItemTransition(from: StatusItemPesanan, to: StatusItemPesanan): boolean {
  return ITEM_TRANSITIONS[from].includes(to);
}
