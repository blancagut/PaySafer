'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface CommodityPrice {
  symbol: string
  name: string
  price: number
  unit: string
  changePct: number
  updatedAt: string
}

export interface CommodityHistoryPoint {
  date: string
  value: number
}

/** Cache staleness — 24 hours for commodities */
const COMMODITY_STALE_MS = 24 * 60 * 60 * 1000

// ═══════════════════════════════════════════════════════════
// GET COMMODITY PRICES
// Reads from DB cache, returns seeded data or refreshed AV data
// ═══════════════════════════════════════════════════════════

export async function getCommodityPrices(): Promise<{
  data?: CommodityPrice[]
  error?: string
}> {
  try {
    const admin = createAdminClient()

    const { data: rows, error } = await admin
      .from('commodity_prices')
      .select('*')
      .order('symbol')

    if (error) return { error: error.message }

    // Check if we need a refresh
    const now = new Date()
    const isStale = !rows || rows.length === 0 || rows.some((r: { updated_at: string }) => {
      return now.getTime() - new Date(r.updated_at).getTime() > COMMODITY_STALE_MS
    })

    if (isStale) {
      await refreshCommodityPrices()
      // Re-read after refresh
      const { data: fresh } = await admin
        .from('commodity_prices')
        .select('*')
        .order('symbol')
      if (fresh && fresh.length > 0) {
        return { data: fresh.map(mapCommodityRow) }
      }
    }

    return { data: (rows || []).map(mapCommodityRow) }
  } catch (err) {
    console.error('[getCommodityPrices] Error:', err)
    return { error: 'Failed to fetch commodity prices' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCommodityRow(row: any): CommodityPrice {
  return {
    symbol: row.symbol,
    name: row.name,
    price: parseFloat(row.price),
    unit: row.unit,
    changePct: parseFloat(row.change_pct || '0'),
    updatedAt: row.updated_at,
  }
}

/**
 * Refresh commodity prices from Alpha Vantage.
 * Gold + Silver via CURRENCY_EXCHANGE_RATE (XAU/USD, XAG/USD) = 2 calls
 * Oil via WTI endpoint = 1 call
 * Natural Gas via NATURAL_GAS = 1 call
 * Total: 4 API calls
 */
export async function refreshCommodityPrices(): Promise<void> {
  try {
    const {
      getCryptoExchangeRate,
      getCommodityPrices: fetchCommodity,
    } = await import('@/lib/alphavantage/client')

    const admin = createAdminClient()

    // Gold
    try {
      const gold = await getCryptoExchangeRate('XAU', 'USD')
      await admin.from('commodity_prices').upsert({
        symbol: 'GOLD',
        name: 'Gold (XAU)',
        price: gold.exchangeRate,
        unit: 'USD/oz',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'symbol' })
    } catch (e) { console.error('[refreshCommodity] Gold failed:', e) }

    // Silver
    try {
      const silver = await getCryptoExchangeRate('XAG', 'USD')
      await admin.from('commodity_prices').upsert({
        symbol: 'SILVER',
        name: 'Silver (XAG)',
        price: silver.exchangeRate,
        unit: 'USD/oz',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'symbol' })
    } catch (e) { console.error('[refreshCommodity] Silver failed:', e) }

    // Oil (WTI)
    try {
      const oil = await fetchCommodity('WTI', 'monthly')
      if (oil.data.length > 0) {
        await admin.from('commodity_prices').upsert({
          symbol: 'WTI',
          name: 'Crude Oil (WTI)',
          price: oil.data[0].value,
          unit: 'USD/bbl',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'symbol' })
        // Also store history
        for (const pt of oil.data.slice(0, 24)) {
          await admin.from('commodity_history').upsert({
            symbol: 'WTI',
            date: pt.date,
            value: pt.value,
          }, { onConflict: 'symbol,date' }).then(() => {}, () => {})
        }
      }
    } catch (e) { console.error('[refreshCommodity] WTI failed:', e) }

    // Natural Gas
    try {
      const gas = await fetchCommodity('NATURAL_GAS', 'monthly')
      if (gas.data.length > 0) {
        await admin.from('commodity_prices').upsert({
          symbol: 'NATURAL_GAS',
          name: 'Natural Gas',
          price: gas.data[0].value,
          unit: 'USD/MMBtu',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'symbol' })
      }
    } catch (e) { console.error('[refreshCommodity] Natural Gas failed:', e) }

  } catch (err) {
    console.error('[refreshCommodityPrices] Error:', err)
  }
}

/**
 * Get commodity price history for charts
 */
export async function getCommodityHistory(symbol: string): Promise<{
  data?: CommodityHistoryPoint[]
  error?: string
}> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('commodity_history')
      .select('date, value')
      .eq('symbol', symbol)
      .order('date', { ascending: false })
      .limit(60)

    if (error) return { error: error.message }
    return {
      data: (data || []).map((r: { date: string; value: string | number }) => ({
        date: r.date,
        value: parseFloat(String(r.value)),
      })),
    }
  } catch (err) {
    console.error('[getCommodityHistory] Error:', err)
    return { error: 'Failed to fetch commodity history' }
  }
}
