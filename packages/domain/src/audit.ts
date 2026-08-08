/**
 * @altora/domain/audit — Audit event types for Altora Resto.
 *
 * AuditEvent is append-only. No update, no delete.
 * Every financial mutation must have an audit trail.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "VOID"
  | "REFUND"
  | "APPROVE"
  | "REJECT"
  | "ADJUST"
  | "TRANSFER"
  | "CONSUME"
  | "REVERSE"
  | "OPEN_SHIFT"
  | "CLOSE_SHIFT"
  | "CLOCK_IN"
  | "CLOCK_OUT"
  | "LOGIN"
  | "LOGOUT";

export type AuditEntityType =
  | "Order"
  | "OrderItem"
  | "Payment"
  | "Refund"
  | "Check"
  | "Shift"
  | "Promotion"
  | "PromotionUsage"
  | "LoyaltyAccount"
  | "LoyaltyLedgerEntry"
  | "StockMovement"
  | "InventoryItem"
  | "Recipe"
  | "RecipeVersion"
  | "Reservation"
  | "Employee"
  | "Attendance"
  | "Tenant"
  | "Outlet"
  | "MenuItem"
  | "ModifierGroup"
  | "ManualDiscount";

export interface AuditEventInput {
  tenantId: string;
  outletId?: string;
  actorUserId?: string;
  employeeId?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  correlationId?: string;
  deviceId?: string;
  ipAddress?: string;
}

// ─── Sensitive Actions ──────────────────────────────────────────────────────

/** Actions that require reason + actor */
export const SENSITIVE_ACTIONS: AuditAction[] = [
  "VOID",
  "REFUND",
  "ADJUST",
  "REVERSE",
];

/** Actions that may require manager approval */
export const APPROVAL_REQUIRED_ACTIONS: AuditAction[] = [
  "VOID",
  "REFUND",
  "ADJUST",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Create an audit event input from context.
 * Call this in service layer, never in router.
 */
export function createAuditEvent(
  params: AuditEventInput,
): AuditEventInput {
  // Validate sensitive actions have reason
  if (SENSITIVE_ACTIONS.includes(params.action) && !params.reason) {
    throw new Error(
      `Audit: action ${params.action} requires a reason`,
    );
  }

  return {
    ...params,
    // Ensure timestamps are set by the database, not the application
  };
}

/**
 * Build audit diff (before vs after).
 * Only includes changed fields.
 */
export function auditDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const changedBefore: Record<string, unknown> = {};
  const changedAfter: Record<string, unknown> = {};

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changedBefore[key] = before[key];
      changedAfter[key] = after[key];
    }
  }

  return { before: changedBefore, after: changedAfter };
}
