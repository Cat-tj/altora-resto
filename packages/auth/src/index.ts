/**
 * @altora/auth — Authentication library for Altora Resto.
 *
 * Provides email+password login, session management, password reset,
 * and request context resolution for the multi-tenant auth system.
 *
 * @example
 * ```ts
 * import { loginWithEmail, resolveContext } from "@altora/auth";
 *
 * // Login
 * const { session, rawToken } = await loginWithEmail(db, {
 *   email: "user@example.com",
 *   password: "secret",
 * });
 *
 * // Later, resolve context from a request
 * const ctx = await resolveContext(db, request);
 * if (ctx) {
 *   console.log(ctx.pengguna.namaLengkap);
 *   console.log(ctx.tenantId);
 * }
 * ```
 */

// Password hashing
export { hashPassword, verifyPassword } from "./password.js";

// Session management
export {
  generateSessionToken,
  hashToken,
  createSession,
  validateSession,
  revokeSession,
  revokeAllSessions,
  type CreateSessionInput,
  type SessionResult,
} from "./session.js";

// Auth service (login, register, password reset)
export {
  AuthError,
  loginWithEmail,
  registerUser,
  generateResetToken,
  resetPassword,
  type LoginInput,
  type RegisterInput,
  type AuthErrorCode,
} from "./auth.js";

// Request context resolution
export {
  extractToken,
  resolveContext,
  resolveContextFromToken,
  type RequestContext,
} from "./context.js";
