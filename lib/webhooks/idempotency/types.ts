/**
 * Idempotency Layer Types
 * 
 * NO BUSINESS LOGIC - Type definitions only
 * 
 * This module defines types for:
 * - Event lifecycle states
 * - Idempotency decisions
 * - Concurrency control
 */

// ============================================================================
// EVENT LIFECYCLE STATES
// ============================================================================

/**
 * Webhook event status in the processing lifecycle.
 * 
 * State Transitions:
 * 
 *   received → verified → processing → processed → completed
 *                    ↓           ↓
 *               duplicate    failed → retrying
 *                    ↓                    ↓
 *              replay_alert          (back to processing)
 *                    ↓
 *               rejected
 */
export type WebhookEventStatus =
  | 'received'      // Event received and signature verified
  | 'verified'      // Idempotency check passed
  | 'processing'    // Currently being processed (lock held)
  | 'processed'     // Processing completed (placeholder)
  | 'completed'     // Terminal success state
  | 'failed'        // Processing failed
  | 'retrying'      // Scheduled for retry
  | 'rejected'      // Rejected (validation failed)
  | 'duplicate'     // Duplicate event (same payload)
  | 'replay_alert'; // SECURITY: Same ID, different payload

// ============================================================================
// IDEMPOTENCY DECISION
// ============================================================================

/**
 * The result of an idempotency check.
 * 
 * Decision Matrix:
 * 
 * | event_id exists | payload_hash matches | Decision      | Action           |
 * |-----------------|----------------------|---------------|------------------|
 * | No              | N/A                  | NEW           | Insert & process |
 * | Yes             | Yes                  | DUPLICATE     | Return 200 OK    |
 * | Yes             | No                   | REPLAY_ATTACK | Alert & reject   |
 * | Error           | N/A                  | ERROR         | Return 500       |
 */
export type IdempotencyDecision =
  | 'NEW'           // First time seeing this event
  | 'DUPLICATE'     // Same event_id and same payload
  | 'REPLAY_ATTACK' // Same event_id but DIFFERENT payload (SECURITY!)
  | 'LOCKED'        // Event is currently being processed
  | 'ERROR';        // Database error during check

export interface IdempotencyCheckResult {
  decision: IdempotencyDecision;
  eventId: string;
  existingStatus?: WebhookEventStatus;
  existingPayloadHash?: string;
  lockToken?: string;
  error?: string;
}

// ============================================================================
// WEBHOOK EVENT RECORD
// ============================================================================

export interface WebhookEventRecord {
  id: string;
  event_id: string;
  payload_hash: string;
  event_type: string;
  event_timestamp: string;
  api_version: string | null;
  status: WebhookEventStatus;
  lock_token: string | null;
  lock_acquired_at: string | null;
  lock_expires_at: string | null;
  created_at: string;
  updated_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  error_message: string | null;
  error_code: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  source_ip: string | null;
  user_agent: string | null;
}

// ============================================================================
// LOCK MANAGEMENT
// ============================================================================

export interface LockAcquisitionResult {
  acquired: boolean;
  lockToken: string | null;
  expiresAt: string | null;
  reason?: 'already_locked' | 'already_processed' | 'not_found' | 'error';
}

export interface LockReleaseResult {
  released: boolean;
  reason?: 'not_locked' | 'wrong_token' | 'not_found' | 'error';
}

// ============================================================================
// ALERT TYPES
// ============================================================================

export type WebhookAlertSeverity = 'info' | 'warning' | 'critical' | 'security';

export type WebhookAlertType =
  | 'replay_attack'
  | 'high_duplicate_volume'
  | 'processing_failure'
  | 'lock_timeout'
  | 'signature_failure_spike'
  | 'unknown_event_type';

export interface WebhookAlert {
  id: string;
  alert_type: WebhookAlertType;
  severity: WebhookAlertSeverity;
  webhook_event_id: string | null;
  event_id: string | null;
  message: string;
  details: Record<string, unknown> | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface IdempotencyConfig {
  /** Lock duration in seconds (default: 300 = 5 minutes) */
  lockDurationSeconds: number;
  /** Maximum retries for failed events */
  maxRetries: number;
  /** Base delay for retry backoff in seconds */
  retryBaseDelaySeconds: number;
  /** Duplicate volume threshold for alerting (per hour) */
  duplicateAlertThreshold: number;
}

// ============================================================================
// INSERT PAYLOAD
// ============================================================================

export interface WebhookEventInsert {
  event_id: string;
  payload_hash: string;
  event_type: string;
  event_timestamp: string;
  api_version?: string | null;
  source_ip?: string | null;
  user_agent?: string | null;
}
