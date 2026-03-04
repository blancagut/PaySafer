const ALPHA_VANTAGE_BASE_URL = 'https://alpha-vantage.p.rapidapi.com'

type OutputSize = 'compact' | 'full'

export type AlphaVantageDailyPoint = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type AlphaVantageDailyResult = {
  symbol: string
  points: AlphaVantageDailyPoint[]
  latestClose: number | null
  previousClose: number | null
  changePercent: number | null
}

function getRapidApiKey(): string {
  const value = process.env.RAPIDAPI_KEY
  if (!value) {
    throw new Error('Missing required environment variable: RAPIDAPI_KEY')
  }
  return value
}

function getAlphaVantageHost(): string {
  return process.env.RAPIDAPI_ALPHA_VANTAGE_HOST || 'alpha-vantage.p.rapidapi.com'
}

function toNumber(value: string | undefined): number {
  const parsed = Number.parseFloat(value || '')
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getAlphaVantageDaily(
  symbol: string,
  outputSize: OutputSize = 'compact'
): Promise<AlphaVantageDailyResult> {
  const normalizedSymbol = symbol.trim().toUpperCase()

  if (!normalizedSymbol) {
    throw new Error('symbol is required')
  }

  const url = new URL('/query', ALPHA_VANTAGE_BASE_URL)
  url.searchParams.set('function', 'TIME_SERIES_DAILY')
  url.searchParams.set('symbol', normalizedSymbol)
  url.searchParams.set('outputsize', outputSize)
  url.searchParams.set('datatype', 'json')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-rapidapi-key': getRapidApiKey(),
      'x-rapidapi-host': getAlphaVantageHost(),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const details = await response.text().catch(() => 'No additional details')
    throw new Error(`Alpha Vantage request failed (${response.status}): ${details}`)
  }

  const payload = await response.json()

  if (payload?.Note || payload?.Information || payload?.['Error Message']) {
    throw new Error(payload.Note || payload.Information || payload['Error Message'])
  }

  const series = payload?.['Time Series (Daily)'] as Record<string, Record<string, string>> | undefined
  if (!series || typeof series !== 'object') {
    throw new Error('Unexpected Alpha Vantage response shape')
  }

  const points = Object.entries(series)
    .map(([date, values]) => ({
      date,
      open: toNumber(values?.['1. open']),
      high: toNumber(values?.['2. high']),
      low: toNumber(values?.['3. low']),
      close: toNumber(values?.['4. close']),
      volume: toNumber(values?.['5. volume']),
    }))
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())

  const latestClose = points[0]?.close ?? null
  const previousClose = points[1]?.close ?? null
  const changePercent =
    latestClose !== null && previousClose !== null && previousClose !== 0
      ? ((latestClose - previousClose) / previousClose) * 100
      : null

  return {
    symbol: normalizedSymbol,
    points,
    latestClose,
    previousClose,
    changePercent,
  }
}
