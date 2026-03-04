'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SplitParticipant {
  id: string
  bill_id: string
  user_id: string | null
  participant_name: string
  amount: number
  is_paid: boolean
  paid_at: string | null
  created_at: string
}

export interface SplitBill {
  id: string
  creator_id: string
  title: string
  category_id: string
  total_amount: number
  currency: string
  status: 'active' | 'pending' | 'settled'
  created_at: string
  updated_at: string
  participants: SplitParticipant[]
  is_creator: boolean
}

export async function getSplitBills(): Promise<{
  data?: SplitBill[]
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('split_bills')
    .select(`
      *,
      participants:split_participants(*)
    `)
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  const bills: SplitBill[] = (data ?? []).map((bill) => ({
    ...bill,
    total_amount: Number(bill.total_amount),
    participants: (bill.participants ?? []).map((p: SplitParticipant) => ({
      ...p,
      amount: Number(p.amount),
    })),
    is_creator: true,
  }))

  return { data: bills }
}

export async function createSplitBill(params: {
  title: string
  category_id: string
  total_amount: number
  currency?: string
  participants: { participant_name: string; amount: number }[]
}): Promise<{ data?: SplitBill; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  if (params.participants.length < 2) {
    return { error: 'At least 2 participants are required' }
  }

  // ── Create the bill ──
  const { data: bill, error: billErr } = await supabase
    .from('split_bills')
    .insert({
      creator_id: user.id,
      title: params.title,
      category_id: params.category_id,
      total_amount: params.total_amount,
      currency: params.currency ?? 'USD',
      status: 'active',
    })
    .select()
    .single()

  if (billErr) return { error: billErr.message }

  // ── Add participants ──
  const { data: participants, error: participantsErr } = await supabase
    .from('split_participants')
    .insert(
      params.participants.map((p) => ({
        bill_id: bill.id,
        participant_name: p.participant_name,
        amount: p.amount,
        is_paid: false,
      }))
    )
    .select()

  if (participantsErr) {
    // Rollback the bill
    await supabase.from('split_bills').delete().eq('id', bill.id)
    return { error: participantsErr.message }
  }

  revalidatePath('/split')
  return {
    data: {
      ...bill,
      total_amount: Number(bill.total_amount),
      participants: (participants ?? []).map((p: SplitParticipant) => ({
        ...p,
        amount: Number(p.amount),
      })),
      is_creator: true,
    } as SplitBill,
  }
}

export async function markParticipantPaid(
  participantId: string,
  paid: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  // ── Verify caller is bill creator ──
  const { data: participant } = await supabase
    .from('split_participants')
    .select('bill_id, user_id')
    .eq('id', participantId)
    .single()

  if (!participant) return { error: 'Participant not found' }

  const { data: bill } = await supabase
    .from('split_bills')
    .select('creator_id')
    .eq('id', participant.bill_id)
    .single()

  if (!bill) return { error: 'Bill not found' }

  if (bill.creator_id !== user.id && participant.user_id !== user.id) {
    return { error: 'Permission denied' }
  }

  // ── Update paid status ──
  const { error } = await supabase
    .from('split_participants')
    .update({
      is_paid: paid,
      paid_at: paid ? new Date().toISOString() : null,
    })
    .eq('id', participantId)

  if (error) return { error: error.message }

  // ── Auto-settle bill if all participants are paid ──
  const { data: allParticipants } = await supabase
    .from('split_participants')
    .select('is_paid')
    .eq('bill_id', participant.bill_id)

  const allPaid = (allParticipants ?? []).every((p) => p.is_paid)
  if (allPaid) {
    await supabase
      .from('split_bills')
      .update({ status: 'settled' })
      .eq('id', participant.bill_id)
  }

  revalidatePath('/split')
  return {}
}

export async function deleteSplitBill(
  billId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('split_bills')
    .delete()
    .eq('id', billId)
    .eq('creator_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/split')
  return {}
}
