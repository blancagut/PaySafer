'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── Types ───

export interface DirectMessage {
  id: string
  conversation_id: string
  sender_id: string
  message: string
  message_type: 'text' | 'payment_sent' | 'payment_request' | 'payment_accepted' | 'payment_declined' | 'system'
  transfer_id: string | null
  request_id: string | null
  amount: number | null
  currency: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Conversation {
  id: string
  participant_1: string
  participant_2: string
  last_message_at: string
  created_at: string
}

export interface ConversationWithDetails extends Conversation {
  other_user: {
    id: string
    full_name: string | null
    username: string | null
    email: string
    avatar_url: string | null
  }
  last_message?: DirectMessage | null
  unread_count?: number
}

// ─── Get or Create Conversation ───

export async function getOrCreateConversation(otherUserId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }
  if (otherUserId === user.id) return { error: 'Cannot chat with yourself' }

  const admin = createAdminClient()

  const { data: conversationId, error } = await admin.rpc('get_or_create_conversation', {
    p_user_1: user.id,
    p_user_2: otherUserId,
  })

  if (error) return { error: error.message }

  return { data: { conversationId } }
}

// ─── List Conversations (Inbox) ───

export async function getConversations() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Get all conversations for user
  const { data: conversations, error } = await admin
    .from('conversations')
    .select('*')
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
    .order('last_message_at', { ascending: false })
    .limit(50)

  if (error) return { error: error.message }
  if (!conversations || conversations.length === 0) return { data: [] }

  // Collect other user IDs
  const otherUserIds = conversations.map(c =>
    c.participant_1 === user.id ? c.participant_2 : c.participant_1
  )

  // Fetch profiles
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, username, email, avatar_url')
    .in('id', otherUserIds)

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))

  // Fetch last message per conversation
  const conversationIds = conversations.map(c => c.id)
  const { data: lastMessages } = await admin
    .from('direct_messages')
    .select('*')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })

  // Group by conversation, take first (latest) per conversation
  const lastMessageMap = new Map<string, DirectMessage>()
  for (const msg of (lastMessages || [])) {
    if (!lastMessageMap.has(msg.conversation_id)) {
      lastMessageMap.set(msg.conversation_id, msg as DirectMessage)
    }
  }

  const result: ConversationWithDetails[] = conversations.map(c => {
    const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1
    const profile = profileMap.get(otherId)
    return {
      ...c,
      other_user: profile || { id: otherId, full_name: null, username: null, email: '', avatar_url: null },
      last_message: lastMessageMap.get(c.id) || null,
    }
  })

  return { data: result }
}

// ─── Get Messages ───

export async function getDirectMessages(conversationId: string, cursor?: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  let query = supabase
    .from('direct_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) return { error: error.message }

  return { data: (data as DirectMessage[]).reverse() }
}

// ─── Send Text Message ───

export async function sendDirectMessage(conversationId: string, message: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }
  if (!message.trim()) return { error: 'Message cannot be empty' }

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message: message.trim(),
      message_type: 'text',
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Update conversation timestamp
  const admin = createAdminClient()
  await admin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  return { data: data as DirectMessage }
}

// ─── Send Money via Chat ───

export async function sendMoneyInChat(input: {
  conversationId: string
  recipientId: string
  amount: number
  currency?: string
  note?: string
}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Execute the transfer
  const { data: transferResult, error: transferError } = await admin.rpc('execute_transfer', {
    p_sender_id: user.id,
    p_recipient_id: input.recipientId,
    p_amount: input.amount,
    p_currency: input.currency || 'EUR',
    p_note: input.note || null,
  })

  if (transferError) {
    if (transferError.message.includes('Insufficient balance')) {
      return { error: 'Insufficient balance. Top up your wallet first.' }
    }
    return { error: transferError.message }
  }

  const result = transferResult as Record<string, unknown>

  // Create payment message in chat
  const { data: msg, error: msgError } = await admin
    .from('direct_messages')
    .insert({
      conversation_id: input.conversationId,
      sender_id: user.id,
      message: input.note || `Sent ${input.currency || 'EUR'} ${input.amount.toFixed(2)}`,
      message_type: 'payment_sent',
      transfer_id: result.transfer_id as string,
      amount: input.amount,
      currency: input.currency || 'EUR',
    })
    .select()
    .single()

  if (msgError) return { error: msgError.message }

  // Update conversation timestamp
  await admin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', input.conversationId)

  // Send notification
  const { data: senderProfile } = await admin
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .single()

  const senderName = senderProfile?.username
    ? `$${senderProfile.username}`
    : senderProfile?.full_name || 'Someone'

  await admin.from('notifications').insert({
    user_id: input.recipientId,
    type: 'p2p_received',
    title: 'Money Received!',
    message: `${senderName} sent you ${input.currency || 'EUR'} ${input.amount.toFixed(2)} in chat`,
    reference_type: 'transfer',
    reference_id: result.transfer_id as string,
  })

  // Auto-add contacts
  await admin.from('contacts').upsert(
    { user_id: user.id, contact_id: input.recipientId },
    { onConflict: 'user_id,contact_id' }
  )
  await admin.from('contacts').upsert(
    { user_id: input.recipientId, contact_id: user.id },
    { onConflict: 'user_id,contact_id' }
  )

  revalidatePath('/wallet')
  revalidatePath('/messages')
  return { data: msg as DirectMessage }
}

