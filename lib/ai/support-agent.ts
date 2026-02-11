'use server'

import { chatCompletionJSON, GPT4O_MINI, GPT4O } from './client'
import { trackAIUsage } from './usage-tracker'
import { SUPPORT_AGENT_SYSTEM_PROMPT, buildSupportPrompt } from './prompts/support'
import type { SupportAgentResult } from './types'

/**
 * AI-powered first-line support responder.
 * Analyzes the user's message + conversation history and generates a response.
 * Returns confidence level and escalation flag.
 */
export async function generateSupportResponse(
  userMessage: string,
  conversationHistory: { role: 'user' | 'agent'; message: string }[],
  userId?: string
): Promise<SupportAgentResult> {
  // Use GPT-4o for complex queries with long history, 4o-mini for simple FAQ
  const isComplex = conversationHistory.length > 4 || userMessage.length > 300
  const model = isComplex ? GPT4O : GPT4O_MINI

  const result = await chatCompletionJSON<SupportAgentResult>({
    model,
    systemPrompt: SUPPORT_AGENT_SYSTEM_PROMPT,
    userPrompt: buildSupportPrompt(userMessage, conversationHistory),
    temperature: 0.3,
    maxTokens: 1024,
  })

  // Track usage
  if (result.usage) {
    await trackAIUsage({
      feature: 'support_agent',
      model,
      prompt_tokens: result.usage.prompt_tokens,
      completion_tokens: result.usage.completion_tokens,
      total_tokens: result.usage.total_tokens,
      user_id: userId,
    })
  }

  if (result.error || !result.data) {
    // Graceful fallback — escalate to human
    return {
      response: "I'm having a bit of trouble right now. Let me connect you with a human agent who can help!",
      confidence: 0,
      should_escalate: true,
      escalation_reason: 'AI response generation failed',
      category: 'technical',
    }
  }

  return result.data
}

/**
 * Check if a message is a request to talk to a human.
 * Simple keyword match — no AI needed.
 */
export async function isHumanEscalationRequest(message: string): Promise<boolean> {
  const lower = message.toLowerCase()
  const patterns = [
    'talk to a human',
    'talk to someone',
    'real person',
    'human agent',
    'speak to someone',
    'real agent',
    'not a bot',
    'stop bot',
    'agent please',
    'human please',
    'connect me to',
    'transfer me',
  ]
  return patterns.some(p => lower.includes(p))
}
