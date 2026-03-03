'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type {
  CryptoPrice,
  CryptoHolding,
  CryptoTrade,
  TradeResult,
} from '@/lib/binance/types'
import { SUPPORTED_TRADING_PAIRS, MIN_TRADE_QTY } from '@/lib/binance/types'

// ─── Configuration ───

const FEE_PERCENT = parseFloat(process.env.CRYPTO_FEE_PERCENT || '0.5') / 100 // 0.5% default
const MIN_TRADE_USD = parseFloat(process.env.CRYPTO_MIN_TRADE_USD || '10')
const MAX_TRADE_USD = parseFloat(process.env.CRYPTO_MAX_TRADE_USD || '10000')

// ═══════════════════════════════════════════════════════════
// GET CRYPTO PRICES
// Reads from DB cache, refreshes from Binance if stale (>15s)
// ═══════════════════════════════════════════════════════════

export async function getCryptoPrices(): Promise<{ data?: CryptoPrice[]; error?: string }> {
  try {
    const admin = createAdminClient()

    // Read cached prices
    const { data: cached, error } = await admin
      .from('crypto_prices')
      .select('*')
      .order('symbol')

    if (error) return { error: error.message }

    // Check staleness — refresh if oldest price is > 15 seconds old
    const now = new Date()
    const isStale =
      !cached ||
      cached.length === 0 ||
      cached.some((p: { updated_at: string }) => {
        const age = now.getTime() - new Date(p.updated_at).getTime()
        return age > 15_000
      })

    if (isStale) {
      // Refresh from Binance in the background
      await refreshPricesFromBinance()

      // Re-read after refresh
      const { data: fresh } = await admin
        .from('crypto_prices')
        .select('*')
        .order('symbol')

      if (fresh && fresh.length > 0) {
        return {
          data: fresh.map(mapPriceRow),
        }
      }
    }

    if (cached && cached.length > 0) {
      return { data: cached.map(mapPriceRow) }
    }

    // No cached data and couldn't refresh — return empty
    return { data: [] }
  } catch (err) {
    console.error('[getCryptoPrices] Error:', err)
    return { error: 'Failed to fetch crypto prices' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPriceRow(row: any): CryptoPrice {
  return {
    symbol: row.symbol,
    price: parseFloat(row.price),
    change24h: parseFloat(row.change_24h),
    updatedAt: row.updated_at,
  }
}

/**
 * Fetch live prices from Binance and update the cache table.
 * Called server-side only.
 */
export async function refreshPricesFromBinance(): Promise<void> {
  try {
    // Dynamic import to avoid top-level import of server-only Binance client
    const { get24hrTickers } = await import('@/lib/binance/client')

    const symbols = [
      ...Object.values(SUPPORTED_TRADING_PAIRS), // BTCUSDT, ETHUSDT, etc.
    ]

    const tickers = await get24hrTickers(symbols)

    const admin = createAdminClient()

    // Upsert each price
    for (const ticker of tickers) {
      // Extract coin symbol from pair (BTCUSDT → BTC)
      const coinSymbol = ticker.symbol.replace('USDT', '')

      await admin
        .from('crypto_prices')
        .upsert(
          {
            symbol: coinSymbol,
            price: parseFloat(ticker.lastPrice),
            change_24h: parseFloat(ticker.priceChangePercent),
            high_24h: parseFloat(ticker.highPrice),
            low_24h: parseFloat(ticker.lowPrice),
            volume_24h: parseFloat(ticker.quoteVolume),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'symbol' }
        )
    }

    // Also add stablecoin prices (not traded against USDT)
    await admin.from('crypto_prices').upsert(
      { symbol: 'USDT', price: 1.0, change_24h: 0, updated_at: new Date().toISOString() },
      { onConflict: 'symbol' }
    )
    await admin.from('crypto_prices').upsert(
      { symbol: 'USDC', price: 1.0, change_24h: 0, updated_at: new Date().toISOString() },
      { onConflict: 'symbol' }
    )
  } catch (err) {
    console.error('[refreshPricesFromBinance] Error:', err)
    // Don't throw — callers fall back to cached prices
  }
}


// ═══════════════════════════════════════════════════════════
// GET CRYPTO HOLDINGS
// ═══════════════════════════════════════════════════════════

export async function getCryptoHoldings(): Promise<{ data?: CryptoHolding[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('crypto_holdings')
    .select('*')
    .eq('user_id', user.id)
    .gt('amount', 0)
    .order('amount', { ascending: false })

  if (error) return { error: error.message }

  return {
    data: (data || []).map((row) => ({
      id: row.id,
      symbol: row.symbol,
      amount: parseFloat(row.amount),
      avgBuyPrice: parseFloat(row.avg_buy_price),
      updatedAt: row.updated_at,
    })),
  }
}


// ═══════════════════════════════════════════════════════════
// GET TRADE HISTORY
// ═══════════════════════════════════════════════════════════

export async function getCryptoTradeHistory(filters?: {
  symbol?: string
  side?: 'buy' | 'sell'
  limit?: number
  offset?: number
}): Promise<{ data?: CryptoTrade[]; total?: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  let query = supabase
    .from('crypto_trades')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (filters?.symbol) query = query.eq('symbol', filters.symbol)
  if (filters?.side) query = query.eq('side', filters.side)

  const limit = filters?.limit || 20
  const offset = filters?.offset || 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) return { error: error.message }

  return {
    data: (data || []).map((row) => ({
      id: row.id,
      symbol: row.symbol,
      side: row.side as 'buy' | 'sell',
      cryptoAmount: parseFloat(row.crypto_amount),
      pricePerCoin: parseFloat(row.price_per_coin),
      quoteAmount: parseFloat(row.quote_amount),
      feeAmount: parseFloat(row.fee_amount),
      status: row.status,
      binanceOrderId: row.binance_order_id,
      createdAt: row.created_at,
    })),
    total: count || 0,
  }
}


// ═══════════════════════════════════════════════════════════
// EXECUTE CRYPTO BUY
// User enters USD amount → Binance market buy → atomic DB update
// ═══════════════════════════════════════════════════════════

export async function executeCryptoBuy(input: {
  symbol: string
  amountUsd: number
}): Promise<{ data?: TradeResult; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { symbol, amountUsd } = input

  // ── Validate ──
  if (!SUPPORTED_TRADING_PAIRS[symbol]) {
    return { error: `${symbol} is not supported for trading` }
  }
  if (amountUsd < MIN_TRADE_USD) {
    return { error: `Minimum trade is $${MIN_TRADE_USD}` }
  }
  if (amountUsd > MAX_TRADE_USD) {
    return { error: `Maximum trade is $${MAX_TRADE_USD}` }
  }

  // ── Check wallet balance ──
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance, frozen')
    .eq('user_id', user.id)
    .single()

  if (!wallet) return { error: 'Wallet not found' }
  if (wallet.frozen) return { error: 'Wallet is frozen. Contact support.' }

  const fee = Math.round(amountUsd * FEE_PERCENT * 100) / 100  // round to 2 decimals
  const totalCost = amountUsd + fee

  if (Number(wallet.balance) < totalCost) {
    return { error: `Insufficient balance. Need $${totalCost.toFixed(2)}, have $${Number(wallet.balance).toFixed(2)}` }
  }

  // ── Place Binance market buy ──
  const tradingPair = SUPPORTED_TRADING_PAIRS[symbol]

  try {
    const { marketBuy } = await import('@/lib/binance/client')
    const order = await marketBuy(tradingPair, amountUsd)

    if (order.status !== 'FILLED') {
      return { error: `Order not filled. Status: ${order.status}` }
    }

    const executedQty = parseFloat(order.executedQty)
    const actualQuoteAmount = parseFloat(order.cummulativeQuoteQty)
    const avgPrice = actualQuoteAmount / executedQty

    // ── Atomic DB update via RPC ──
    const admin = createAdminClient()
    const { data: result, error: rpcError } = await admin.rpc('execute_crypto_buy', {
      p_user_id: user.id,
      p_symbol: symbol,
      p_crypto_amount: executedQty,
      p_price_per_coin: Math.round(avgPrice * 100) / 100,
      p_quote_amount: Math.round(actualQuoteAmount * 100) / 100,
      p_fee: fee,
      p_binance_order_id: order.orderId.toString(),
    })

    if (rpcError) {
      // Binance order succeeded but DB failed — log for reconciliation
      console.error('[executeCryptoBuy] DB ERROR after Binance success!', {
        userId: user.id,
        binanceOrderId: order.orderId,
        symbol,
        executedQty,
        actualQuoteAmount,
        error: rpcError.message,
      })
      return { error: 'Trade executed on exchange but failed to update balance. Contact support with order ID: ' + order.orderId }
    }

    // ── Send notification ──
    await admin.from('notifications').insert({
      user_id: user.id,
      type: 'crypto.buy',
      title: `Bought ${executedQty.toFixed(6)} ${symbol}`,
      message: `You bought ${executedQty.toFixed(6)} ${symbol} for $${actualQuoteAmount.toFixed(2)} (fee: $${fee.toFixed(2)})`,
      reference_type: 'crypto',
      reference_id: result?.trade_id || null,
    }).then(() => {}, console.error) // fire-and-forget

    revalidatePath('/crypto')
    revalidatePath('/wallet')

    return {
      data: {
        tradeId: result?.trade_id,
        symbol,
        side: 'buy',
        cryptoAmount: executedQty,
        pricePerCoin: Math.round(avgPrice * 100) / 100,
        quoteAmount: Math.round(actualQuoteAmount * 100) / 100,
        feeAmount: fee,
        newWalletBalance: result?.new_balance ? parseFloat(result.new_balance) : 0,
      },
    }
  } catch (err) {
    console.error('[executeCryptoBuy] Binance error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'

    // If it's a Binance API error, return user-friendly message
    if (message.includes('Binance API error')) {
      return { error: 'Exchange is temporarily unavailable. Please try again in a moment.' }
    }
    return { error: 'Failed to execute trade. Please try again.' }
  }
}


// ═══════════════════════════════════════════════════════════
// EXECUTE CRYPTO SELL
// User enters crypto amount → Binance market sell → atomic DB update
// ═══════════════════════════════════════════════════════════

export async function executeCryptoSell(input: {
  symbol: string
  amountCrypto: number
}): Promise<{ data?: TradeResult; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { symbol, amountCrypto } = input

  // ── Validate ──
  if (!SUPPORTED_TRADING_PAIRS[symbol]) {
    return { error: `${symbol} is not supported for trading` }
  }
  if (amountCrypto <= 0) {
    return { error: 'Amount must be positive' }
  }
  const minQty = MIN_TRADE_QTY[symbol] || 0.00001
  if (amountCrypto < minQty) {
    return { error: `Minimum sell amount is ${minQty} ${symbol}` }
  }

  // ── Check holdings ──
  const { data: holding } = await supabase
    .from('crypto_holdings')
    .select('amount')
    .eq('user_id', user.id)
    .eq('symbol', symbol)
    .single()

  if (!holding || parseFloat(holding.amount) < amountCrypto) {
    const available = holding ? parseFloat(holding.amount) : 0
    return { error: `Insufficient ${symbol}. Have ${available.toFixed(8)}, need ${amountCrypto.toFixed(8)}` }
  }

  // ── Place Binance market sell ──
  const tradingPair = SUPPORTED_TRADING_PAIRS[symbol]

  try {
    const { marketSell } = await import('@/lib/binance/client')
    const order = await marketSell(tradingPair, amountCrypto)

    if (order.status !== 'FILLED') {
      return { error: `Order not filled. Status: ${order.status}` }
    }

    const executedQty = parseFloat(order.executedQty)
    const actualQuoteAmount = parseFloat(order.cummulativeQuoteQty)
    const avgPrice = actualQuoteAmount / executedQty
    const fee = Math.round(actualQuoteAmount * FEE_PERCENT * 100) / 100

    // ── Atomic DB update via RPC ──
    const admin = createAdminClient()
    const { data: result, error: rpcError } = await admin.rpc('execute_crypto_sell', {
      p_user_id: user.id,
      p_symbol: symbol,
      p_crypto_amount: executedQty,
      p_price_per_coin: Math.round(avgPrice * 100) / 100,
      p_quote_amount: Math.round(actualQuoteAmount * 100) / 100,
      p_fee: fee,
      p_binance_order_id: order.orderId.toString(),
    })

    if (rpcError) {
      console.error('[executeCryptoSell] DB ERROR after Binance success!', {
        userId: user.id,
        binanceOrderId: order.orderId,
        symbol,
        executedQty,
        actualQuoteAmount,
        error: rpcError.message,
      })
      return { error: 'Trade executed on exchange but failed to update balance. Contact support with order ID: ' + order.orderId }
    }

    // ── Notification ──
    await admin.from('notifications').insert({
      user_id: user.id,
      type: 'crypto.sell',
      title: `Sold ${executedQty.toFixed(6)} ${symbol}`,
      message: `You sold ${executedQty.toFixed(6)} ${symbol} for $${(actualQuoteAmount - fee).toFixed(2)} (fee: $${fee.toFixed(2)})`,
      reference_type: 'crypto',
      reference_id: result?.trade_id || null,
    }).then(() => {}, console.error)

    revalidatePath('/crypto')
    revalidatePath('/wallet')

    return {
      data: {
        tradeId: result?.trade_id,
        symbol,
        side: 'sell',
        cryptoAmount: executedQty,
        pricePerCoin: Math.round(avgPrice * 100) / 100,
        quoteAmount: Math.round(actualQuoteAmount * 100) / 100,
        feeAmount: fee,
        newWalletBalance: result?.new_balance ? parseFloat(result.new_balance) : 0,
      },
    }
  } catch (err) {
    console.error('[executeCryptoSell] Binance error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'

    if (message.includes('Binance API error')) {
      return { error: 'Exchange is temporarily unavailable. Please try again in a moment.' }
    }
    return { error: 'Failed to execute trade. Please try again.' }
  }
}
