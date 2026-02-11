"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Save a push subscription for the current user.
 */
export async function savePushSubscription(subscription: {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: "user_id,endpoint" }
    )

  return { error: error?.message }
}

/**
 * Remove a push subscription (when permission is revoked).
 */
export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint)

  return { error: error?.message }
}
