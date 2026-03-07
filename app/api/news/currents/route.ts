import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl
  const category = (searchParams.get('category') || 'all').toLowerCase()
  const limit = Math.min(200, parseInt(searchParams.get('limit') || '60', 10))

  const keywords = CATEGORY_KEYWORDS[category] ?? CATEGORY_KEYWORDS['all']

  let articles: CurrentsNewsItem[] = []

  // For 'all', use the multi-topic fetch; for specific categories use single targeted fetch
  if (category === 'all') {
    articles = await fetchCurrentsNews(limit)
  } else {
    // Direct single-category fetch
    const url = new URL('https://api.currentsapi.services/v1/search')
    url.searchParams.set('language', 'en')
    url.searchParams.set('keywords', keywords)
    url.searchParams.set('limit', String(Math.min(200, limit)))

    try {
      const res = await fetch(url.toString(), {
        headers: { Authorization: process.env.CURRENTS_API_KEY! },
        next: { revalidate: 300 },
      })
      if (res.ok) {
        const json = await res.json()
        if (json.status === 'ok') articles = json.news || []
      }
    } catch (err) {
      console.error('[api/news/currents] fetch error:', err)
    }

    // If direct fetch returned nothing, fall back to the multi-search helper
    if (articles.length === 0) {
      articles = await fetchCurrentsNews(limit)
    }
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
