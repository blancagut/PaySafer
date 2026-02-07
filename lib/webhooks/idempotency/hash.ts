/**
 * Payload Hashing for Replay Detection
 * 
 * NO BUSINESS LOGIC - Cryptographic hashing only
 * 
 * PURPOSE:
 * Generate a deterministic hash of webhook payloads to detect replay attacks.
 * If an event_id arrives with a different payload hash, it's a security incident.
 */

import { createHash } from 'crypto';

// ============================================================================
// PAYLOAD HASH GENERATION
// ============================================================================

/**
 * Generate SHA-256 hash of a webhook payload.
 * 
 * SECURITY CONSIDERATIONS:
 * - Uses SHA-256 (cryptographically secure)
 * - Deterministic: same payload = same hash
 * - One-way: cannot recover payload from hash
 * 
 * @param payload - Raw webhook payload string
 * @returns 64-character hex string (SHA-256 hash)
 */
export function hashPayload(payload: string): string {
  return createHash('sha256')
    .update(payload, 'utf8')
    .digest('hex');
}

/**
 * Compare two payload hashes.
 * 
 * NOTE: We use simple string comparison here (not constant-time)
 * because payload hashes are not secrets. An attacker knowing
 * whether hashes match doesn't reveal any sensitive information.
 * 
 * @param hash1 - First hash to compare
 * @param hash2 - Second hash to compare
 * @returns true if hashes match
 */
export function hashesMatch(hash1: string, hash2: string): boolean {
  return hash1 === hash2;
}

// ============================================================================
// PAYLOAD NORMALIZATION (Optional - for edge cases)
// ============================================================================

/**
 * Normalize payload before hashing.
 * 
 * In most cases, you should hash the raw payload as-is.
 * This function is provided for edge cases where normalization
 * might be needed (e.g., if Stripe ever changes whitespace).
 * 
 * DEFAULT BEHAVIOR: Returns payload unchanged.
 * 
 * @param payload - Raw webhook payload
 * @returns Normalized payload (currently unchanged)
 */
export function normalizePayload(payload: string): string {
  // DO NOT modify the payload by default
  // Stripe's signature is computed on the exact bytes received
  // Any modification would break signature verification
  return payload;
}

/**
 * Generate hash with optional normalization.
 * 
 * @param payload - Raw webhook payload
 * @param normalize - Whether to normalize before hashing (default: false)
 */
export function generatePayloadHash(
  payload: string,
  normalize: boolean = false
): string {
  const toHash = normalize ? normalizePayload(payload) : payload;
  return hashPayload(toHash);
}
