'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Dispute {
  id: string
  transaction_id: string
  opened_by: string
  reason: string
  description: string
  status: 'under_review' | 'resolved' | 'closed'
  resolution: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

// Get all disputes for current user
export async function getUserDisputes() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('disputes')
    .select(`
      *,
      transaction:transactions(*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

// Get single dispute
export async function getDispute(id: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('disputes')
    .select(`
      *,
      transaction:transactions(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    return { error: error.message }
  }

  return { data }
}

// Create a dispute
export async function createDispute(input: {
  transaction_id: string
  reason: string
  description: string
}) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // Verify user is part of transaction
  const { data: transaction } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', input.transaction_id)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .single()

  if (!transaction) {
    return { error: 'Transaction not found or access denied' }
  }

  // Create dispute
  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .insert({
      transaction_id: input.transaction_id,
      opened_by: user.id,
      reason: input.reason,
      description: input.description,
      status: 'under_review',
    })
    .select()
    .single()

  if (disputeError) {
    return { error: disputeError.message }
  }

  // Update transaction status to dispute
  await supabase
    .from('transactions')
    .update({ status: 'dispute' })
    .eq('id', input.transaction_id)

  revalidatePath('/disputes')
  revalidatePath('/transactions')
  revalidatePath(`/transactions/${input.transaction_id}`)

  return { data: dispute }
}

// Get dispute messages
export async function getDisputeMessages(disputeId: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('dispute_messages')
    .select(`
      *,
      user:profiles(full_name, email)
    `)
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

// Add dispute message
export async function addDisputeMessage(disputeId: string, message: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('dispute_messages')
    .insert({
      dispute_id: disputeId,
      user_id: user.id,
      message,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/disputes/${disputeId}`)

  return { data }
}
