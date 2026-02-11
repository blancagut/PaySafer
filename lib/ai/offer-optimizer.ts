'use server'

import { chatCompletionJSON, GPT4O_MINI } from './client'
import { trackAIUsage } from './usage-tracker'
import { OFFER_OPTIMIZER_SYSTEM_PROMPT, buildOfferOptimizationPrompt } from './prompts/offer'
import type { OfferOptimizationResult } from './types'

/**
 * Enhance an offer's title and description using AI.
 * User always sees the suggestion and can accept/edit/reject.
 */
export async function optimizeOffer(
  title: string,
  description: string,
  amount: number,
  currency: string,
  role: 'buyer' | 'seller',
  userId?: string
): Promise<OfferOptimizationResult> {
  const result = await chatCompletionJSON<OfferOptimizationResult>({
    model: GPT4O_MINI,
    systemPrompt: OFFER_OPTIMIZER_SYSTEM_PROMPT,
    userPrompt: buildOfferOptimizationPrompt(title, description, amount, currency, role),
    temperature: 0.5, // Some creativity for descriptions
    maxTokens: 1024,
  })

  // Track usage
  if (result.usage) {
    await trackAIUsage({
      feature: 'offer_optimizer',
      model: GPT4O_MINI,
      prompt_tokens: result.usage.prompt_tokens,
      completion_tokens: result.usage.completion_tokens,
      total_tokens: result.usage.total_tokens,
      user_id: userId,
    })
  }

  if (result.error || !result.data) {
    return {
      improved_title: title,
      improved_description: description,
      suggested_category: 'Other',
      improvements_made: [],
    }
  }

  return result.data
}
