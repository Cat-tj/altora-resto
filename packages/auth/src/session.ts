/**
 * Session management for Altora Resto.
 *
 * Session tokens are:
 * 1. Generated as random hex strings (32 bytes = 64 hex chars)
 * 2. SHA-256 hashed before storage (Sesi.tokenHash)
 * 3. The raw token is sent to the client; only the hash is stored
 * 4. Sessions have expiry, last-active tracking, and revocation
 *
 * ALT-DEF-003: Session model includes tokenHash (unique), keanggotaanTenantId
 * (nullable), terakhirAktifPada, alasanPencabutan, ipHash, userAgent.
 *
 * ALT-PLT-014: Support for revoking all sessions for a user.
 */

import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient, Sesi } from "@prisma/client";

// ─── Configuration ──────────────────────────────────────────────────────────

/** Default session duration: 24 hours */
const DEFAULT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

/** Idle timeout: 4 hours — sessions inactive longer are considered stale */
const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000;

// ─── Token Utilities ────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random session token.
 * Returns the raw token (to send to client) and its SHA-256 hash (to store).
 */
export function generateSessionToken(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = sha256(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Hash a session token for storage/comparison.
 * Used when verifying a token from a request.
 */
export function hashToken(token: string): string {
  return sha256(token);
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

// ─── Session CRUD ───────────────────────────────────────────────────────────

export interface CreateSessionInput {
  penggunaId: string;
  keanggotaanTenantId?: string;
  perangkatId?: string;
  ipHash?: string;
  userAgent?: string;
  durationMs?: number;
}

export interface SessionResult {
  session: Sesi;
  rawToken: string;
}

/**
 * Create a new session for a user.
 * Returns the session record and the raw token (to send to client).
 */
export async function createSession(
  db: PrismaClient,
  input: CreateSessionInput,
): Promise<SessionResult> {
  const { rawToken, tokenHash } = generateSessionToken();
  const now = new Date();
  const durationMs = input.durationMs ?? DEFAULT_SESSION_DURATION_MS;

  const session = await db.sesi.create({
    data: {
      id: crypto.randomUUID(),
      penggunaId: input.penggunaId,
      ...(input.keanggotaanTenantId ? { keanggotaanTenantId: input.keanggotaanTenantId } : {}),
      ...(input.perangkatId ? { perangkatId: input.perangkatId } : {}),
      tokenHash,
      dibuatPada: now,
      kadaluarsaPada: new Date(now.getTime() + durationMs),
      terakhirAktifPada: now,
      ...(input.ipHash ? { ipHash: input.ipHash } : {}),
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
    } as any,
  });

  return { session, rawToken };
}

/**
 * Validate a session token and return the active session.
 *
 * Checks:
 * - Token hash matches an existing session
 * - Session has not been revoked (dicabutPada is null)
 * - Session has not expired (kadaluarsaPada > now)
 * - Session is not idle (terakhirAktifPada + idle timeout > now)
 *
 * If valid, updates terakhirAktifPada and returns the session.
 */
export async function validateSession(
  db: PrismaClient,
  token: string,
): Promise<Sesi | null> {
  const tokenHash = hashToken(token);
  const now = new Date();

  const session = await db.sesi.findUnique({
    where: { tokenHash },
  });

  if (!session) return null;
  if (session.dicabutPada !== null) return null;
  if (session.kadaluarsaPada < now) return null;

  // Check idle timeout
  const idleDeadline = new Date(
    session.terakhirAktifPada.getTime() + IDLE_TIMEOUT_MS,
  );
  if (idleDeadline < now) return null;

  // Update last active timestamp
  await db.sesi.update({
    where: { id: session.id },
    data: { terakhirAktifPada: now },
  });

  return { ...session, terakhirAktifPada: now };
}

/**
 * Revoke a specific session (logout from one device).
 */
export async function revokeSession(
  db: PrismaClient,
  sessionId: string,
  reason: string = "logout",
): Promise<void> {
  await db.sesi.update({
    where: { id: sessionId },
    data: {
      dicabutPada: new Date(),
      alasanPencabutan: reason,
    },
  });
}

/**
 * Revoke all sessions for a user (logout from all devices).
 * ALT-PLT-014: Force logout from all devices at once.
 */
export async function revokeAllSessions(
  db: PrismaClient,
  penggunaId: string,
  reason: string = "cabut-semua",
): Promise<number> {
  const result = await db.sesi.updateMany({
    where: {
      penggunaId,
      dicabutPada: null, // Only revoke active sessions
    },
    data: {
      dicabutPada: new Date(),
      alasanPencabutan: reason,
    },
  });

  return result.count;
}
