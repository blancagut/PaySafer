/**
 * Alpha Vantage API Type Definitions
 *
 * Types for all Alpha Vantage endpoints used by PaySafe:
 * - Crypto exchange rates
 * - Forex rates
 * - Commodities (gold, oil, etc.)
 * - Economic indicators (GDP, inflation, etc.)
 * - News sentiment
 * - Stock time series
 */

// ─── Crypto Exchange Rate ───

export interface AVCryptoExchangeRate {
  fromCurrency: string
  toCurrency: string
  exchangeRate: number
  lastRefreshed: string
  bidPrice: number
  askPrice: number
}

// ─── Forex Exchange Rate ───

export interface AVForexRate {
  fromCurrency: string
  toCurrency: string
  exchangeRate: number
  lastRefreshed: string
  bidPrice: number
  askPrice: number
}

// ─── Time Series Data Point ───

export interface AVTimeSeriesPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// ─── Commodities ───

export interface AVCommodityPoint {
  date: string
  value: number
}

export interface AVCommodityData {
  name: string
  interval: string
  unit: string
  data: AVCommodityPoint[]
}

// ─── Economic Indicators ───

export interface AVEconomicPoint {
  date: string
  value: number
}

export interface AVEconomicData {
  name: string
  interval: string
  unit: string
  data: AVEconomicPoint[]
}

// ─── News Sentiment ───

export interface AVNewsSentiment {
  title: string
  url: string
  timePublished: string
  authors: string[]
  summary: string
  bannerImage: string | null
  source: string
  sourceDomain: string
  overallSentimentScore: number
  overallSentimentLabel: string
  tickerSentiment: AVTickerSentiment[]
}

export interface AVTickerSentiment {
  ticker: string
  relevanceScore: number
  tickerSentimentScore: number
  tickerSentimentLabel: string
}

// ─── Stock Search ───

export interface AVStockMatch {
  symbol: string
  name: string
  type: string
  region: string
  currency: string
}

// ─── API Budget Tracking ───

export interface APIBudgetStatus {
  dailyLimit: number
  usedToday: number
  remaining: number
  nextResetAt: string
}

// ─── Supported Assets ───

/** Crypto symbols for Alpha Vantage CURRENCY_EXCHANGE_RATE */
export const AV_CRYPTO_SYMBOLS = [
  'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX',
] as const

/** Forex pairs to fetch (base → quote) */
export const AV_FOREX_PAIRS = [
  { from: 'USD', to: 'EUR' },
  { from: 'USD', to: 'GBP' },
  { from: 'USD', to: 'AED' },
  { from: 'EUR', to: 'GBP' },
] as const

/** Commodity endpoints */
export const AV_COMMODITIES = {
  gold: { fn: 'WTI', name: 'Gold (XAU)', endpoint: 'GOLD_PRICE' },
  oil: { fn: 'WTI', name: 'Crude Oil (WTI)', endpoint: 'WTI' },
  naturalGas: { fn: 'NATURAL_GAS', name: 'Natural Gas', endpoint: 'NATURAL_GAS' },
  copper: { fn: 'COPPER', name: 'Copper', endpoint: 'COPPER' },
} as const

/** Economic indicator functions */
export const AV_ECONOMIC_INDICATORS = {
  gdp: { fn: 'REAL_GDP', name: 'Real GDP', interval: 'quarterly' },
  inflation: { fn: 'INFLATION', name: 'Inflation (CPI)', interval: 'annual' },
  unemployment: { fn: 'UNEMPLOYMENT', name: 'Unemployment Rate', interval: 'monthly' },
  federalFundsRate: { fn: 'FEDERAL_FUNDS_RATE', name: 'Federal Funds Rate', interval: 'monthly' },
  cpi: { fn: 'CPI', name: 'Consumer Price Index', interval: 'monthly' },
  treasuryYield: { fn: 'TREASURY_YIELD', name: 'Treasury Yield 10Y', interval: 'monthly' },
} as const
