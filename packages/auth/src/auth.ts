/**
 * Authentication service for Altora Resto.
 *
 * Handles:
 * - Email + password login with account lockout
 * - PIN-based outlet login
 * - Registration of new users
 * - Password reset flow (token generation + verification)
 *
 * ALT-DEF-003: Login attempt tracking, account lockout, reset tokens.
 * ALT-DEF-013: PIN per keanggotaan-tenant + outlet (PinOutlet model).
 */

import type { PrismaClient, Pengguna } from "@prisma/client";
import { hashPassword, verifyPassword } from "./password.js";
import {
  createSession,
  revokeAllSessions,
  type SessionResult,
} from "./session.js";

// ─── Configuration ──────────────────────────────────────────────────────────

/** Max failed login attempts before lockout */
const MAX_LOGIN_ATTEMPTS = 5;

/** Lockout duration: 15 minutes */
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/** Password reset token validity: 1 hour */
const RESET_TOKEN_VALIDITY_MS = 60 * 60 * 1000;

// ─── Errors ─────────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    message: string,
    public code: AuthErrorCode,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_DISABLED"
  | "USER_NOT_FOUND"
  | "INVALID_RESET_TOKEN"
  | "RESET_TOKEN_EXPIRED"
  | "EMAIL_ALREADY_EXISTS"
  | "INVALID_PIN"
  | "OUTLET_ACCESS_DENIED";

// ─── Login ──────────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
  ipHash?: string;
  userAgent?: string;
  /** Optional: auto-select a tenant membership after login */
  keanggotaanTenantId?: string;
}

/**
 * Authenticate a user with email + password.
 *
 * Flow:
 * 1. Find user by email
 * 2. Check account lockout (terkunciSampai)
 * 3. Verify password
 * 4. On success: reset failed attempts, create session, update lastLoginPada
 * 5. On failure: increment failed attempts, potentially lock account
 * 6. Log the attempt (PercobaanLogin append-only)
 */
export async function loginWithEmail(
  db: PrismaClient,
  input: LoginInput,
): Promise<SessionResult> {
  const user = await db.pengguna.findUnique({
    where: { email: input.email.toLowerCase().trim() },
  });

  if (!user) {
    // Log attempt even for non-existent users (anti-enumeration: same response)
    await logLoginAttempt(db, input.email, false, input.ipHash, input.userAgent);
    throw new AuthError("Email atau kata sandi salah", "INVALID_CREDENTIALS");
  }

  if (user.status === "NONAKTIF") {
    throw new AuthError("Akun tidak aktif", "ACCOUNT_DISABLED");
  }

  // Check lockout
  if (user.terkunciSampai && user.terkunciSampai > new Date()) {
    throw new AuthError(
      "Akun terkunci karena terlalu banyak percobaan gagal. Coba lagi nanti.",
      "ACCOUNT_LOCKED",
    );
  }

  // Verify password
  if (!user.passwordHash) {
    throw new AuthError("Akun belum memiliki kata sandi", "INVALID_CREDENTIALS");
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);

  if (!passwordValid) {
    // Increment failed attempts
    const newAttempts = user.jumlahPercobaanGagal + 1;
    const updateData: Record<string, unknown> = {
      jumlahPercobaanGagal: newAttempts,
    };

    // Lock account if threshold exceeded
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      updateData.terkunciSampai = new Date(Date.now() + LOCKOUT_DURATION_MS);
    }

    await db.pengguna.update({
      where: { id: user.id },
      data: updateData,
    });

    await logLoginAttempt(db, input.email, false, input.ipHash, input.userAgent);

    throw new AuthError("Email atau kata sandi salah", "INVALID_CREDENTIALS");
  }

  // Login successful — reset lockout state
  await db.pengguna.update({
    where: { id: user.id },
    data: {
      jumlahPercobaanGagal: 0,
      terkunciSampai: null,
      terakhirLoginPada: new Date(),
    },
  });

  await logLoginAttempt(db, input.email, true, input.ipHash, input.userAgent);

  // Create session
  return createSession(db, {
    penggunaId: user.id,
    keanggotaanTenantId: input.keanggotaanTenantId,
    ipHash: input.ipHash,
    userAgent: input.userAgent,
  });
}

