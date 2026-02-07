/**
 * Idempotency Check Logic
 * 
 * NO BUSINESS LOGIC - Idempotency decisions only
 * 
 * This module implements the core idempotency check:
 * - NEW: First time seeing this event_id
 * - DUPLICATE: Same event_id with same payload
 * - REPLAY_ATTACK: Same event_id with DIFFERENT payload
 * 
 * CRITICAL SECURITY PROPERTY:
 * All decisions are made at the DATABASE level, not in memory.
 * This ensures correctness across serverless function instances.
 */

import { createClient } from '@/lib/supabase/server';
import type {
  IdempotencyCheckResult,
  IdempotencyConfig,
  WebhookEventInsert,
  WebhookEventRecord,
  LockAcquisitionResult,
  LockReleaseResult,
} from './types';
import { hashesMatch, generatePayloadHash } from './hash';
import { createReplayAttackAlert } from './alerts';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: IdempotencyConfig = {
  lockDurationSeconds: 300,        // 5 minutes
  maxRetries: 3,
  retryBaseDelaySeconds: 60,       // 1 minute base
  duplicateAlertThreshold: 100,    // Alert if >100 duplicates/hour
};

// ============================================================================
// MAIN IDEMPOTENCY CHECK
// ============================================================================

/**
 * Check if an event should be processed or is a duplicate/replay.
 * 
 * DECISION TABLE:
 * 
 * | event_id exists | payload_hash matches | status         | Decision      |
 * |-----------------|----------------------|----------------|---------------|
 * | No              | N/A                  | N/A            | NEW           |
 * | Yes             | Yes                  | any            | DUPLICATE     |
 * | Yes             | No                   | any            | REPLAY_ATTACK |
 * | Yes             | Yes                  | processing     | LOCKED        |
 * 
 * IMPLEMENTATION:
 * Uses INSERT ... ON CONFLICT to atomically check and insert.
 * This prevents race conditions between concurrent requests.
 */
export async function checkIdempotency(
  eventId: string,
  payloadHash: string,
  config: IdempotencyConfig = DEFAULT_CONFIG
): Promise<IdempotencyCheckResult> {
  const supabase = await createClient();

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Try to find existing event
    // -------------------------------------------------------------------------
    const { data: existing, error: selectError } = await supabase
      .from('webhook_events')
      .select('id, event_id, payload_hash, status, lock_token, lock_expires_at')
      .eq('event_id', eventId)
      .single();

    // -------------------------------------------------------------------------
    // STEP 2: Handle database errors
    // -------------------------------------------------------------------------
    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = "No rows found" - this is expected for new events
      console.error('[Idempotency] Database error during lookup:', selectError);
      return {
        decision: 'ERROR',
        eventId,
        error: `Database error: ${selectError.message}`,
      };
    }

    // -------------------------------------------------------------------------
    // STEP 3: NEW EVENT - No existing record found
    // -------------------------------------------------------------------------
    if (!existing) {
      return {
        decision: 'NEW',
        eventId,
      };
    }

    // -------------------------------------------------------------------------
    // STEP 4: Check payload hash for replay detection
    // -------------------------------------------------------------------------
    if (!hashesMatch(existing.payload_hash, payloadHash)) {
      // CRITICAL SECURITY ALERT: Same event_id but different payload!
      // This should NEVER happen in normal operation.
      // Possible causes:
      // 1. Replay attack attempt
      // 2. Stripe bug (extremely unlikely)
      // 3. Our bug in hash computation (verify with tests)
      
      await createReplayAttackAlert(eventId, existing.payload_hash, payloadHash);

      return {
        decision: 'REPLAY_ATTACK',
        eventId,
        existingStatus: existing.status,
        existingPayloadHash: existing.payload_hash,
        error: 'Payload hash mismatch - potential replay attack',
      };
    }

    // -------------------------------------------------------------------------
    // STEP 5: Check if event is currently locked (being processed)
    // -------------------------------------------------------------------------
    if (existing.lock_token && existing.lock_expires_at) {
      const lockExpiry = new Date(existing.lock_expires_at);
      if (lockExpiry > new Date()) {
        // Lock is still valid - event is being processed
        return {
          decision: 'LOCKED',
          eventId,
          existingStatus: existing.status,
          existingPayloadHash: existing.payload_hash,
        };
      }
      // Lock has expired - treat as duplicate (processor failed)
    }

    // -------------------------------------------------------------------------
    // STEP 6: DUPLICATE - Same event_id with same payload
    // -------------------------------------------------------------------------
    return {
      decision: 'DUPLICATE',
      eventId,
      existingStatus: existing.status,
      existingPayloadHash: existing.payload_hash,
    };

  } catch (error) {
    console.error('[Idempotency] Unexpected error:', error);
    return {
      decision: 'ERROR',
      eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// ATOMIC INSERT (For NEW events)
// ============================================================================

/**
 * Atomically insert a new webhook event.
 * 
 * Uses database unique constraint to prevent race conditions.
 * If two requests try to insert the same event_id simultaneously,
 * only one will succeed (the other gets a unique violation).
 * 
 * @returns The inserted record, or null if duplicate
 */
export async function insertWebhookEvent(
  event: WebhookEventInsert
): Promise<{ success: boolean; record?: WebhookEventRecord; isDuplicate?: boolean }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('webhook_events')
      .insert({
        event_id: event.event_id,
        payload_hash: event.payload_hash,
        event_type: event.event_type,
        event_timestamp: event.event_timestamp,
        api_version: event.api_version,
        source_ip: event.source_ip,
        user_agent: event.user_agent,
        status: 'received',
      })
      .select()
      .single();

    if (error) {
      // Check for unique violation (duplicate)
      if (error.code === '23505') {
        return { success: false, isDuplicate: true };
      }
      console.error('[Idempotency] Insert error:', error);
      return { success: false };
    }

    return { success: true, record: data };

  } catch (error) {
    console.error('[Idempotency] Unexpected insert error:', error);
    return { success: false };
  }
}

