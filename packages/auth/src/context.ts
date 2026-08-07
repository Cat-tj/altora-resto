/**
 * Request context resolver for Altora Resto.
 *
 * Extracts the session token from a request, validates it, and builds
 * the full request context including tenant/outlet information.
 *
 * This is the bridge between raw HTTP requests and the tenant-aware
 * application layer.
 */

import type { PrismaClient, Sesi, Pengguna, KeanggotaanTenant, KeanggotaanOutlet } from "@prisma/client";
import { validateSession } from "./session"

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * The full request context, available to all authenticated handlers.
 */
export interface RequestContext {
  /** The authenticated user (global identity) */
  pengguna: Pengguna;

  /** The active session */
  sesi: Sesi;

  /** The tenant membership (if user has selected a tenant) */
  keanggotaanTenant?: KeanggotaanTenant;

  /** The outlet membership (if user has selected an outlet) */
  keanggotaanOutlet?: KeanggotaanOutlet;

  /** Tenant ID shortcut (from keanggotaanTenant.tenantId) */
  tenantId?: string;

  /** Outlet ID shortcut (from keanggotaanOutlet.outletId) */
  outletId?: string;
}

// ─── Token Extraction ───────────────────────────────────────────────────────

/**
 * Extract the session token from a Request object.
 * Checks Authorization header (Bearer token) first, then cookies.
 */
export function extractToken(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Check cookie (for web app)
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [key, ...val] = c.trim().split("=");
        return [key, val.join("=")];
      }),
    );
    return cookies["altora-session"] ?? null;
  }

  return null;
}

// ─── Context Resolution ─────────────────────────────────────────────────────

/**
 * Resolve the full request context from a raw Request.
 *
 * Flow:
 * 1. Extract token from request
 * 2. Validate session (check expiry, revocation, idle)
 * 3. Load user + tenant membership + outlet membership
 * 4. Return RequestContext (or null if unauthenticated)
 */
export async function resolveContext(
  db: PrismaClient,
  request: Request,
): Promise<RequestContext | null> {
  const token = extractToken(request);
  if (!token) return null;

  const session = await validateSession(db, token);
  if (!session) return null;

  // Load user
  const pengguna = await db.pengguna.findUnique({
    where: { id: session.penggunaId },
  });

  if (!pengguna || pengguna.status !== "AKTIF") return null;

  // Load tenant membership if session has one
  let keanggotaanTenant: KeanggotaanTenant | undefined;
  if (session.keanggotaanTenantId) {
    const kt = await db.keanggotaanTenant.findUnique({
      where: { id: session.keanggotaanTenantId },
    });

    // Only include if still active
    if (kt && kt.status === "AKTIF") {
      keanggotaanTenant = kt;
    }
  }

  // Load outlet membership if available
  let keanggotaanOutlet: KeanggotaanOutlet | undefined;
  if (keanggotaanTenant) {
    // Find the user's outlet membership for this tenant
    // This could be optimized by storing keanggotaanOutletId on the session
    const ko = await db.keanggotaanOutlet.findFirst({
      where: {
        keanggotaanTenantId: keanggotaanTenant.id,
        status: "AKTIF",
      },
    });

    if (ko) {
      keanggotaanOutlet = ko;
    }
  }

  return {
    pengguna,
    sesi: session,
    ...(keanggotaanTenant ? { keanggotaanTenant } : {}),
    ...(keanggotaanOutlet ? { keanggotaanOutlet } : {}),
    ...(keanggotaanTenant ? { tenantId: keanggotaanTenant.tenantId } : {}),
    ...(keanggotaanOutlet ? { outletId: keanggotaanOutlet.outletId } : {}),
  } as RequestContext;
}

/**
 * Resolve context from just a token string (useful for tRPC/WS contexts).
 */
export async function resolveContextFromToken(
  db: PrismaClient,
  token: string,
): Promise<RequestContext | null> {
  const session = await validateSession(db, token);
  if (!session) return null;

  const pengguna = await db.pengguna.findUnique({
    where: { id: session.penggunaId },
  });

  if (!pengguna || pengguna.status !== "AKTIF") return null;

  let keanggotaanTenant: KeanggotaanTenant | undefined;
  if (session.keanggotaanTenantId) {
    const kt = await db.keanggotaanTenant.findUnique({
      where: { id: session.keanggotaanTenantId },
    });
    if (kt && kt.status === "AKTIF") {
      keanggotaanTenant = kt;
    }
  }

  let keanggotaanOutlet: KeanggotaanOutlet | undefined;
  if (keanggotaanTenant) {
    const ko = await db.keanggotaanOutlet.findFirst({
      where: {
        keanggotaanTenantId: keanggotaanTenant.id,
        status: "AKTIF",
      },
    });
    if (ko) keanggotaanOutlet = ko;
  }

  return {
    pengguna,
    sesi: session,
    ...(keanggotaanTenant ? { keanggotaanTenant } : {}),
    ...(keanggotaanOutlet ? { keanggotaanOutlet } : {}),
    ...(keanggotaanTenant ? { tenantId: keanggotaanTenant.tenantId } : {}),
    ...(keanggotaanOutlet ? { outletId: keanggotaanOutlet.outletId } : {}),
  } as RequestContext;
}
