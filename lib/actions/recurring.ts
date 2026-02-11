"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ─── Get recurring payments ───
export async function getRecurringPayments() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("recurring_payments")
    .select(`
      *,
      recipient:profiles!recurring_payments_recipient_id_fkey(id, username, full_name, avatar_url),
      sender:profiles!recurring_payments_sender_id_fkey(id, username, full_name, avatar_url)
    `)
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order("next_execution", { ascending: true })

  if (error) throw error
  return data || []
}

// ─── Create recurring payment ───
export async function createRecurringPayment(params: {
  recipientId: string
  amount: number
  currency?: string
  frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"
  description?: string
  startDate?: string
  endDate?: string | null
  maxExecutions?: number | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  if (params.recipientId === user.id) {
    throw new Error("Cannot create recurring payment to yourself")
  }

  const nextExecution = params.startDate
    ? new Date(params.startDate).toISOString()
    : new Date().toISOString()

  const { data, error } = await supabase
    .from("recurring_payments")
    .insert({
      sender_id: user.id,
      recipient_id: params.recipientId,
      amount: params.amount,
      currency: params.currency || "EUR",
      frequency: params.frequency,
      description: params.description,
      next_execution: nextExecution,
      start_date: params.startDate || new Date().toISOString().split("T")[0],
      end_date: params.endDate || null,
      max_executions: params.maxExecutions || null,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath("/wallet/recurring")
  return data
}

// ─── Pause recurring payment ───
export async function pauseRecurringPayment(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("recurring_payments")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("sender_id", user.id)

  if (error) throw error
  revalidatePath("/wallet/recurring")
}

// ─── Resume recurring payment ───
export async function resumeRecurringPayment(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("recurring_payments")
    .update({
      status: "active",
      next_execution: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("sender_id", user.id)

  if (error) throw error
  revalidatePath("/wallet/recurring")
}

// ─── Cancel recurring payment ───
export async function cancelRecurringPayment(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("recurring_payments")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("sender_id", user.id)

  if (error) throw error
  revalidatePath("/wallet/recurring")
}

// ─── Get execution logs for a recurring payment ───
export async function getRecurringPaymentLogs(recurringId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("recurring_payment_logs")
    .select("*")
    .eq("recurring_id", recurringId)
    .order("executed_at", { ascending: false })
    .limit(20)

  if (error) throw error
  return data || []
}