// ─── Request Money via Chat ───

export async function requestMoneyInChat(input: {
  conversationId: string
  payerId: string
  amount: number
  currency?: string
  note?: string
}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Create payment request
  const { data: request, error: reqError } = await admin
    .from('payment_requests')
    .insert({
      requester_id: user.id,
      payer_id: input.payerId,
      amount: input.amount,
      currency: input.currency || 'EUR',
      note: input.note || null,
      status: 'pending',
    })
    .select()
    .single()

  if (reqError) return { error: reqError.message }

  // Insert chat message
  const { data: msg, error: msgError } = await admin
    .from('direct_messages')
    .insert({
      conversation_id: input.conversationId,
      sender_id: user.id,
      message: input.note || `Requested ${input.currency || 'EUR'} ${input.amount.toFixed(2)}`,
      message_type: 'payment_request',
      request_id: request.id,
      amount: input.amount,
      currency: input.currency || 'EUR',
    })
    .select()
    .single()

  if (msgError) return { error: msgError.message }

  // Update conversation timestamp
  await admin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', input.conversationId)

  // Notify
  const { data: senderProfile } = await admin
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .single()

  const senderName = senderProfile?.username
    ? `$${senderProfile.username}`
    : senderProfile?.full_name || 'Someone'

  await admin.from('notifications').insert({
    user_id: input.payerId,
    type: 'payment_request',
    title: 'Payment Request',
    message: `${senderName} requested ${input.currency || 'EUR'} ${input.amount.toFixed(2)}${input.note ? ` — "${input.note}"` : ''}`,
    reference_type: 'payment_request',
    reference_id: request.id,
  })

  revalidatePath('/messages')
  return { data: msg as DirectMessage }
}

// ─── Accept Payment Request from Chat ───

export async function acceptRequestInChat(requestId: string, conversationId: string) {
  // Reuse the existing acceptPaymentRequest logic, then post a chat message
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Get the request
  const { data: req, error: reqError } = await admin
    .from('payment_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (reqError || !req) return { error: 'Payment request not found' }
  if (req.payer_id !== user.id) return { error: 'Only the payer can accept' }
  if (req.status !== 'pending') return { error: `Request already ${req.status}` }

  // Execute the transfer
  const { data: transferResult, error: transferError } = await admin.rpc('execute_transfer', {
    p_sender_id: user.id,
    p_recipient_id: req.requester_id,
    p_amount: Number(req.amount),
    p_currency: req.currency || 'EUR',
    p_note: req.note || `Paid request`,
  })

  if (transferError) {
    if (transferError.message.includes('Insufficient balance')) {
      return { error: 'Insufficient balance. Top up your wallet first.' }
    }
    return { error: transferError.message }
  }

  const result = transferResult as Record<string, unknown>

  // Update request status
  await admin
    .from('payment_requests')
    .update({ status: 'accepted', transfer_id: result.transfer_id as string })
    .eq('id', requestId)

  // Post chat message
  await admin
    .from('direct_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message: `Paid ${req.currency || 'EUR'} ${Number(req.amount).toFixed(2)}`,
      message_type: 'payment_accepted',
      transfer_id: result.transfer_id as string,
      request_id: requestId,
      amount: Number(req.amount),
      currency: req.currency || 'EUR',
    })

  await admin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  revalidatePath('/wallet')
  revalidatePath('/messages')
  return { data: { transferId: result.transfer_id } }
}

// ─── Decline Payment Request from Chat ───

export async function declineRequestInChat(requestId: string, conversationId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: req, error: reqError } = await admin
    .from('payment_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (reqError || !req) return { error: 'Payment request not found' }
  if (req.payer_id !== user.id) return { error: 'Only the payer can decline' }
  if (req.status !== 'pending') return { error: `Request already ${req.status}` }

  await admin
    .from('payment_requests')
    .update({ status: 'declined' })
    .eq('id', requestId)

  await admin
    .from('direct_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message: `Declined request for ${req.currency || 'EUR'} ${Number(req.amount).toFixed(2)}`,
      message_type: 'payment_declined',
      request_id: requestId,
      amount: Number(req.amount),
      currency: req.currency || 'EUR',
    })

  await admin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  revalidatePath('/messages')
  return { data: { success: true } }
}
