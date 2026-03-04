/**
 * Alpha Vantage REST API Client
 *
 * Direct API calls (NOT via RapidAPI) using the user's own API key.
 * Free tier: 25 requests/day — all callers MUST use aggressive caching.
 *
 * Endpoints implemented:
 * - CURRENCY_EXCHANGE_RATE  → crypto & forex spot prices
 * - WTI / BRENT / NATURAL_GAS / COPPER  → commodity prices
 * - REAL_GDP / INFLATION / UNEMPLOYMENT / etc.  → economic indicators
 * - NEWS_SENTIMENT  → market news with sentiment scores
 * - SYMBOL_SEARCH  → stock ticker search
 * - TIME_SERIES_DAILY  → stock daily OHLCV
 */

import type {
  AVCryptoExchangeRate,
  AVForexRate,
  AVCommodityData,
  AVCommodityPoint,
  AVEconomicData,
  AVEconomicPoint,
  AVNewsSentiment,
  AVStockMatch,
  AVTimeSeriesPoint,
} from './types'

// ─── Configuration ───

const BASE_URL = 'https://www.alphavantage.co/query'
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || ''

// ─── In-memory call counter (resets on server restart) ───

let dailyCalls = 0
let dailyResetDate = new Date().toDateString()

function trackCall(): void {
  const today = new Date().toDateString()
  if (today !== dailyResetDate) {
    dailyCalls = 0
    dailyResetDate = today
  }
  dailyCalls++
  if (dailyCalls > 20) {
    console.warn(`[AlphaVantage] High usage today: ${dailyCalls}/25 calls`)
  }
}

export function getAPIUsage(): { usedToday: number; remaining: number } {
  const today = new Date().toDateString()
  if (today !== dailyResetDate) {
    dailyCalls = 0
    dailyResetDate = today
  }
  return { usedToday: dailyCalls, remaining: Math.max(0, 25 - dailyCalls) }
}

// ─── Generic fetcher ───

async function avFetch(params: Record<string, string>): Promise<Record<string, unknown>> {
  if (!API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured')
  }

  trackCall()

  const url = new URL(BASE_URL)
  url.searchParams.set('apikey', API_KEY)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 0 }, // we control caching at the action layer
  })

  if (!res.ok) {
    throw new Error(`Alpha Vantage HTTP ${res.status}: ${res.statusText}`)
  }

  const json = await res.json()

  // Alpha Vantage returns errors in various formats
  if (json['Error Message']) {
    throw new Error(`Alpha Vantage error: ${json['Error Message']}`)
  }
  if (json['Note']) {
    // Rate limit hit
    console.warn('[AlphaVantage] Rate limit note:', json['Note'])
    throw new Error('Alpha Vantage rate limit reached. Try again later.')
  }
  if (json['Information']) {
    console.warn('[AlphaVantage] Info:', json['Information'])
    throw new Error('Alpha Vantage rate limit reached. Try again later.')
  }

  return json
}


// ═══════════════════════════════════════════════════════════
// CRYPTO EXCHANGE RATE
// One call per pair. Returns real-time exchange rate.
// e.g. getCryptoExchangeRate('BTC', 'USD')
// ═══════════════════════════════════════════════════════════