// ─── Registration ───────────────────────────────────────────────────────────

export interface RegisterInput {
  namaLengkap: string;
  email: string;
  password: string;
}

/**
 * Register a new user account.
 *
 * ALT-PLT-002: Creates the Pengguna record. Tenant creation + KeanggotaanTenant
 * assignment is handled separately (in the tenant registration flow).
 */
export async function registerUser(
  db: PrismaClient,
  input: RegisterInput,
): Promise<Pengguna> {
  const email = input.email.toLowerCase().trim();

  // Check if email already exists (global uniqueness — ALT-DEF-001)
  const existing = await db.pengguna.findUnique({
    where: { email },
  });

  if (existing) {
    throw new AuthError("Email sudah terdaftar", "EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);

  return db.pengguna.create({
    data: {
      namaLengkap: input.namaLengkap,
      email,
      passwordHash,
      status: "AKTIF",
    },
  });
}

// ─── Password Reset ─────────────────────────────────────────────────────────

/**
 * Generate a password reset token.
 * Returns the raw token (to send via email); the hash is stored in DB.
 */
export async function generateResetToken(
  db: PrismaClient,
  email: string,
): Promise<{ rawToken: string; userId: string } | null> {
  const user = await db.pengguna.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  // Return null silently if user not found (anti-enumeration)
  if (!user) return null;

  // Invalidate any existing unused tokens for this user
  await db.tokenResetKataSandi.updateMany({
    where: {
      penggunaId: user.id,
      digunakanPada: null,
    },
    data: {
      // We can't "delete" them but we can mark them as used to invalidate
      digunakanPada: new Date(),
    },
  });

  // Generate new token
  const { randomBytes } = await import("node:crypto");
  const { createHash } = await import("node:crypto");
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  await db.tokenResetKataSandi.create({
    data: {
      penggunaId: user.id,
      tokenHash,
      kadaluarsaPada: new Date(Date.now() + RESET_TOKEN_VALIDITY_MS),
    },
  });

  return { rawToken, userId: user.id };
}

/**
 * Reset password using a valid reset token.
 */
export async function resetPassword(
  db: PrismaClient,
  rawToken: string,
  newPassword: string,
): Promise<void> {
  const { createHash } = await import("node:crypto");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const resetToken = await db.tokenResetKataSandi.findUnique({
    where: { tokenHash },
  });

  if (!resetToken) {
    throw new AuthError("Token reset tidak valid", "INVALID_RESET_TOKEN");
  }

  if (resetToken.digunakanPada !== null) {
    throw new AuthError("Token reset sudah digunakan", "INVALID_RESET_TOKEN");
  }

  if (resetToken.kadaluarsaPada < new Date()) {
    throw new AuthError("Token reset sudah kedaluwarsa", "RESET_TOKEN_EXPIRED");
  }

  // Update password and mark token as used
  const newHash = await hashPassword(newPassword);

  await db.$transaction([
    db.pengguna.update({
      where: { id: resetToken.penggunaId },
      data: {
        passwordHash: newHash,
        jumlahPercobaanGagal: 0,
        terkunciSampai: null,
      },
    }),
    db.tokenResetKataSandi.update({
      where: { id: resetToken.id },
      data: { digunakanPada: new Date() },
    }),
  ]);

  // Revoke all sessions after password reset (ALT-PLT-014)
  await revokeAllSessions(db, resetToken.penggunaId, "reset-kata-sandi");
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function logLoginAttempt(
  db: PrismaClient,
  email: string,
  berhasil: boolean,
  ipHash?: string,
  userAgent?: string,
): Promise<void> {
  // Append-only — no FK to Pengguna (email might not exist)
  await db.percobaanLogin.create({
    data: {
      email: email.toLowerCase().trim(),
      berhasil,
      ipHash,
      userAgent,
    },
  });
}
