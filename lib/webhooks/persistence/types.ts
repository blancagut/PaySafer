/**
 * Webhook Persistence Types
 * 
 * NO BUSINESS LOGIC - Type definitions only
 * 
 * These types define the persistence layer for webhook events.
 * They are provider-agnostic and support async processing.
 */

// ============================================================================
// PROVIDER TYPES
// ============================================================================

export type WebhookProvider = 
  | 'stripe'
  | 'paypal'
  | 'wise'
  | 'plaid'
  | 'internal'
  | 'test';

// ============================================================================
// STATUS TYPES
// ============================================================================

export type VerificationStatus = 
  | 'pending'
  | 'verified'
  | 'failed'
  | 'skipped';

export type ProcessingStatus = 
  | 'pending'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'dead_letter'
  | 'skipped'
  | 'superseded';

// ============================================================================
// WEBHOOK EVENT RECORD
// ============================================================================

export interface WebhookEventRecord {
  id: string;
  event_id: string;
  provider: WebhookProvider;
  event_type: string;
  api_version: string | null;
  event_timestamp: string | null;
  
  // Verification
  verification_status: VerificationStatus;
  verified_at: string | null;
  verification_error: string | null;
  
  // Processing
  processing_status: ProcessingStatus;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  processing_error: string | null;
  processing_error_code: string | null;
  
  // Payload
  raw_payload_hash: string;
  encrypted_payload_ref: string | null;
  
  // Request metadata
  request_id: string | null;
  headers_hash: string | null;
  source_ip: string | null;
  user_agent: string | null;
  
  // Retry
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  
  // Dead letter
  dead_letter_at: string | null;
  dead_letter_reason: string | null;
  
  // Lock
  lock_token: string | null;
  lock_acquired_at: string | null;
  lock_expires_at: string | null;
  
  // Version
  version: number;
  
  // Queue
  queue_name: string | null;
  queue_priority: number;
  queued_at: string | null;
  processor_id: string | null;
  
  // Timestamps
  received_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INSERT TYPES
// ============================================================================

export interface WebhookEventInsert {
  event_id: string;
  provider: WebhookProvider;
  event_type: string;
  raw_payload_hash: string;
  api_version?: string | null;
  event_timestamp?: string | null;
  request_id?: string | null;
  headers_hash?: string | null;
  source_ip?: string | null;
  user_agent?: string | null;
  verification_status?: VerificationStatus;
  verified_at?: string | null;
}

// ============================================================================
// PERSISTENCE RESULT TYPES
// ============================================================================

export type PersistenceResult = 
  | { success: true; record: WebhookEventRecord; isDuplicate: false }
  | { success: true; record: WebhookEventRecord; isDuplicate: true }
  | { success: false; error: PersistenceError };

export interface PersistenceError {
  code: PersistenceErrorCode;
  message: string;
  retriable: boolean;
}

export type PersistenceErrorCode =
  | 'DATABASE_UNAVAILABLE'
  | 'CONSTRAINT_VIOLATION'
  | 'SERIALIZATION_FAILURE'
  | 'TIMEOUT'
  | 'UNKNOWN';

// ============================================================================
// DEAD LETTER TYPES
// ============================================================================

export interface DeadLetterResult {
  success: boolean;
  eventId: string;
  reason: string;
}

// ============================================================================
// PROCESSING LOG TYPES
// ============================================================================

export type ProcessingAction =
  | 'received'
  | 'verified'
  | 'verification_failed'
  | 'queued'
  | 'processing_started'
  | 'processing_completed'
  | 'processing_failed'
  | 'retried'
  | 'dead_lettered'
  | 'skipped'
  | 'superseded';

export interface ProcessingLogEntry {
  webhook_event_id: string;
  action: ProcessingAction;
  previous_status?: ProcessingStatus;
  new_status?: ProcessingStatus;
  message?: string;
  error_details?: Record<string, unknown>;
  processor_id?: string;
  duration_ms?: number;
}

// ============================================================================
// METRICS TYPES
// ============================================================================

export interface WebhookMetrics {
  events_received: number;
  events_verified: number;
  events_verification_failed: number;
  events_duplicate: number;
  events_processed: number;
  events_failed: number;
  events_dead_lettered: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface PersistenceConfig {
  /** Maximum retries before dead-lettering */
  maxRetries: number;
  /** Base delay for exponential backoff (seconds) */
  retryBaseDelaySeconds: number;
  /** Maximum delay between retries (seconds) */
  retryMaxDelaySeconds: number;
  /** Lock duration for processing (seconds) */
  lockDurationSeconds: number;
  /** Default queue name */
  defaultQueue: string;
}

export const DEFAULT_PERSISTENCE_CONFIG: PersistenceConfig = {
  maxRetries: 5,
  retryBaseDelaySeconds: 60,
  retryMaxDelaySeconds: 3600,
  lockDurationSeconds: 300,
  defaultQueue: 'default',
};
