'use server'

/**
 * Currents API news fetcher
 * Filters: finance, stocks, economy, forex, crypto, politics (economic)
 * API docs: https://currentsapi.services/en/docs/
 */

const CURRENTS_BASE = 'https://api.currentsapi.services/v1'

function getApiKey(): string {
  const key = process.env.CURRENTS_API_KEY
  if (!key) throw new Error('CURRENTS_API_KEY not set')
  return key
}

export interface CurrentsNewsItem {
  id: string
  title: string
  description: string
  url: string
  author: string
  image: string | null
  language: string
  category: string[]
  published: string // ISO-8601
}

interface CurrentsResponse {
  status: string
  news: CurrentsNewsItem[]
  page: number
}

/** A single search request to the Currents /v1/search endpoint */
async function fetchSearch(params: Record<string, string>): Promise<CurrentsNewsItem[]> {
  const url = new URL(`${CURRENTS_BASE}/search`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: { Authorization: getApiKey() },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[currents-news] HTTP ${res.status}: ${body}`)
    return []
  }

  const json: CurrentsResponse = await res.json()
  if (json.status !== 'ok') {
    console.error('[currents-news] API error:', json)
    return []
  }

  return json.news || []
}

/**
 * Fetch up to `limit` financial news articles from Currents API.
 * Makes 3 parallel requests to maximise topic coverage, then deduplicates.
 */
export async function fetchCurrentsNews(limit = 200): Promise<CurrentsNewsItem[]> {
  const perRequest = Math.min(200, limit)
  const lang = 'en'

  // Run all requests in parallel for speed
  const [financeArticles, cryptoArticles, politicsArticles] = await Promise.all([
    // ── Finance / Economy / Stocks / Forex ──────────────────────────────────
    fetchSearch({
      language: lang,
      keywords: 'finance economy stocks forex market trading investment rates interest',
      limit: String(perRequest),
    }),

    // ── Crypto / Blockchain ─────────────────────────────────────────────────
    fetchSearch({
      language: lang,
      keywords: 'cryptocurrency bitcoin ethereum crypto blockchain defi token',
      limit: String(perRequest),
    }),

    // ── Economic Politics ────────────────────────────────────────────────────
    fetchSearch({
      language: lang,
      keywords: 'central bank federal reserve ECB monetary policy GDP inflation recession fiscal',
      limit: String(perRequest),
    }),
  ])

  // Deduplicate by URL
  const seen = new Set<string>()
  const combined: CurrentsNewsItem[] = []

  for (const item of [...financeArticles, ...cryptoArticles, ...politicsArticles]) {
    if (!item.url || seen.has(item.url)) continue
    seen.add(item.url)
    combined.push(item)
  }

  // Sort newest first
  combined.sort((a, b) => {
    const ta = a.published ? new Date(a.published).getTime() : 0
    const tb = b.published ? new Date(b.published).getTime() : 0
    return tb - ta
  })

  return combined.slice(0, limit)
}

/**
 * Naive keyword-based sentiment scorer.
 * Returns a score in [-1, 1] and a label.
 */
export async function scoreCurrentsSentiment(title: string, description: string): Promise<{
  score: number
  label: string
}> {
  const text = `${title} ${description}`.toLowerCase()

  const bullish = [
    'surge', 'surges', 'jumped', 'rally', 'rallies', 'gains', 'bullish', 'outperform',
    'record high', 'all-time high', 'beats', 'beat expectations', 'strong', 'growth',
    'profit', 'upgrade', 'upgraded', 'positive', 'recovery', 'soar', 'soaring',
    'boom', 'breakout', 'milestone', 'rising', 'rises',
  ]
  const bearish = [
    'crash', 'drop', 'drops', 'fell', 'fall', 'decline', 'bearish', 'underperform',
    'all-time low', 'misses', 'miss expectations', 'weak', 'recession', 'layoffs',
    'loss', 'downgrade', 'downgraded', 'negative', 'sell-off', 'selloff', 'plunge',
    'plunges', 'risk', 'collapse', 'collapsing', 'fear', 'warning', 'concern',
  ]

  let score = 0
  bullish.forEach((w) => { if (text.includes(w)) score += 0.1 })
  bearish.forEach((w) => { if (text.includes(w)) score -= 0.1 })
  score = Math.max(-1, Math.min(1, score))

  let label: string
  if (score >= 0.2) label = 'Bullish'
  else if (score >= 0.05) label = 'Somewhat-Bullish'
  else if (score <= -0.2) label = 'Bearish'
  else if (score <= -0.05) label = 'Somewhat-Bearish'
  else label = 'Neutral'

  return { score: parseFloat(score.toFixed(4)), label }
}
