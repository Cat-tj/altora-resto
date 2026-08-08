/**
 * Core tRPC setup for Altora Resto.
 *
 * Provides:
 * - Public procedure (no auth required)
 * - Protected procedure (auth required)
 * - Tenant-scoped procedure (auth + tenant context required)
 * - Outlet-scoped procedure (auth + tenant + outlet required)
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import type { TRPCContext } from "./context"

// ─── tRPC Initialization ────────────────────────────────────────────────────

const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// ─── Base Procedures ────────────────────────────────────────────────────────

/**
 * Public procedure — no authentication required.
 * Used for public endpoints (login, register, health check, etc.)
 */
export const publicProcedure = t.procedure;

/**
 * Base middleware that checks authentication.
 */
const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.ctx) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Anda harus login terlebih dahulu",
    });
  }

  return next({
    ctx: {
      ...ctx,
      ctx: ctx.ctx, // RequestContext is guaranteed non-null
    },
  });
});

/**
 * Protected procedure — requires authentication.
 * The ctx.pengguna, ctx.sesi are guaranteed to exist.
 */
export const protectedProcedure = t.procedure.use(authMiddleware);

/**
 * Base middleware that checks tenant context.
 */
const tenantMiddleware = t.middleware(({ ctx, next }) => {
  const reqCtx = ctx.ctx;
  if (!reqCtx || !reqCtx.tenantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Anda harus memilih tenant terlebih dahulu",
    });
  }

  return next({
    ctx: {
      ...ctx,
      ctx: reqCtx, // tenantId is guaranteed non-null
    },
  });
});

/**
 * Tenant-scoped procedure — requires auth + tenant selection.
 * The ctx.tenantId is guaranteed to exist.
 */
export const tenantProcedure = protectedProcedure.use(tenantMiddleware);

/**
 * Base middleware that checks outlet context.
 */
const outletMiddleware = t.middleware(({ ctx, next }) => {
  const reqCtx = ctx.ctx;
  if (!reqCtx || !reqCtx.outletId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Anda harus memilih outlet terlebih dahulu",
    });
  }

  return next({
    ctx: {
      ...ctx,
      ctx: reqCtx, // outletId is guaranteed non-null
    },
  });
});

/**
 * Outlet-scoped procedure — requires auth + tenant + outlet selection.
 * The ctx.outletId is guaranteed to exist.
 */
export const outletProcedure = tenantProcedure.use(outletMiddleware);

// ─── Router Factory ─────────────────────────────────────────────────────────

export const router = t.router;
export const middleware = t.middleware;
export { TRPCError };

// ─── Permission Procedure ──────────────────────────────────────────────────

import { type PermissionCode, hasPermission } from "@altora/domain";

/**
 * Create a permission-gated procedure.
 * Usage: permissionProcedure("order.void") — checks if user's role has the permission.
 */
export function permissionProcedure(...requiredPermissions: PermissionCode[]) {
  return outletProcedure.use(async ({ ctx, next }) => {
    const reqCtx = ctx.ctx;
    if (!reqCtx?.pengguna?.peran) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Anda tidak memiliki peran yang valid",
      });
    }

    // Get user's permissions from their role
    const userPermissions = reqCtx.pengguna.peran.izin?.map((i: any) => i.kode) ?? [];

    // Check if user has ALL required permissions
    for (const required of requiredPermissions) {
      if (!hasPermission(userPermissions as any[], required)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Anda tidak memiliki izin: ${required}`,
        });
      }
    }

    return next({ ctx });
  });
}
