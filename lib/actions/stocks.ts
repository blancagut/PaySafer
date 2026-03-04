'use server'

import { createClient } from '@/lib/supabase/server'

export interface StockSearchResult {
  symbol: string
  name: string
  type: string
  region: string
  currency: string
}

export interface StockDailyPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface WatchlistItem {
  id: string
  symbol: string
  name: string | null
  addedAt: string
}

// ═══════════════════════════════════════════════════════════
// STOCK SEARCH — uses 1 API call per search
// ═══════════════════════════════════════════════════════════

export async function searchStockSymbols(keywords: string): Promise<{
  data?: StockSearchResult[]
  error?: string
}> {
  if (!keywords || keywords.trim().length < 1) {
    return { data: [] }
  }

  try {
    const { searchStocks } = await import('@/lib/alphavantage/client')
    const matches = await searchStocks(keywords.trim())

    return {
      data: matches.map((m) => ({
        symbol: m.symbol,
        name: m.name,
        type: m.type,
        region: m.region,
        currency: m.currency,
      })),
    }
  } catch (err) {
    console.error('[searchStockSymbols] Error:', err)
    return { error: 'Failed to search stocks' }
  }
}

// ═══════════════════════════════════════════════════════════
// STOCK DAILY DATA — uses 1 API call per symbol
// ═══════════════════════════════════════════════════════════

export async function getStockDailyData(symbol: string): Promise<{
  data?: { symbol: string; points: StockDailyPoint[] }
  error?: string
}> {
  if (!symbol) return { error: 'Symbol is required' }

  try {
    const { getStockDaily } = await import('@/lib/alphavantage/client')
    const result = await getStockDaily(symbol, 'compact')

    return {
      data: {
        symbol: result.symbol,
        points: result.data.map((p) => ({
          date: p.date,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume,
        })),
      },
    }
  } catch (err) {
    console.error('[getStockDailyData] Error:', err)
    return { error: 'Failed to fetch stock data' }
  }
}

// ═══════════════════════════════════════════════════════════
// WATCHLIST — user's saved stock symbols
// ═══════════════════════════════════════════════════════════

export async function getWatchlist(): Promise<{
  data?: WatchlistItem[]
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('stock_watchlist')
    .select('*')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false })

  if (error) return { error: error.message }
  return {
    data: (data || []).map((r: { id: string; symbol: string; name: string | null; added_at: string }) => ({
      id: r.id,
      symbol: r.symbol,
      name: r.name,
      addedAt: r.added_at,
    })),
  }
}

export async function addToWatchlist(symbol: string, name?: string): Promise<{
  success?: boolean
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('stock_watchlist').insert({
    user_id: user.id,
    symbol: symbol.toUpperCase(),
    name: name || null,
  })

  if (error) {
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return { error: 'Already in watchlist' }
    }
    return { error: error.message }
  }
  return { success: true }
}

export async function removeFromWatchlist(symbol: string): Promise<{
  success?: boolean
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('stock_watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('symbol', symbol.toUpperCase())

  if (error) return { error: error.message }
  return { success: true }
}
