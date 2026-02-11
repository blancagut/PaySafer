'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── Types ───

export interface Wallet {
  id: string
  user_id: string
  balance: number
  currency: string
  frozen: boolean
  created_at: string
  updated_at: string
}

export interface WalletTransaction {
  id: string
  wallet_id: string
  type: string
  amount: number
  direction: 'credit' | 'debit'
  balance_after: number
  counterparty_wallet_id: string | null
  reference_type: string | null
  reference_id: string | null
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ─── Get Wallet ───

export async function getWallet() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    // Wallet might not exist for users created before the migration
    // Create one using admin client
    if (error.code === 'PGRST116') {
      const admin = createAdminClient()
      const { data: newWallet, error: createError } = await admin
        .from('wallets')
        .insert({ user_id: user.id, currency: 'EUR' })
        .select()
        .single()

      if (createError) return { error: createError.message }
      return { data: newWallet as Wallet }
    }
    return { error: error.message }
  }

  return { data: data as Wallet }
}

// ─── Get Wallet History ───

export async function getWalletHistory(options?: {
  limit?: number
  offset?: number
  type?: string
}) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  // First get the user's wallet id
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!wallet) return { data: [], total: 0 }

  let query = supabase
    .from('wallet_transactions')
    .select('*', { count: 'exact' })
    .eq('wallet_id', wallet.id)
    .order('created_at', { ascending: false })

  if (options?.type) {
    query = query.eq('type', options.type)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
  }

  const { data, error, count } = await query

  if (error) return { error: error.message }

  return { data: data as WalletTransaction[], total: count || 0 }
}

// ─── Create Top-Up Checkout Session ───

export async function createTopUpSession(amount: number, currency: string = 'EUR') {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  if (amount < 1) return { error: 'Minimum top-up is €1.00' }
  if (amount > 10000) return { error: 'Maximum top-up is €10,000.00' }

  // Dynamic import to avoid circular dependency
  const { stripe } = await import('@/lib/stripe/server')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.paysafer.site'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'Wallet Top-Up',
              description: `Add ${currency} ${amount.toFixed(2)} to your PaySafer wallet`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'wallet_top_up',
        user_id: user.id,
        amount: amount.toString(),
        currency,
      },
      success_url: `${baseUrl}/wallet?topup=success`,
      cancel_url: `${baseUrl}/wallet?topup=cancelled`,
    })

    return { url: session.url }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create top-up session'
    return { error: message }
  }
}

// ─── Process Top-Up (called by webhook) ───

export async function processWalletTopUp(
  userId: string,
  amount: number,
  currency: string,
  stripeSessionId: string
) {
  const admin = createAdminClient()

  try {
    const { data, error } = await admin.rpc('credit_wallet', {
      p_user_id: userId,
      p_amount: amount,
      p_type: 'top_up',
      p_reference_type: 'stripe',
      p_reference_id: null,
      p_description: `Wallet top-up via Stripe`,
      p_metadata: { stripe_session_id: stripeSessionId },
    })

    if (error) throw error

    // Create notification
    await admin.from('notifications').insert({
      user_id: userId,
      type: 'wallet_top_up',
      title: 'Wallet Top-Up Successful',
      message: `${currency} ${amount.toFixed(2)} has been added to your wallet.`,
      reference_type: 'wallet',
    })

    return { data }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process top-up'
    console.error('[wallet] Top-up failed:', message)
    return { error: message }
  }
}

// ─── Claim Username ───

export async function claimUsername(username: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  // Validate format
  const usernameRegex = /^[a-z][a-z0-9_]{2,19}$/
  if (!usernameRegex.test(username)) {
    return { error: 'Username must be 3-20 characters, start with a letter, and contain only lowercase letters, numbers, and underscores.' }
  }

  // Check rate limiting (once per 30 days)
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('username, username_changed_at')
    .eq('id', user.id)
    .single()

  if (profile?.username_changed_at) {
    const lastChange = new Date(profile.username_changed_at)
    const daysSince = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < 30) {
      const daysLeft = Math.ceil(30 - daysSince)
      return { error: `You can change your username again in ${daysLeft} days.` }
    }
  }

  // Check availability
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .single()

  if (existing) return { error: 'Username already taken.' }

  // Reserved usernames
  const reserved = ['admin', 'support', 'help', 'paysafer', 'paysafe', 'system', 'mod', 'moderator']
  if (reserved.includes(username)) return { error: 'This username is reserved.' }

  // Update
  const { error } = await admin
    .from('profiles')
    .update({
      username,
      username_changed_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505') return { error: 'Username already taken.' }
    return { error: error.message }
  }

  revalidatePath('/profile')
  revalidatePath('/wallet')
  return { data: { username } }
}

// ─── Get Profile with Username ───

export async function getMyProfile() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, username, phone, stripe_connect_id, stripe_connect_status, created_at')
    .eq('id', user.id)
    .single()

  if (error) return { error: error.message }
  return { data }
}
