import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { translateText, translateUserContent } from '@/lib/ai/translate'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { text, locale, type = 'ui' } = body

    if (!text || !locale) {
      return NextResponse.json({ error: 'Missing text or locale' }, { status: 400 })
    }

    if (type === 'content') {
      const result = await translateUserContent(text, locale, user.id)
      return NextResponse.json(result)
    }

    const { translated, cached } = await translateText(text, locale, user.id)
    return NextResponse.json({ translated, cached })
  } catch (error) {
    console.error('[API] Translation error:', error)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
