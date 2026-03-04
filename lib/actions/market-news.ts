'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface MarketNewsItem {
  id: string
  title: string
  url: string
  source: string
  sourceDomain: string
  summary: string
  bannerImage: string | null
  authors: string[]
  sentimentScore: number
  sentimentLabel: string
  timePublished: string
  tickers: string[]
}

/** Cache staleness — 12 hours for news */
const NEWS_STALE_MS = 12 * 60 * 60 * 1000

// ═══════════════════════════════════════════════════════════
// GET MARKET NEWS
// ═══════════════════════════════════════════════════════════

export async function getMarketNews(options?: {
  limit?: number
  ticker?: string
}): Promise<{
  data?: MarketNewsItem[]
  error?: string
}> {
  try {
    const admin = createAdminClient()
    const limit = options?.limit || 20

    // Check if we have recent news
    const { data: latest } = await admin
      .from('market_news')
      .select('fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(1)

    const now = new Date()
    const isStale = !latest || latest.length === 0 ||
      now.getTime() - new Date(latest[0].fetched_at).getTime() > NEWS_STALE_MS

    if (isStale) {
      await refreshMarketNews(options?.ticker)
    }

    // Read from cache
    let query = admin
      .from('market_news')
      .select('*')
      .order('time_published', { ascending: false })
      .limit(limit)

    if (options?.ticker) {
      query = query.contains('tickers', [options.ticker])
    }

    const { data: rows, error } = await query

    if (error) return { error: error.message }

    return {
      data: (rows || []).map(mapNewsRow),
    }
  } catch (err) {
    console.error('[getMarketNews] Error:', err)
    return { error: 'Failed to fetch market news' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNewsRow(row: any): MarketNewsItem {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    source: row.source || '',
    sourceDomain: row.source_domain || '',
    summary: row.summary || '',
    bannerImage: row.banner_image,
    authors: row.authors || [],
    sentimentScore: parseFloat(row.sentiment_score || '0'),
    sentimentLabel: row.sentiment_label || 'Neutral',
    timePublished: row.time_published,
    tickers: row.tickers || [],
  }
}

/**
 * Refresh news from Alpha Vantage NEWS_SENTIMENT.
 * 1 API call per refresh. Returns up to 50 articles.
 */
export async function refreshMarketNews(ticker?: string): Promise<void> {
  try {
    const { getNewsSentiment } = await import('@/lib/alphavantage/client')
    const admin = createAdminClient()

    // Fetch financial news — topics default to finance/economy
    const articles = await getNewsSentiment(
      ticker || 'COIN:BTC,COIN:ETH,FOREX:USD',
      'financial_markets,economy_monetary',
      50,
    )

    for (const article of articles) {
      // Parse the Alpha Vantage time format: "20240615T120000"
      let publishedAt: string
      try {
        const ts = article.timePublished
        if (ts && ts.length >= 15) {
          const formatted = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(9, 11)}:${ts.slice(11, 13)}:${ts.slice(13, 15)}Z`
          publishedAt = new Date(formatted).toISOString()
        } else {
          publishedAt = new Date().toISOString()
        }
      } catch {
        publishedAt = new Date().toISOString()
      }

      const tickers = article.tickerSentiment.map((ts) => ts.ticker)

      await admin.from('market_news').upsert({
        title: article.title,
        url: article.url,
        source: article.source,
        source_domain: article.sourceDomain,
        summary: article.summary,
        banner_image: article.bannerImage,
        authors: article.authors,
        sentiment_score: article.overallSentimentScore,
        sentiment_label: article.overallSentimentLabel,
        time_published: publishedAt,
        tickers,
        fetched_at: new Date().toISOString(),
      }, { onConflict: 'url' }).then(() => {}, (err) => {
        // Ignore duplicate URL conflicts
        if (!err.message?.includes('unique')) {
          console.error('[refreshMarketNews] Insert error:', err)
        }
      })
    }
  } catch (err) {
    console.error('[refreshMarketNews] Error:', err)
  }
}
