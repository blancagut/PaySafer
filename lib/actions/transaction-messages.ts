'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
