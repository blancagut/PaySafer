/**
 * Idempotency Layer - Public API
 * 
 * NO BUSINESS LOGIC - Infrastructure exports only
 */

// Types
export type {
  WebhookEventStatus,
  IdempotencyDecision,
  IdempotencyCheckResult,
  WebhookEventRecord,
  LockAcquisitionResult,
  LockReleaseResult,
  WebhookAlertSeverity,
  WebhookAlertType,
  WebhookAlert,
  IdempotencyConfig,
  WebhookEventInsert,
} from './types';

// Idempotency check
export {
  checkIdempotency,
  insertWebhookEvent,
  acquireLock,
  releaseLock,
  updateEventStatus,
  markAsDuplicate,
} from './check';

// Payload hashing
export {
  hashPayload,
  hashesMatch,
  generatePayloadHash,
} from './hash';

// Alerts
export {
  createReplayAttackAlert,
  createHighDuplicateVolumeAlert,
  createProcessingFailureAlert,
  createLockTimeoutAlert,
  createUnknownEventTypeAlert,
} from './alerts';
