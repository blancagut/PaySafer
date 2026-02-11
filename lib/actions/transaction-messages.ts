'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyTransactionMessage } from './notifications'

export interface TransactionMessage {
  id: string
  transaction_id: string
  sender_id: string | null
  message: string
  message_type: 'text' | 'system' | 'file' | 'milestone' | 'payment_notice'
  metadata: Record<string, unknown>
  created_at: string
}

// ============================================================================
// GET MESSAGES
// ============================================================================
export async function getTransactionMessages(transactionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('transaction_messages')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { data: data as TransactionMessage[] }
}

// ============================================================================
// SEND MESSAGE
// ============================================================================
export async function sendTransactionMessage(
  transactionId: string,
  message: string
) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  if (!message.trim()) {
    return { error: 'Message cannot be empty' }
  }

  // RLS will enforce participant check, but let's be explicit
  const { data: txn } = await supabase
    .from('transactions')
    .select('id, status')
    .eq('id', transactionId)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .single()

  if (!txn) {
    return { error: 'Transaction not found or access denied' }
  }

  // Don't allow messages on terminal transactions
  if (['released', 'cancelled'].includes(txn.status)) {
    return { error: 'This transaction is closed' }
  }

  const { data, error } = await supabase
    .from('transaction_messages')
    .insert({
      transaction_id: transactionId,
      sender_id: user.id,
      message: message.trim(),
      message_type: 'text',
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Fire-and-forget: Notify the other party
  try {
    const { data: txnData } = await supabase
      .from('transactions')
      .select('buyer_id, seller_id, description')
      .eq('id', transactionId)
      .single()

    if (txnData) {
      const recipientId = txnData.buyer_id === user.id ? txnData.seller_id : txnData.buyer_id
      if (recipientId) {
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .single()

        const senderName = senderProfile?.username
          ? `$${senderProfile.username}`
          : senderProfile?.full_name || 'Someone'

        await notifyTransactionMessage({
          recipientId,
          senderName,
          transactionId,
          transactionDesc: txnData.description || 'your transaction',
        })
      }
    }
  } catch {
    // Never block messaging
  }

  // Fire-and-forget: Run scam detection every 5 messages
  try {
    const { count } = await supabase
      .from('transaction_messages')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_id', transactionId)
      .eq('message_type', 'text')

    if (count && count % 5 === 0) {
      // Get last 5 messages for analysis
      const { data: recentMsgs } = await supabase
        .from('transaction_messages')
        .select('sender_id, message, created_at')
        .eq('transaction_id', transactionId)
        .eq('message_type', 'text')
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentMsgs && recentMsgs.length > 0) {
        import('@/lib/ai/scam-detector').then(({ detectScamPatterns }) => {
          detectScamPatterns(
            recentMsgs.map(m => ({
              sender: m.sender_id === user.id ? 'you' : 'counterparty',
              content: m.message,
              timestamp: m.created_at,
            })),
            'transaction',
            transactionId,
            user.id,
            data.id
          ).catch(err => console.error('[AI Scam] Detection failed:', err))
        }).catch(() => {})
      }
    }
  } catch {
    // Scam detection failure never blocks messaging
  }

  return { data: data as TransactionMessage }
}

// ============================================================================
// INSERT SYSTEM MESSAGE (admin/service_role only — called from server actions)
// ============================================================================
export async function insertSystemMessage(
  transactionId: string,
  message: string,
  messageType: TransactionMessage['message_type'] = 'system',
  metadata: Record<string, unknown> = {}
) {
  const admin = createAdminClient()

  const { error } = await admin
    .from('transaction_messages')
    .insert({
      transaction_id: transactionId,
      sender_id: null,
      message,
      message_type: messageType,
      metadata,
    })

  if (error) {
    console.error('[system-message] Failed to insert:', error.message)
  }
}