export async function getCryptoExchangeRate(
  fromCurrency: string,
  toCurrency: string = 'USD',
): Promise<AVCryptoExchangeRate> {
  const json = await avFetch({
    function: 'CURRENCY_EXCHANGE_RATE',
    from_currency: fromCurrency,
    to_currency: toCurrency,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = json['Realtime Currency Exchange Rate'] as any
  if (!data) {
    throw new Error(`No exchange rate data for ${fromCurrency}/${toCurrency}`)
  }

  return {
    fromCurrency: data['1. From_Currency Code'],
    toCurrency: data['3. To_Currency Code'],
    exchangeRate: parseFloat(data['5. Exchange Rate']),
    lastRefreshed: data['6. Last Refreshed'],
    bidPrice: parseFloat(data['8. Bid Price'] || data['5. Exchange Rate']),
    askPrice: parseFloat(data['9. Ask Price'] || data['5. Exchange Rate']),
  }
}


// ═══════════════════════════════════════════════════════════
// FOREX EXCHANGE RATE
// Same endpoint, works for fiat pairs too.
// e.g. getForexRate('USD', 'EUR')
// ═══════════════════════════════════════════════════════════

export async function getForexRate(
  fromCurrency: string,
  toCurrency: string,
): Promise<AVForexRate> {
  const json = await avFetch({
    function: 'CURRENCY_EXCHANGE_RATE',
    from_currency: fromCurrency,
    to_currency: toCurrency,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = json['Realtime Currency Exchange Rate'] as any
  if (!data) {
    throw new Error(`No forex rate data for ${fromCurrency}/${toCurrency}`)
  }

  return {
    fromCurrency: data['1. From_Currency Code'],
    toCurrency: data['3. To_Currency Code'],
    exchangeRate: parseFloat(data['5. Exchange Rate']),
    lastRefreshed: data['6. Last Refreshed'],
    bidPrice: parseFloat(data['8. Bid Price'] || data['5. Exchange Rate']),
    askPrice: parseFloat(data['9. Ask Price'] || data['5. Exchange Rate']),
  }
}


// ═══════════════════════════════════════════════════════════
// COMMODITY PRICES
// Gold, Oil, Natural Gas, Copper
// Returns monthly data points (no daily API call budget needed)
// ═══════════════════════════════════════════════════════════

export async function getCommodityPrices(
  fn: 'WTI' | 'BRENT' | 'NATURAL_GAS' | 'COPPER',
  interval: 'daily' | 'weekly' | 'monthly' = 'monthly',
): Promise<AVCommodityData> {
  const json = await avFetch({
    function: fn,
    interval,
  })

  const name = (json['name'] as string) || fn
  const unit = (json['unit'] as string) || 'USD'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawData = (json['data'] as any[]) || []

  const data: AVCommodityPoint[] = rawData
    .filter((d) => d.value !== '.')  // Alpha Vantage uses '.' for missing
    .slice(0, 60)  // last 60 data points
    .map((d) => ({
      date: d.date,
      value: parseFloat(d.value),
    }))

  return { name, interval, unit, data }
}

/**
 * Gold/Silver special endpoint — uses same format as commodities
 */
export async function getGoldPrice(
  interval: 'daily' | 'weekly' | 'monthly' = 'monthly',
): Promise<AVCommodityData> {
  // Alpha Vantage doesn't have a dedicated gold endpoint in the free API,
  // but we can get it from CURRENCY_EXCHANGE_RATE XAU/USD
  const rate = await getCryptoExchangeRate('XAU', 'USD')
  return {
    name: 'Gold (XAU/USD)',
    interval: 'realtime',
    unit: 'USD/oz',
    data: [{
      date: rate.lastRefreshed,
      value: rate.exchangeRate,
    }],
  }
}

export async function getSilverPrice(): Promise<AVCommodityData> {
  const rate = await getCryptoExchangeRate('XAG', 'USD')
  return {
    name: 'Silver (XAG/USD)',
    interval: 'realtime',
    unit: 'USD/oz',
    data: [{
      date: rate.lastRefreshed,
      value: rate.exchangeRate,
    }],
  }
}


// ═══════════════════════════════════════════════════════════
// ECONOMIC INDICATORS
// GDP, Inflation, Unemployment, Federal Funds Rate, CPI, Treasury Yield
// ═══════════════════════════════════════════════════════════

export async function getEconomicIndicator(
  fn: 'REAL_GDP' | 'REAL_GDP_PER_CAPITA' | 'INFLATION' | 'INFLATION_EXPECTATION' |
      'UNEMPLOYMENT' | 'FEDERAL_FUNDS_RATE' | 'CPI' | 'TREASURY_YIELD' |
      'CONSUMER_SENTIMENT' | 'RETAIL_SALES' | 'NONFARM_PAYROLL' | 'DURABLES',
  interval?: 'quarterly' | 'annual' | 'monthly',
): Promise<AVEconomicData> {
  const params: Record<string, string> = { function: fn }
  if (interval) params.interval = interval
  // Treasury yield has a maturity param
  if (fn === 'TREASURY_YIELD') params.maturity = '10year'

  const json = await avFetch(params)

  const name = (json['name'] as string) || fn
  const unit = (json['unit'] as string) || ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawData = (json['data'] as any[]) || []

  const data: AVEconomicPoint[] = rawData
    .filter((d) => d.value !== '.')
    .slice(0, 40)
    .map((d) => ({
      date: d.date,
      value: parseFloat(d.value),
    }))

  return { name, interval: interval || 'default', unit, data }
}


// ═══════════════════════════════════════════════════════════
// NEWS SENTIMENT
// Search news by tickers or topics with sentiment analysis
// ═══════════════════════════════════════════════════════════

export async function getNewsSentiment(
  tickers?: string,
  topics?: string,
  limit: number = 20,
): Promise<AVNewsSentiment[]> {
  const params: Record<string, string> = {
    function: 'NEWS_SENTIMENT',
    limit: String(limit),
    sort: 'LATEST',
  }
  if (tickers) params.tickers = tickers
  if (topics) params.topics = topics

  const json = await avFetch(params)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feed = (json['feed'] as any[]) || []

  return feed.map((item) => ({
    title: item.title || '',
    url: item.url || '',
    timePublished: item.time_published || '',
    authors: item.authors || [],
    summary: item.summary || '',
    bannerImage: item.banner_image || null,
    source: item.source || '',
    sourceDomain: item.source_domain || '',
    overallSentimentScore: parseFloat(item.overall_sentiment_score || '0'),
    overallSentimentLabel: item.overall_sentiment_label || 'Neutral',
    tickerSentiment: (item.ticker_sentiment || []).map((ts: Record<string, string>) => ({
      ticker: ts.ticker || '',
      relevanceScore: parseFloat(ts.relevance_score || '0'),
      tickerSentimentScore: parseFloat(ts.ticker_sentiment_score || '0'),
      tickerSentimentLabel: ts.ticker_sentiment_label || 'Neutral',
    })),
  }))
}


// ═══════════════════════════════════════════════════════════
// STOCK SEARCH
// Search for stock symbols by keyword
// ═══════════════════════════════════════════════════════════

export async function searchStocks(keywords: string): Promise<AVStockMatch[]> {
  const json = await avFetch({
    function: 'SYMBOL_SEARCH',
    keywords,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = (json['bestMatches'] as any[]) || []

  return matches.map((m) => ({
    symbol: m['1. symbol'],
    name: m['2. name'],
    type: m['3. type'],
    region: m['4. region'],
    currency: m['8. currency'],
  }))
}


// ═══════════════════════════════════════════════════════════
// STOCK DAILY TIME SERIES
// OHLCV data for a stock
// ═══════════════════════════════════════════════════════════

export async function getStockDaily(
  symbol: string,
  outputSize: 'compact' | 'full' = 'compact',
): Promise<{ symbol: string; data: AVTimeSeriesPoint[] }> {
  const json = await avFetch({
    function: 'TIME_SERIES_DAILY',
    symbol,
    outputsize: outputSize,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeSeries = (json['Time Series (Daily)'] as Record<string, any>) || {}

  const data: AVTimeSeriesPoint[] = Object.entries(timeSeries)
    .slice(0, 100)
    .map(([date, values]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseFloat(values['5. volume']),
    }))

  return { symbol, data }
}
