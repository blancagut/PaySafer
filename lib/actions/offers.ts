'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'
import { notifyOfferAccepted } from './notifications'

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
  image_urls: string[]
  category: string | null
  delivery_days: number | null
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
  image_urls?: string[]
  category?: string
  delivery_days?: number
  expires_at?: string
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
  if (input.image_urls && input.image_urls.length > 3) {
    return { error: 'Maximum 3 images allowed' }
  }
  if (input.delivery_days && input.delivery_days <= 0) {
    return { error: 'Delivery days must be positive' }
  }

  // Generate unique token for shareable link
  const token = crypto.randomBytes(32).toString('hex')

  const insertData: Record<string, unknown> = {
    creator_id: user.id,
    title: input.title.trim(),
    description: input.description.trim(),
    amount: input.amount,
    currency: input.currency || 'USD',
    creator_role: input.creator_role,
    token,
    status: 'pending',
  }

  // Optional fields
  if (input.image_urls?.length) insertData.image_urls = input.image_urls
  if (input.category?.trim()) insertData.category = input.category.trim()
  if (input.delivery_days) insertData.delivery_days = input.delivery_days
  if (input.expires_at) insertData.expires_at = input.expires_at

  const { data, error } = await supabase
    .from('offers')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/offers')
  return { data }
}

// ============================================================================
// UPLOAD OFFER IMAGE
// ============================================================================
export async function uploadOfferImage(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const file = formData.get('image') as File
  if (!file) return { error: 'No file provided' }

  // Validate
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Invalid file type. Use JPG, PNG, WebP, or GIF.' }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'File too large. Maximum size is 5MB.' }
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${user.id}/${crypto.randomBytes(8).toString('hex')}.${ext}`

  // Ensure bucket exists (auto-create via admin if missing)
  const admin = createAdminClient()
  const { data: buckets } = await admin.storage.listBuckets()
  if (!buckets?.find(b => b.id === 'offer-images')) {
    await admin.storage.createBucket('offer-images', { public: true })
  }

  const { error: uploadError } = await supabase.storage
    .from('offer-images')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return { error: uploadError.message }
  }

  const { data: urlData } = supabase.storage
    .from('offer-images')
    .getPublicUrl(fileName)

  return { data: { url: urlData.publicUrl } }
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
  // Use admin client so the offer is readable even by unauthenticated visitors
  const admin = createAdminClient()

  // Check if visitor is logged in (optional — page is public)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await admin
    .from('offers')
    .select(`
      id, title, description, amount, currency, creator_role,
      creator_id, token, status, expires_at, created_at,
      image_urls, category, delivery_days
    `)
    .eq('token', token)
    .single()

  if (error) {
    return { error: 'Offer not found' }
  }

  // Fetch creator profile (admin client bypasses cross-user RLS)
  let creator: { full_name: string | null; email: string; avatar_url: string | null } = { full_name: null, email: 'Unknown', avatar_url: null }
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', data.creator_id)
    .single()

  if (profile) {
    creator = profile
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    // Auto-expire
    await admin
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

  // Check expiry — use admin client because RLS WITH CHECK on the
  // non-creator update policy rejects status changes away from 'pending'
  if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
    const admin = createAdminClient()
    await admin
      .from('offers')
      .update({ status: 'expired' })
      .eq('id', offer.id)
      .eq('status', 'pending')
    return { error: 'This offer has expired' }
  }

  // Determine buyer/seller based on creator_role
  const buyer_id = offer.creator_role === 'buyer' ? offer.creator_id : user.id
  const seller_id = offer.creator_role === 'seller' ? offer.creator_id : user.id

  // Use admin client for the insert — the RLS INSERT policy only allows
  // auth.uid() = buyer_id, but when the acceptor is the seller the insert
  // would be blocked.  The admin (service_role) client bypasses RLS.
  const admin = createAdminClient()

  // Get seller email for the transaction
  const { data: sellerProfile } = await admin
    .from('profiles')
    .select('email')
    .eq('id', seller_id)
    .single()

  // Create the transaction (service_role bypasses RLS)
  const { data: transaction, error: txnError } = await admin
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

  // Update the offer to accepted — guard with status='pending' to prevent
  // a race condition where two users accept simultaneously
  const { data: updatedOffer, error: updateError } = await admin
    .from('offers')
    .update({
      status: 'accepted',
      accepted_by: user.id,
      transaction_id: transaction.id,
    })
    .eq('id', offer.id)
    .eq('status', 'pending')
    .select()
    .maybeSingle()

  if (updateError) {
    // Rollback: delete the transaction we just created
    await admin.from('transactions').delete().eq('id', transaction.id)
    return { error: updateError.message }
  }

  if (!updatedOffer) {
    // Another user already accepted — rollback the duplicate transaction
    await admin.from('transactions').delete().eq('id', transaction.id)
    return { error: 'This offer has already been accepted by someone else' }
  }

  // Notify offer creator that their offer was accepted
  await notifyOfferAccepted({
    offerId: offer.id,
    creatorId: offer.creator_id,
    acceptedById: user.id,
    title: offer.title,
    amount: Number(offer.amount),
    currency: offer.currency,
    transactionId: transaction.id,
  })

  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  revalidatePath('/offers')

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
  revalidatePath('/offers')
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
