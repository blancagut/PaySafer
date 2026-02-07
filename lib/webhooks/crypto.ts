/**
 * Webhook Cryptographic Utilities
 * 
 * NO BUSINESS LOGIC - Cryptographic primitives only
 * 
 * Security guarantees:
 * - Constant-time comparison to prevent timing attacks
 * - HMAC-SHA256 signature verification
 * - No secret logging or exposure
 */

import { createHmac, timingSafeEqual } from 'crypto';

// ============================================================================
// CONSTANT-TIME STRING COMPARISON
// ============================================================================

/**
 * Compare two strings in constant time to prevent timing attacks.
 * 
 * SECURITY: This function MUST be used for all signature comparisons.
 * Using === or other comparison operators leaks timing information.
 */
export function constantTimeCompare(a: string, b: string): boolean {
  // Convert to buffers for timingSafeEqual
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  
  // If lengths differ, compare against self to maintain constant time
  // but still return false
  if (bufferA.length !== bufferB.length) {
    // Compare a against itself to burn the same amount of time
    timingSafeEqual(bufferA, bufferA);
    return false;
  }
  
  return timingSafeEqual(bufferA, bufferB);
}

// ============================================================================
// HMAC-SHA256 SIGNATURE COMPUTATION
// ============================================================================

/**
 * Compute HMAC-SHA256 signature for a payload.
 * 
 * Uses Stripe's signing scheme:
 * signed_payload = timestamp + "." + payload
 * signature = HMAC-SHA256(signed_payload, secret)
 */
export function computeSignature(
  payload: string,
  timestamp: number,
  secret: string
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(signedPayload, 'utf8');
  return hmac.digest('hex');
}

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

/**
 * Verify that at least one provided signature matches the expected signature.
 * 
 * SECURITY: Uses constant-time comparison for ALL signature checks.
 */
export function verifySignature(
  payload: string,
  timestamp: number,
  signatures: string[],
  secret: string
): boolean {
  const expectedSignature = computeSignature(payload, timestamp, secret);
  
  // Check each signature using constant-time comparison
  // Continue checking all signatures even after a match to maintain constant time
  let isValid = false;
  
  for (const signature of signatures) {
    if (constantTimeCompare(signature, expectedSignature)) {
      isValid = true;
      // Don't break - continue to maintain constant time
    }
  }
  
  return isValid;
}
