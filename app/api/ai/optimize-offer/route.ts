import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { optimizeOffer } from '@/lib/ai/offer-optimizer'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, amount, currency, role } = body

    if (!title || !amount) {
      return NextResponse.json({ error: 'Missing title or amount' }, { status: 400 })
    }

    const result = await optimizeOffer(
      title,
      description || '',
      amount,
      currency || 'EUR',
      role || 'seller',
      user.id
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Offer optimizer error:', error)
    return NextResponse.json({ error: 'Optimization failed' }, { status: 500 })
  }
}
