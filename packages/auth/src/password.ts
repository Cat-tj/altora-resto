/**
 * Password hashing and verification using bcryptjs.
 *
 * Salt rounds: 12 (recommended for bcrypt, balances security vs speed).
 * ALT-DEF-003: passwordHash is stored as bcrypt hash in Pengguna model.
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password.
 * Returns the bcrypt hash string to store in Pengguna.passwordHash.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 * Returns true if the password matches.
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
