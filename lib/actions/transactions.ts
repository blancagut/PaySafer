'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { insertSystemMessage } from './transaction-messages'
import { notifyTransactionStatusChange } from './notifications'

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

// ─── Volume Chart Data (real aggregated data for dashboard) ───
export async function getVolumeChartData(days: number = 30) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount, currency, buyer_id, seller_id, created_at, status')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }

  // Build day-by-day map
  const dayMap: Record<string, { inflow: number; outflow: number }> = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    dayMap[key] = { inflow: 0, outflow: 0 }
  }

  for (const txn of transactions || []) {
    const key = new Date(txn.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!dayMap[key]) continue
    const amount = Number(txn.amount)
    if (txn.buyer_id === user.id) {
      dayMap[key].outflow += amount // Money sent out (buyer paying)
    }
    if (txn.seller_id === user.id) {
      dayMap[key].inflow += amount // Money received (seller earning)
    }
  }

  const data = Object.entries(dayMap).map(([date, vals]) => ({
    date,
    inflow: Math.round(vals.inflow * 100) / 100,
    outflow: Math.round(vals.outflow * 100) / 100,
  }))

  return { data }
}

// ─── Status Distribution (real counts for bar chart) ───
export async function getStatusDistribution() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('status')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

  if (error) return { error: error.message }

  const statusMap: Record<string, number> = {}
  for (const txn of transactions || []) {
    statusMap[txn.status] = (statusMap[txn.status] || 0) + 1
  }

  const fillColors: Record<string, string> = {
    in_escrow: 'hsl(200, 80%, 55%)',
    delivered: 'hsl(180, 70%, 45%)',
    released: 'hsl(160, 84%, 45%)',
    dispute: 'hsl(0, 72%, 55%)',
    awaiting_payment: 'hsl(45, 90%, 55%)',
    cancelled: 'hsl(215, 15%, 45%)',
    draft: 'hsl(215, 15%, 35%)',
  }

  const labelMap: Record<string, string> = {
    in_escrow: 'Escrow',
    delivered: 'Delivered',
    released: 'Released',
    dispute: 'Disputed',
    awaiting_payment: 'Pending',
    cancelled: 'Cancelled',
    draft: 'Draft',
  }

  const data = Object.entries(statusMap)
    .filter(([, count]) => count > 0)
    .map(([status, value]) => ({
      name: labelMap[status] || status,
      value,
      fill: fillColors[status] || 'hsl(215, 15%, 55%)',
    }))
    .sort((a, b) => b.value - a.value)

  return { data }
}

// ─── Trend Stats (compare current month vs previous month) ───
export async function getTrendStats() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('status, amount, created_at, buyer_id, seller_id')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .gte('created_at', startOfLastMonth.toISOString())

  if (error) return { error: error.message }

  const thisMonth = (transactions || []).filter(t => new Date(t.created_at) >= startOfThisMonth)
  const lastMonth = (transactions || []).filter(t => {
    const d = new Date(t.created_at)
    return d >= startOfLastMonth && d < startOfThisMonth
  })

  function pctChange(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const activeStatuses = ['awaiting_payment', 'in_escrow', 'delivered']
  const thisActive = thisMonth.filter(t => activeStatuses.includes(t.status)).length
  const lastActive = lastMonth.filter(t => activeStatuses.includes(t.status)).length

  const thisCompleted = thisMonth.filter(t => t.status === 'released').length
  const lastCompleted = lastMonth.filter(t => t.status === 'released').length

  const thisDisputes = thisMonth.filter(t => t.status === 'dispute').length
  const lastDisputes = lastMonth.filter(t => t.status === 'dispute').length

  // Total volume = sum of all transaction amounts the user is involved in
  const allTxns = transactions || []
  const totalVolume = allTxns.reduce((sum, t) => sum + Number(t.amount), 0)

  return {
    data: {
      activeEscrows: pctChange(thisActive, lastActive),
      completed: pctChange(thisCompleted, lastCompleted),
      disputes: pctChange(thisDisputes, lastDisputes),
      totalVolume,
    }
  }
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

  // Notify buyer
  await notifyTransactionStatusChange({
    transactionId: id,
    buyerId: txn.buyer_id,
    sellerId: txn.seller_id,
    newStatus: 'delivered',
    description: txn.description,
    amount: Number(txn.amount),
    currency: txn.currency,
    actorId: user.id,
  })

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

  // Notify seller
  await notifyTransactionStatusChange({
    transactionId: id,
    buyerId: txn.buyer_id,
    sellerId: txn.seller_id,
    newStatus: 'released',
    description: txn.description,
    amount: Number(txn.amount),
    currency: txn.currency,
    actorId: user.id,
  })

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

  // Notify the other party
  await notifyTransactionStatusChange({
    transactionId: id,
    buyerId: txn.buyer_id,
    sellerId: txn.seller_id,
    newStatus: 'cancelled',
    description: txn.description,
    amount: Number(txn.amount),
    currency: txn.currency,
    actorId: user.id,
  })

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

  // Notify other party about the dispute
  await notifyTransactionStatusChange({
    transactionId: id,
    buyerId: txn.buyer_id,
    sellerId: txn.seller_id,
    newStatus: 'dispute',
    description: txn.description,
    amount: Number(txn.amount),
    currency: txn.currency,
    actorId: user.id,
  })

  revalidatePath(`/transactions/${id}`)
  revalidatePath('/transactions')
  return { data }
}
