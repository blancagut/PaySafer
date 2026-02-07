/**
 * Webhook Infrastructure - Public API
 * 
 * NO BUSINESS LOGIC - Infrastructure exports only
 */

// Types
export type {
  VerificationStatus,
  VerificationResult,
  WebhookEventEnvelope,
  IntakeResponse,
  IntakeErrorResponse,
  WebhookErrorCode,
  WebhookLogEntry,
  WebhookConfig,
  SignatureComponents,
} from './types';

// Signature verification
export {
  verifyWebhookSignature,
  parseSignatureHeader,
  isTimestampValid,
  extractEventId,
  extractEventType,
} from './signature';

// Cryptographic utilities
export {
  constantTimeCompare,
  computeSignature,
  verifySignature,
} from './crypto';

// Configuration
export {
  loadWebhookConfig,
  validateConfig,
} from './config';

// Logging
export {
  createLogEntry,
  logVerificationSuccess,
  logVerificationFailure,
  logIntakeError,
} from './logger';

// ============================================================================
// IDEMPOTENCY LAYER
// ============================================================================

// Idempotency types
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
} from './idempotency';

// Idempotency check
export {
  checkIdempotency,
  insertWebhookEvent,
  acquireLock,
  releaseLock,
  updateEventStatus,
  markAsDuplicate,
} from './idempotency';

// Payload hashing
export {
  hashPayload,
  hashesMatch,
  generatePayloadHash,
} from './idempotency';

// Alerts
export {
  createReplayAttackAlert,
  createHighDuplicateVolumeAlert,
  createProcessingFailureAlert,
  createLockTimeoutAlert,
  createUnknownEventTypeAlert,
} from './idempotency';

// ============================================================================
// PERSISTENCE LAYER
// ============================================================================

// Persistence types
export type {
  WebhookProvider,
  VerificationStatus as PersistenceVerificationStatus,
  ProcessingStatus,
  WebhookEventRecord as PersistedEventRecord,
  WebhookEventInsert as PersistenceEventInsert,
  PersistenceResult,
  PersistenceError,
  PersistenceErrorCode,
  DeadLetterResult,
  ProcessingAction,
  ProcessingLogEntry,
  WebhookMetrics,
  PersistenceConfig,
} from './persistence';

export { DEFAULT_PERSISTENCE_CONFIG } from './persistence';

// Persistence operations
export {
  persistWebhookEvent,
  updateProcessingStatus,
  getWebhookEvent,
  eventExists,
} from './persistence';

// Dead letter operations
export {
  moveToDeadLetter,
  shouldDeadLetter,
  getDeadLetteredEvents,
  countDeadLetteredEvents,
  scheduleRetry,
  calculateRetryDelay,
  getRetryReadyEvents,
} from './persistence';

// Processing log
export {
  logProcessingAction,
  logEventReceived,
  logEventVerified,
  logVerificationFailed,
  logEventQueued,
  logProcessingStarted,
  logProcessingCompleted,
  logProcessingFailed,
  logEventRetried,
  logEventDeadLettered,
  logEventSkipped,
  getProcessingHistory,
} from './persistence';

// Metrics
export {
  recordMetric,
  recordEventReceived,
  recordEventVerified,
  recordVerificationFailed,
  recordDuplicateEvent,
  recordEventProcessed,
  recordEventFailed,
  recordEventDeadLettered,
  aggregateHourlyMetrics,
  getMetrics,
  getTodayMetrics,
} from './persistence';
