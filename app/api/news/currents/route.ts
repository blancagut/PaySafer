import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchCurrentsNews, scoreCurrentsSentiment, CurrentsNewsItem } from '@/lib/actions/currents-news'

export const runtime = 'nodejs'
export const revalidate = 300 // 5 min edge cache

// ─── Category → keyword mapping ──────────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string> = {
  all:      'finance economy stocks forex cryptocurrency market trading investment banking',
  finance:  'finance investment banking interest rates bonds Treasury Wall Street earnings',
  crypto:   'cryptocurrency bitcoin ethereum crypto blockchain defi solana ripple token NFT',
  forex:    'forex foreign exchange currency dollar euro pound yen sterling exchange rate',
  stocks:   'stocks equity shares earnings NYSE NASDAQ dividends IPO quarterly results',
  economy:  'economy GDP inflation recession CPI unemployment central bank monetary policy stimulus',
  politics: 'government federal reserve ECB policy regulation sanctions trade war tariff sanctions',
}

export interface NewsArticle {
  id: string
  title: string
  description: string
  url: string
  author: string
  image: string | null
  category: string[]
  published: string
  sourceDomain: string
  sentiment: {
    score: number
    label: string
  }
}

export interface NewsApiResponse {
  articles: NewsArticle[]
  stats: {
    total: number
    bullish: number
    bearish: number
    neutral: number
  }
  category: string
  fetchedAt: string
}

const CATEGORY_FILTERS: Record<string, string[]> = {
  all: [],
  finance: ['finance', 'bank', 'banking', 'invest', 'earnings', 'interest', 'bond', 'treasury', 'wall street'],
  crypto: ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'token', 'defi', 'solana', 'ripple'],
  forex: ['forex', 'currency', 'exchange rate', 'dollar', 'euro', 'yen', 'sterling', 'fx'],
  stocks: ['stock', 'stocks', 'shares', 'equity', 'nasdaq', 'nyse', 'ipo', 'dividend'],
  economy: ['economy', 'gdp', 'inflation', 'recession', 'cpi', 'unemployment', 'central bank', 'monetary'],
  politics: ['government', 'policy', 'regulation', 'sanction', 'tariff', 'trade war', 'federal reserve', 'ecb'],
}

function matchesCategory(article: CurrentsNewsItem, category: string): boolean {
  if (category === 'all') return true

  const haystack = [
    article.title,
    article.description,
    article.author,
    ...(article.category || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return (CATEGORY_FILTERS[category] || []).some((term) => haystack.includes(term))
}

async function readCachedArticles(limit: number): Promise<CurrentsNewsItem[]> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('market_news')
      .select('id, title, summary, url, source, banner_image, time_published')
      .order('time_published', { ascending: false })
      .limit(Math.max(limit, 60))

    if (error || !data?.length) return []

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.summary || '',
      url: row.url,
      author: row.source || '',
      image: row.banner_image || null,
      language: 'en',
      category: [],
      published: row.time_published || new Date().toISOString(),
    }))
  } catch (error) {
    console.warn('[api/news/currents] cache fallback unavailable:', error)
    return []
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl
  const category = (searchParams.get('category') || 'all').toLowerCase()
  const limit = Math.min(200, parseInt(searchParams.get('limit') || '60', 10))

  let articles: CurrentsNewsItem[] = []

  try {
    articles = await fetchCurrentsNews(Math.max(limit, 60))
  } catch (error) {
    console.error('[api/news/currents] live fetch failed:', error)
  }

  if (articles.length === 0) {
    articles = await readCachedArticles(limit)
  }

  if (category !== 'all') {
    articles = articles.filter((article) => matchesCategory(article, category))
  }

  if (articles.length === 0 && category !== 'all') {
    const fallbackArticles = await readCachedArticles(limit)
    articles = fallbackArticles.filter((article) => matchesCategory(article, category))
  }

  // Score sentiment + build response
  const scored: NewsArticle[] = articles.map((a) => {
    const { score, label } = scoreCurrentsSentiment(a.title, a.description)
    let sourceDomain = ''
    try { sourceDomain = new URL(a.url).hostname.replace('www.', '') } catch { /* */ }
    return {
      id: a.id,
      title: a.title,
      description: a.description || '',
      url: a.url,
      author: a.author || sourceDomain,
      image: a.image || null,
      category: a.category || [],
      published: a.published || new Date().toISOString(),
      sourceDomain,
      sentiment: { score, label },
    }
  })

  // Compute stats
  let bullish = 0, bearish = 0, neutral = 0
  for (const a of scored) {
    const lbl = a.sentiment.label.toLowerCase()
    if (lbl.includes('bullish')) bullish++
    else if (lbl.includes('bearish')) bearish++
    else neutral++
  }

  const response: NewsApiResponse = {
    articles: scored.slice(0, limit),
    stats: { total: scored.length, bullish, bearish, neutral },
    category,
    fetchedAt: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  })
}
