/**
 * Dead Letter Queue Management
 * 
 * NO BUSINESS LOGIC - Dead letter operations only
 * 
 * DEAD LETTER RULES:
 * 1. Events are dead-lettered after max retries exceeded
 * 2. Dead-lettered events are NEVER auto-deleted
 * 3. Payload hash is preserved forever
 * 4. Manual intervention required for reprocessing
 */

import { createClient } from '@/lib/supabase/server';
import type {
  WebhookEventRecord,
  DeadLetterResult,
  ProcessingStatus,
  PersistenceConfig,
} from './types';
import { DEFAULT_PERSISTENCE_CONFIG } from './types';

// ============================================================================
// DEAD LETTER OPERATIONS
// ============================================================================

/**
 * Move event to dead letter queue.
 * 
 * INVARIANTS:
 * - Dead letter events are preserved forever
 * - Reason is always logged
 * - No automatic reprocessing
 */
export async function moveToDeadLetter(
  provider: string,
  eventId: string,
  reason: string
): Promise<DeadLetterResult> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('webhook_events_v2')
      .update({
        processing_status: 'dead_letter' as ProcessingStatus,
        dead_letter_at: new Date().toISOString(),
        dead_letter_reason: reason,
        processing_completed_at: new Date().toISOString(),
        // Release any lock
        lock_token: null,
        lock_acquired_at: null,
        lock_expires_at: null,
      })
      .eq('provider', provider)
      .eq('event_id', eventId);

    if (error) {
      logDeadLetterError(eventId, provider, reason, error);
      return { success: false, eventId, reason };
    }

    logDeadLettered(eventId, provider, reason);
    
    return { success: true, eventId, reason };

  } catch (error) {
    logDeadLetterError(eventId, provider, reason, error);
    return { success: false, eventId, reason };
  }
}

/**
 * Check if event should be dead-lettered.
 */
export function shouldDeadLetter(
  retryCount: number,
  maxRetries: number = DEFAULT_PERSISTENCE_CONFIG.maxRetries
): boolean {
  return retryCount >= maxRetries;
}

/**
 * Get all dead-lettered events (for admin review).
 */
export async function getDeadLetteredEvents(
  provider?: string,
  limit: number = 100,
  offset: number = 0
): Promise<WebhookEventRecord[]> {
  const supabase = await createClient();

  let query = supabase
    .from('webhook_events_v2')
    .select()
    .eq('processing_status', 'dead_letter')
    .order('dead_letter_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (provider) {
    query = query.eq('provider', provider);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[DeadLetter] Failed to fetch dead-lettered events:', error);
    return [];
  }

  return data as WebhookEventRecord[];
}

/**
 * Count dead-lettered events (for monitoring).
 */
export async function countDeadLetteredEvents(
  provider?: string
): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from('webhook_events_v2')
    .select('id', { count: 'exact', head: true })
    .eq('processing_status', 'dead_letter');

  if (provider) {
    query = query.eq('provider', provider);
  }

  const { count, error } = await query;

  if (error) {
    console.error('[DeadLetter] Failed to count dead-lettered events:', error);
    return 0;
  }

  return count ?? 0;
}

// ============================================================================
// RETRY MANAGEMENT
// ============================================================================

/**
 * Schedule event for retry with exponential backoff.
 */
export async function scheduleRetry(
  provider: string,
  eventId: string,
  retryCount: number,
  errorMessage?: string,
  config: PersistenceConfig = DEFAULT_PERSISTENCE_CONFIG
): Promise<{ success: boolean; nextRetryAt?: string }> {
  const supabase = await createClient();

  // Check if should dead-letter instead
  if (shouldDeadLetter(retryCount, config.maxRetries)) {
    const result = await moveToDeadLetter(
      provider,
      eventId,
      `Max retries exceeded (${config.maxRetries}). Last error: ${errorMessage ?? 'Unknown'}`
    );
    return { success: result.success };
  }

  // Calculate next retry time with exponential backoff
  const delaySeconds = calculateRetryDelay(retryCount, config);
  const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

  try {
    const { error } = await supabase
      .from('webhook_events_v2')
      .update({
        processing_status: 'retrying' as ProcessingStatus,
        retry_count: retryCount + 1,
        next_retry_at: nextRetryAt.toISOString(),
        processing_error: errorMessage,
        processing_completed_at: new Date().toISOString(),
        // Release lock
        lock_token: null,
        lock_acquired_at: null,
        lock_expires_at: null,
      })
      .eq('provider', provider)
      .eq('event_id', eventId);

    if (error) {
      console.error('[Retry] Failed to schedule retry:', error);
      return { success: false };
    }

    logRetryScheduled(eventId, provider, retryCount + 1, nextRetryAt.toISOString());
    
    return { success: true, nextRetryAt: nextRetryAt.toISOString() };

  } catch (error) {
    console.error('[Retry] Unexpected error scheduling retry:', error);
    return { success: false };
  }
}

/**
 * Calculate retry delay using exponential backoff.
 */
export function calculateRetryDelay(
  retryCount: number,
  config: PersistenceConfig = DEFAULT_PERSISTENCE_CONFIG
): number {
  // Exponential backoff: base * 2^retryCount
  const delay = config.retryBaseDelaySeconds * Math.pow(2, retryCount);
  
  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  
  // Cap at max delay
  return Math.min(delay + jitter, config.retryMaxDelaySeconds);
}

/**
 * Get events ready for retry.
 */
export async function getRetryReadyEvents(
  limit: number = 50
): Promise<WebhookEventRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('webhook_events_v2')
    .select()
    .eq('processing_status', 'retrying')
    .lte('next_retry_at', new Date().toISOString())
    .is('lock_token', null)
    .order('next_retry_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[Retry] Failed to fetch retry-ready events:', error);
    return [];
  }

  return data as WebhookEventRecord[];
}

// ============================================================================
// LOGGING
// ============================================================================

function logDeadLettered(
  eventId: string,
  provider: string,
  reason: string
): void {
  console.warn(JSON.stringify({
    level: 'warn',
    category: 'webhook_persistence',
    action: 'event_dead_lettered',
    event_id: eventId,
    provider,
    reason,
    timestamp: new Date().toISOString(),
  }));
}

function logDeadLetterError(
  eventId: string,
  provider: string,
  reason: string,
  error: unknown
): void {
  console.error(JSON.stringify({
    level: 'error',
    category: 'webhook_persistence',
    action: 'dead_letter_error',
    event_id: eventId,
    provider,
    reason,
    error: error instanceof Error ? error.message : 'Unknown error',
    timestamp: new Date().toISOString(),
  }));
}

function logRetryScheduled(
  eventId: string,
  provider: string,
  retryCount: number,
  nextRetryAt: string
): void {
  console.log(JSON.stringify({
    level: 'info',
    category: 'webhook_persistence',
    action: 'retry_scheduled',
    event_id: eventId,
    provider,
    retry_count: retryCount,
    next_retry_at: nextRetryAt,
    timestamp: new Date().toISOString(),
  }));
}
