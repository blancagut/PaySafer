'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type TransactionStatus = 
  | 'draft'
  | 'awaiting_payment'
  | 'in_escrow'
  | 'delivered'
  | 'released'
  | 'cancelled'
  | 'dispute'

export interface Transaction {
  id: string
  description: string
  amount: number
  currency: string
  buyer_id: string
  seller_id: string | null
  seller_email: string
  status: TransactionStatus
  created_at: string
  paid_at: string | null
  delivered_at: string | null
  released_at: string | null
  updated_at: string
  metadata: any
}

// Get all transactions for current user
export async function getUserTransactions(filters?: {
  status?: TransactionStatus
  role?: 'buyer' | 'seller'
}) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  let query = supabase
    .from('transactions')
    .select('*')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.role === 'buyer') {
    query = query.eq('buyer_id', user.id)
  } else if (filters?.role === 'seller') {
    query = query.eq('seller_id', user.id)
  }

  const { data, error } = await query

  if (error) {
    return { error: error.message }
  }

  return { data }
}

// Get single transaction by ID
export async function getTransaction(id: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .single()

  if (error) {
    return { error: error.message }
  }

  return { data }
}

// Create a new transaction
export async function createTransaction(input: {
  description: string
  amount: number
  currency: string
  seller_email: string
}) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // Check if seller exists
  const { data: sellerProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', input.seller_email)
    .single()

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      buyer_id: user.id,
      seller_id: sellerProfile?.id || null,
      seller_email: input.seller_email,
      status: 'awaiting_payment',
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')

  return { data }
}

// Update transaction status
export async function updateTransactionStatus(
  id: string, 
  status: TransactionStatus
) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // Get transaction to verify access
  const { data: transaction, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .single()

  if (fetchError || !transaction) {
    return { error: 'Transaction not found or access denied' }
  }

  // Validate status transitions
  const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
    draft: ['awaiting_payment', 'cancelled'],
    awaiting_payment: ['in_escrow', 'cancelled'],
    in_escrow: ['delivered', 'dispute', 'cancelled'],
    delivered: ['released', 'dispute'],
    released: [],
    cancelled: [],
    dispute: ['released', 'cancelled'],
  }

  if (!validTransitions[transaction.status].includes(status)) {
    return { error: `Cannot transition from ${transaction.status} to ${status}` }
  }

  // Build update object with timestamps
  const updateData: any = { status }
  
  if (status === 'in_escrow' && !transaction.paid_at) {
    updateData.paid_at = new Date().toISOString()
  }
  if (status === 'delivered' && !transaction.delivered_at) {
    updateData.delivered_at = new Date().toISOString()
  }
  if (status === 'released' && !transaction.released_at) {
    updateData.released_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/transactions/${id}`)
  revalidatePath('/transactions')
  revalidatePath('/dashboard')

  return { data }
}

// Get transaction statistics
export async function getTransactionStats() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('status')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

  if (error) {
    return { error: error.message }
  }

  const stats = {
    active: transactions.filter(t => ['awaiting_payment', 'in_escrow', 'delivered'].includes(t.status)).length,
    completed: transactions.filter(t => t.status === 'released').length,
    disputes: transactions.filter(t => t.status === 'dispute').length,
    total: transactions.length,
  }

  return { data: stats }
}
