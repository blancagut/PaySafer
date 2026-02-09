"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ─── Types ───

export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  status: "open" | "waiting_reply" | "resolved" | "closed"
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface SupportMessage {
  id: string
  ticket_id: string
  sender_type: "user" | "agent" | "system"
  sender_id: string | null
  message: string
  metadata: Record<string, unknown>
  read: boolean
  created_at: string
}

// ─── Get or Create Active Ticket ───

export async function getOrCreateActiveTicket(): Promise<{
  data: SupportTicket | null
  error: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Not authenticated" }

  // Check for existing open ticket
  const { data: existing, error: findError } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["open", "waiting_reply"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (existing) return { data: existing as SupportTicket, error: null }

  // Create new ticket
  const { data: newTicket, error: createError } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      subject: "General Support",
      status: "open",
    })
    .select()
    .single()

  if (createError) return { data: null, error: createError.message }

  // Send welcome system message
  await supabase.from("support_messages").insert({
    ticket_id: newTicket.id,
    sender_type: "system",
    sender_id: user.id,
    message:
      "Welcome to PaySafer Support! 👋 How can we help you today? Our team typically responds within a few minutes during business hours.",
  })

  return { data: newTicket as SupportTicket, error: null }
}

// ─── Get Ticket Messages ───

export async function getTicketMessages(ticketId: string): Promise<{
  data: SupportMessage[] | null
  error: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Not authenticated" }

  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data: data as SupportMessage[], error: null }
}

// ─── Send Message ───

export async function sendSupportMessage(
  ticketId: string,
  message: string
): Promise<{ data: SupportMessage | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Not authenticated" }

  if (!message.trim()) return { data: null, error: "Message cannot be empty" }

  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      ticket_id: ticketId,
      sender_type: "user",
      sender_id: user.id,
      message: message.trim(),
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  // Update ticket status to waiting_reply
  await supabase
    .from("support_tickets")
    .update({ status: "waiting_reply" })
    .eq("id", ticketId)

  // Auto-reply for demo purposes (smart responses)
  setTimeout(async () => {
    const autoReply = getSmartReply(message.trim())
    const serverSupabase = await createClient()
    await serverSupabase.from("support_messages").insert({
      ticket_id: ticketId,
      sender_type: "agent",
      sender_id: null,
      message: autoReply,
      metadata: { agent_name: "PaySafer Support" },
    })

    await serverSupabase
      .from("support_tickets")
      .update({ status: "open" })
      .eq("id", ticketId)
  }, 1500 + Math.random() * 2000)

  revalidatePath("/help")
  return { data: data as SupportMessage, error: null }
}

// ─── Close Ticket ───

export async function closeTicket(
  ticketId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("support_tickets")
    .update({ status: "closed", resolved_at: new Date().toISOString() })
    .eq("id", ticketId)
    .eq("user_id", user.id)

  if (error) return { error: error.message }

  // System message
  await supabase.from("support_messages").insert({
    ticket_id: ticketId,
    sender_type: "system",
    sender_id: user.id,
    message: "This conversation has been closed. Start a new chat if you need more help.",
  })

  revalidatePath("/help")
  return { error: null }
}

// ─── Get User Ticket History ───

export async function getTicketHistory(): Promise<{
  data: SupportTicket[] | null
  error: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Not authenticated" }

  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  if (error) return { data: null, error: error.message }
  return { data: data as SupportTicket[], error: null }
}

// ─── Smart Reply (Auto-responder) ───

function getSmartReply(userMessage: string): string {
  const msg = userMessage.toLowerCase()

  if (msg.includes("payment") || msg.includes("pay") || msg.includes("charge")) {
    return "Payments on PaySafer are processed securely through Stripe. Once a buyer makes a payment, the funds are held in escrow until the transaction is completed. If you're experiencing a payment issue, could you share the transaction ID so I can look into it?"
  }

  if (msg.includes("refund") || msg.includes("money back") || msg.includes("cancel")) {
    return "Refunds can be initiated if both parties agree to cancel the transaction, or through our dispute resolution process. If you'd like to request a refund, please open a dispute from the Transactions page and our team will review it within 5-10 business days."
  }

  if (msg.includes("dispute") || msg.includes("problem") || msg.includes("issue")) {
    return "I'm sorry to hear you're having an issue. You can open a dispute directly from the transaction page by clicking the 'Open Dispute' button. Our team will review all evidence from both parties and reach a fair resolution. Is there a specific transaction you need help with?"
  }

  if (msg.includes("fee") || msg.includes("cost") || msg.includes("price") || msg.includes("charge")) {
    return "PaySafer charges a small transaction fee that's displayed before you confirm any payment. There are no hidden fees, monthly subscriptions, or account maintenance costs. The exact fee varies by transaction amount and is always shown upfront."
  }

  if (msg.includes("escrow") || msg.includes("how") || msg.includes("work")) {
    return "PaySafer works as an escrow service: 1) A seller creates an offer, 2) The buyer pays and funds are held securely, 3) The seller delivers the goods/service, 4) The buyer confirms delivery, and 5) Funds are released to the seller. This protects both parties throughout the process."
  }

  if (msg.includes("account") || msg.includes("profile") || msg.includes("settings")) {
    return "You can manage your account details from the Profile page and adjust notification preferences from Settings. If you need to update your email or have account access issues, I can help guide you through the process."
  }

  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("help")) {
    return "Hi there! 👋 I'm here to help. You can ask me about payments, transactions, disputes, fees, or anything else about PaySafer. What would you like to know?"
  }

  if (msg.includes("payout") || msg.includes("withdraw") || msg.includes("bank")) {
    return "Payouts are processed to your connected Stripe account. You can set up and manage your payout preferences from the Payouts page. Standard payouts typically arrive within 2-7 business days depending on your bank."
  }

  if (msg.includes("security") || msg.includes("safe") || msg.includes("secure") || msg.includes("trust")) {
    return "Security is our top priority. All payments are processed through Stripe (PCI-compliant), funds are held in escrow until both parties are satisfied, and we use bank-level encryption for all data. Your payment details are never stored on our servers."
  }

  if (msg.includes("thank") || msg.includes("thanks") || msg.includes("great") || msg.includes("awesome")) {
    return "You're welcome! 😊 Is there anything else I can help you with? Feel free to ask anytime."
  }

  return "Thanks for reaching out! I'd be happy to help with that. Could you provide a bit more detail about your question? In the meantime, you might find answers in our FAQ section above. Our support team is also available at support@paysafer.me for complex inquiries."
}
