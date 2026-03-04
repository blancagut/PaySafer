'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const SUPPORTED_CURRENCIES = ['USD', 'AED', 'EUR', 'GBP'] as const

export interface ExchangeRate {
  from_currency: string
  to_currency: string
  rate: number
  updated_at: string
}

export interface CurrencyWallet {
  id: string
  user_id: string
  currency: string
  balance: number
  created_at: string
}

export interface CurrencyExchange {
  id: string
  user_id: string
  from_currency: string
  to_currency: string
  from_amount: number
  to_amount: number
  rate: number
  created_at: string
}

// Initial seed balance when a user's USD currency wallet is first created
const USD_SEED_BALANCE = 500

export async function getExchangeData(): Promise<{
  data?: {
    rates: Record<string, number>
    wallets: CurrencyWallet[]
    recentExchanges: CurrencyExchange[]
    ratesUpdatedAt: string
  }
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  // ── Rates ──
  const { data: rateRows, error: rateErr } = await supabase
    .from('exchange_rates')
    .select('from_currency, to_currency, rate, updated_at')

  if (rateErr) return { error: rateErr.message }

  const rates: Record<string, number> = {}
  let ratesUpdatedAt = ''
  for (const row of rateRows ?? []) {
    rates[`${row.from_currency}-${row.to_currency}`] = Number(row.rate)
    if (!ratesUpdatedAt) ratesUpdatedAt = row.updated_at
  }

  // ── Ensure currency wallets exist ──
  const { data: existingWallets } = await supabase
    .from('currency_wallets')
    .select('*')
    .eq('user_id', user.id)

  const existingCurrencies = new Set(
    (existingWallets ?? []).map((w: CurrencyWallet) => w.currency)
  )
  const missing = SUPPORTED_CURRENCIES.filter((c) => !existingCurrencies.has(c))

  if (missing.length > 0) {
    await supabase.from('currency_wallets').insert(
      missing.map((currency) => ({
        user_id: user.id,
        currency,
        balance: currency === 'USD' ? USD_SEED_BALANCE : 0,
      }))
    )
  }

  // ── Wallets (re-fetch after any inserts) ──
  const { data: wallets, error: walletsErr } = await supabase
    .from('currency_wallets')
    .select('*')
    .eq('user_id', user.id)
    .order('currency')

  if (walletsErr) return { error: walletsErr.message }

  // ── Recent exchange history ──
  const { data: exchanges } = await supabase
    .from('currency_exchanges')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return {
    data: {
      rates,
      wallets: wallets as CurrencyWallet[],
      recentExchanges: (exchanges ?? []) as CurrencyExchange[],
      ratesUpdatedAt,
    },
  }
}

export async function executeExchange(params: {
  fromCurrency: string
  toCurrency: string
  amount: number
}): Promise<{ data?: CurrencyWallet[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { fromCurrency, toCurrency, amount } = params
  if (fromCurrency === toCurrency) return { error: 'Cannot exchange same currency' }
  if (amount <= 0) return { error: 'Amount must be greater than zero' }

  // ── Fetch rate ──
  const { data: rateRow, error: rateErr } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', fromCurrency)
    .eq('to_currency', toCurrency)
    .single()

  if (rateErr || !rateRow) return { error: 'Exchange rate not available' }

  const rate = Number(rateRow.rate)
  const toAmount = parseFloat((amount * rate).toFixed(2))

  // ── Source wallet ──
  const { data: fromWallet, error: fromErr } = await supabase
    .from('currency_wallets')
    .select('id, balance')
    .eq('user_id', user.id)
    .eq('currency', fromCurrency)
    .single()

  if (fromErr || !fromWallet) return { error: `${fromCurrency} wallet not found` }
  if (Number(fromWallet.balance) < amount) {
    return { error: `Insufficient ${fromCurrency} balance` }
  }

  // ── Target wallet ──
  const { data: toWallet, error: toErr } = await supabase
    .from('currency_wallets')
    .select('id, balance')
    .eq('user_id', user.id)
    .eq('currency', toCurrency)
    .single()

  if (toErr || !toWallet) return { error: `${toCurrency} wallet not found` }

  // ── Deduct from source ──
  const newFromBalance = parseFloat((Number(fromWallet.balance) - amount).toFixed(2))
  const { error: deductErr } = await supabase
    .from('currency_wallets')
    .update({ balance: newFromBalance })
    .eq('id', fromWallet.id)

  if (deductErr) return { error: deductErr.message }

  // ── Add to target ──
  const newToBalance = parseFloat((Number(toWallet.balance) + toAmount).toFixed(2))
  const { error: addErr } = await supabase
    .from('currency_wallets')
    .update({ balance: newToBalance })
    .eq('id', toWallet.id)

  if (addErr) {
    // Attempt rollback of source deduction
    await supabase
      .from('currency_wallets')
      .update({ balance: fromWallet.balance })
      .eq('id', fromWallet.id)
    return { error: addErr.message }
  }

  // ── Log the exchange ──
  await supabase.from('currency_exchanges').insert({
    user_id: user.id,
    from_currency: fromCurrency,
    to_currency: toCurrency,
    from_amount: amount,
    to_amount: toAmount,
    rate,
  })

  // ── Return updated wallets ──
  const { data: updatedWallets } = await supabase
    .from('currency_wallets')
    .select('*')
    .eq('user_id', user.id)
    .order('currency')

  revalidatePath('/exchange')
  return { data: (updatedWallets ?? []) as CurrencyWallet[] }
}
