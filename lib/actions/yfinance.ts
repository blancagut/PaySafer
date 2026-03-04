const YFINANCE_BASE_URL = 'https://yahoo-finance166.p.rapidapi.com'

type YFinanceNewsListParams = {
  snippetCount?: number
  region?: string
}

function getRequiredEnv(name: 'RAPIDAPI_KEY'): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function getYFinanceHost(): string {
  return process.env.RAPIDAPI_YFINANCE_HOST || process.env.RAPIDAPI_HOST || 'yahoo-finance166.p.rapidapi.com'
}

export async function getYFinanceNewsList({
  snippetCount = 20,
  region = 'US',
}: YFinanceNewsListParams = {}) {
  const rapidApiKey = getRequiredEnv('RAPIDAPI_KEY')
  const rapidApiHost = getYFinanceHost()

  const safeSnippetCount = Number.isFinite(snippetCount)
    ? Math.min(Math.max(Math.floor(snippetCount), 1), 500)
    : 20

  const url = new URL('/api/news/list', YFINANCE_BASE_URL)
  url.searchParams.set('snippetCount', String(safeSnippetCount))
  url.searchParams.set('region', region.toUpperCase())

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': rapidApiHost,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const details = await response.text().catch(() => 'No additional details')
    throw new Error(`YFinance request failed (${response.status}): ${details}`)
  }

  return response.json()
}
