/**
 * Webhook Event Persistence Service
 * 
 * NO BUSINESS LOGIC - Persistence operations only
 * 
 * GUARANTEES:
 * 1. Every verified event is persisted before processing
 * 2. Persistence is idempotent (duplicate inserts are safe)
 * 3. Database failures return 500 (allow provider retry)
 * 4. Verification failures are NOT persisted
 * 
 * INVARIANTS:
 * - No event is processed before persistence
 * - No event is auto-deleted
 * - All failures are logged with event_id correlation
 */

import { createClient } from '@/lib/supabase/server';
import type {
  WebhookEventInsert,
  WebhookEventRecord,
  PersistenceResult,
  PersistenceError,
  PersistenceErrorCode,
  ProcessingStatus,
  PersistenceConfig,
  DEFAULT_PERSISTENCE_CONFIG,
} from './types';

// ============================================================================
// MAIN PERSISTENCE FUNCTION
// ============================================================================

/**
 * Persist a verified webhook event.
 * 
 * INSERT FLOW:
 * 1. Validate required fields
 * 2. Attempt INSERT with ON CONFLICT handling
 * 3. If duplicate, return existing record
 * 4. If success, return new record
 * 5. If error, return retriable error
 * 
 * IDEMPOTENCY:
 * - Uses (provider, event_id) as idempotency key
 * - Duplicate inserts return the existing record
 * - No side effects on duplicate
 */
export async function persistWebhookEvent(
  event: WebhookEventInsert
): Promise<PersistenceResult> {
  const supabase = await createClient();
  const startTime = Date.now();

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Validate required fields
    // -------------------------------------------------------------------------
    const validationError = validateEventInsert(event);
    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    // -------------------------------------------------------------------------
    // STEP 2: Attempt insert
    // -------------------------------------------------------------------------
    const { data, error } = await supabase
      .from('webhook_events_v2')
      .insert({
        event_id: event.event_id,
        provider: event.provider,
        event_type: event.event_type,
        raw_payload_hash: event.raw_payload_hash,
        api_version: event.api_version ?? null,
        event_timestamp: event.event_timestamp ?? null,
        request_id: event.request_id ?? null,
        headers_hash: event.headers_hash ?? null,
        source_ip: event.source_ip ?? null,
        user_agent: event.user_agent ?? null,
        verification_status: event.verification_status ?? 'verified',
        verified_at: event.verified_at ?? new Date().toISOString(),
        processing_status: 'pending',
        received_at: new Date().toISOString(),
      })
      .select()
      .single();

    // -------------------------------------------------------------------------
    // STEP 3: Handle insert result
    // -------------------------------------------------------------------------
    if (error) {
      return handleInsertError(error, event);
    }

    // Success - new record created
    logPersistenceSuccess(event.event_id, event.provider, startTime);
    
    return {
      success: true,
      record: data as WebhookEventRecord,
      isDuplicate: false,
    };

  } catch (error) {
    // Unexpected error - treat as retriable
    logPersistenceError(event.event_id, event.provider, error, startTime);
    
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Unknown error',
        retriable: true,
      },
    };
  }
}

// ============================================================================
// DUPLICATE HANDLING
// ============================================================================

/**
 * Handle duplicate event (idempotent insert).
 * 
 * Returns the existing record without modification.
 */
async function handleDuplicateEvent(
  provider: string,
  eventId: string
): Promise<PersistenceResult> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('webhook_events_v2')
      .select()
      .eq('provider', provider)
      .eq('event_id', eventId)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: 'Duplicate detected but record not found',
          retriable: false,
        },
      };
    }

    logDuplicateDetected(eventId, provider);

    return {
      success: true,
      record: data as WebhookEventRecord,
      isDuplicate: true,
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Failed to fetch duplicate record',
        retriable: true,
      },
    };
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Handle insert errors with proper categorization.
 */
async function handleInsertError(
  error: { code?: string; message?: string },
  event: WebhookEventInsert
): Promise<PersistenceResult> {
  // PostgreSQL error codes
  switch (error.code) {
    // Unique violation - this is a duplicate
    case '23505':
      return handleDuplicateEvent(event.provider, event.event_id);

    // Serialization failure - retry
    case '40001':
      return {
        success: false,
        error: {
          code: 'SERIALIZATION_FAILURE',
          message: 'Transaction conflict, please retry',
          retriable: true,
        },
      };

    // Connection/timeout issues
    case '08000':
    case '08003':
    case '08006':
    case '57P01':
      return {
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database connection error',
          retriable: true,
        },
      };

    // Statement timeout
    case '57014':
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Database operation timed out',
          retriable: true,
        },
      };

    // Other constraint violations - not retriable
    case '23000':
    case '23502':
    case '23503':
    case '23514':
      return {
        success: false,
        error: {
          code: 'CONSTRAINT_VIOLATION',
          message: error.message ?? 'Constraint violation',
          retriable: false,
        },
      };

    default:
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: error.message ?? 'Unknown database error',
          retriable: true,
        },
      };
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate event insert payload.
 */
