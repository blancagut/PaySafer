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

export type DisputeResolution =
  | 'release_to_seller'
  | 'refund_to_buyer'
  | 'hold_funds'
  | 'ban_both_hold'
  | 'escalate_authorities'

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
export async function getAdminAllowedActions(status: TransactionStatus): Promise<TransactionStatus[]> {
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

/**
 * Admin: Resolve a dispute
 *
 * ONLY the super admin decides where funds go. Options:
 * - release_to_seller  → Release escrowed funds to seller
 * - refund_to_buyer    → Refund escrowed funds to buyer
 * - hold_funds         → Keep funds frozen in platform until further notice
 * - ban_both_hold      → Ban both parties + freeze funds (suspected money laundering)
 * - escalate_authorities → Freeze funds + flag for law enforcement / compliance
 */
export async function adminResolveDispute(
  disputeId: string,
  resolution: DisputeResolution,
  reason: string
) {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  if (!reason.trim()) return { error: 'Reason is required for all dispute actions' }

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
    return { error: `Dispute is already ${dispute.status}. Cannot act on it again.` }
  }

  const transaction = dispute.transaction as any
  if (!transaction) {
    return { error: 'Associated transaction not found' }
  }

  // ─── Apply resolution based on admin decision ───
  let disputeStatus: string = 'resolved'
  let resolutionLabel = resolution

  switch (resolution) {
    case 'release_to_seller': {
      const result = await adminReleaseTransaction(transaction.id, reason)
      if (result.error) return result
      break
    }
    case 'refund_to_buyer': {
      const result = await adminRefundTransaction(transaction.id, reason)
      if (result.error) return result
      break
    }
    case 'hold_funds': {
      // Funds stay in escrow/dispute — transaction status remains "dispute".
      // No money moves. Admin will decide later.
      disputeStatus = 'closed'
      break
    }
    case 'ban_both_hold': {
      // Ban both buyer and seller, freeze funds
      if (transaction.buyer_id) await adminBanUser(transaction.buyer_id, `Banned: dispute ${disputeId} — ${reason}`)
      if (transaction.seller_id) await adminBanUser(transaction.seller_id, `Banned: dispute ${disputeId} — ${reason}`)
      disputeStatus = 'closed'
      break
    }
    case 'escalate_authorities': {
      // Freeze everything, flag for law enforcement
      if (transaction.buyer_id) await adminBanUser(transaction.buyer_id, `Escalated to authorities: dispute ${disputeId}`)
      if (transaction.seller_id) await adminBanUser(transaction.seller_id, `Escalated to authorities: dispute ${disputeId}`)
      disputeStatus = 'closed'
      break
    }
  }

  // Update dispute record
  await supabase
    .from('disputes')
    .update({
      status: disputeStatus,
      resolution: `[${resolution}] ${reason}`,
      resolved_by: 'admin',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', disputeId)

  // Audit log
  await writeAuditLog({
    eventType: `admin.dispute.${resolution}`,
    actorId: user.id,
    actorRole: 'admin',
    targetTable: 'disputes',
    targetId: disputeId,
    oldValues: { status: 'under_review', transaction_status: transaction.status },
    newValues: { status: disputeStatus, resolution, reason, transaction_id: transaction.id },
  })

  revalidatePath('/admin')
  revalidatePath('/disputes')
  revalidatePath(`/disputes/${disputeId}`)

  return { data: { success: true, resolution } }
}

/**
 * Admin: Ban a user (set role to 'banned')
 * Banned users cannot log in or perform any actions.
 * Used for fraud, money laundering, or compliance violations.
 */
// Super admin email — this account can NEVER be banned or demoted
const SUPER_ADMIN_EMAIL = 'renzocarlosme@gmail.com'

export async function adminBanUser(userId: string, reason?: string) {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  if (userId === user.id) return { error: 'Cannot ban yourself' }

  const supabase = await createClient()

  // Get current profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .single()

  if (!profile) return { error: 'User not found' }
  if (profile.email === SUPER_ADMIN_EMAIL) return { error: 'Cannot ban the super admin account' }
  if (profile.role === 'banned') return { error: 'User is already banned' }
  if (profile.role === 'admin') return { error: 'Cannot ban another admin. Demote them first.' }

  // Set role to banned
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'banned', updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateError) return { error: updateError.message }

  await writeAuditLog({
    eventType: 'admin.user.ban',
    actorId: user.id,
    actorRole: 'admin',
    targetTable: 'profiles',
    targetId: userId,
    oldValues: { role: profile.role },
    newValues: { role: 'banned', reason: reason || 'Admin banned user' },
  })

  revalidatePath('/admin')
  return { data: { success: true } }
}

/**
 * Admin: Unban a user (restore role to 'user')
 */
export async function adminUnbanUser(userId: string) {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!profile) return { error: 'User not found' }
  if (profile.role !== 'banned') return { error: 'User is not banned' }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'user', updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateError) return { error: updateError.message }

  await writeAuditLog({
    eventType: 'admin.user.unban',
    actorId: user.id,
    actorRole: 'admin',
    targetTable: 'profiles',
    targetId: userId,
    oldValues: { role: 'banned' },
    newValues: { role: 'user' },
  })

  revalidatePath('/admin')
  return { data: { success: true } }
}

