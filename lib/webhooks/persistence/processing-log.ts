/**
 * Webhook Processing Log
 * 
 * NO BUSINESS LOGIC - Audit logging only
 * 
 * Records every state transition for debugging and compliance.
 */

import { createClient } from '@/lib/supabase/server';
import type {
  ProcessingLogEntry,
  ProcessingAction,
  ProcessingStatus,
} from './types';

// ============================================================================
// LOG ENTRY CREATION
// ============================================================================

/**
 * Record a processing action in the audit log.
 */
export async function logProcessingAction(
  entry: ProcessingLogEntry
): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('webhook_processing_log')
      .insert({
        webhook_event_id: entry.webhook_event_id,
        action: entry.action,
        previous_status: entry.previous_status ?? null,
        new_status: entry.new_status ?? null,
        message: entry.message ?? null,
        error_details: entry.error_details ?? null,
        processor_id: entry.processor_id ?? null,
        duration_ms: entry.duration_ms ?? null,
      });

    if (error) {
      // Don't throw - logging should not break the main flow
      console.error('[ProcessingLog] Failed to insert log entry:', error);
    }
  } catch (error) {
    console.error('[ProcessingLog] Unexpected error:', error);
  }
}

// ============================================================================
// CONVENIENCE LOGGERS
// ============================================================================

export async function logEventReceived(
  webhookEventId: string,
  processorId?: string
): Promise<void> {
  await logProcessingAction({
    webhook_event_id: webhookEventId,
    action: 'received',
    new_status: 'pending',
    processor_id: processorId,
  });
}

export async function logEventVerified(
  webhookEventId: string,
  processorId?: string
): Promise<void> {
  await logProcessingAction({
    webhook_event_id: webhookEventId,
    action: 'verified',
    previous_status: 'pending',
    new_status: 'pending',
    processor_id: processorId,
  });
}

export async function logVerificationFailed(
  webhookEventId: string,
  errorMessage: string,
  processorId?: string
): Promise<void> {
  await logProcessingAction({
    webhook_event_id: webhookEventId,
    action: 'verification_failed',
    message: errorMessage,
    processor_id: processorId,
  });
}

export async function logEventQueued(
  webhookEventId: string,
  queueName: string,
  processorId?: string
): Promise<void> {
  await logProcessingAction({
    webhook_event_id: webhookEventId,
    action: 'queued',
    previous_status: 'pending',
    new_status: 'queued',
    message: `Queued to: ${queueName}`,
    processor_id: processorId,
  });
}

export async function logProcessingStarted(
  webhookEventId: string,
  previousStatus: ProcessingStatus,
  processorId?: string
): Promise<void> {
  await logProcessingAction({
    webhook_event_id: webhookEventId,
    action: 'processing_started',
    previous_status: previousStatus,
    new_status: 'processing',
    processor_id: processorId,
  });
}

export async function logProcessingCompleted(
  webhookEventId: string,
  durationMs: number,
  processorId?: string
): Promise<void> {
  await logProcessingAction({
    webhook_event_id: webhookEventId,
    action: 'processing_completed',
    previous_status: 'processing',
    new_status: 'completed',
    duration_ms: durationMs,
    processor_id: processorId,
  });
}

export async function logProcessingFailed(
  webhookEventId: string,
  errorMessage: string,
  errorDetails?: Record<string, unknown>,
  durationMs?: number,
  processorId?: string
): Promise<void> {
  await logProcessingAction({
    webhook_event_id: webhookEventId,
    action: 'processing_failed',
    previous_status: 'processing',
    new_status: 'failed',
    message: errorMessage,
    error_details: errorDetails,
    duration_ms: durationMs,
    processor_id: processorId,
  });
}

export async function logEventRetried(
  webhookEventId: string,
  retryCount: number,
  nextRetryAt: string,
  processorId?: string
): Promise<void> {
  await logProcessingAction({
    webhook_event_id: webhookEventId,
    action: 'retried',
    previous_status: 'failed',
    new_status: 'retrying',
    message: `Retry ${retryCount} scheduled for ${nextRetryAt}`,
    processor_id: processorId,
  });
}

export async function logEventDeadLettered(
  webhookEventId: string,
  reason: string,
  processorId?: string
): Promise<void> {
  await logProcessingAction({
    webhook_event_id: webhookEventId,
    action: 'dead_lettered',
    new_status: 'dead_letter',
    message: reason,
    processor_id: processorId,
  });
}

export async function logEventSkipped(
  webhookEventId: string,
  reason: string,
  processorId?: string
): Promise<void> {
  await logProcessingAction({
    webhook_event_id: webhookEventId,
    action: 'skipped',
    new_status: 'skipped',
    message: reason,
    processor_id: processorId,
  });
}

// ============================================================================
// LOG RETRIEVAL
// ============================================================================

/**
 * Get processing history for an event.
 */
export async function getProcessingHistory(
  webhookEventId: string,
  limit: number = 50
): Promise<Array<ProcessingLogEntry & { created_at: string }>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('webhook_processing_log')
    .select()
    .eq('webhook_event_id', webhookEventId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ProcessingLog] Failed to fetch history:', error);
    return [];
  }

  return data as Array<ProcessingLogEntry & { created_at: string }>;
}
