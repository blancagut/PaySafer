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
  categories: string[]
}

/** Cache staleness — 2 hours for Currents API news */
const NEWS_STALE_MS = 2 * 60 * 60 * 1000

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
  const limit = options?.limit || 100

  try {
    const admin = createAdminClient()

    // Check if we have recent cached news
    const { data: latest } = await admin
      .from('market_news')
      .select('fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(1)

    const now = new Date()
    const isStale = !latest || latest.length === 0 ||
      now.getTime() - new Date(latest[0].fetched_at).getTime() > NEWS_STALE_MS

    if (isStale) {
      // Fire refresh in background — don't block the response
      refreshMarketNews(options?.ticker).catch(() => {})
    }

    // Read from DB cache
    let query = admin
      .from('market_news')
      .select('*')
      .order('time_published', { ascending: false })
      .limit(limit)

    if (options?.ticker) {
      query = query.contains('tickers', [options.ticker])
    }

    const { data: rows, error } = await query

    if (!error && rows && rows.length > 0) {
      return { data: rows.map(mapNewsRow) }
    }
  } catch (err) {
    console.warn('[getMarketNews] DB unavailable, falling back to direct fetch:', err)
  }

  // ── Direct fallback: fetch from Currents API live ──────────────────────────
  try {
    const { fetchCurrentsNews, scoreCurrentsSentiment } = await import('@/lib/actions/currents-news')
    const articles = await fetchCurrentsNews(limit)

    const items: MarketNewsItem[] = articles.map((a) => {
        const { score, label } = scoreCurrentsSentiment(a.title, a.description)
        let sourceDomain = ''
        try { sourceDomain = new URL(a.url).hostname.replace('www.', '') } catch { /* */ }
        return {
          id: a.id,
          title: a.title,
          url: a.url,
          source: a.author || sourceDomain,
          sourceDomain,
          summary: a.description || '',
          bannerImage: a.image || null,
          authors: a.author ? [a.author] : [],
          sentimentScore: score,
          sentimentLabel: label,
          timePublished: a.published ? new Date(a.published).toISOString() : new Date().toISOString(),
          tickers: [],
          categories: a.category || [],
        }
      })

    return { data: items }
  } catch (err) {
    console.error('[getMarketNews] Direct Currents fetch also failed:', err)
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
    categories: row.categories || [],
  }
}

/**
 * Refresh news — Currents API as primary, Alpha Vantage as fallback.
 * Stores up to 200 articles per cycle (refreshed every 2 h).
 */
export async function refreshMarketNews(ticker?: string): Promise<void> {
  const admin = createAdminClient()

  // ── Primary: Currents API ──────────────────────────────────────────────────
  try {
    const { fetchCurrentsNews, scoreCurrentsSentiment } = await import('@/lib/actions/currents-news')
    const articles = await fetchCurrentsNews(200)

    if (articles.length > 0) {
      for (const article of articles) {
        const { score, label } = scoreCurrentsSentiment(article.title, article.description)

        let publishedAt: string
        try {
          publishedAt = article.published
            ? new Date(article.published).toISOString()
            : new Date().toISOString()
        } catch {
          publishedAt = new Date().toISOString()
        }

        let sourceDomain = ''
        try { sourceDomain = new URL(article.url).hostname.replace('www.', '') } catch { /* */ }

        await admin.from('market_news').upsert({
          title: article.title,
          url: article.url,
          source: article.author || sourceDomain,
          source_domain: sourceDomain,
          summary: article.description || '',
          banner_image: article.image || null,
          authors: article.author ? [article.author] : [],
          sentiment_score: score,
          sentiment_label: label,
          time_published: publishedAt,
          tickers: [],
          categories: article.category || [],
          fetched_at: new Date().toISOString(),
        }, { onConflict: 'url' }).then(() => {}, (err) => {
          if (!err?.message?.includes('unique')) {
            console.error('[refreshMarketNews:currents] Insert error:', err)
          }
        })
      }
      console.log(`[refreshMarketNews] Currents API: stored ${articles.length} articles`)
      return // success — skip Alpha Vantage fallback
    }
  } catch (err) {
    console.warn('[refreshMarketNews] Currents API failed, falling back to Alpha Vantage:', err)
  }

  // ── Fallback: Alpha Vantage NEWS_SENTIMENT ─────────────────────────────────
  try {
    const { getNewsSentiment } = await import('@/lib/alphavantage/client')

    const articles = await getNewsSentiment(
      ticker || 'COIN:BTC,COIN:ETH,FOREX:USD',
      'financial_markets,economy_monetary',
      50,
    )

    for (const article of articles) {
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
        categories: [],
        fetched_at: new Date().toISOString(),
      }, { onConflict: 'url' }).then(() => {}, (err) => {
        if (!err?.message?.includes('unique')) {
          console.error('[refreshMarketNews:alphavantage] Insert error:', err)
        }
      })
    }
    console.log(`[refreshMarketNews] Alpha Vantage fallback: stored ${articles.length} articles`)
  } catch (err) {
    console.error('[refreshMarketNews] Both providers failed:', err)
  }
}
