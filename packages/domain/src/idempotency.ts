/**
 * @altora/domain/idempotency — Idempotency key utilities for Altora Resto.
 *
 * Every critical mutation must have an idempotency key.
 * Duplicate requests with the same key return the existing result.
 */

import { createHash } from "node:crypto";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IdempotencyKey {
  /** The unique key (typically a UUID or hash) */
  key: string;
  /** When the key was created */
  createdAt: Date;
  /** The result of the first execution (serialized) */
  result?: string;
  /** HTTP status code of the first execution */
  statusCode?: number;
}

// ─── Generation ─────────────────────────────────────────────────────────────

/**
 * Generate an idempotency key from a request context.
 * Format: `{domain}:{entity}:{action}:{fingerprint}`
 */
export function generateIdempotencyKey(params: {
  domain: string;
  entity: string;
  action: string;
  /** Unique identifiers that make this request unique */
  fingerprint: string[];
}): string {
  const base = [
    params.domain,
    params.entity,
    params.action,
    ...params.fingerprint,
  ].join(":");

  const hash = createHash("sha256").update(base).digest("hex").slice(0, 16);
  return `${params.domain}:${params.entity}:${params.action}:${hash}`;
}

/**
 * Generate a simple idempotency key from a string.
 */
export function simpleIdempotencyKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

// ─── Pre-built Key Patterns ─────────────────────────────────────────────────

export const IdempotencyPatterns = {
  /** Payment: order:{orderId}:payment:{method}:{amount} */
  payment: (orderId: string, method: string, amount: number) =>
    `payment:order:${orderId}:${method}:${amount}`,

  /** Refund: refund:{paymentId}:{amount} */
  refund: (paymentId: string, amount: number) =>
    `refund:${paymentId}:${amount}`,

  /** Inventory consumption: consume:{orderItemId}:ingredient:{ingredientId} */
  inventoryConsume: (orderItemId: string, ingredientId: string) =>
    `consume:${orderItemId}:ingredient:${ingredientId}`,

  /** Loyalty earn: loyalty-earn:{orderId}:{customerId} */
  loyaltyEarn: (orderId: string, customerId: string) =>
    `loyalty-earn:${orderId}:${customerId}`,

  /** Loyalty redeem: loyalty-redeem:{orderId}:{customerId}:{points} */
  loyaltyRedeem: (orderId: string, customerId: string, points: number) =>
    `loyalty-redeem:${orderId}:${customerId}:${points}`,

  /** Stock transfer: transfer:{transferId} */
  stockTransfer: (transferId: string) =>
    `transfer:${transferId}`,

  /** Reservation: reservation:{tenantId}:{tableId}:{startsAt} */
  reservation: (tenantId: string, tableId: string, startsAt: string) =>
    `reservation:${tenantId}:${tableId}:${startsAt}`,
} as const;

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate idempotency key format.
 */
export function isValidIdempotencyKey(key: string): boolean {
  // Must be non-empty, max 255 chars, only alphanumeric + colons + hyphens
  return /^[a-zA-Z0-9:-]{1,255}$/.test(key);
}
