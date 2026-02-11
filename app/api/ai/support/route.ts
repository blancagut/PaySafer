import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSupportResponse, isHumanEscalationRequest } from '@/lib/ai/support-agent'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { message, history = [] } = body

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 })
    }

    // Check for explicit human escalation request
    if (isHumanEscalationRequest(message)) {
      return NextResponse.json({
        response: "Of course! I'm connecting you with a human support agent. They'll be with you shortly.",
        confidence: 1,
        should_escalate: true,
        escalation_reason: 'User requested human agent',
        category: 'escalation',
      })
    }

    const result = await generateSupportResponse(message, history, user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Support agent error:', error)
    return NextResponse.json({
      response: "I'm experiencing some technical difficulties. Let me connect you with a human agent.",
      confidence: 0,
      should_escalate: true,
      escalation_reason: 'API error',
      category: 'technical',
    }, { status: 200 }) // Return 200 with escalation instead of error
  }
}
