'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface EconomicIndicator {
  indicator: string
  name: string
  latestValue: number
  latestDate: string
  unit: string
  interval: string
  updatedAt: string
}

export interface EconomicHistoryPoint {
  date: string
  value: number
}

/** Cache staleness — 7 days for economic data (changes infrequently) */
const ECONOMIC_STALE_MS = 7 * 24 * 60 * 60 * 1000

// ═══════════════════════════════════════════════════════════
// GET ECONOMIC INDICATORS
// ═══════════════════════════════════════════════════════════

export async function getEconomicIndicators(): Promise<{
  data?: EconomicIndicator[]
  error?: string
}> {
  try {
    const admin = createAdminClient()

    const { data: rows, error } = await admin
      .from('economic_indicators')
      .select('*')
      .order('indicator')

    if (error) return { error: error.message }

    // Check if we need a refresh
    const now = new Date()
    const isStale = !rows || rows.length === 0 || rows.some((r: { updated_at: string }) => {
      return now.getTime() - new Date(r.updated_at).getTime() > ECONOMIC_STALE_MS
    })

    if (isStale) {
      await refreshEconomicIndicators()
      const { data: fresh } = await admin
        .from('economic_indicators')
        .select('*')
        .order('indicator')
      if (fresh && fresh.length > 0) {
        return { data: fresh.map(mapEconomicRow) }
      }
    }

    return { data: (rows || []).map(mapEconomicRow) }
  } catch (err) {
    console.error('[getEconomicIndicators] Error:', err)
    return { error: 'Failed to fetch economic indicators' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEconomicRow(row: any): EconomicIndicator {
  return {
    indicator: row.indicator,
    name: row.name,
    latestValue: parseFloat(row.latest_value),
    latestDate: row.latest_date,
    unit: row.unit || '',
    interval: row.interval || 'monthly',
    updatedAt: row.updated_at,
  }
}

/**
 * Refresh economic indicators from Alpha Vantage.
 * 6 indicators = 6 API calls. Run sparingly (weekly).
 */
export async function refreshEconomicIndicators(): Promise<void> {
  try {
    const { getEconomicIndicator } = await import('@/lib/alphavantage/client')
    const admin = createAdminClient()

    const indicators = [
      { fn: 'REAL_GDP' as const, name: 'Real GDP', interval: 'quarterly' as const },
      { fn: 'INFLATION' as const, name: 'Inflation Rate (CPI YoY)', interval: 'annual' as const },
      { fn: 'UNEMPLOYMENT' as const, name: 'Unemployment Rate', interval: 'monthly' as const },
      { fn: 'FEDERAL_FUNDS_RATE' as const, name: 'Federal Funds Rate', interval: 'monthly' as const },
      { fn: 'CPI' as const, name: 'Consumer Price Index', interval: 'monthly' as const },
      { fn: 'TREASURY_YIELD' as const, name: 'Treasury Yield 10Y', interval: 'monthly' as const },
    ]

    for (const ind of indicators) {
      try {
        const result = await getEconomicIndicator(ind.fn, ind.interval)
        if (result.data.length > 0) {
          const latest = result.data[0]
          await admin.from('economic_indicators').upsert({
            indicator: ind.fn,
            name: result.name || ind.name,
            latest_value: latest.value,
            latest_date: latest.date,
            unit: result.unit,
            interval: ind.interval,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'indicator' })

          // Store historical points
          for (const pt of result.data.slice(0, 20)) {
            await admin.from('economic_history').upsert({
              indicator: ind.fn,
              date: pt.date,
              value: pt.value,
            }, { onConflict: 'indicator,date' }).then(() => {}, () => {})
          }
        }
      } catch (e) {
        console.error(`[refreshEconomic] ${ind.fn} failed:`, e)
      }
    }
  } catch (err) {
    console.error('[refreshEconomicIndicators] Error:', err)
  }
}

/**
 * Get history for a specific indicator
 */
export async function getEconomicHistory(indicator: string): Promise<{
  data?: EconomicHistoryPoint[]
  error?: string
}> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('economic_history')
      .select('date, value')
      .eq('indicator', indicator)
      .order('date', { ascending: false })
      .limit(40)

    if (error) return { error: error.message }
    return {
      data: (data || []).map((r: { date: string; value: string | number }) => ({
        date: r.date,
        value: parseFloat(String(r.value)),
      })),
    }
  } catch (err) {
    console.error('[getEconomicHistory] Error:', err)
    return { error: 'Failed to fetch economic history' }
  }
}
