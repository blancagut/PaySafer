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

  // Update ticket status to waiting_reply (admin will respond from Support console)
  await supabase
    .from("support_tickets")
    .update({ status: "waiting_reply" })
    .eq("id", ticketId)

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
