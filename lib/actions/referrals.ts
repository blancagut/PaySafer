'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface Referral {
  id: string
  referrer_id: string
  invited_email: string
  referred_id: string | null
  status: 'pending' | 'signed_up' | 'verified' | 'rewarded'
  reward_amount: number
  created_at: string
  updated_at: string
}

export async function getReferralData(): Promise<{
  data?: {
    referralCode: string
    referrals: Referral[]
    totalReferred: number
    totalEarned: number
    pendingRewards: number
  }
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  // ── Get / ensure referral code ──
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', user.id)
    .single()

  if (profileErr) return { error: profileErr.message }

  let referralCode = profile?.referral_code as string | null

  if (!referralCode) {
    // Generate a deterministic code from the user ID (no collision risk)
    referralCode = user.id.replace(/-/g, '').toUpperCase().substring(0, 8)
    const admin = createAdminClient()
    await admin
      .from('profiles')
      .update({ referral_code: referralCode })
      .eq('id', user.id)
  }

  // ── Fetch referrals ──
  const { data: referrals, error: refErr } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })

  if (refErr) return { error: refErr.message }

  const list = (referrals ?? []) as Referral[]
  const totalEarned = list
    .filter((r) => r.status === 'rewarded')
    .reduce((s, r) => s + Number(r.reward_amount), 0)
  const pendingRewards = list.filter((r) => r.status === 'verified').length * 10

  return {
    data: {
      referralCode: referralCode ?? '',
      referrals: list,
      totalReferred: list.length,
      totalEarned,
      pendingRewards,
    },
  }
}

export async function sendReferralInvite(
  email: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const normalised = email.toLowerCase().trim()
  if (!normalised.includes('@')) return { error: 'Invalid email address' }

  // Prevent self-referral
  if (user.email?.toLowerCase() === normalised) {
    return { error: 'You cannot refer yourself' }
  }

  const { error } = await supabase.from('referrals').insert({
    referrer_id: user.id,
    invited_email: normalised,
    status: 'pending',
    reward_amount: 10.0,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'You have already invited this email address' }
    }
    return { error: error.message }
  }

  revalidatePath('/referrals')
  return {}
}
