"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import type { NotificationType, NotificationReferenceType } from "@/lib/notifications/types"
import { NOTIFICATION_CONFIG } from "@/lib/notifications/types"

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
  filter?: string
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

  if (params?.filter && params.filter !== "all") {
    // Filter by notification type prefix: "transactions", "messages", "disputes"
    const filterMap: Record<string, string[]> = {
      transactions: ["transaction.", "p2p_", "wallet.", "offer."],
      messages: ["message."],
      disputes: ["dispute."],
    }
    const prefixes = filterMap[params.filter]
    if (prefixes) {
      // Build OR filter for type LIKE each prefix
      const orFilter = prefixes.map(p => `type.like.${p}%`).join(",")
      query = query.or(orFilter)
    }
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

export async function deleteNotification(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const admin = createAdminClient()
  const { error } = await admin
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", user.id)

  if (!error) revalidatePath("/dashboard")
  return { error: error?.message }
}

// ─── Internal: Low-level DB insert (via admin to bypass RLS) ───

async function insertNotification(params: {
  userId: string
  type: string
  title: string
  message: string
  referenceType?: string | null
  referenceId?: string | null
}) {
  const admin = createAdminClient()

  const { error } = await admin
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

  if (error) {
    console.error("[notifications] Failed to insert:", error.message)
  }

  return { error: error?.message }
}

// ─── Orchestrator: Check preferences then dispatch ───

/**
 * Central notification function. Checks user preferences before
 * creating the in-app notification. Called from all server actions
 * and webhook processors.
 */
export async function notifyUser(params: {
  userId: string
  type: NotificationType
  title: string
  message: string
  referenceType?: NotificationReferenceType | string
  referenceId?: string
}) {
  const config = NOTIFICATION_CONFIG[params.type]
  if (!config) {
    // Unknown type — still insert but skip preference check
    return insertNotification(params)
  }

  // Check user preferences (if the type has a preference key)
  if (config.preferenceKey) {
    try {
      const admin = createAdminClient()
      const { data: settings } = await admin
        .from("user_settings")
        .select(config.preferenceKey)
        .eq("id", params.userId)
        .single()

      if (settings && settings[config.preferenceKey] === false) {
        // User has disabled this notification category — skip
        return { error: null }
      }
    } catch {
      // If settings fetch fails, still send the notification (fail-open for fintech)
    }
  }

  // Always insert in-app notification
  const result = await insertNotification(params)

  // Send push notification (fire-and-forget)
  if (config.sendPush) {
    sendPushToUser(params.userId, params.title, params.message, params.referenceType, params.referenceId)
      .catch((err) => console.error("[push] Failed:", err))
  }

  // Send email notification for critical events (fire-and-forget)
  if (config.sendEmail) {
    sendEmailToUser(params.userId, params.type, params.title, params.message)
      .catch((err) => console.error("[email] Failed:", err))
  }

  return result
}

// ─── Push Notification Dispatch ───

async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  referenceType?: string,
  referenceId?: string
) {
  try {
    // Dynamic import to avoid loading web-push unless needed
    const webpush = await import("web-push").catch(() => null)
    if (!webpush) return // web-push not installed yet

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY
    if (!vapidPublic || !vapidPrivate) return // VAPID keys not configured

    webpush.setVapidDetails(
      "mailto:support@paysafe.app",
      vapidPublic,
      vapidPrivate
    )

    const admin = createAdminClient()
    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId)

    if (!subscriptions || subscriptions.length === 0) return

    // Build the notification URL
    const { getNotificationHref } = await import("@/lib/notifications/types")
    const url = getNotificationHref(referenceType, referenceId)

    const payload = JSON.stringify({ title, body, url })

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      } catch (err: unknown) {
        // 410 Gone = subscription expired, clean up
        if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id)
        }
      }
    }
  } catch (err) {
    console.error("[push] Dispatch error:", err)
  }
}

// ─── Email Notification Dispatch ───

async function sendEmailToUser(
  userId: string,
  type: NotificationType,
  title: string,
  message: string
) {
  try {
    const admin = createAdminClient()

    // Check if user has email notifications enabled
    const { data: settings } = await admin
      .from("user_settings")
      .select("notify_email")
      .eq("id", userId)
      .single()

    if (settings?.notify_email === false) return

    // Get user email
    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single()

    if (!profile?.email) return

    // Dynamic import Resend
    const { Resend } = await import("resend").catch(() => ({ Resend: null }))
    if (!Resend) return // resend not installed yet

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return

    const resend = new Resend(apiKey)

    await resend.emails.send({
      from: "PaySafe <notifications@paysafe.app>",
      to: profile.email,
      subject: title,
      html: buildEmailHtml(title, message, profile.full_name || "there"),
    })
  } catch (err) {
    console.error("[email] Dispatch error:", err)
  }
}

