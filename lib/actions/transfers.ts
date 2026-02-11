'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── Types ───

export interface Transfer {
  id: string
  sender_id: string
  recipient_id: string
  amount: number
  currency: string
  note: string | null
  status: 'completed' | 'pending' | 'failed'
  metadata: Record<string, unknown>
  created_at: string
}

export interface PaymentRequest {
  id: string
  requester_id: string
  payer_id: string
  amount: number
  currency: string
  note: string | null
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
  transfer_id: string | null
  expires_at: string
  created_at: string
  updated_at: string
}

// ─── Resolve User Identifier ───
// Accepts: $username, email, or UUID
async function resolveUser(identifier: string): Promise<{ id: string; username: string | null; full_name: string | null; email: string } | null> {
  const admin = createAdminClient()

  // Strip $ prefix if present
  const cleaned = identifier.startsWith('$') ? identifier.slice(1) : identifier

  // Try UUID first
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(cleaned)) {
    const { data } = await admin
      .from('profiles')
      .select('id, username, full_name, email')
      .eq('id', cleaned)
      .single()
    return data
  }

  // Try username (case-insensitive)
  const { data: byUsername } = await admin
    .from('profiles')
    .select('id, username, full_name, email')
    .ilike('username', cleaned)
    .single()

  if (byUsername) return byUsername

  // Try email
  const { data: byEmail } = await admin
    .from('profiles')
    .select('id, username, full_name, email')
    .ilike('email', cleaned)
    .single()

  return byEmail
}

// ─── Send Money ───

