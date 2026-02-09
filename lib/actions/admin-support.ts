"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ─── Types ───

export interface AdminSupportTicket {
  id: string
  user_id: string
  subject: string
  status: "open" | "waiting_reply" | "resolved" | "closed"
  created_at: string
  updated_at: string
  resolved_at: string | null
  // Joined profile data
  user_email?: string
  user_name?: string
  last_message?: string
  last_message_at?: string
  unread_count?: number
}

export interface AdminSupportMessage {
  id: string
  ticket_id: string
  sender_type: "user" | "agent" | "system"
  sender_id: string | null
  message: string
  metadata: Record<string, unknown>
  read: boolean
  created_at: string
}

// ─── Verify Admin (local helper) ───

async function verifyAdminAccess() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated", user: null, supabase }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return { error: "Access denied", user: null, supabase }
  }

  return { error: null, user: { ...user, profile }, supabase }
}

// ─── Get All Support Tickets (Admin) ───

export async function getAdminSupportTickets(filters?: {
  status?: string
  search?: string
}): Promise<{
  data: AdminSupportTicket[] | null
  error: string | null
}> {
  const { error, supabase } = await verifyAdminAccess()
  if (error) return { data: null, error }

  // Use service-level query — admin bypasses RLS via the admin role check above
  // We query tickets and join profile info
  let query = supabase
    .from("support_tickets")
    .select("*")
    .order("updated_at", { ascending: false })

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }

  const { data: tickets, error: ticketsError } = await query

  if (ticketsError) return { data: null, error: ticketsError.message }
  if (!tickets || tickets.length === 0) return { data: [], error: null }

  // Get profile info for all users
  const userIds = [...new Set(tickets.map((t: any) => t.user_id))]
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds)

  const profileMap = new Map(
    (profiles || []).map((p: any) => [p.id, p])
  )

  // Get last message and unread count for each ticket
  const enrichedTickets: AdminSupportTicket[] = await Promise.all(
    tickets.map(async (ticket: any) => {
      const profile = profileMap.get(ticket.user_id)

      // Last message
      const { data: lastMsg } = await supabase
        .from("support_messages")
        .select("message, created_at, sender_type")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      // Unread count (messages from user that haven't been read)
      const { count } = await supabase
        .from("support_messages")
        .select("*", { count: "exact", head: true })
        .eq("ticket_id", ticket.id)
        .eq("sender_type", "user")
        .eq("read", false)

      return {
        ...ticket,
        user_email: profile?.email || "Unknown",
        user_name: profile?.full_name || "Unknown User",
        last_message: lastMsg?.message || "",
        last_message_at: lastMsg?.created_at || ticket.updated_at,
        unread_count: count || 0,
      } as AdminSupportTicket
    })
  )

  // Filter by search if provided
  if (filters?.search) {
    const s = filters.search.toLowerCase()
    const filtered = enrichedTickets.filter(
      (t) =>
        t.user_email?.toLowerCase().includes(s) ||
        t.user_name?.toLowerCase().includes(s) ||
        t.subject.toLowerCase().includes(s) ||
        t.last_message?.toLowerCase().includes(s)
    )
    return { data: filtered, error: null }
  }

  return { data: enrichedTickets, error: null }
}

// ─── Get Ticket Messages (Admin) ───

export async function getAdminTicketMessages(
  ticketId: string
): Promise<{
  data: AdminSupportMessage[] | null
  error: string | null
}> {
  const { error, supabase } = await verifyAdminAccess()
  if (error) return { data: null, error }

  const { data, error: msgError } = await supabase
    .from("support_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })

  if (msgError) return { data: null, error: msgError.message }

  // Mark user messages as read
  await supabase
    .from("support_messages")
    .update({ read: true })
    .eq("ticket_id", ticketId)
    .eq("sender_type", "user")
    .eq("read", false)

  return { data: data as AdminSupportMessage[], error: null }
}

// ─── Send Admin Reply ───

export async function sendAdminReply(
  ticketId: string,
  message: string
): Promise<{ data: AdminSupportMessage | null; error: string | null }> {
  const { error, user, supabase } = await verifyAdminAccess()
  if (error || !user) return { data: null, error: error || "Not authenticated" }

  if (!message.trim()) return { data: null, error: "Message cannot be empty" }

  const { data, error: insertError } = await supabase
    .from("support_messages")
    .insert({
      ticket_id: ticketId,
      sender_type: "agent",
      sender_id: user.id,
      message: message.trim(),
      metadata: {
        agent_name: user.profile?.full_name || "PaySafer Support",
        agent_email: user.profile?.email,
      },
    })
    .select()
    .single()

  if (insertError) return { data: null, error: insertError.message }

  // Update ticket status to open (admin has replied)
  await supabase
    .from("support_tickets")
    .update({ status: "open" })
    .eq("id", ticketId)

  revalidatePath("/admin")
  return { data: data as AdminSupportMessage, error: null }
}

// ─── Update Ticket Status (Admin) ───

export async function updateAdminTicketStatus(
  ticketId: string,
  status: "open" | "resolved" | "closed"
): Promise<{ error: string | null }> {
  const { error, supabase } = await verifyAdminAccess()
  if (error) return { error }

  const updates: any = { status }
  if (status === "resolved" || status === "closed") {
    updates.resolved_at = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from("support_tickets")
    .update(updates)
    .eq("id", ticketId)

  if (updateError) return { error: updateError.message }

  // Send system message
  if (status === "resolved" || status === "closed") {
    await supabase.from("support_messages").insert({
      ticket_id: ticketId,
      sender_type: "system",
      sender_id: null,
      message:
        status === "resolved"
          ? "This ticket has been marked as resolved by our support team. If you need further help, feel free to send another message."
          : "This conversation has been closed by support. Start a new chat if you need more help.",
    })
  }

  revalidatePath("/admin")
  return { error: null }
}

// ─── Get Admin Support Stats ───

export async function getAdminSupportStats(): Promise<{
  data: {
    totalTickets: number
    openTickets: number
    waitingReplyTickets: number
    resolvedTickets: number
    closedTickets: number
    totalUnread: number
  } | null
  error: string | null
}> {
  const { error, supabase } = await verifyAdminAccess()
  if (error) return { data: null, error }

  const [total, open, waiting, resolved, closed] = await Promise.all([
    supabase.from("support_tickets").select("*", { count: "exact", head: true }),
    supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "waiting_reply"),
    supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "resolved"),
    supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "closed"),
  ])

  // Unread messages from users
  const { count: unread } = await supabase
    .from("support_messages")
    .select("*", { count: "exact", head: true })
    .eq("sender_type", "user")
    .eq("read", false)

  return {
    data: {
      totalTickets: total.count || 0,
      openTickets: open.count || 0,
      waitingReplyTickets: waiting.count || 0,
      resolvedTickets: resolved.count || 0,
      closedTickets: closed.count || 0,
      totalUnread: unread || 0,
    },
    error: null,
  }
}
