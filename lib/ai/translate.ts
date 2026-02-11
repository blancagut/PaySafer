'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { chatCompletionJSON, GPT4O_MINI } from './client'
import { trackAIUsage } from './usage-tracker'
import {
  TRANSLATION_SYSTEM_PROMPT,
  buildTranslationPrompt,
  BATCH_TRANSLATION_SYSTEM_PROMPT,
  buildBatchTranslationPrompt,
} from './prompts/translation'
import type { TranslationResult } from './types'
import { createHash } from 'crypto'

// =============================================================================
// TRANSLATE SINGLE STRING
// =============================================================================

/**
 * Translate a single string to the target locale.
 * Uses aggressive caching — each unique string+locale is translated once, ever.
 */
export async function translateText(
  text: string,
  targetLocale: string,
  userId?: string
): Promise<{ translated: string; cached: boolean }> {
  if (!text.trim()) return { translated: text, cached: true }

  // Normalize locale
  const locale = targetLocale.toLowerCase().slice(0, 5) // e.g., 'es', 'fr', 'de', 'pt-br'

  // English is the source — no translation needed
  if (locale === 'en') return { translated: text, cached: true }

  const sourceHash = hashText(text)

  // Check cache first
  const admin = createAdminClient()
  const { data: cached } = await admin
    .from('translations')
    .select('translated_text')
    .eq('source_hash', sourceHash)
    .eq('locale', locale)
    .single()

  if (cached) {
    return { translated: cached.translated_text, cached: true }
  }

  // Cache miss — call OpenAI
  const result = await chatCompletionJSON<TranslationResult>({
    model: GPT4O_MINI,
    systemPrompt: TRANSLATION_SYSTEM_PROMPT,
    userPrompt: buildTranslationPrompt(text, locale),
    temperature: 0.1, // Very low for consistent translations
    maxTokens: 2048,
  })

  if (result.error || !result.data) {
    console.error('[Translation] Failed:', result.error)
    return { translated: text, cached: false } // Graceful fallback to original
  }

  // Cache the translation
  await admin.from('translations').upsert(
    {
      source_hash: sourceHash,
      source_text: text.slice(0, 5000), // Truncate for storage
      locale,
      translated_text: result.data.translated_text,
    },
    { onConflict: 'source_hash,locale' }
  )

  // Track usage
  if (result.usage) {
    await trackAIUsage({
      feature: 'translation',
      model: GPT4O_MINI,
      prompt_tokens: result.usage.prompt_tokens,
      completion_tokens: result.usage.completion_tokens,
      total_tokens: result.usage.total_tokens,
      user_id: userId,
    })
  }

  return { translated: result.data.translated_text, cached: false }
}

// =============================================================================
// BATCH TRANSLATE (for UI strings)
// =============================================================================

/**
 * Translate a dictionary of strings in one API call.
 * Used for translating entire locale files at once.
 */
export async function translateBatch(
  strings: Record<string, string>,
  targetLocale: string,
  userId?: string
): Promise<Record<string, string>> {
  const locale = targetLocale.toLowerCase().slice(0, 5)
  if (locale === 'en') return strings

  const admin = createAdminClient()
  const result: Record<string, string> = {}
  const toTranslate: Record<string, string> = {}

  // Check cache for each string
  for (const [key, text] of Object.entries(strings)) {
    const hash = hashText(text)
    const { data: cached } = await admin
      .from('translations')
      .select('translated_text')
      .eq('source_hash', hash)
      .eq('locale', locale)
      .single()

    if (cached) {
      result[key] = cached.translated_text
    } else {
      toTranslate[key] = text
    }
  }

  // Translate uncached strings in one batch
  if (Object.keys(toTranslate).length > 0) {
    const aiResult = await chatCompletionJSON<Record<string, string>>({
      model: GPT4O_MINI,
      systemPrompt: BATCH_TRANSLATION_SYSTEM_PROMPT,
      userPrompt: buildBatchTranslationPrompt(toTranslate, locale),
      temperature: 0.1,
      maxTokens: 4096,
    })

    if (aiResult.data) {
      // Cache each translated string individually
      const inserts = Object.entries(aiResult.data).map(([key, translated]) => ({
        source_hash: hashText(toTranslate[key] || key),
        source_text: (toTranslate[key] || key).slice(0, 5000),
        locale,
        translated_text: translated,
      }))

      if (inserts.length > 0) {
        await admin
          .from('translations')
          .upsert(inserts, { onConflict: 'source_hash,locale' })
      }

      // Merge into result
      for (const [key, translated] of Object.entries(aiResult.data)) {
        result[key] = translated
      }
    }

    // Track usage
    if (aiResult.usage) {
      await trackAIUsage({
        feature: 'translation_batch',
        model: GPT4O_MINI,
        prompt_tokens: aiResult.usage.prompt_tokens,
        completion_tokens: aiResult.usage.completion_tokens,
        total_tokens: aiResult.usage.total_tokens,
        user_id: userId,
        metadata: { strings_count: Object.keys(toTranslate).length },
      })
    }

    // Fill in any keys that AI missed
    for (const key of Object.keys(toTranslate)) {
      if (!result[key]) {
        result[key] = toTranslate[key] // Fallback to original
      }
    }
  }

  return result
}

// =============================================================================
// TRANSLATE USER CONTENT (messages, descriptions, etc.)
// =============================================================================

/**
 * Translate user-generated content on demand.
 * Returns both original and translated text for toggle display.
 */
export async function translateUserContent(
  text: string,
  targetLocale: string,
  userId?: string
): Promise<{ original: string; translated: string; locale: string }> {
  const { translated } = await translateText(text, targetLocale, userId)
  return { original: text, translated, locale: targetLocale }
}

// =============================================================================
// HELPERS
// =============================================================================

function hashText(text: string): string {
  return createHash('sha256').update(text.trim()).digest('hex')
}

// =============================================================================
// GET SUPPORTED LOCALES
// =============================================================================

export async function getSupportedLocales() {
  return [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'ro', name: 'Română', flag: '🇷🇴' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  ] as const
}
