/**
 * lib/ai/translate-ui.ts
 *
 * Client-side helper for on-demand UI translation.
 *
 * RULES:
 *  - Default language is English (hardcoded UI text — no dictionaries).
 *  - Translation only happens when the user explicitly switches language.
 *  - Results are cached in Supabase `ui_translations` table — once translated,
 *    OpenAI is never called again for the same string+lang pair.
 *  - No auto-detection, no middleware, no routing changes.
 */

// ─── Supported Languages ─────────────────────────────────────────────────────

export const UI_LANGUAGES = [
  { code: 'en', name: 'English',    flag: '🇬🇧' },
  { code: 'es', name: 'Español',    flag: '🇪🇸' },
  { code: 'fr', name: 'Français',   flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch',    flag: '🇩🇪' },
  { code: 'pt', name: 'Português',  flag: '🇵🇹' },
  { code: 'it', name: 'Italiano',   flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski',     flag: '🇵🇱' },
  { code: 'ro', name: 'Română',     flag: '🇷🇴' },
  { code: 'tr', name: 'Türkçe',     flag: '🇹🇷' },
  { code: 'ar', name: 'العربية',    flag: '🇸🇦' },
  { code: 'zh', name: '中文',       flag: '🇨🇳' },
  { code: 'ja', name: '日本語',     flag: '🇯🇵' },
  { code: 'ko', name: '한국어',     flag: '🇰🇷' },
  { code: 'hi', name: 'हिन्दी',     flag: '🇮🇳' },
  { code: 'ru', name: 'Русский',    flag: '🇷🇺' },
] as const

export type LangCode = (typeof UI_LANGUAGES)[number]['code']

// ─── Local Storage Key ───────────────────────────────────────────────────────

const LANG_STORAGE_KEY = 'paysafer-ui-lang'

export function getSavedLanguage(): LangCode {
  if (typeof window === 'undefined') return 'en'
  return (localStorage.getItem(LANG_STORAGE_KEY) as LangCode) || 'en'
}

export function saveLanguage(code: LangCode) {
  localStorage.setItem(LANG_STORAGE_KEY, code)
}

// ─── In-memory translation cache (per session) ──────────────────────────────

const memoryCache = new Map<string, string>()

function cacheKey(text: string, lang: string) {
  return `${lang}::${text}`
}

// ─── Translate UI Text ───────────────────────────────────────────────────────

/**
 * Translate a batch of visible UI strings to the target language.
 * Returns a Map<original, translated>.
 *
 * Flow:
 *  1. If lang is 'en' → return originals immediately (no API call).
 *  2. Check in-memory cache first.
 *  3. Call /api/ai/translate-ui for uncached strings.
 *  4. API checks Supabase cache, calls OpenAI only on miss, stores result.
 *  5. Populate memory cache and return.
 */
export async function translateUITexts(
  texts: string[],
  targetLang: LangCode
): Promise<Map<string, string>> {
  const result = new Map<string, string>()

  // English = source → no-op
  if (targetLang === 'en') {
    for (const t of texts) result.set(t, t)
    return result
  }

  // Deduplicate & check memory cache
  const unique = [...new Set(texts)]
  const uncached: string[] = []

  for (const t of unique) {
    const cached = memoryCache.get(cacheKey(t, targetLang))
    if (cached) {
      result.set(t, cached)
    } else {
      uncached.push(t)
    }
  }

  if (uncached.length === 0) return result

  // Call API for uncached strings
  try {
    const res = await fetch('/api/ai/translate-ui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: uncached, targetLang }),
    })

    if (!res.ok) {
      console.error('[translate-ui] API error:', res.status)
      // Fallback: return originals
      for (const t of uncached) result.set(t, t)
      return result
    }

    const data: { translations: Record<string, string> } = await res.json()

    for (const [original, translated] of Object.entries(data.translations)) {
      memoryCache.set(cacheKey(original, targetLang), translated)
      result.set(original, translated)
    }

    // Fill any missing keys with originals
    for (const t of uncached) {
      if (!result.has(t)) result.set(t, t)
    }
  } catch (err) {
    console.error('[translate-ui] Network error:', err)
    for (const t of uncached) result.set(t, t)
  }

  return result
}

/**
 * Clear the in-memory cache (useful when switching back to English).
 */
export function clearTranslationCache() {
  memoryCache.clear()
}
