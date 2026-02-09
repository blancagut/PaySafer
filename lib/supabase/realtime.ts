"use client"

import { useEffect, useRef, useCallback } from "react"
import { createClient } from "./client"
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js"

type SubscribableTable =
  | "transactions"
  | "disputes"
  | "dispute_messages"
  | "notifications"
  | "offers"
  | "support_messages"
  | "support_tickets"

type PostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*"

interface RealtimeSubscriptionOptions<T extends Record<string, unknown>> {
  table: SubscribableTable
  event?: PostgresEvent
  filter?: string
  onData: (payload: RealtimePostgresChangesPayload<T>) => void
  enabled?: boolean
}

/**
 * Subscribe to real-time Postgres changes on any table.
 * Automatically manages channel lifecycle on mount/unmount.
 *
 * @example
 * useRealtimeSubscription({
 *   table: "transactions",
 *   filter: `buyer_id=eq.${userId}`,
 *   onData: (payload) => { ... }
 * })
 */
export function useRealtimeSubscription<T extends Record<string, unknown>>({
  table,
  event = "*",
  filter,
  onData,
  enabled = true,
}: RealtimeSubscriptionOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbackRef = useRef(onData)
  callbackRef.current = onData

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    const channelName = `realtime:${table}:${filter || "all"}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channelConfig: any = {
      event,
      schema: "public",
      table,
    }
    if (filter) {
      channelConfig.filter = filter
    }

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", channelConfig, (payload: RealtimePostgresChangesPayload<T>) => {
        callbackRef.current(payload)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [table, event, filter, enabled])

  return channelRef
}

/**
 * Subscribe to user-specific notifications in real-time.
 */
export function useNotificationSubscription(
  userId: string | undefined,
  onNotification: (notification: Record<string, unknown>) => void
) {
  return useRealtimeSubscription({
    table: "notifications",
    event: "INSERT",
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onData: (payload) => {
      if (payload.new && typeof payload.new === "object") {
        onNotification(payload.new as Record<string, unknown>)
      }
    },
    enabled: !!userId,
  })
}

/**
 * Subscribe to transaction updates for a specific user (buyer or seller).
 */
export function useTransactionSubscription(
  userId: string | undefined,
  onUpdate: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
) {
  // We subscribe to all transaction changes since Supabase realtime
  // filters support single column. The callback filters client-side.
  return useRealtimeSubscription({
    table: "transactions",
    event: "UPDATE",
    onData: (payload) => {
      const record = (payload.new || {}) as Record<string, unknown>
      if (record.buyer_id === userId || record.seller_id === userId) {
        onUpdate(payload)
      }
    },
    enabled: !!userId,
  })
}

/**
 * Subscribe to dispute messages for a specific dispute.
 */
export function useDisputeMessagesSubscription(
  disputeId: string | undefined,
  onMessage: (message: Record<string, unknown>) => void
) {
  return useRealtimeSubscription({
    table: "dispute_messages",
    event: "INSERT",
    filter: disputeId ? `dispute_id=eq.${disputeId}` : undefined,
    onData: (payload) => {
      if (payload.new && typeof payload.new === "object") {
        onMessage(payload.new as Record<string, unknown>)
      }
    },
    enabled: !!disputeId,
  })
}

/**
 * Imperative channel creation for one-off subscriptions outside React.
 */
export function createRealtimeChannel(
  table: SubscribableTable,
  event: PostgresEvent = "*",
  filter?: string
) {
  const supabase = createClient()
  const channelName = `realtime:${table}:${Date.now()}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelConfig: any = {
    event,
    schema: "public",
    table,
  }
  if (filter) channelConfig.filter = filter

  return {
    subscribe: (callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void) => {
      const channel = supabase
        .channel(channelName)
        .on("postgres_changes", channelConfig, callback)
        .subscribe()
      return () => supabase.removeChannel(channel)
    },
  }
}

/**
 * Subscribe to support chat messages for a specific ticket.
 */
export function useSupportChatSubscription(
  ticketId: string | undefined,
  onMessage: (message: Record<string, unknown>) => void
) {
  return useRealtimeSubscription({
    table: "support_messages",
    event: "INSERT",
    filter: ticketId ? `ticket_id=eq.${ticketId}` : undefined,
    onData: (payload) => {
      if (payload.new && typeof payload.new === "object") {
        onMessage(payload.new as Record<string, unknown>)
      }
    },
    enabled: !!ticketId,
  })
}
