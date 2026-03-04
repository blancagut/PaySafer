'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SavingsGoal {
  id: string
  user_id: string
  name: string
  icon_id: string
  target_amount: number
  current_amount: number
  currency: string
  deadline: string | null
  auto_save_amount: number | null
  is_paused: boolean
  created_at: string
  updated_at: string
}

export async function getSavingsGoals(): Promise<{
  data?: SavingsGoal[]
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: data as SavingsGoal[] }
}

export async function createSavingsGoal(params: {
  name: string
  icon_id: string
  target_amount: number
  deadline?: string
  auto_save_amount?: number
  currency?: string
}): Promise<{ data?: SavingsGoal; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('savings_goals')
    .insert({
      user_id: user.id,
      name: params.name,
      icon_id: params.icon_id,
      target_amount: params.target_amount,
      currency: params.currency ?? 'USD',
      deadline: params.deadline ?? null,
      auto_save_amount: params.auto_save_amount ?? null,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/savings')
  return { data: data as SavingsGoal }
}

export async function addFundsToGoal(
  goalId: string,
  amount: number
): Promise<{ data?: SavingsGoal; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  // Fetch goal to verify ownership + current state
  const { data: goal, error: fetchErr } = await supabase
    .from('savings_goals')
    .select('id, current_amount, target_amount, user_id')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !goal) return { error: 'Goal not found' }
  if (amount <= 0) return { error: 'Amount must be greater than zero' }

  const newAmount = Math.min(
    parseFloat((goal.current_amount + amount).toFixed(2)),
    goal.target_amount
  )

  const { data, error } = await supabase
    .from('savings_goals')
    .update({ current_amount: newAmount })
    .eq('id', goalId)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/savings')
  return { data: data as SavingsGoal }
}

export async function withdrawFromGoal(
  goalId: string,
  amount: number
): Promise<{ data?: SavingsGoal; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { data: goal, error: fetchErr } = await supabase
    .from('savings_goals')
    .select('id, current_amount, user_id')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !goal) return { error: 'Goal not found' }
  if (amount <= 0) return { error: 'Amount must be greater than zero' }
  if (amount > goal.current_amount) return { error: 'Insufficient saved amount' }

  const { data, error } = await supabase
    .from('savings_goals')
    .update({ current_amount: parseFloat((goal.current_amount - amount).toFixed(2)) })
    .eq('id', goalId)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/savings')
  return { data: data as SavingsGoal }
}

export async function toggleGoalPause(
  goalId: string
): Promise<{ data?: SavingsGoal; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { data: goal, error: fetchErr } = await supabase
    .from('savings_goals')
    .select('id, is_paused, user_id')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !goal) return { error: 'Goal not found' }

  const { data, error } = await supabase
    .from('savings_goals')
    .update({ is_paused: !goal.is_paused })
    .eq('id', goalId)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/savings')
  return { data: data as SavingsGoal }
}

export async function deleteSavingsGoal(
  goalId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('savings_goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/savings')
  return {}
}
