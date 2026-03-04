'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ───

export interface UserSubscription {
  id: string
  user_id: string
  name: string
  category: string
  amount: number
  currency: string
  billing_cycle: 'monthly' | 'yearly'
  next_billing: string | null
  status: 'active' | 'paused' | 'trial' | 'expiring' | 'cancelled'
  color: string
  start_date: string | null
  created_at: string
}

// ─── Get all subscriptions ───

export async function getSubscriptions(): Promise<{ data: UserSubscription[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { data: [], error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .order('next_billing', { ascending: true })

  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as UserSubscription[] }
}

// ─── Add subscription ───

export async function addSubscription(sub: {
  name: string
  category: string
  amount: number
  currency: string
  billing_cycle: 'monthly' | 'yearly'
  next_billing: string
  color: string
  start_date?: string
  status?: string
}): Promise<{ data?: UserSubscription; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: user.id,
      name: sub.name,
      category: sub.category,
      amount: sub.amount,
      currency: sub.currency,
      billing_cycle: sub.billing_cycle,
      next_billing: sub.next_billing,
      color: sub.color,
      start_date: sub.start_date ?? null,
      status: sub.status ?? 'active',
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/subscriptions')
  return { data: data as UserSubscription }
}

// ─── Toggle pause/resume ───

export async function toggleSubscriptionPause(subId: string): Promise<{ data?: UserSubscription; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: 'Not authenticated' }

  // Fetch current status
  const { data: current, error: fetchErr } = await supabase
    .from('user_subscriptions')
    .select('status')
    .eq('id', subId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !current) return { error: 'Subscription not found' }

  const newStatus = current.status === 'paused' ? 'active' : 'paused'

  const { data, error } = await supabase
    .from('user_subscriptions')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', subId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/subscriptions')
  return { data: data as UserSubscription }
}

// ─── Cancel subscription ───

export async function cancelSubscription(subId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', subId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/subscriptions')
  return { success: true }
}