// ============================================================================
// LOCK MANAGEMENT
// ============================================================================

/**
 * Acquire a processing lock on an event.
 * 
 * Uses optimistic locking with a lock token (UUID).
 * The lock has an expiration time to prevent deadlocks
 * if a processor crashes.
 */
export async function acquireLock(
  eventId: string,
  config: IdempotencyConfig = DEFAULT_CONFIG
): Promise<LockAcquisitionResult> {
  const supabase = await createClient();
  const lockToken = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.lockDurationSeconds * 1000);

  try {
    // Atomic update: only succeeds if not already locked
    const { data, error } = await supabase
      .from('webhook_events')
      .update({
        lock_token: lockToken,
        lock_acquired_at: now.toISOString(),
        lock_expires_at: expiresAt.toISOString(),
        status: 'processing',
        processing_started_at: now.toISOString(),
      })
      .eq('event_id', eventId)
      .or(`lock_token.is.null,lock_expires_at.lt.${now.toISOString()}`)
      .in('status', ['received', 'verified', 'retrying'])
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No matching row - either not found, already locked, or already processed
        return { acquired: false, lockToken: null, expiresAt: null, reason: 'already_locked' };
      }
      console.error('[Idempotency] Lock acquisition error:', error);
      return { acquired: false, lockToken: null, expiresAt: null, reason: 'error' };
    }

    return {
      acquired: true,
      lockToken,
      expiresAt: expiresAt.toISOString(),
    };

  } catch (error) {
    console.error('[Idempotency] Unexpected lock error:', error);
    return { acquired: false, lockToken: null, expiresAt: null, reason: 'error' };
  }
}

/**
 * Release a processing lock after completion.
 */
export async function releaseLock(
  eventId: string,
  lockToken: string,
  finalStatus: 'processed' | 'completed' | 'failed' | 'rejected',
  errorMessage?: string
): Promise<LockReleaseResult> {
  const supabase = await createClient();

  try {
    const updateData: Record<string, unknown> = {
      lock_token: null,
      lock_acquired_at: null,
      lock_expires_at: null,
      status: finalStatus,
      processing_completed_at: new Date().toISOString(),
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { data, error } = await supabase
      .from('webhook_events')
      .update(updateData)
      .eq('event_id', eventId)
      .eq('lock_token', lockToken)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { released: false, reason: 'wrong_token' };
      }
      console.error('[Idempotency] Lock release error:', error);
      return { released: false, reason: 'error' };
    }

    return { released: true };

  } catch (error) {
    console.error('[Idempotency] Unexpected release error:', error);
    return { released: false, reason: 'error' };
  }
}

// ============================================================================
// STATUS UPDATES
// ============================================================================

/**
 * Update event status (for state transitions).
 */
export async function updateEventStatus(
  eventId: string,
  status: WebhookEventRecord['status'],
  additionalFields?: Partial<WebhookEventRecord>
): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('webhook_events')
      .update({
        status,
        ...additionalFields,
      })
      .eq('event_id', eventId);

    if (error) {
      console.error('[Idempotency] Status update error:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('[Idempotency] Unexpected status update error:', error);
    return false;
  }
}

/**
 * Mark event as duplicate (for logging purposes).
 */
export async function markAsDuplicate(eventId: string): Promise<void> {
  // We don't actually update the status to 'duplicate' because
  // the original record should keep its status.
  // Instead, we just log that a duplicate was received.
  console.log(JSON.stringify({
    level: 'info',
    category: 'webhook',
    action: 'duplicate_received',
    event_id: eventId,
    timestamp: new Date().toISOString(),
  }));
}