export async function sendMoney(input: {
  recipientIdentifier: string
  amount: number
  currency?: string
  note?: string
}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  // Validate amount
  if (!input.amount || input.amount <= 0) return { error: 'Amount must be positive' }
  if (input.amount > 50000) return { error: 'Maximum transfer is €50,000' }

  // Resolve recipient
  const recipient = await resolveUser(input.recipientIdentifier)
  if (!recipient) return { error: 'User not found. Check the username or email.' }
  if (recipient.id === user.id) return { error: 'You cannot send money to yourself.' }

  // Check recipient is not banned
  const admin = createAdminClient()
  const { data: recipientProfile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', recipient.id)
    .single()

  if (!recipientProfile) return { error: 'Recipient not found.' }
  if ((recipientProfile as any).role === 'banned') return { error: 'This user cannot receive payments.' }

  // Execute atomic transfer via DB function
  const { data, error } = await admin.rpc('execute_transfer', {
    p_sender_id: user.id,
    p_recipient_id: recipient.id,
    p_amount: input.amount,
    p_currency: input.currency || 'EUR',
    p_note: input.note || null,
  })

  if (error) {
    // Parse Postgres function errors
    if (error.message.includes('Insufficient balance')) {
      return { error: 'Insufficient balance. Please top up your wallet.' }
    }
    if (error.message.includes('frozen')) {
      return { error: 'Your wallet is currently frozen. Contact support.' }
    }
    return { error: error.message }
  }

  const result = data as Record<string, unknown>

  // Send notification to recipient
  const { data: senderProfile } = await admin
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .single()

  const senderName = senderProfile?.username
    ? `$${senderProfile.username}`
    : senderProfile?.full_name || 'Someone'

  await admin.from('notifications').insert({
    user_id: recipient.id,
    type: 'p2p_received',
    title: 'Money Received!',
    message: `${senderName} sent you ${input.currency || 'EUR'} ${input.amount.toFixed(2)}${input.note ? ` — "${input.note}"` : ''}`,
    reference_type: 'transfer',
    reference_id: result.transfer_id as string,
  })

  // Auto-add to contacts (both ways, idempotent)
  await admin.from('contacts').upsert(
    { user_id: user.id, contact_id: recipient.id },
    { onConflict: 'user_id,contact_id' }
  )
  await admin.from('contacts').upsert(
    { user_id: recipient.id, contact_id: user.id },
    { onConflict: 'user_id,contact_id' }
  )

  revalidatePath('/wallet')
  return { data: result }
}

// ─── Request Money ───

export async function requestMoney(input: {
  payerIdentifier: string
  amount: number
  currency?: string
  note?: string
}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  if (!input.amount || input.amount <= 0) return { error: 'Amount must be positive' }
  if (input.amount > 50000) return { error: 'Maximum request is €50,000' }

  // Resolve payer
  const payer = await resolveUser(input.payerIdentifier)
  if (!payer) return { error: 'User not found. Check the username or email.' }
  if (payer.id === user.id) return { error: 'You cannot request money from yourself.' }

  const admin = createAdminClient()

  // Create payment request
  const { data, error } = await admin
    .from('payment_requests')
    .insert({
      requester_id: user.id,
      payer_id: payer.id,
      amount: input.amount,
      currency: input.currency || 'EUR',
      note: input.note || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Notify payer
  const { data: requesterProfile } = await admin
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .single()

  const requesterName = requesterProfile?.username
    ? `$${requesterProfile.username}`
    : requesterProfile?.full_name || 'Someone'

  await admin.from('notifications').insert({
    user_id: payer.id,
    type: 'p2p_request',
    title: 'Payment Request',
    message: `${requesterName} is requesting ${input.currency || 'EUR'} ${input.amount.toFixed(2)}${input.note ? ` for "${input.note}"` : ''}`,
    reference_type: 'request',
    reference_id: data.id,
  })

  revalidatePath('/wallet')
  return { data: data as PaymentRequest }
}

// ─── Accept Payment Request ───

export async function acceptPaymentRequest(requestId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Fetch request
  const { data: req, error: fetchError } = await admin
    .from('payment_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (fetchError || !req) return { error: 'Request not found' }
  if (req.payer_id !== user.id) return { error: 'Only the payer can accept this request' }
  if (req.status !== 'pending') return { error: 'This request is no longer pending' }

  // Check expiry
  if (new Date(req.expires_at) < new Date()) {
    await admin.from('payment_requests').update({ status: 'expired' }).eq('id', requestId)
    return { error: 'This request has expired' }
  }

  // Execute transfer
  const { data: transferResult, error: transferError } = await admin.rpc('execute_transfer', {
    p_sender_id: user.id,
    p_recipient_id: req.requester_id,
    p_amount: req.amount,
    p_currency: req.currency,
    p_note: req.note,
  })

  if (transferError) {
    if (transferError.message.includes('Insufficient balance')) {
      return { error: 'Insufficient balance. Please top up your wallet.' }
    }
    return { error: transferError.message }
  }

  const result = transferResult as Record<string, unknown>

  // Update request status
  await admin
    .from('payment_requests')
    .update({ status: 'accepted', transfer_id: result.transfer_id as string })
    .eq('id', requestId)

  // Notify requester
  const { data: payerProfile } = await admin
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .single()

  const payerName = payerProfile?.username
    ? `$${payerProfile.username}`
    : payerProfile?.full_name || 'Someone'

  await admin.from('notifications').insert({
    user_id: req.requester_id,
    type: 'p2p_request_accepted',
    title: 'Payment Request Accepted',
    message: `${payerName} paid your request of ${req.currency} ${Number(req.amount).toFixed(2)}`,
    reference_type: 'transfer',
    reference_id: result.transfer_id as string,
  })

  revalidatePath('/wallet')
  return { data: result }
}

// ─── Decline Payment Request ───

export async function declinePaymentRequest(requestId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: req } = await admin
    .from('payment_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (!req) return { error: 'Request not found' }
  if (req.payer_id !== user.id) return { error: 'Only the payer can decline' }
  if (req.status !== 'pending') return { error: 'This request is no longer pending' }

  await admin
    .from('payment_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)

  // Notify requester
  await admin.from('notifications').insert({
    user_id: req.requester_id,
    type: 'p2p_request_declined',
    title: 'Payment Request Declined',
    message: `Your request for ${req.currency} ${Number(req.amount).toFixed(2)} was declined.`,
    reference_type: 'request',
    reference_id: requestId,
  })

  revalidatePath('/wallet')
  return { data: { status: 'declined' } }
}

// ─── Cancel My Payment Request ───

export async function cancelPaymentRequest(requestId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: req } = await admin
    .from('payment_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (!req) return { error: 'Request not found' }
  if (req.requester_id !== user.id) return { error: 'Only the requester can cancel' }
  if (req.status !== 'pending') return { error: 'This request is no longer pending' }

  await admin
    .from('payment_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)

  revalidatePath('/wallet')
  return { data: { status: 'cancelled' } }
}

// ─── Get My Transfer History ───

export async function getTransfers(options?: {
  limit?: number
  offset?: number
}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const limit = options?.limit || 20
  const offset = options?.offset || 0

  const { data, error, count } = await supabase
    .from('transfers')
    .select('*', { count: 'exact' })
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return { error: error.message }

  return { data: data as Transfer[], total: count || 0 }
}

// ─── Get Payment Requests ───

export async function getPaymentRequests(options?: {
  role?: 'requester' | 'payer'
  status?: string
  limit?: number
}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  let query = supabase
    .from('payment_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (options?.role === 'requester') {
    query = query.eq('requester_id', user.id)
  } else if (options?.role === 'payer') {
    query = query.eq('payer_id', user.id)
  } else {
    query = query.or(`requester_id.eq.${user.id},payer_id.eq.${user.id}`)
  }

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) return { error: error.message }

  return { data: data as PaymentRequest[] }
}
