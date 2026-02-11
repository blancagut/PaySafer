import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createClient } from "@/lib/supabase/server"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are SafeAI, the financial copilot for PaySafer — a modern escrow and P2P payment platform.
You help users understand their finances, spending patterns, pending actions, and guide them through the platform.

Your personality:
- Concise but friendly (max 2-3 sentences per response)
- Use currency symbols (€) and exact numbers when possible
- You can suggest actions for the user to take
- If asked about something you can't access, be honest and suggest what they could do

When responding, you can include:
- "suggestions": array of 2-3 follow-up question strings the user might ask
- "chart": { "type": "bar"|"line", "data": [{"label": "Mon", "value": 120},...] } for visual data

Context about the user will be provided. Use it to give personalized insights.
Always respond in JSON format: { "message": "...", "suggestions": [...], "chart": {...} | null }
`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { message, history } = await request.json()

    // Gather user context
    const [walletResult, txnResult, pendingResult, offersResult] = await Promise.all([
      supabase.from("wallets").select("balance, currency").eq("user_id", user.id).single(),
      supabase.from("transactions")
        .select("id, amount, status, created_at")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("transactions")
        .select("id, status")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .in("status", ["awaiting_payment", "in_escrow", "delivered", "draft"]),
      supabase.from("offers")
        .select("id, status, expires_at")
        .eq("creator_id", user.id)
        .eq("status", "active"),
    ])

    const userContext = `
User's current state:
- Wallet balance: €${walletResult.data?.balance || 0} ${walletResult.data?.currency || 'EUR'}
- Recent transactions (last 20): ${JSON.stringify(txnResult.data?.map(t => ({ amount: t.amount, status: t.status, date: t.created_at })) || [])}
- Pending transactions: ${pendingResult.data?.length || 0} (${JSON.stringify(pendingResult.data?.reduce((acc: Record<string, number>, t: any) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc }, {}) || {})})
- Active offers: ${offersResult.data?.length || 0}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: userContext },
        ...(history || []).map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" },
    })

    const raw = completion.choices[0].message.content || '{}'
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = { message: raw, suggestions: [] }
    }

    return NextResponse.json({
      message: parsed.message || "I'm not sure how to answer that.",
      suggestions: parsed.suggestions || [],
      chart: parsed.chart || null,
    })
  } catch (error) {
    console.error("[AI Copilot] Error:", error)
    return NextResponse.json(
      { message: "Something went wrong. Please try again.", suggestions: [] },
      { status: 500 }
    )
  }
}
