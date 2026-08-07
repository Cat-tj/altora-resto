/**
 * Auth router for tRPC.
 *
 * Endpoints:
 * - auth.login: Email + password login
 * - auth.register: Register new user
 * - auth.me: Get current user (requires auth)
 * - auth.logout: Logout (revoke current session)
 * - auth.logoutAll: Logout from all devices
 * - auth.forgotPassword: Request password reset token
 * - auth.resetPassword: Reset password with token
 * - auth.selectTenant: Select a tenant to work in
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure, TRPCError } from "../trpc"
import {
  loginWithEmail,
  registerUser,
  AuthError,
  revokeSession,
  revokeAllSessions,
  generateResetToken,
  resetPassword,
  createSession,
} from "@altora/auth";

// ─── Input Schemas ──────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
  keanggotaanTenantId: z.string().optional(),
});

const registerSchema = z.object({
  namaLengkap: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Format email tidak valid"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token tidak boleh kosong"),
  newPassword: z.string().min(8, "Kata sandi minimal 8 karakter"),
});

const selectTenantSchema = z.object({
  keanggotaanTenantId: z.string().min(1, "ID keanggotaan tenant tidak valid"),
});

// ─── Router ─────────────────────────────────────────────────────────────────

export const authRouter = router({
  /**
   * Login with email + password.
   * Returns session token and user info.
   */
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await loginWithEmail(ctx.db, {
          email: input.email,
          password: input.password,
          ...(input.keanggotaanTenantId ? { keanggotaanTenantId: input.keanggotaanTenantId } : {}),
          ipHash: hashIp(ctx.request.headers.get("x-forwarded-for") ?? "unknown"),
          ...(ctx.request.headers.get("user-agent") ? { userAgent: ctx.request.headers.get("user-agent")! } : {}),
        });

        return {
          token: result.rawToken,
          session: {
            id: result.session.id,
            kadaluarsaPada: result.session.kadaluarsaPada,
          },
        };
      } catch (error) {
        if (error instanceof AuthError) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Register a new user account.
   */
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await registerUser(ctx.db, input);
        return {
          id: user.id,
          namaLengkap: user.namaLengkap,
          email: user.email,
        };
      } catch (error) {
        if (error instanceof AuthError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Get current authenticated user info.
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const { pengguna, keanggotaanTenant, keanggotaanOutlet } = ctx.ctx;

    // Load all tenant memberships for user selection
    const memberships = await ctx.db.keanggotaanTenant.findMany({
      where: { penggunaId: pengguna.id, status: "AKTIF" },
      include: {
        tenant: {
          select: { id: true, nama: true, slug: true },
        },
      },
    });

    return {
      id: pengguna.id,
      namaLengkap: pengguna.namaLengkap,
      email: pengguna.email,
      tenantAktif: keanggotaanTenant
        ? {
            id: keanggotaanTenant.id,
            tenantId: keanggotaanTenant.tenantId,
            isOwner: keanggotaanTenant.isOwner,
          }
        : null,
      outletAktif: keanggotaanOutlet
        ? {
            id: keanggotaanOutlet.id,
            outletId: keanggotaanOutlet.outletId,
          }
        : null,
      daftarTenant: memberships.map((m: any) => ({
        keanggotaanTenantId: m.id,
        tenantId: m.tenantId,
        nama: m.tenant.nama,
        slug: m.tenant.slug,
        isOwner: m.isOwner,
      })),
    };
  }),

  /**
   * Logout — revoke current session.
   */
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    await revokeSession(ctx.db, ctx.ctx.sesi.id, "logout");
    return { success: true };
  }),

  /**
   * Logout from all devices.
   */
  logoutAll: protectedProcedure.mutation(async ({ ctx }) => {
    const count = await revokeAllSessions(ctx.db, ctx.ctx.pengguna.id, "cabut-semua");
    return { revokedCount: count };
  }),

  /**
   * Request password reset token.
   * Always returns success (anti-enumeration).
   */
  forgotPassword: publicProcedure
    .input(forgotPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      // Always return success to prevent email enumeration
      await generateResetToken(ctx.db, input.email);
      return { success: true };
    }),

  /**
   * Reset password with token.
   */
  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await resetPassword(ctx.db, input.token, input.newPassword);
        return { success: true };
      } catch (error) {
        if (error instanceof AuthError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Select a tenant to work in.
   * Creates a new session scoped to the selected tenant.
   */
  selectTenant: protectedProcedure
    .input(selectTenantSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify user is a member of this tenant
      const membership = await ctx.db.keanggotaanTenant.findFirst({
        where: {
          id: input.keanggotaanTenantId,
          penggunaId: ctx.ctx.pengguna.id,
          status: "AKTIF",
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Anda bukan anggota dari tenant ini",
        });
      }

      // Revoke current session
      await revokeSession(ctx.db, ctx.ctx.sesi.id, "pindah-tenant");

      // Create new session with tenant scope
      const sessionResult = await createSession(ctx.db, {
        penggunaId: ctx.ctx.pengguna.id,
        keanggotaanTenantId: membership.id,
        ...(ctx.ctx.sesi.ipHash ? { ipHash: ctx.ctx.sesi.ipHash } : {}),
        ...(ctx.ctx.sesi.userAgent ? { userAgent: ctx.ctx.sesi.userAgent } : {}),
      });

      return {
        token: sessionResult.rawToken,
        tenant: {
          id: membership.tenantId,
          isOwner: membership.isOwner,
        },
      };
    }),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashIp(ip: string): string {
  // Simple hash for IP logging — not cryptographic, just for obfuscation
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `ip:${hash.toString(36)}`;
}
