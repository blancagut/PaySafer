/**
 * Webhook Persistence Layer - Public API
 * 
 * NO BUSINESS LOGIC - Infrastructure exports only
 */

// Types
export type {
  WebhookProvider,
  VerificationStatus,
  ProcessingStatus,
  WebhookEventRecord,
  WebhookEventInsert,
  PersistenceResult,
  PersistenceError,
  PersistenceErrorCode,
  DeadLetterResult,
  ProcessingAction,
  ProcessingLogEntry,
  WebhookMetrics,
  PersistenceConfig,
} from './types';

export { DEFAULT_PERSISTENCE_CONFIG } from './types';

// Persistence operations
export {
  persistWebhookEvent,
  updateProcessingStatus,
  getWebhookEvent,
  eventExists,
} from './store';

// Dead letter operations
export {
  moveToDeadLetter,
  shouldDeadLetter,
  getDeadLetteredEvents,
  countDeadLetteredEvents,
  scheduleRetry,
  calculateRetryDelay,
  getRetryReadyEvents,
} from './dead-letter';

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
} from './processing-log';

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
} from './metrics';
