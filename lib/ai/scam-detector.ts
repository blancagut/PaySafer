'use server'

import { chatCompletionJSON, GPT4O_MINI } from './client'
import { trackAIUsage } from './usage-tracker'
import { SCAM_DETECTOR_SYSTEM_PROMPT, buildScamDetectionPrompt } from './prompts/scam'
import type { ScamDetectionResult } from './types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Analyze a batch of chat messages for scam patterns.
 * MODERATE approach: flags + warns, never blocks.
 * 
 * Call this every ~5 messages in a conversation, not on every single message.
 */
export async function detectScamPatterns(
  messages: { sender: string; content: string; timestamp: string }[],
  conversationType: 'transaction' | 'direct',
  conversationId: string,
  flaggedUserId?: string,
  messageId?: string
): Promise<ScamDetectionResult> {
  if (messages.length === 0) {
    return { is_suspicious: false, confidence: 0, pattern_type: 'none', explanation: 'No messages to analyze' }
  }

  const result = await chatCompletionJSON<ScamDetectionResult>({
    model: GPT4O_MINI,
    systemPrompt: SCAM_DETECTOR_SYSTEM_PROMPT,
    userPrompt: buildScamDetectionPrompt(messages),
    temperature: 0.1,
    maxTokens: 512,
  })

  // Track usage
  if (result.usage) {
    await trackAIUsage({
      feature: 'scam_detection',
      model: GPT4O_MINI,
      prompt_tokens: result.usage.prompt_tokens,
      completion_tokens: result.usage.completion_tokens,
      total_tokens: result.usage.total_tokens,
      metadata: { conversation_type: conversationType, conversation_id: conversationId },
    })
  }

  const detection: ScamDetectionResult = result.data ?? {
    is_suspicious: false,
    confidence: 0,
    pattern_type: 'none',
    explanation: 'Scam detection unavailable',
  }

  // If suspicious with sufficient confidence, create a flag for admin review
  if (detection.is_suspicious && detection.confidence >= 0.7) {
    const admin = createAdminClient()
    await admin.from('scam_flags').insert({
      message_id: messageId ?? null,
      conversation_type: conversationType,
      conversation_id: conversationId,
      flagged_user_id: flaggedUserId ?? null,
      confidence: detection.confidence,
      pattern_type: detection.pattern_type,
      explanation: detection.explanation,
    })
  }

  return detection
}

/**
 * Get the protective warning message shown to the potential victim.
 * Only shown when confidence > 0.7.
 */
export async function getProtectiveWarning(patternType: string): Promise<string | null> {
  const warnings: Record<string, string> = {
    off_platform_request: '💡 Tip: Always complete transactions through escrow for your protection. PaySafer holds your funds safely until delivery is confirmed.',
    fake_delivery_proof: '💡 Tip: Only confirm delivery when you have received and verified what was promised. You have 3 days to review.',
    phishing_link: '⚠️ Be careful with links. PaySafer will never ask you to click external links for payment. All payments happen securely within the platform.',
    pressure_tactics: '💡 Take your time. Legitimate sellers don\'t pressure you to act immediately. Your funds are safe in escrow.',
    impersonation: '⚠️ PaySafer staff will never ask for your password or payment outside the platform. Contact support if something seems off.',
    social_engineering: '💡 Tip: Keep communication within PaySafer and use escrow for all transactions.',
    advance_fee: '⚠️ Never pay extra fees outside of your escrow transaction. All legitimate fees are handled by the platform.',
    overpayment: '⚠️ Be cautious of overpayment schemes. If someone sends extra money and asks for a refund of the difference, contact support.',
  }
  return warnings[patternType] ?? null
}

/**
 * Get unreviewed scam flags for admin dashboard.
 */
export async function getUnreviewedScamFlags(limit = 50) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('scam_flags')
    .select('*')
    .eq('reviewed', false)
    .order('confidence', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

/**
 * Admin reviews a scam flag.
 */
export async function reviewScamFlag(
  flagId: string,
  adminId: string,
  dismissed: boolean
): Promise<{ error: string | null }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('scam_flags')
    .update({
      reviewed: true,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      dismissed,
    })
    .eq('id', flagId)

  return { error: error?.message ?? null }
}
