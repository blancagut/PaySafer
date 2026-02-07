/**
 * Webhook Infrastructure Types
 * 
 * NO BUSINESS LOGIC - Infrastructure types only
 */

// ============================================================================
// VERIFICATION RESULT TYPES
// ============================================================================

export type VerificationStatus = 
  | 'VALID'
  | 'MISSING_SIGNATURE'
  | 'INVALID_SIGNATURE'
  | 'TIMESTAMP_EXPIRED'
  | 'MALFORMED_HEADER'
  | 'EMPTY_PAYLOAD';

export interface VerificationResult {
  status: VerificationStatus;
  isValid: boolean;
  timestamp?: number;
  eventId?: string;
  error?: string;
}

// ============================================================================
// WEBHOOK EVENT ENVELOPE (Generic - No Stripe-specific assumptions)
// ============================================================================

export interface WebhookEventEnvelope {
  id: string;
  type: string;
  created: number;
  // Payload is opaque at infrastructure level
  data: unknown;
}

// ============================================================================
// INTAKE RESPONSE TYPES
// ============================================================================

export interface IntakeResponse {
  received: boolean;
  eventId?: string;
  timestamp?: number;
}

export interface IntakeErrorResponse {
  error: string;
  code: WebhookErrorCode;
}

export type WebhookErrorCode = 
  | 'MISSING_SIGNATURE'
  | 'INVALID_SIGNATURE'
  | 'TIMESTAMP_EXPIRED'
  | 'MALFORMED_PAYLOAD'
  | 'INTERNAL_ERROR';

// ============================================================================
// LOGGING TYPES (Sensitive data exclusion)
// ============================================================================

export interface WebhookLogEntry {
  timestamp: string;
  eventId: string | null;
  eventType: string | null;
  verificationStatus: VerificationStatus;
  ipAddress: string | null;
  userAgent: string | null;
  processingTimeMs: number;
  // NEVER include: full payload, signatures, secrets
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface WebhookConfig {
  /** Signing secret for signature verification */
  signingSecret: string;
  /** Maximum age of webhook in seconds (replay attack prevention) */
  timestampToleranceSeconds: number;
  /** Header name containing the signature */
  signatureHeader: string;
}

// ============================================================================
// SIGNATURE COMPONENTS (Stripe-style)
// ============================================================================

export interface SignatureComponents {
  timestamp: number;
  signatures: string[];
}
