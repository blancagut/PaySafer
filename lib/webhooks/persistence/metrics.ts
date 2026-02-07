/**
 * Webhook Metrics Collection
 * 
 * NO BUSINESS LOGIC - Metrics collection only
 * 
 * METRICS COLLECTED:
 * - events_received: Total events received
 * - events_verified: Events that passed verification
 * - events_verification_failed: Events that failed verification
 * - events_duplicate: Duplicate events detected
 * - events_processed: Successfully processed events
 * - events_failed: Failed processing attempts
 * - events_dead_lettered: Events moved to dead letter
 */

import { createClient } from '@/lib/supabase/server';
import type { WebhookProvider, WebhookMetrics } from './types';

// ============================================================================
// IN-MEMORY COUNTERS (For current request)
// ============================================================================

// These are used to batch updates within a single request
// They are NOT used for cross-request state (that's forbidden)
interface RequestMetrics {
  provider: WebhookProvider;
  received: number;
  verified: number;
  verification_failed: number;
  duplicate: number;
  processed: number;
  failed: number;
  dead_lettered: number;
}

// ============================================================================
// METRIC RECORDING
// ============================================================================

/**
 * Record a metric event.
 * 
 * Logs the metric and optionally persists to database.
 */
export function recordMetric(
  provider: WebhookProvider,
  metric: keyof WebhookMetrics,
  value: number = 1
): void {
  // Log the metric (for real-time monitoring via log aggregation)
  console.log(JSON.stringify({
    level: 'info',
    category: 'webhook_metrics',
    metric,
    provider,
    value,
    timestamp: new Date().toISOString(),
  }));
}

// ============================================================================
// CONVENIENCE RECORDERS
// ============================================================================

export function recordEventReceived(provider: WebhookProvider): void {
  recordMetric(provider, 'events_received');
}

export function recordEventVerified(provider: WebhookProvider): void {
  recordMetric(provider, 'events_verified');
}

export function recordVerificationFailed(provider: WebhookProvider): void {
  recordMetric(provider, 'events_verification_failed');
}

export function recordDuplicateEvent(provider: WebhookProvider): void {
  recordMetric(provider, 'events_duplicate');
}

export function recordEventProcessed(provider: WebhookProvider): void {
  recordMetric(provider, 'events_processed');
}

export function recordEventFailed(provider: WebhookProvider): void {
  recordMetric(provider, 'events_failed');
}

export function recordEventDeadLettered(provider: WebhookProvider): void {
  recordMetric(provider, 'events_dead_lettered');
}

// ============================================================================
// HOURLY AGGREGATION (Background job)
// ============================================================================

/**
 * Aggregate metrics for the past hour.
 * 
 * This should be called by a cron job, not during request processing.
 */
export async function aggregateHourlyMetrics(
  hourStart: Date,
  provider: WebhookProvider
): Promise<void> {
  const supabase = await createClient();
  const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

  try {
    // Count events by status
    const { data: counts, error: countError } = await supabase
      .from('webhook_events_v2')
      .select('processing_status, verification_status')
      .eq('provider', provider)
      .gte('received_at', hourStart.toISOString())
      .lt('received_at', hourEnd.toISOString());

    if (countError) {
      console.error('[Metrics] Failed to aggregate metrics:', countError);
      return;
    }

    // Calculate metrics
    const metrics: WebhookMetrics = {
      events_received: counts?.length ?? 0,
      events_verified: counts?.filter(e => e.verification_status === 'verified').length ?? 0,
      events_verification_failed: counts?.filter(e => e.verification_status === 'failed').length ?? 0,
      events_duplicate: 0, // Calculated from idempotency layer
      events_processed: counts?.filter(e => e.processing_status === 'completed').length ?? 0,
      events_failed: counts?.filter(e => e.processing_status === 'failed').length ?? 0,
      events_dead_lettered: counts?.filter(e => e.processing_status === 'dead_letter').length ?? 0,
    };

    // Upsert metrics
    const { error: upsertError } = await supabase
      .from('webhook_metrics_hourly')
      .upsert({
        hour_start: hourStart.toISOString(),
        provider,
        ...metrics,
      }, {
        onConflict: 'hour_start,provider',
      });

    if (upsertError) {
      console.error('[Metrics] Failed to upsert hourly metrics:', upsertError);
    }

  } catch (error) {
    console.error('[Metrics] Unexpected error during aggregation:', error);
  }
}

// ============================================================================
// METRIC RETRIEVAL
// ============================================================================

/**
 * Get metrics for a time range.
 */
export async function getMetrics(
  provider: WebhookProvider,
  startTime: Date,
  endTime: Date
): Promise<WebhookMetrics> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('webhook_metrics_hourly')
    .select()
    .eq('provider', provider)
    .gte('hour_start', startTime.toISOString())
    .lt('hour_start', endTime.toISOString());

  if (error || !data) {
    console.error('[Metrics] Failed to fetch metrics:', error);
    return {
      events_received: 0,
      events_verified: 0,
      events_verification_failed: 0,
      events_duplicate: 0,
      events_processed: 0,
      events_failed: 0,
      events_dead_lettered: 0,
    };
  }

  // Sum up all hourly metrics
  return data.reduce(
    (acc, row) => ({
      events_received: acc.events_received + (row.events_received ?? 0),
      events_verified: acc.events_verified + (row.events_verified ?? 0),
      events_verification_failed: acc.events_verification_failed + (row.events_verification_failed ?? 0),
      events_duplicate: acc.events_duplicate + (row.events_duplicate ?? 0),
      events_processed: acc.events_processed + (row.events_processed ?? 0),
      events_failed: acc.events_failed + (row.events_failed ?? 0),
      events_dead_lettered: acc.events_dead_lettered + (row.events_dead_lettered ?? 0),
    }),
    {
      events_received: 0,
      events_verified: 0,
      events_verification_failed: 0,
      events_duplicate: 0,
      events_processed: 0,
      events_failed: 0,
      events_dead_lettered: 0,
    }
  );
}

/**
 * Get current day's metrics (real-time from events table).
 */
export async function getTodayMetrics(
  provider: WebhookProvider
): Promise<WebhookMetrics> {
  const supabase = await createClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('webhook_events_v2')
    .select('processing_status, verification_status')
    .eq('provider', provider)
    .gte('received_at', todayStart.toISOString());

  if (error || !data) {
    return {
      events_received: 0,
      events_verified: 0,
      events_verification_failed: 0,
      events_duplicate: 0,
      events_processed: 0,
      events_failed: 0,
      events_dead_lettered: 0,
    };
  }

  return {
    events_received: data.length,
    events_verified: data.filter(e => e.verification_status === 'verified').length,
    events_verification_failed: data.filter(e => e.verification_status === 'failed').length,
    events_duplicate: 0,
    events_processed: data.filter(e => e.processing_status === 'completed').length,
    events_failed: data.filter(e => e.processing_status === 'failed').length,
    events_dead_lettered: data.filter(e => e.processing_status === 'dead_letter').length,
  };
}
