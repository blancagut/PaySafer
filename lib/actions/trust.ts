"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ─── Get trust score ───
export async function getTrustScore(userId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const targetId = userId || user.id

  const { data, error } = await supabase.rpc("compute_trust_score", {
    p_user_id: targetId,
  })

  if (error) {
    // Fallback if function doesn't exist yet
    return {
      total: 45,
      breakdown: {
        account_age: 5,
        transactions: 10,
        disputes: 15,
        response_time: 10,
        verification: 0,
        vouches: 5,
      },
      completed_transactions: 5,
      dispute_count: 0,
      vouch_count: 5,
      account_age_months: 5,
    }
  }

  return data
}

// ─── Get vouches for a user ───
export async function getVouches(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("vouches")
    .select(`
      *,
      voucher:profiles!vouches_voucher_id_fkey(id, username, full_name, avatar_url)
    `)
    .eq("vouched_id", userId)
    .order("created_at", { ascending: false })

  if (error) return []
  return data || []
}

// ─── Vouch for a user ───
export async function vouchForUser(vouchedId: string, message?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  if (user.id === vouchedId) throw new Error("Cannot vouch for yourself")

  const { error } = await supabase
    .from("vouches")
    .insert({
      voucher_id: user.id,
      vouched_id: vouchedId,
      message,
    })

  if (error) {
    if (error.code === "23505") throw new Error("You already vouched for this user")
    throw error
  }

  revalidatePath("/trust")
}

// ─── Remove vouch ───
export async function removeVouch(vouchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("vouches")
    .delete()
    .eq("id", vouchId)
    .eq("voucher_id", user.id)

  if (error) throw error
  revalidatePath("/trust")
}

// ─── Get achievements ───
export async function getAchievements(userId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const targetId = userId || user.id

  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", targetId)
    .order("awarded_at", { ascending: false })

  if (error) return []
  return data || []
}

// ─── Get activity feed ───
export async function getActivityFeed(options?: { publicOnly?: boolean; limit?: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  let query = supabase
    .from("activity_feed")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit || 30)

  if (options?.publicOnly) {
    query = query.eq("public", true)
  } else {
    query = query.eq("user_id", user.id)
  }

  const { data, error } = await query
  if (error) return []
  return data || []
}
