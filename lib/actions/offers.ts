'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export type OfferStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'
export type CreatorRole = 'buyer' | 'seller'

export interface Offer {
  id: string
  creator_id: string
  title: string
  description: string
  amount: number
  currency: string
  creator_role: CreatorRole
  token: string
  status: OfferStatus
  accepted_by: string | null
  transaction_id: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface OfferFilters {
  status?: OfferStatus
  page?: number
  pageSize?: number
}

// ============================================================================
// CREATE OFFER
// ============================================================================
export async function createOffer(input: {
  title: string
  description: string
  amount: number
  currency: string
  creator_role: CreatorRole
}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // Validate inputs
  if (!input.title.trim()) return { error: 'Title is required' }
  if (!input.description.trim()) return { error: 'Description is required' }
  if (input.amount <= 0) return { error: 'Amount must be positive' }
  if (!['buyer', 'seller'].includes(input.creator_role)) {
    return { error: 'Invalid role selection' }
  }

  // Generate unique token for shareable link
  const token = crypto.randomBytes(32).toString('hex')

  const { data, error } = await supabase
    .from('offers')
    .insert({
      creator_id: user.id,
      title: input.title.trim(),
      description: input.description.trim(),
      amount: input.amount,
      currency: input.currency || 'USD',
      creator_role: input.creator_role,
      token,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { data }
}

// ============================================================================
// GET MY OFFERS (paginated)
// ============================================================================
export async function getMyOffers(filters: OfferFilters = {}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const page = filters.page || 1
  const pageSize = filters.pageSize || 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('offers')
    .select('*', { count: 'exact' })
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error, count } = await query

  if (error) {
    return { error: error.message }
  }

  const total = count || 0
  return {
    data: data || [],
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

// ============================================================================
// GET OFFER BY TOKEN (for the public accept page)
// ============================================================================
export async function getOfferByToken(token: string) {
  const supabase = await createClient()

  // We need auth to check if user is the creator (to prevent self-accept)
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('offers')
    .select(`
      id, title, description, amount, currency, creator_role,
      creator_id, token, status, expires_at, created_at
    `)
    .eq('token', token)
    .single()

  if (error) {
    return { error: 'Offer not found' }
  }

  // Fetch creator profile separately (may be null if RLS blocks cross-user reads)
  let creator: { full_name: string | null; email: string } = { full_name: null, email: 'Unknown' }
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', data.creator_id)
    .single()

  if (profile) {
    creator = profile
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    // Auto-expire
    await supabase
      .from('offers')
      .update({ status: 'expired' })
      .eq('id', data.id)
      .eq('status', 'pending')

    return { error: 'This offer has expired' }
  }

  const isCreator = user?.id === data.creator_id
  const isExpired = data.status === 'expired'
  const isAccepted = data.status === 'accepted'
  const isCancelled = data.status === 'cancelled'

  return {
    data: {
      ...data,
      creator,
      isCreator,
      isExpired,
      isAccepted,
      isCancelled,
      canAccept: !isCreator && data.status === 'pending' && !!user,
      isAuthenticated: !!user,
    },
  }
}

// ============================================================================
// ACCEPT OFFER → creates transaction
// ============================================================================
export async function acceptOffer(token: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to accept an offer' }
  }

  // Fetch the offer
  const { data: offer, error: offerError } = await supabase
    .from('offers')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (offerError || !offer) {
    return { error: 'Offer not found or no longer available' }
  }

  // Cannot accept own offer
  if (offer.creator_id === user.id) {
    return { error: 'You cannot accept your own offer' }
  }

  // Check expiry
  if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
    await supabase
      .from('offers')
      .update({ status: 'expired' })
      .eq('id', offer.id)
    return { error: 'This offer has expired' }
  }

  // Determine buyer/seller based on creator_role
  const buyer_id = offer.creator_role === 'buyer' ? offer.creator_id : user.id
  const seller_id = offer.creator_role === 'seller' ? offer.creator_id : user.id

  // Get seller email for the transaction
  const { data: sellerProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', seller_id)
    .single()

  // Create the transaction
  const { data: transaction, error: txnError } = await supabase
    .from('transactions')
    .insert({
      description: offer.title,
      amount: offer.amount,
      currency: offer.currency,
      buyer_id,
      seller_id,
      seller_email: sellerProfile?.email || '',
      status: 'awaiting_payment',
      metadata: {
        offer_id: offer.id,
        offer_description: offer.description,
      },
    })
    .select()
    .single()

  if (txnError) {
    return { error: txnError.message }
  }

  // Update the offer to accepted
  const { error: updateError } = await supabase
    .from('offers')
    .update({
      status: 'accepted',
      accepted_by: user.id,
      transaction_id: transaction.id,
    })
    .eq('id', offer.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/transactions')

  return { data: { offerId: offer.id, transactionId: transaction.id } }
}

// ============================================================================
// CANCEL OFFER (creator only, pending only)
// ============================================================================
export async function cancelOffer(offerId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('offers')
    .update({ status: 'cancelled' })
    .eq('id', offerId)
    .eq('creator_id', user.id)
    .eq('status', 'pending')
    .select()
    .single()

  if (error) {
    return { error: 'Cannot cancel this offer' }
  }

  revalidatePath('/dashboard')
  return { data }
}

// ============================================================================
// GET OFFER STATS (for dashboard)
// ============================================================================
export async function getOfferStats() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const { data: offers, error } = await supabase
    .from('offers')
    .select('status')
    .eq('creator_id', user.id)

  if (error) {
    return { error: error.message }
  }

  return {
    data: {
      total: offers.length,
      pending: offers.filter(o => o.status === 'pending').length,
      accepted: offers.filter(o => o.status === 'accepted').length,
      expired: offers.filter(o => o.status === 'expired').length,
      cancelled: offers.filter(o => o.status === 'cancelled').length,
    },
  }
}
