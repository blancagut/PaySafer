import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { chatCompletionJSON, GPT4O_MINI } from '@/lib/ai/client'
import { trackAIUsage } from '@/lib/ai/usage-tracker'
import { createHash } from 'crypto'

// =============================================================================
// POST /api/ai/translate-ui
//
// Batch-translates UI strings with aggressive Supabase caching.
// 1. Receive { texts: string[], targetLang: string }
// 2. Hash each text+lang → check `ui_translations` table
// 3. Translate only uncached strings via GPT-4o-mini
// 4. Store results
// 5. Return { translations: Record<original, translated> }
// =============================================================================

const MAX_TEXTS_PER_REQUEST = 50

function hashUI(text: string, lang: string): string {
  return createHash('sha256').update(`${text.trim()}||${lang}`).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // ── Parse body ──
    const body = await req.json()
    const { texts, targetLang } = body as { texts: string[]; targetLang: string }

    if (!texts || !Array.isArray(texts) || !targetLang) {
      return NextResponse.json(
        { error: 'Missing texts array or targetLang' },
        { status: 400 }
      )
    }

    if (targetLang === 'en') {
      // English is source — return as-is
      const translations: Record<string, string> = {}
      for (const t of texts) translations[t] = t
      return NextResponse.json({ translations })
    }

    const lang = targetLang.toLowerCase().slice(0, 5)
    const batch = texts.slice(0, MAX_TEXTS_PER_REQUEST)

    // ── Check cache for each text ──
    const admin = createAdminClient()
    const translations: Record<string, string> = {}
    const toTranslate: string[] = []

    for (const text of batch) {
      const hash = hashUI(text, lang)
      const { data: cached } = await admin
        .from('ui_translations')
        .select('translated_text')
        .eq('text_hash', hash)
        .eq('target_lang', lang)
        .single()

      if (cached) {
        translations[text] = cached.translated_text
      } else {
        toTranslate.push(text)
      }
    }

    // ── All cached → return immediately ──
    if (toTranslate.length === 0) {
      return NextResponse.json({ translations })
    }

    // ── Translate uncached strings in one API call ──
    const inputObj: Record<string, string> = {}
    toTranslate.forEach((t, i) => {
      inputObj[`s${i}`] = t
    })

    const aiResult = await chatCompletionJSON<Record<string, string>>({
      model: GPT4O_MINI,
      systemPrompt: `You are a professional translator for PaySafer, a peer-to-peer escrow payment platform.
You will receive a JSON object where keys are identifiers and values are English UI strings.
Translate ALL values to ${lang}.
Return a JSON object with the SAME keys and translated values.
Rules:
- Preserve placeholders like {amount}, {name}, {date}.
- Keep numbers, currency symbols, and formatting intact.
- Use standard localized financial/UI terms.
- Return ONLY the JSON object, no explanations.`,
      userPrompt: JSON.stringify(inputObj, null, 2),
      temperature: 0.1,
      maxTokens: 4096,
    })

    if (aiResult.data) {
      // Map back from keyed results to original texts & cache
      const inserts: {
        text_hash: string
        original_text: string
        translated_text: string
        target_lang: string
      }[] = []

      toTranslate.forEach((text, i) => {
        const key = `s${i}`
        const translated = aiResult.data![key] ?? text
        translations[text] = translated

        inserts.push({
          text_hash: hashUI(text, lang),
          original_text: text.slice(0, 5000),
          translated_text: translated,
          target_lang: lang,
        })
      })

      // Upsert into Supabase
      if (inserts.length > 0) {
        await admin
          .from('ui_translations')
          .upsert(inserts, { onConflict: 'text_hash,target_lang' })
      }
    } else {
      // AI failed → fallback to originals
      for (const t of toTranslate) {
        translations[t] = t
      }
    }

    // ── Track AI usage ──
    if (aiResult.usage) {
      await trackAIUsage({
        feature: 'ui_translation',
        model: GPT4O_MINI,
        prompt_tokens: aiResult.usage.prompt_tokens,
        completion_tokens: aiResult.usage.completion_tokens,
        total_tokens: aiResult.usage.total_tokens,
        user_id: user.id,
        metadata: { strings_count: toTranslate.length, target_lang: lang },
      })
    }

    return NextResponse.json({ translations })
  } catch (error) {
    console.error('[API] translate-ui error:', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