// =============================================================================
// ADMIN: OFFERS (paginated)
// =============================================================================

export interface AdminOfferFilters {
  status?: 'pending' | 'accepted' | 'expired' | 'cancelled'
  search?: string
  page?: number
  pageSize?: number
}

export async function getAdminOffers(filters: AdminOfferFilters = {}) {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  const supabase = await createClient()

  const page = filters.page || 1
  const pageSize = Math.min(filters.pageSize || 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('offers')
    .select(`
      *,
      creator:profiles!offers_creator_id_fkey(id, email, full_name)
    `, { count: 'exact' })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  query = query.order('created_at', { ascending: false }).range(from, to)

  const { data, error: queryError, count } = await query
  if (queryError) return { error: queryError.message }

  return {
    data: data || [],
    pagination: { page, pageSize, total: count || 0, totalPages: Math.ceil((count || 0) / pageSize) },
  }
}

// =============================================================================
// ADMIN: USER MANAGEMENT (promote, demote, suspend)
// =============================================================================

export async function adminUpdateUserRole(userId: string, newRole: 'user' | 'admin') {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  if (userId === user.id) return { error: 'Cannot change your own role' }

  const supabase = await createClient()

  const { data: target, error: fetchErr } = await supabase
    .from('profiles')
    .select('id, role, email')
    .eq('id', userId)
    .single()

  if (fetchErr || !target) return { error: 'User not found' }
  if (target.email === SUPER_ADMIN_EMAIL && newRole !== 'admin') {
    return { error: 'Cannot demote the super admin account' }
  }

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateErr) return { error: updateErr.message }

  await writeAuditLog({
    eventType: `admin.user.${newRole === 'admin' ? 'promote' : 'demote'}`,
    actorId: user.id,
    actorRole: 'admin',
    targetTable: 'profiles',
    targetId: userId,
    oldValues: { role: target.role },
    newValues: { role: newRole },
  })

  revalidatePath('/admin')
  return { data: { success: true } }
}

export async function adminCancelOffer(offerId: string, reason?: string) {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  const supabase = await createClient()

  const { data: offer, error: fetchErr } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .single()

  if (fetchErr || !offer) return { error: 'Offer not found' }
  if (offer.status !== 'pending') return { error: `Cannot cancel offer in "${offer.status}" state` }

  const { error: updateErr } = await supabase
    .from('offers')
    .update({ status: 'cancelled' })
    .eq('id', offerId)

  if (updateErr) return { error: updateErr.message }

  await writeAuditLog({
    eventType: 'admin.offer.cancel',
    actorId: user.id,
    actorRole: 'admin',
    targetTable: 'offers',
    targetId: offerId,
    oldValues: { status: offer.status },
    newValues: { status: 'cancelled', reason: reason || 'Admin cancelled' },
  })

  revalidatePath('/admin')
  return { data: { success: true } }
}

/** Admin: Get platform-wide revenue metrics (aggregated from transactions) */
export async function getAdminRevenueMetrics() {
  const { error, user } = await verifyAdmin()
  if (error || !user) return { error: error || 'Not authorized' }

  const supabase = await createClient()

  const { data: txns, error: txnErr } = await supabase
    .from('transactions')
    .select('amount, status, currency, created_at')

  if (txnErr) return { error: txnErr.message }

  const all = txns || []
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000)

  const last30 = all.filter(t => new Date(t.created_at) >= thirtyDaysAgo)
  const prev30 = all.filter(t => {
    const d = new Date(t.created_at)
    return d >= sixtyDaysAgo && d < thirtyDaysAgo
  })

  const totalVolume = all.reduce((s, t) => s + Number(t.amount), 0)
  const last30Volume = last30.reduce((s, t) => s + Number(t.amount), 0)
  const prev30Volume = prev30.reduce((s, t) => s + Number(t.amount), 0)
  const volumeChange = prev30Volume > 0 ? ((last30Volume - prev30Volume) / prev30Volume) * 100 : 0

  const released = all.filter(t => t.status === 'released')
  const releasedVolume = released.reduce((s, t) => s + Number(t.amount), 0)
  const successRate = all.length > 0 ? (released.length / all.length) * 100 : 0

  // Monthly breakdown for charts (last 12 months)
  const monthly: Record<string, { month: string; volume: number; count: number; released: number }> = {}
  all.forEach(t => {
    const d = new Date(t.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    if (!monthly[key]) monthly[key] = { month: label, volume: 0, count: 0, released: 0 }
    monthly[key].volume += Number(t.amount)
    monthly[key].count += 1
    if (t.status === 'released') monthly[key].released += Number(t.amount)
  })

  // Currency breakdown
  const currencies: Record<string, number> = {}
  all.forEach(t => {
    currencies[t.currency] = (currencies[t.currency] || 0) + Number(t.amount)
  })

  return {
    data: {
      totalVolume,
      releasedVolume,
      last30Volume,
      volumeChange: Math.round(volumeChange),
      successRate: Math.round(successRate),
      totalTransactions: all.length,
      last30Transactions: last30.length,
      monthlyData: Object.values(monthly).slice(-12),
      currencyBreakdown: Object.entries(currencies).map(([currency, amount]) => ({ currency, amount })),
    }
  }
}