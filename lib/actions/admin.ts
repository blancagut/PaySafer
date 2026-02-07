'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// =============================================================================
// TYPES
// =============================================================================

export type TransactionStatus =
  | 'draft'
  | 'awaiting_payment'
  | 'in_escrow'
  | 'delivered'
  | 'released'
  | 'cancelled'
  | 'dispute'

export interface AdminTransactionFilters {
  status?: TransactionStatus
  search?: string
  minAmount?: number
  maxAmount?: number
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  sortBy?: 'created_at' | 'amount' | 'status' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

export interface AdminDisputeFilters {
  status?: 'under_review' | 'resolved' | 'closed'
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export interface AdminUserFilters {
  search?: string
  role?: 'user' | 'admin'
  page?: number
  pageSize?: number
}

export interface AdminAuditLogFilters {
  eventType?: string
  actorId?: string
  targetTable?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

// =============================================================================
// AUTH CHECK
// =============================================================================

/** Verify current user is an admin. Returns user data or error. */
export async function verifyAdmin() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Not authenticated', user: null }
  }

  // Check admin role via profiles table (matches is_admin() RLS function)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    return { error: 'Access denied: admin privileges required', user: null }
  }

  return { error: null, user: { ...user, profile } }
}

// =============================================================================
// DASHBOARD STATS (real aggregates)
// =============================================================================

export async function getAdminStats() {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  const supabase = await createClient()

  // Parallel queries for stats
  const [
    profilesResult,
    transactionsResult,
    disputesResult,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('transactions').select('id, status, amount'),
    supabase.from('disputes').select('id, status', { count: 'exact' }),
  ])

  const transactions = transactionsResult.data || []
  const disputes = disputesResult.data || []

  const activeStatuses: TransactionStatus[] = ['awaiting_payment', 'in_escrow', 'delivered']
  const activeTransactions = transactions.filter(t => activeStatuses.includes(t.status as TransactionStatus))
  const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const escrowVolume = transactions
    .filter(t => t.status === 'in_escrow')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)

  const activeDisputes = disputes.filter(d => d.status === 'under_review').length
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved').length

  return {
    data: {
      totalUsers: profilesResult.count || 0,
      totalTransactions: transactions.length,
      activeTransactions: activeTransactions.length,
      totalVolume,
      escrowVolume,
      activeDisputes,
      resolvedDisputes,
      totalDisputes: disputes.length,
    }
  }
}

// =============================================================================
// TRANSACTIONS (paginated, filtered, sorted)
// =============================================================================

export async function getAdminTransactions(filters: AdminTransactionFilters = {}) {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  const supabase = await createClient()

  const page = filters.page || 1
  const pageSize = Math.min(filters.pageSize || 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('transactions')
    .select(`
      *,
      buyer:profiles!transactions_buyer_id_fkey(id, email, full_name),
      seller:profiles!transactions_seller_id_fkey(id, email, full_name)
    `, { count: 'exact' })

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.minAmount !== undefined && filters.minAmount > 0) {
    query = query.gte('amount', filters.minAmount)
  }
  if (filters.maxAmount !== undefined && filters.maxAmount > 0) {
    query = query.lte('amount', filters.maxAmount)
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }
  if (filters.search) {
    query = query.or(`description.ilike.%${filters.search}%,seller_email.ilike.%${filters.search}%`)
  }

  // Sort
  const sortBy = filters.sortBy || 'created_at'
  const sortOrder = filters.sortOrder === 'asc' ? true : false
  query = query.order(sortBy, { ascending: sortOrder })

  // Paginate
  query = query.range(from, to)

  const { data, error: queryError, count } = await query

  if (queryError) {
    return { error: queryError.message }
  }

  return {
    data: data || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    }
  }
}

// =============================================================================
// DISPUTES (paginated, filtered)
// =============================================================================

