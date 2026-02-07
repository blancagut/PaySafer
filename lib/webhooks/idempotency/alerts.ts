/**
 * Webhook Alerting System
 * 
 * NO BUSINESS LOGIC - Alert creation and logging only
 * 
 * ALERT TYPES:
 * - replay_attack: CRITICAL - Same event_id with different payload
 * - high_duplicate_volume: WARNING - Unusual duplicate rate
 * - processing_failure: WARNING - Repeated failures
 * - lock_timeout: WARNING - Lock held too long
 */

import { createClient } from '@/lib/supabase/server';
import type { WebhookAlertType, WebhookAlertSeverity } from './types';

// ============================================================================
// ALERT CREATION
// ============================================================================

/**
 * Create a replay attack alert.
 * 
 * SEVERITY: CRITICAL / SECURITY
 * 
 * This alert is triggered when:
 * - We receive an event with an event_id we've seen before
 * - BUT the payload hash is different
 * 
 * This should NEVER happen in normal operation and indicates:
 * 1. A replay attack attempt
 * 2. A Stripe bug (extremely unlikely)
 * 3. A bug in our hash computation
 */
export async function createReplayAttackAlert(
  eventId: string,
  existingHash: string,
  newHash: string
): Promise<void> {
  const supabase = await createClient();

  // Log immediately (even if database insert fails)
  console.error(JSON.stringify({
    level: 'critical',
    category: 'webhook',
    action: 'replay_attack_detected',
    event_id: eventId,
    existing_hash: existingHash.substring(0, 8) + '...', // Partial hash for debugging
    new_hash: newHash.substring(0, 8) + '...',
    timestamp: new Date().toISOString(),
  }));

  try {
    await supabase.from('webhook_alerts').insert({
      alert_type: 'replay_attack' as WebhookAlertType,
      severity: 'security' as WebhookAlertSeverity,
      event_id: eventId,
      message: `Replay attack detected: Event ${eventId} received with different payload`,
      details: {
        existing_hash_prefix: existingHash.substring(0, 16),
        new_hash_prefix: newHash.substring(0, 16),
        detected_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Don't throw - alert logging should not break the main flow
    console.error('[Alerts] Failed to insert replay attack alert:', error);
  }
}

/**
 * Create a high duplicate volume alert.
 * 
 * SEVERITY: WARNING
 * 
 * Triggered when duplicate rate exceeds threshold.
 * May indicate:
 * 1. Stripe webhook retry storm
 * 2. Network issues causing duplicates
 * 3. Misconfigured webhook endpoints
 */
export async function createHighDuplicateVolumeAlert(
  duplicateCount: number,
  timeWindowMinutes: number,
  threshold: number
): Promise<void> {
  const supabase = await createClient();

  console.warn(JSON.stringify({
    level: 'warning',
    category: 'webhook',
    action: 'high_duplicate_volume',
    duplicate_count: duplicateCount,
    time_window_minutes: timeWindowMinutes,
    threshold,
    timestamp: new Date().toISOString(),
  }));

  try {
    await supabase.from('webhook_alerts').insert({
      alert_type: 'high_duplicate_volume' as WebhookAlertType,
      severity: 'warning' as WebhookAlertSeverity,
      message: `High duplicate volume: ${duplicateCount} duplicates in ${timeWindowMinutes} minutes (threshold: ${threshold})`,
      details: {
        duplicate_count: duplicateCount,
        time_window_minutes: timeWindowMinutes,
        threshold,
        detected_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Alerts] Failed to insert duplicate volume alert:', error);
  }
}

/**
 * Create a processing failure alert.
 * 
 * SEVERITY: WARNING (escalates to CRITICAL after multiple failures)
 */
export async function createProcessingFailureAlert(
  eventId: string,
  webhookEventId: string,
  errorMessage: string,
  retryCount: number
): Promise<void> {
  const supabase = await createClient();
  const severity: WebhookAlertSeverity = retryCount >= 3 ? 'critical' : 'warning';

  console.warn(JSON.stringify({
    level: severity,
    category: 'webhook',
    action: 'processing_failure',
    event_id: eventId,
    retry_count: retryCount,
    error: errorMessage,
    timestamp: new Date().toISOString(),
  }));

  try {
    await supabase.from('webhook_alerts').insert({
      alert_type: 'processing_failure' as WebhookAlertType,
      severity,
      webhook_event_id: webhookEventId,
      event_id: eventId,
      message: `Processing failed for event ${eventId} (attempt ${retryCount + 1})`,
      details: {
        error_message: errorMessage,
        retry_count: retryCount,
        detected_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Alerts] Failed to insert processing failure alert:', error);
  }
}

/**
 * Create a lock timeout alert.
 * 
 * SEVERITY: WARNING
 * 
 * Triggered when a lock has been held longer than expected.
 * May indicate a crashed processor.
 */
export async function createLockTimeoutAlert(
  eventId: string,
  lockAcquiredAt: string,
  expectedDurationSeconds: number
): Promise<void> {
  const supabase = await createClient();

  console.warn(JSON.stringify({
    level: 'warning',
    category: 'webhook',
    action: 'lock_timeout',
    event_id: eventId,
    lock_acquired_at: lockAcquiredAt,
    expected_duration_seconds: expectedDurationSeconds,
    timestamp: new Date().toISOString(),
  }));

  try {
    await supabase.from('webhook_alerts').insert({
      alert_type: 'lock_timeout' as WebhookAlertType,
      severity: 'warning' as WebhookAlertSeverity,
      event_id: eventId,
      message: `Lock timeout for event ${eventId}`,
      details: {
        lock_acquired_at: lockAcquiredAt,
        expected_duration_seconds: expectedDurationSeconds,
        detected_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Alerts] Failed to insert lock timeout alert:', error);
  }
}

/**
 * Create an unknown event type alert.
 * 
 * SEVERITY: INFO
 * 
 * Triggered when we receive an event type we don't handle.
 * Not necessarily an error, but good to track.
 */
export async function createUnknownEventTypeAlert(
  eventId: string,
  eventType: string
): Promise<void> {
  const supabase = await createClient();

  console.info(JSON.stringify({
    level: 'info',
    category: 'webhook',
    action: 'unknown_event_type',
    event_id: eventId,
    event_type: eventType,
    timestamp: new Date().toISOString(),
  }));

  try {
    await supabase.from('webhook_alerts').insert({
      alert_type: 'unknown_event_type' as WebhookAlertType,
      severity: 'info' as WebhookAlertSeverity,
      event_id: eventId,
      message: `Unknown event type: ${eventType}`,
      details: {
        event_type: eventType,
        detected_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Alerts] Failed to insert unknown event type alert:', error);
  }
}
