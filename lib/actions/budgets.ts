'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'

export interface Budget {
  id: string
  user_id: string
  category_id: string
  limit_amount: number
  month: string     // 'YYYY-MM'
  spent: number     // computed from wallet_transactions
  created_at: string
  updated_at: string
}

export async function getBudgets(month?: string): Promise<{
  data?: Budget[]
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const targetMonth = month ?? format(new Date(), 'yyyy-MM')

  // ── Fetch budget rows ──
  const { data: budgetRows, error: budgetErr } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', targetMonth)
    .order('created_at', { ascending: true })

  if (budgetErr) return { error: budgetErr.message }

  // ── Compute actual spending from wallet_transactions ──
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const spendByCategory: Record<string, number> = {}

  if (wallet) {
    const [year, mon] = targetMonth.split('-').map(Number)
    const monthStart = `${targetMonth}-01`
    const monthEnd = new Date(year, mon, 1).toISOString()

    const { data: transactions } = await supabase
      .from('wallet_transactions')
      .select('amount, metadata')
      .eq('wallet_id', wallet.id)
      .eq('direction', 'debit')
      .gte('created_at', monthStart)
      .lt('created_at', monthEnd)
      .not('metadata', 'is', null)

    for (const txn of transactions ?? []) {
      const meta = txn.metadata as Record<string, unknown> | null
      const cat = meta?.budget_category as string | undefined
      if (cat) {
        spendByCategory[cat] = (spendByCategory[cat] ?? 0) + Number(txn.amount)
      }
    }
  }

  const budgets: Budget[] = (budgetRows ?? []).map((row) => ({
    ...row,
    limit_amount: Number(row.limit_amount),
    spent: parseFloat((spendByCategory[row.category_id] ?? 0).toFixed(2)),
  }))

  return { data: budgets }
}

export async function createBudget(params: {
  category_id: string
  limit_amount: number
  month?: string
}): Promise<{ data?: Budget; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const month = params.month ?? format(new Date(), 'yyyy-MM')

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      user_id: user.id,
      category_id: params.category_id,
      limit_amount: params.limit_amount,
      month,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'A budget already exists for this category this month' }
    }
    return { error: error.message }
  }

  revalidatePath('/budgets')
  return { data: { ...data, limit_amount: Number(data.limit_amount), spent: 0 } as Budget }
}

export async function updateBudget(
  budgetId: string,
  limitAmount: number
): Promise<{ data?: Budget; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('budgets')
    .update({ limit_amount: limitAmount })
    .eq('id', budgetId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/budgets')
  return { data: { ...data, limit_amount: Number(data.limit_amount), spent: 0 } as Budget }
}

export async function deleteBudget(
  budgetId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', budgetId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/budgets')
  return {}
}