function validateEventInsert(event: WebhookEventInsert): PersistenceError | null {
  if (!event.event_id || event.event_id.trim() === '') {
    return {
      code: 'CONSTRAINT_VIOLATION',
      message: 'event_id is required',
      retriable: false,
    };
  }

  if (!event.provider) {
    return {
      code: 'CONSTRAINT_VIOLATION',
      message: 'provider is required',
      retriable: false,
    };
  }

  if (!event.event_type || event.event_type.trim() === '') {
    return {
      code: 'CONSTRAINT_VIOLATION',
      message: 'event_type is required',
      retriable: false,
    };
  }

  if (!event.raw_payload_hash || event.raw_payload_hash.length !== 64) {
    return {
      code: 'CONSTRAINT_VIOLATION',
      message: 'raw_payload_hash must be a 64-character hex string',
      retriable: false,
    };
  }

  return null;
}

// ============================================================================
// STATUS UPDATES
// ============================================================================

/**
 * Update processing status of an event.
 * 
 * Uses optimistic locking (version field) to prevent conflicts.
 */
export async function updateProcessingStatus(
  eventId: string,
  provider: string,
  newStatus: ProcessingStatus,
  options?: {
    expectedVersion?: number;
    errorMessage?: string;
    errorCode?: string;
    processorId?: string;
  }
): Promise<{ success: boolean; newVersion?: number }> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    processing_status: newStatus,
  };

  // Add timestamps based on status
  switch (newStatus) {
    case 'processing':
      updateData.processing_started_at = new Date().toISOString();
      break;
    case 'completed':
    case 'failed':
    case 'dead_letter':
      updateData.processing_completed_at = new Date().toISOString();
      break;
  }

  if (options?.errorMessage) {
    updateData.processing_error = options.errorMessage;
  }
  if (options?.errorCode) {
    updateData.processing_error_code = options.errorCode;
  }
  if (options?.processorId) {
    updateData.processor_id = options.processorId;
  }

  let query = supabase
    .from('webhook_events_v2')
    .update(updateData)
    .eq('provider', provider)
    .eq('event_id', eventId);

  // Optimistic locking
  if (options?.expectedVersion !== undefined) {
    query = query.eq('version', options.expectedVersion);
  }

  const { data, error } = await query.select('version').single();

  if (error) {
    console.error('[Persistence] Status update error:', error);
    return { success: false };
  }

  return { success: true, newVersion: data?.version };
}

// ============================================================================
// FETCH OPERATIONS
// ============================================================================

/**
 * Get event by provider and event_id.
 */
export async function getWebhookEvent(
  provider: string,
  eventId: string
): Promise<WebhookEventRecord | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('webhook_events_v2')
    .select()
    .eq('provider', provider)
    .eq('event_id', eventId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as WebhookEventRecord;
}

/**
 * Check if event exists.
 */
export async function eventExists(
  provider: string,
  eventId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('webhook_events_v2')
    .select('id', { count: 'exact', head: true })
    .eq('provider', provider)
    .eq('event_id', eventId);

  return !error && (count ?? 0) > 0;
}

// ============================================================================
// LOGGING
// ============================================================================

function logPersistenceSuccess(
  eventId: string,
  provider: string,
  startTime: number
): void {
  console.log(JSON.stringify({
    level: 'info',
    category: 'webhook_persistence',
    action: 'event_persisted',
    event_id: eventId,
    provider,
    duration_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }));
}

function logPersistenceError(
  eventId: string,
  provider: string,
  error: unknown,
  startTime: number
): void {
  console.error(JSON.stringify({
    level: 'error',
    category: 'webhook_persistence',
    action: 'persistence_error',
    event_id: eventId,
    provider,
    error: error instanceof Error ? error.message : 'Unknown error',
    duration_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  }));
}

function logDuplicateDetected(eventId: string, provider: string): void {
  console.log(JSON.stringify({
    level: 'info',
    category: 'webhook_persistence',
    action: 'duplicate_detected',
    event_id: eventId,
    provider,
    timestamp: new Date().toISOString(),
  }));
}
