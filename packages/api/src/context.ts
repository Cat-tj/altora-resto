/**
 * tRPC context creation for Altora Resto.
 *
 * Creates the per-request context that includes:
 * - The Prisma client (tenant-scoped)
 * - The resolved request context (user, session, tenant, outlet)
 * - The raw Request object
 */

import type { PrismaClient } from "@prisma/client";
import type { RequestContext } from "@altora/auth";
import { resolveContext } from "@altora/auth";
import { createTenantDb, type TenantContext } from "@altora/db";

// ─── Context Types ──────────────────────────────────────────────────────────

/**
 * The tRPC context, created per-request.
 */
export interface TRPCContext {
  /** The Prisma client (tenant-scoped if user has selected a tenant) */
  db: PrismaClient;

  /** The full request context (null if unauthenticated) */
  ctx: RequestContext | null;

  /** The raw Request object (for headers, IP, etc.) */
  request: Request;
}

// ─── Context Creation ───────────────────────────────────────────────────────

/**
 * Create the tRPC context for a request.
 *
 * This is called once per request and passed to all tRPC procedures.
 */
export async function createContext(
  prisma: PrismaClient,
  request: Request,
): Promise<TRPCContext> {
  // Resolve auth context (session, user, tenant, outlet)
  const resolvedCtx = await resolveContext(prisma, request);

  // Create tenant-scoped DB if we have a tenant context
  let db: PrismaClient = prisma;
  if (resolvedCtx?.tenantId) {
    const tenantCtx: TenantContext = {
      tenantId: resolvedCtx.tenantId,
      ...(resolvedCtx.outletId != null && { outletId: resolvedCtx.outletId }),
      ...(resolvedCtx.keanggotaanTenant?.id != null && { keanggotaanTenantId: resolvedCtx.keanggotaanTenant.id }),
      ...(resolvedCtx.keanggotaanOutlet?.id != null && { keanggotaanOutletId: resolvedCtx.keanggotaanOutlet.id }),
      penggunaId: resolvedCtx.pengguna.id,
    };
    db = createTenantDb(prisma, tenantCtx);
  }

  return {
    db,
    ctx: resolvedCtx,
    request,
  };
}
