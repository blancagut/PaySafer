'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { insertSystemMessage } from './transaction-messages'

// Lazy import to avoid circular dependency
async function creditWallet(userId: string, amount: number, transactionId: string) {
  const admin = createAdminClient()
  try {
    await admin.rpc('credit_wallet', {
      p_user_id: userId,
      p_amount: amount,
      p_type: 'escrow_release',
      p_reference_type: 'escrow',
      p_reference_id: transactionId,
      p_description: 'Escrow funds released',
      p_metadata: { transaction_id: transactionId },
    })
  } catch (err) {
    console.error('[escrow] Failed to credit seller wallet:', err)
  }
}

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

// ============================================================================
// ROLE-ENFORCED LIFECYCLE ACTIONS
// ============================================================================

/**
 * Mark transaction as delivered — seller only, in_escrow → delivered
 */
export async function markDelivered(id: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  // Use admin to read (seller may not see awaiting_payment via RLS)
  const admin = createAdminClient()
  const { data: txn } = await admin
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (!txn) return { error: 'Transaction not found' }
  if (txn.seller_id !== user.id) return { error: 'Only the seller can mark delivery' }
  if (txn.status !== 'in_escrow') return { error: 'Transaction must be in escrow' }

  const { data, error } = await admin
    .from('transactions')
    .update({
      status: 'delivered',
      delivered_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'in_escrow')
    .select()
    .single()

  if (error) return { error: error.message }

  await insertSystemMessage(id, 'Seller has marked this transaction as delivered. Buyer, please inspect and confirm.', 'milestone', { event: 'delivery_submitted' })

  revalidatePath(`/transactions/${id}`)
  revalidatePath('/transactions')
  return { data }
}

/**
 * Confirm delivery and release funds — buyer only, delivered → released
 */
export async function confirmAndRelease(id: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: txn } = await admin
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (!txn) return { error: 'Transaction not found' }
  if (txn.buyer_id !== user.id) return { error: 'Only the buyer can release funds' }
  if (txn.status !== 'delivered') return { error: 'Delivery must be confirmed first' }

  const { data, error } = await admin
    .from('transactions')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'delivered')
    .select()
    .single()

  if (error) return { error: error.message }

  await insertSystemMessage(id, 'Buyer has confirmed delivery. Funds have been released to the seller. Transaction complete!', 'milestone', { event: 'funds_released' })

  // Credit seller's wallet with the escrow amount
  await creditWallet(txn.seller_id, Number(txn.amount), id)

  revalidatePath(`/transactions/${id}`)
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/wallet')
  return { data }
}

/**
 * Cancel transaction — buyer only, awaiting_payment → cancelled
 */
export async function cancelTransaction(id: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: txn } = await admin
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (!txn) return { error: 'Transaction not found' }
  if (txn.buyer_id !== user.id && txn.seller_id !== user.id) {
    return { error: 'Access denied' }
  }
  if (!['awaiting_payment', 'draft'].includes(txn.status)) {
    return { error: 'Can only cancel before payment' }
  }

  const { data, error } = await admin
    .from('transactions')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  await insertSystemMessage(id, `Transaction cancelled${reason ? `: ${reason}` : '.'} `, 'system', { event: 'cancelled' })

  revalidatePath(`/transactions/${id}`)
  revalidatePath('/transactions')
  return { data }
}

/**
 * Open dispute — either party, in_escrow or delivered → dispute
 */
export async function openDispute(id: string, reason: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: txn } = await admin
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (!txn) return { error: 'Transaction not found' }
  if (txn.buyer_id !== user.id && txn.seller_id !== user.id) {
    return { error: 'Access denied' }
  }
  if (!['in_escrow', 'delivered'].includes(txn.status)) {
    return { error: 'Can only dispute during escrow or delivery inspection' }
  }

  const { data, error } = await admin
    .from('transactions')
    .update({ status: 'dispute' })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  const role = txn.buyer_id === user.id ? 'Buyer' : 'Seller'
  await insertSystemMessage(id, `${role} has opened a dispute: "${reason}". An admin will review this case.`, 'system', { event: 'dispute_opened', reason, opened_by: user.id })

  revalidatePath(`/transactions/${id}`)
  revalidatePath('/transactions')
  return { data }
}
