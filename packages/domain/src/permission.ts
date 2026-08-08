/**
 * @altora/domain/permission — Granular permission model for Altora Resto.
 *
 * Permissions are code-based (e.g., "pos.use", "order.void").
 * Roles are collections of permissions.
 * Sensitive actions may require manager PIN.
 */

// ─── Permission Codes ───────────────────────────────────────────────────────

export const PERMISSIONS = {
  // POS
  POS_USE: "pos.use",
  POS_DISCOUNT: "pos.discount",
  POS_MANUAL_DISCOUNT: "pos.manual_discount",
  POS_SPLIT_BILL: "pos.split_bill",

  // Orders
  ORDER_VIEW: "order.view",
  ORDER_CREATE: "order.create",
  ORDER_CANCEL: "order.cancel",
  ORDER_VOID: "order.void",
  ORDER_REOPEN: "order.reopen",
  ORDER_EDIT: "order.edit",

  // Payments
  PAYMENT_CREATE: "payment.create",
  PAYMENT_REFUND: "payment.refund",
  PAYMENT_VIEW: "payment.view",

  // Menu
  MENU_VIEW: "menu.view",
  MENU_MANAGE: "menu.manage",
  MENU_PRICE: "menu.price",

  // Kitchen
  KITCHEN_VIEW: "kitchen.view",
  KITCHEN_MANAGE: "kitchen.manage",

  // Inventory
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_ADJUST: "inventory.adjust",
  INVENTORY_TRANSFER: "inventory.transfer",
  INVENTORY_STOCK_COUNT: "inventory.stock_count",
  INVENTORY_RECEIVE: "inventory.receive",
  INVENTORY_WASTE: "inventory.waste",

  // Promotions
  PROMOTION_VIEW: "promotion.view",
  PROMOTION_MANAGE: "promotion.manage",

  // Loyalty
  LOYALTY_VIEW: "loyalty.view",
  LOYALTY_ADJUST: "loyalty.adjust",
  LOYALTY_REDEEM: "loyalty.redeem",

  // Employee
  EMPLOYEE_VIEW: "employee.view",
  EMPLOYEE_MANAGE: "employee.manage",

  // Attendance
  ATTENDANCE_VIEW: "attendance.view",
  ATTENDANCE_APPROVE: "attendance.approve",
  ATTENDANCE_CORRECT: "attendance.correct",

  // Reports
  REPORT_VIEW: "report.view",
  REPORT_EXPORT: "report.export",

  // Settings
  SETTINGS_MANAGE: "settings.manage",
  SETTINGS_OUTLET: "settings.outlet",

  // Reservations
  RESERVATION_VIEW: "reservation.view",
  RESERVATION_MANAGE: "reservation.manage",

  // Recipes
  RECIPE_VIEW: "recipe.view",
  RECIPE_MANAGE: "recipe.manage",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── Role Definitions ───────────────────────────────────────────────────────

export const DEFAULT_ROLES: Record<string, PermissionCode[]> = {
  OWNER: Object.values(PERMISSIONS), // All permissions

  MANAGER: [
    PERMISSIONS.POS_USE,
    PERMISSIONS.POS_DISCOUNT,
    PERMISSIONS.POS_MANUAL_DISCOUNT,
    PERMISSIONS.POS_SPLIT_BILL,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_CANCEL,
    PERMISSIONS.ORDER_VOID,
    PERMISSIONS.ORDER_REOPEN,
    PERMISSIONS.ORDER_EDIT,
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_REFUND,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_MANAGE,
    PERMISSIONS.MENU_PRICE,
    PERMISSIONS.KITCHEN_VIEW,
    PERMISSIONS.KITCHEN_MANAGE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.INVENTORY_STOCK_COUNT,
    PERMISSIONS.INVENTORY_RECEIVE,
    PERMISSIONS.INVENTORY_WASTE,
    PERMISSIONS.PROMOTION_VIEW,
    PERMISSIONS.PROMOTION_MANAGE,
    PERMISSIONS.LOYALTY_VIEW,
    PERMISSIONS.LOYALTY_ADJUST,
    PERMISSIONS.LOYALTY_REDEEM,
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.EMPLOYEE_MANAGE,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_APPROVE,
    PERMISSIONS.ATTENDANCE_CORRECT,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.SETTINGS_OUTLET,
    PERMISSIONS.RESERVATION_VIEW,
    PERMISSIONS.RESERVATION_MANAGE,
    PERMISSIONS.RECIPE_VIEW,
    PERMISSIONS.RECIPE_MANAGE,
  ],

  SUPERVISOR: [
    PERMISSIONS.POS_USE,
    PERMISSIONS.POS_DISCOUNT,
    PERMISSIONS.POS_SPLIT_BILL,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_CANCEL,
    PERMISSIONS.ORDER_EDIT,
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.KITCHEN_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_RECEIVE,
    PERMISSIONS.LOYALTY_VIEW,
    PERMISSIONS.LOYALTY_REDEEM,
    PERMISSIONS.EMPLOYEE_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.RESERVATION_VIEW,
    PERMISSIONS.RESERVATION_MANAGE,
    PERMISSIONS.RECIPE_VIEW,
  ],

  CASHIER: [
    PERMISSIONS.POS_USE,
    PERMISSIONS.POS_DISCOUNT,
    PERMISSIONS.POS_SPLIT_BILL,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_VIEW,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.LOYALTY_VIEW,
    PERMISSIONS.LOYALTY_REDEEM,
    PERMISSIONS.RESERVATION_VIEW,
  ],

  WAITER: [
    PERMISSIONS.POS_USE,
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_EDIT,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.KITCHEN_VIEW,
    PERMISSIONS.RESERVATION_VIEW,
  ],

  KITCHEN: [
    PERMISSIONS.KITCHEN_VIEW,
    PERMISSIONS.KITCHEN_MANAGE,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.RECIPE_VIEW,
  ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(
  rolePermissions: PermissionCode[],
  required: PermissionCode,
): boolean {
  return rolePermissions.includes(required);
}

/**
 * Check if a role has ALL of the required permissions.
 */
export function hasAllPermissions(
  rolePermissions: PermissionCode[],
  required: PermissionCode[],
): boolean {
  return required.every((p) => rolePermissions.includes(p));
}

/**
 * Check if a role has ANY of the required permissions.
 */
export function hasAnyPermission(
  rolePermissions: PermissionCode[],
  required: PermissionCode[],
): boolean {
  return required.some((p) => rolePermissions.includes(p));
}

/**
 * Get default permissions for a role code.
 */
export function getRolePermissions(roleCode: string): PermissionCode[] {
  return DEFAULT_ROLES[roleCode] ?? [];
}