export async function getAdminDisputes(filters: AdminDisputeFilters = {}) {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  const supabase = await createClient()

  const page = filters.page || 1
  const pageSize = Math.min(filters.pageSize || 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('disputes')
    .select(`
      *,
      transaction:transactions(*),
      opener:profiles!disputes_opened_by_fkey(id, email, full_name)
    `, { count: 'exact' })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.search) {
    query = query.or(`reason.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  query = query.order('created_at', { ascending: false })
  query = query.range(from, to)

  const { data, error: queryError, count } = await query

  if (queryError) {
    return { error: queryError.message }
  }

  return {
    data: data || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    }
  }
}

// =============================================================================
// USERS (paginated, filtered)
// =============================================================================

export async function getAdminUsers(filters: AdminUserFilters = {}) {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  const supabase = await createClient()

  const page = filters.page || 1
  const pageSize = Math.min(filters.pageSize || 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })

  if (filters.search) {
    query = query.or(`email.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%`)
  }
  if (filters.role) {
    query = query.eq('role', filters.role)
  }

  query = query.order('created_at', { ascending: false })
  query = query.range(from, to)

  const { data, error: queryError, count } = await query

  if (queryError) {
    return { error: queryError.message }
  }

  return {
    data: data || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    }
  }
}

// =============================================================================
// AUDIT LOGS (paginated, filtered — admin only, append-only)
// =============================================================================

export async function getAdminAuditLogs(filters: AdminAuditLogFilters = {}) {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  const supabase = await createClient()

  const page = filters.page || 1
  const pageSize = Math.min(filters.pageSize || 30, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })

  if (filters.eventType) {
    query = query.eq('event_type', filters.eventType)
  }
  if (filters.actorId) {
    query = query.eq('actor_id', filters.actorId)
  }
  if (filters.targetTable) {
    query = query.eq('target_table', filters.targetTable)
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  query = query.order('created_at', { ascending: false })
  query = query.range(from, to)

  const { data, error: queryError, count } = await query

  if (queryError) {
    return { error: queryError.message }
  }

  return {
    data: data || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    }
  }
}

// =============================================================================
// ADMIN ACTIONS — State Machine Aware
// =============================================================================

// Allowed admin transitions per the state machine:
// - dispute → released (rule in favor of seller → release funds)
// - dispute → cancelled (rule in favor of buyer → refund)
// - in_escrow → cancelled (admin forced refund for fraud/non-delivery)
// - in_escrow → released is NOT allowed (must go through delivered first)

const ADMIN_ALLOWED_TRANSITIONS: Record<string, TransactionStatus[]> = {
  'in_escrow': ['cancelled'],        // Admin force-refund
  'delivered': ['released'],          // Admin confirm release
  'dispute': ['released', 'cancelled'], // Admin resolve dispute
}

const TERMINAL_STATES: TransactionStatus[] = ['released', 'cancelled']

/** Returns which actions the admin can take on a given transaction status */
export function getAdminAllowedActions(status: TransactionStatus): TransactionStatus[] {
  return ADMIN_ALLOWED_TRANSITIONS[status] || []
}

/** Write audit log entry */
async function writeAuditLog(params: {
  eventType: string
  actorId: string
  actorRole: string
  targetTable: string
  targetId: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
}) {
  const supabase = await createClient()

  await supabase.from('audit_logs').insert({
    event_type: params.eventType,
    actor_id: params.actorId,
    actor_role: params.actorRole,
    target_table: params.targetTable,
    target_id: params.targetId,
    old_values: params.oldValues || null,
    new_values: params.newValues || null,
  })
}

/** Admin: Release funds to seller (from delivered or dispute state) */
export async function adminReleaseTransaction(transactionId: string, reason?: string) {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  const supabase = await createClient()

  // Fetch transaction
  const { data: transaction, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (fetchError || !transaction) {
    return { error: 'Transaction not found' }
  }

  // Validate state transition
  const allowed = ADMIN_ALLOWED_TRANSITIONS[transaction.status]
  if (!allowed || !allowed.includes('released')) {
    return { error: `Cannot release from "${transaction.status}" state. Only allowed from: delivered, dispute.` }
  }

  // Perform update
  const { data: updated, error: updateError } = await supabase
    .from('transactions')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
      metadata: {
        ...(transaction.metadata || {}),
        admin_action: 'release',
        admin_reason: reason || 'Admin released funds',
        admin_actor: user.id,
        admin_action_at: new Date().toISOString(),
      }
    })
    .eq('id', transactionId)
    .select()
    .single()

  if (updateError) {
    return { error: updateError.message }
  }

  // If this was a disputed transaction, also resolve the dispute
  if (transaction.status === 'dispute') {
    await supabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolution: reason || 'Admin released funds to seller',
        resolved_by: 'admin',
        resolved_at: new Date().toISOString(),
      })
      .eq('transaction_id', transactionId)
      .eq('status', 'under_review')
  }

  // Audit log
  await writeAuditLog({
    eventType: 'admin.transaction.release',
    actorId: user.id,
    actorRole: 'admin',
    targetTable: 'transactions',
    targetId: transactionId,
    oldValues: { status: transaction.status },
    newValues: { status: 'released', reason: reason || 'Admin released funds' },
  })

  revalidatePath('/admin')
  revalidatePath('/transactions')
  revalidatePath(`/transactions/${transactionId}`)

  return { data: updated }
}

/** Admin: Refund/cancel transaction (from in_escrow or dispute state) */
export async function adminRefundTransaction(transactionId: string, reason?: string) {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  const supabase = await createClient()

  // Fetch transaction
  const { data: transaction, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (fetchError || !transaction) {
    return { error: 'Transaction not found' }
  }

  // Validate state transition
  const allowed = ADMIN_ALLOWED_TRANSITIONS[transaction.status]
  if (!allowed || !allowed.includes('cancelled')) {
    return { error: `Cannot refund from "${transaction.status}" state. Only allowed from: in_escrow, dispute.` }
  }

  // Perform update
  const { data: updated, error: updateError } = await supabase
    .from('transactions')
    .update({
      status: 'cancelled',
      metadata: {
        ...(transaction.metadata || {}),
        admin_action: 'refund',
        admin_reason: reason || 'Admin refunded transaction',
        admin_actor: user.id,
        admin_action_at: new Date().toISOString(),
      }
    })
    .eq('id', transactionId)
    .select()
    .single()

  if (updateError) {
    return { error: updateError.message }
  }

  // If this was a disputed transaction, also resolve the dispute
  if (transaction.status === 'dispute') {
    await supabase
      .from('disputes')
      .update({
        status: 'resolved',
        resolution: reason || 'Admin refunded to buyer',
        resolved_by: 'admin',
        resolved_at: new Date().toISOString(),
      })
      .eq('transaction_id', transactionId)
      .eq('status', 'under_review')
  }

  // Audit log
  await writeAuditLog({
    eventType: 'admin.transaction.refund',
    actorId: user.id,
    actorRole: 'admin',
    targetTable: 'transactions',
    targetId: transactionId,
    oldValues: { status: transaction.status },
    newValues: { status: 'cancelled', reason: reason || 'Admin refunded transaction' },
  })

  revalidatePath('/admin')
  revalidatePath('/transactions')
  revalidatePath(`/transactions/${transactionId}`)

  return { data: updated }
}

/** Admin: Resolve a dispute */
export async function adminResolveDispute(
  disputeId: string,
  resolution: 'release_to_seller' | 'refund_to_buyer',
  reason: string
) {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  const supabase = await createClient()

  // Fetch dispute with transaction
  const { data: dispute, error: fetchError } = await supabase
    .from('disputes')
    .select('*, transaction:transactions(*)')
    .eq('id', disputeId)
    .single()

  if (fetchError || !dispute) {
    return { error: 'Dispute not found' }
  }

  if (dispute.status !== 'under_review') {
    return { error: `Dispute is already ${dispute.status}. Cannot resolve again.` }
  }

  const transaction = dispute.transaction as any
  if (!transaction) {
    return { error: 'Associated transaction not found' }
  }

  // Apply resolution to transaction
  if (resolution === 'release_to_seller') {
    const result = await adminReleaseTransaction(transaction.id, reason)
    if (result.error) return result
  } else {
    const result = await adminRefundTransaction(transaction.id, reason)
    if (result.error) return result
  }

  // The dispute was already resolved in the release/refund functions above,
  // but update with the specific reason if not already done
  await supabase
    .from('disputes')
    .update({
      status: 'resolved',
      resolution: reason,
      resolved_by: 'admin',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', disputeId)

  // Audit log
  await writeAuditLog({
    eventType: 'admin.dispute.resolve',
    actorId: user.id,
    actorRole: 'admin',
    targetTable: 'disputes',
    targetId: disputeId,
    oldValues: { status: 'under_review' },
    newValues: { status: 'resolved', resolution, reason },
  })

  revalidatePath('/admin')
  revalidatePath('/disputes')
  revalidatePath(`/disputes/${disputeId}`)

  return { data: { success: true } }
}
