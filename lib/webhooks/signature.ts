/**
 * Webhook Signature Verification
 * 
 * NO BUSINESS LOGIC - Signature parsing and verification only
 * 
 * Implements Stripe-style signature header format:
 * Stripe-Signature: t=timestamp,v1=signature1,v1=signature2,...
 */

import type { 
  SignatureComponents, 
  VerificationResult, 
  WebhookConfig 
} from './types';
import { verifySignature } from './crypto';

// ============================================================================
// SIGNATURE HEADER PARSING
// ============================================================================

/**
 * Parse Stripe-style signature header into components.
 * 
 * Header format: t=timestamp,v1=signature,v1=signature2
 * 
 * Returns null if header is malformed.
 */
export function parseSignatureHeader(
  header: string | null
): SignatureComponents | null {
  if (!header || typeof header !== 'string') {
    return null;
  }

  const parts = header.split(',');
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    
    if (!key || !value) {
      continue;
    }

    if (key === 't') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        timestamp = parsed;
      }
    } else if (key === 'v1') {
      // Only accept v1 signatures (current scheme)
      if (value.length === 64 && /^[a-f0-9]+$/.test(value)) {
        signatures.push(value);
      }
    }
  }

  // Both timestamp and at least one signature are required
  if (timestamp === null || signatures.length === 0) {
    return null;
  }

  return { timestamp, signatures };
}

// ============================================================================
// TIMESTAMP VALIDATION (Replay Attack Prevention)
// ============================================================================

/**
 * Validate that the timestamp is within acceptable tolerance.
 * 
 * SECURITY: Prevents replay attacks by rejecting old webhooks.
 * 
 * @param timestamp - Unix timestamp from webhook header (seconds)
 * @param toleranceSeconds - Maximum age allowed (default: 300 = 5 minutes)
 */
export function isTimestampValid(
  timestamp: number,
  toleranceSeconds: number = 300
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = now - timestamp;
  
  // Reject if timestamp is in the future (clock skew tolerance: 60 seconds)
  if (age < -60) {
    return false;
  }
  
  // Reject if timestamp is too old
  if (age > toleranceSeconds) {
    return false;
  }
  
  return true;
}

// ============================================================================
// MAIN VERIFICATION FLOW
// ============================================================================

/**
 * Complete signature verification flow.
 * 
 * VERIFICATION STEPS:
 * 1. Check signature header exists
 * 2. Parse signature header components
 * 3. Validate timestamp (replay protection)
 * 4. Verify signature against payload
 * 
 * SECURITY GUARANTEES:
 * - Constant-time signature comparison
 * - Timestamp validation prevents replay attacks
 * - No partial success - all checks must pass
 */
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  config: WebhookConfig
): VerificationResult {
  // -------------------------------------------------------------------------
  // STEP 1: Check payload exists
  // -------------------------------------------------------------------------
  if (!payload || payload.length === 0) {
    return {
      status: 'EMPTY_PAYLOAD',
      isValid: false,
      error: 'Request body is empty',
    };
  }

  // -------------------------------------------------------------------------
  // STEP 2: Check signature header exists
  // -------------------------------------------------------------------------
  if (!signatureHeader) {
    return {
      status: 'MISSING_SIGNATURE',
      isValid: false,
      error: 'Missing signature header',
    };
  }

  // -------------------------------------------------------------------------
  // STEP 3: Parse signature header
  // -------------------------------------------------------------------------
  const components = parseSignatureHeader(signatureHeader);
  
  if (!components) {
    return {
      status: 'MALFORMED_HEADER',
      isValid: false,
      error: 'Signature header is malformed',
    };
  }

  // -------------------------------------------------------------------------
  // STEP 4: Validate timestamp (replay attack prevention)
  // -------------------------------------------------------------------------
  if (!isTimestampValid(components.timestamp, config.timestampToleranceSeconds)) {
    return {
      status: 'TIMESTAMP_EXPIRED',
      isValid: false,
      timestamp: components.timestamp,
      error: 'Timestamp outside tolerance window',
    };
  }

  // -------------------------------------------------------------------------
  // STEP 5: Verify signature
  // -------------------------------------------------------------------------
  const isSignatureValid = verifySignature(
    payload,
    components.timestamp,
    components.signatures,
    config.signingSecret
  );

  if (!isSignatureValid) {
    return {
      status: 'INVALID_SIGNATURE',
      isValid: false,
      timestamp: components.timestamp,
      error: 'Signature verification failed',
    };
  }

  // -------------------------------------------------------------------------
  // SUCCESS: All checks passed
  // -------------------------------------------------------------------------
  return {
    status: 'VALID',
    isValid: true,
    timestamp: components.timestamp,
  };
}

// ============================================================================
// EXTRACT EVENT ID (Safe extraction without full parsing)
// ============================================================================

/**
 * Safely extract event ID from payload for logging purposes.
 * 
 * SECURITY: 
 * - Only extracts the ID field
 * - Does not parse entire payload
 * - Returns null on any parsing failure
 * - Never throws
 */
export function extractEventId(payload: string): string | null {
  try {
    // Use regex to extract just the ID without full JSON parsing
    // This is safe because we only extract a specific field
    const idMatch = payload.match(/"id"\s*:\s*"([^"]+)"/);
    return idMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Safely extract event type from payload for logging purposes.
 */
export function extractEventType(payload: string): string | null {
  try {
    const typeMatch = payload.match(/"type"\s*:\s*"([^"]+)"/);
    return typeMatch?.[1] ?? null;
  } catch {
    return null;
  }
}