function buildEmailHtml(title: string, message: string, name: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0;">PaySafe</h1>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px;">
        <h2 style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">${title}</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">Hi ${name},</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">${message}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://paysafe.app'}/dashboard" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500;">Open PaySafe</a>
      </div>
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">
        You're receiving this because you have email notifications enabled. 
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://paysafe.app'}/settings" style="color: #6366f1;">Manage preferences</a>
      </p>
    </div>
  `
}

// ─── Backward-compatible createNotification (for existing inline usage) ───

export async function createNotification(params: {
  userId: string
  type: string
  title: string
  message: string
  referenceType?: string
  referenceId?: string
}) {
  return insertNotification(params)
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
      message: `Transaction "${description}" (${currency} ${amount}) is awaiting payment.`,
    },
    in_escrow: {
      title: "Funds in Escrow",
      message: `Payment received! ${currency} ${amount} is now safely held in escrow for "${description}".`,
    },
    delivered: {
      title: "Delivery Confirmed",
      message: `The seller has marked "${description}" as delivered. Please review and release funds.`,
    },
    released: {
      title: "Funds Released",
      message: `${currency} ${amount} has been released for "${description}". Transaction complete!`,
    },
    cancelled: {
      title: "Transaction Cancelled",
      message: `Transaction "${description}" has been cancelled.`,
    },
    dispute: {
      title: "Dispute Opened",
      message: `A dispute has been opened for "${description}" (${currency} ${amount}).`,
    },
  }

  const info = statusMessages[newStatus]
  if (!info) return

  // Notify both parties (except the actor)
  const recipientIds = [buyerId, sellerId].filter((id) => id && id !== actorId)

  for (const recipientId of recipientIds) {
    await notifyUser({
      userId: recipientId,
      type: `transaction.${newStatus}` as NotificationType,
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
  await notifyUser({
    userId: params.creatorId,
    type: "offer.accepted",
    title: "Offer Accepted!",
    message: `Your offer "${params.title}" (${params.currency} ${params.amount}) was accepted.`,
    referenceType: "transaction",
    referenceId: params.transactionId,
  })
}

export async function notifyDisputeUpdate(params: {
  disputeId: string
  transactionId: string
  recipientId: string
  type: "message" | "resolved" | "opened"
  message: string
}) {
  const typeMap: Record<string, NotificationType> = {
    message: "dispute.message",
    resolved: "dispute.resolved",
    opened: "dispute.opened",
  }

  await notifyUser({
    userId: params.recipientId,
    type: typeMap[params.type] || "dispute.message",
    title: params.type === "resolved" ? "Dispute Resolved" : params.type === "opened" ? "Dispute Opened" : "New Dispute Message",
    message: params.message,
    referenceType: "dispute",
    referenceId: params.disputeId,
  })
}

export async function notifyMessageReceived(params: {
  recipientId: string
  senderName: string
  conversationId: string
  preview: string
}) {
  await notifyUser({
    userId: params.recipientId,
    type: "message.received",
    title: `New message from ${params.senderName}`,
    message: params.preview.length > 80 ? params.preview.slice(0, 77) + "..." : params.preview,
    referenceType: "conversation",
    referenceId: params.conversationId,
  })
}

export async function notifyTransactionMessage(params: {
  recipientId: string
  senderName: string
  transactionId: string
  transactionDesc: string
}) {
  await notifyUser({
    userId: params.recipientId,
    type: "message.transaction",
    title: `New message in "${params.transactionDesc}"`,
    message: `${params.senderName} sent a message in your transaction.`,
    referenceType: "transaction",
    referenceId: params.transactionId,
  })
}

export async function notifyWalletTopUp(params: {
  userId: string
  amount: number
  currency: string
}) {
  await notifyUser({
    userId: params.userId,
    type: "wallet.topup",
    title: "Wallet Top-Up Complete",
    message: `${params.currency} ${params.amount.toFixed(2)} has been added to your wallet.`,
    referenceType: "wallet",
    referenceId: params.userId,
  })
}
