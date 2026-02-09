"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ─── Read Operations ───

export async function getUnreadNotifications() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Not authenticated" }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(20)

  return { data, error: error?.message }
}

export async function getNotifications(params?: {
  page?: number
  pageSize?: number
  unreadOnly?: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Not authenticated", total: 0 }

  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const offset = (page - 1) * pageSize

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (params?.unreadOnly) {
    query = query.eq("read", false)
  }

  const { data, error, count } = await query
  return { data, error: error?.message, total: count ?? 0 }
}

export async function getUnreadCount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { count: 0, error: "Not authenticated" }

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false)

  return { count: count ?? 0, error: error?.message }
}

// ─── Write Operations ───

export async function markAsRead(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id)

  if (!error) revalidatePath("/dashboard")
  return { error: error?.message }
}

export async function markAllAsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false)

  if (!error) revalidatePath("/dashboard")
  return { error: error?.message }
}

// ─── Internal: Create Notification (called from other server actions) ───

export async function createNotification(params: {
  userId: string
  type: string
  title: string
  message: string
  referenceType?: string
  referenceId?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("notifications")
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      reference_type: params.referenceType ?? null,
      reference_id: params.referenceId ?? null,
      read: false,
    })

  return { error: error?.message }
}

// ─── Notification Helpers (used by other server actions) ───

export async function notifyTransactionStatusChange(params: {
  transactionId: string
  buyerId: string
  sellerId: string
  newStatus: string
  description: string
  amount: number
  currency: string
  actorId: string
}) {
  const { transactionId, buyerId, sellerId, newStatus, description, amount, currency, actorId } = params

  const statusMessages: Record<string, { title: string; message: string }> = {
    awaiting_payment: {
      title: "Payment Required",
      message: `Transaction "${description}" ($${amount} ${currency}) is awaiting payment.`,
    },
    in_escrow: {
      title: "Funds in Escrow",
      message: `Payment received! $${amount} ${currency} is now safely held in escrow for "${description}".`,
    },
    delivered: {
      title: "Delivery Confirmed",
      message: `The seller has marked "${description}" as delivered. Please review and release funds.`,
    },
    released: {
      title: "Funds Released",
      message: `$${amount} ${currency} has been released for "${description}". Transaction complete!`,
    },
    cancelled: {
      title: "Transaction Cancelled",
      message: `Transaction "${description}" has been cancelled.`,
    },
    dispute: {
      title: "Dispute Opened",
      message: `A dispute has been opened for "${description}" ($${amount} ${currency}).`,
    },
  }

  const info = statusMessages[newStatus]
  if (!info) return

  // Notify both parties (except the actor)
  const recipientIds = [buyerId, sellerId].filter((id) => id !== actorId)

  for (const recipientId of recipientIds) {
    await createNotification({
      userId: recipientId,
      type: `transaction.${newStatus}`,
      title: info.title,
      message: info.message,
      referenceType: "transaction",
      referenceId: transactionId,
    })
  }
}

export async function notifyOfferAccepted(params: {
  offerId: string
  creatorId: string
  acceptedById: string
  title: string
  amount: number
  currency: string
  transactionId: string
}) {
  await createNotification({
    userId: params.creatorId,
    type: "offer.accepted",
    title: "Offer Accepted!",
    message: `Your offer "${params.title}" ($${params.amount} ${params.currency}) was accepted.`,
    referenceType: "transaction",
    referenceId: params.transactionId,
  })
}

export async function notifyDisputeUpdate(params: {
  disputeId: string
  transactionId: string
  recipientId: string
  type: "message" | "resolved"
  message: string
}) {
  await createNotification({
    userId: params.recipientId,
    type: `dispute.${params.type}`,
    title: params.type === "resolved" ? "Dispute Resolved" : "New Dispute Message",
    message: params.message,
    referenceType: "dispute",
    referenceId: params.disputeId,
  })
}
