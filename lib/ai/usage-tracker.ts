'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { AIUsageLog } from './types'

/**
 * Log AI API usage to the ai_usage_logs table for cost monitoring.
 * Uses admin client — this is a backend-only operation.
 * Fails silently to never break the main flow.
 */
export async function trackAIUsage(log: AIUsageLog): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('ai_usage_logs').insert({
      feature: log.feature,
      model: log.model,
      prompt_tokens: log.prompt_tokens,
      completion_tokens: log.completion_tokens,
      total_tokens: log.total_tokens,
      user_id: log.user_id ?? null,
      metadata: log.metadata ?? {},
    })
  } catch (err) {
    // Never let logging break the main flow
    console.error('[AI Usage Tracker] Failed to log:', err)
  }
}
