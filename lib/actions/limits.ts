'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Tier definitions ───────────────────────────────────────────────

type Tier = 'standard' | 'gold' | 'platinum'

export const TIER_LIMITS: Record<Tier, {
  label: string
  daily_spend: number
  daily_atm: number
  single_txn: number
  monthly_transfer: number
  international: number
  crypto: number
}> = {
  standard: {
    label: 'Standard',
    daily_spend: 5_000,
    daily_atm: 1_000,
    single_txn: 5_000,
    monthly_transfer: 15_000,
    international: 5_000,
    crypto: 500,
  },
  gold: {
    label: 'Gold',
    daily_spend: 15_000,
    daily_atm: 2_000,
    single_txn: 10_000,
    monthly_transfer: 50_000,
    international: 20_000,
    crypto: 5_000,
  },
  platinum: {
    label: 'Platinum',
    daily_spend: 50_000,
    daily_atm: 5_000,
    single_txn: 50_000,
    monthly_transfer: 200_000,
    international: 100_000,
    crypto: 25_000,
  },
}

// Map kyc_level → tier
function kycToTier(kyc: string | null | undefined): Tier {
  if (kyc === 'full') return 'platinum'
  if (kyc === 'basic' || kyc === 'enhanced') return 'gold'
  return 'standard'
}

// ─── Get limits data ─────────────────────────────────────────────────

export async function getLimitsData() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  // 1. Get profile (kyc_level determines tier)
  const { data: profile } = await supabase
    .from('profiles')
    .select('kyc_level')
    .eq('id', user.id)
    .single()

  const tier = kycToTier((profile as any)?.kyc_level)
  const limits = TIER_LIMITS[tier]

  // 2. Get wallet id
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // 3. Compute usage if wallet exists
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  let dailySpent = 0
  let monthlyTransferred = 0
  let cryptoBought = 0

  if (wallet) {
    const walletId = (wallet as any).id

    // Today's spend (all debits)
    const { data: dailyTxns } = await supabase
      .from('wallet_transactions')
      .select('amount, type')
      .eq('wallet_id', walletId)
      .eq('direction', 'debit')
      .gte('created_at', todayStart)

    dailySpent = (dailyTxns || []).reduce((s: number, t: any) => s + Number(t.amount), 0)

    // This month's transfers
    const { data: monthlyTxns } = await supabase
      .from('wallet_transactions')
      .select('amount, type')
      .eq('wallet_id', walletId)
      .eq('direction', 'debit')
      .in('type', ['p2p_send', 'transfer_out'])
      .gte('created_at', monthStart)

    monthlyTransferred = (monthlyTxns || []).reduce((s: number, t: any) => s + Number(t.amount), 0)

    // This month's crypto buys
    const { data: cryptoTxns } = await supabase
      .from('wallet_transactions')
      .select('amount')
      .eq('wallet_id', walletId)
      .eq('type', 'crypto_buy')
      .gte('created_at', monthStart)

    cryptoBought = (cryptoTxns || []).reduce((s: number, t: any) => s + Number(t.amount), 0)
  }

  // 4. Get any pending limit requests for this user
  const { data: requests } = await supabase
    .from('limit_requests')
    .select('limit_type, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const pendingRequests = new Set(
    (requests || [])
      .filter((r: any) => r.status === 'pending')
      .map((r: any) => r.limit_type)
  )

  return {
    data: {
      tier,
      tierLabel: limits.label,
      limits,
      usage: {
        daily_spend: dailySpent,
        daily_atm: 0,         // ATM data not tracked separately yet
        single_txn: 0,         // Not a running total
        monthly_transfer: monthlyTransferred,
        international: 0,      // Cross-border not tracked separately yet
        crypto: cryptoBought,
      },
      pendingRequests: Array.from(pendingRequests),
    },
  }
}

// ─── Request a limit increase ────────────────────────────────────────

export async function requestLimitIncrease(params: {
  limitType: string
  reason?: string
}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { limitType, reason } = params

  // Upsert: if already pending, no-op; if rejected, allow re-submission
  const { error } = await supabase
    .from('limit_requests')
    .upsert(
      {
        user_id: user.id,
        limit_type: limitType,
        reason: reason || null,
        status: 'pending',
      },
      {
        onConflict: 'user_id,limit_type',
        ignoreDuplicates: false,
      }
    )

  if (error) {
    // Duplicate pending request — that's fine
    if (error.code === '23505') {
      return { data: { already_pending: true } }
    }
    return { error: error.message }
  }

  revalidatePath('/limits')
  return { data: { submitted: true } }
}
