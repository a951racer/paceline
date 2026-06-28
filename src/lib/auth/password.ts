/**
 * Password hashing and comparison utilities using bcrypt.
 * Provides secure password storage and verification.
 */

import bcrypt from "bcrypt";

/** Number of salt rounds for bcrypt hashing. Higher = more secure but slower. */
const SALT_ROUNDS = 12;

/**
 * Hashes a plain-text password using bcrypt.
 * Returns the hashed password string suitable for database storage.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plain-text password against a bcrypt hash.
 * Returns true if the password matches, false otherwise.
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
