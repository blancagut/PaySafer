"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Newspaper,
  Loader2,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Info,
  Tag,
} from "lucide-react"
import { GlassCard, GlassStat } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getMarketNews, type MarketNewsItem } from "@/lib/actions/market-news"

function sentimentColor(label: string): string {
  const lower = label.toLowerCase()
  if (lower.includes("bullish") || lower.includes("positive")) return "text-emerald-400"
  if (lower.includes("bearish") || lower.includes("negative")) return "text-red-400"
  return "text-muted-foreground"
}

function sentimentBadgeVariant(label: string): "emerald" | "red" | "default" {
  const lower = label.toLowerCase()
  if (lower.includes("bullish") || lower.includes("positive")) return "emerald"
  if (lower.includes("bearish") || lower.includes("negative")) return "red"
  return "default"
}

function SentimentIcon({ label }: { label: string }) {
  const lower = label.toLowerCase()
  if (lower.includes("bullish") || lower.includes("positive"))
    return <TrendingUp className="w-4 h-4 text-emerald-400" />
  if (lower.includes("bearish") || lower.includes("negative"))
    return <TrendingDown className="w-4 h-4 text-red-400" />
  return <Minus className="w-4 h-4 text-muted-foreground" />
}

export default function NewsPage() {
  const [news, setNews] = useState<MarketNewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchNews = useCallback(async () => {
    try {
      const result = await getMarketNews({ limit: 100 })
      if (result.data) {
        setNews(result.data)
        setError(null)
      } else if (result.error) {
        setError(result.error)
      }
    } catch {
      setError("Failed to load news")
    }
  }, [])

  useEffect(() => {
    fetchNews().finally(() => setLoading(false))
  }, [fetchNews])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchNews()
    toast.success("News updated")
    setRefreshing(false)
  }

  // Compute sentiment stats
  const bullishCount = news.filter((n) => n.sentimentLabel.toLowerCase().includes("bullish") || n.sentimentLabel.toLowerCase().includes("positive")).length
  const bearishCount = news.filter((n) => n.sentimentLabel.toLowerCase().includes("bearish") || n.sentimentLabel.toLowerCase().includes("negative")).length
  const neutralCount = news.length - bullishCount - bearishCount

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading market news...</p>
        </div>
      </div>
    )
  }

  if (error && news.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Newspaper className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-foreground font-medium mb-1">Could not load news</p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Try again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Market News</h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Finance · Stocks · Crypto · Forex · Economy · Politics
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("w-4 h-4 mr-1.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Sentiment Overview */}
      {news.length > 0 && (
        <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ animationDelay: "80ms" }}>
          <GlassStat
            icon={<Newspaper className="w-4 h-4" />}
            label="Articles"
            value={String(news.length)}
          />
          <GlassStat icon={<TrendingUp className="w-4 h-4" />} label="Bullish" value={String(bullishCount)} glowColor="emerald" />
          <GlassStat icon={<TrendingDown className="w-4 h-4" />} label="Bearish" value={String(bearishCount)} glowColor="red" />
          <GlassStat icon={<Minus className="w-4 h-4" />} label="Neutral" value={String(neutralCount)} glowColor="blue" />
        </div>
      )}

      {/* News Feed */}
      <div className="animate-fade-in-up space-y-3" style={{ animationDelay: "160ms" }}>
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <GlassCard padding="md" className="hover:bg-white/[0.06] transition-all group">
              <div className="flex gap-4">
                {/* Sentiment indicator */}
                <div className="shrink-0 pt-1">
                  <SentimentIcon label={item.sentimentLabel} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                  </div>

                  {item.summary && (
                    <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{item.summary}</p>
                  )}

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground/50">{item.source}</span>

                    <GlassBadge variant={sentimentBadgeVariant(item.sentimentLabel)} size="sm">
                      {item.sentimentLabel}
                    </GlassBadge>

                    <span className={cn("text-[10px] font-mono", sentimentColor(item.sentimentLabel))}>
                      {item.sentimentScore >= 0 ? "+" : ""}{item.sentimentScore.toFixed(3)}
                    </span>

                    {item.tickers.length > 0 && (
                      <div className="flex gap-1">
                        {item.tickers.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-muted-foreground">{t}</span>
                        ))}
                        {item.tickers.length > 3 && (
                          <span className="text-[10px] text-muted-foreground/40">+{item.tickers.length - 3}</span>
                        )}
                      </div>
                    )}

                    {item.categories?.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5 text-muted-foreground/40" />
                        {item.categories.slice(0, 2).map((cat: string) => (
                          <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/70 capitalize">
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.timePublished && (
                      <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(item.timePublished).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Banner image if available */}
                {item.bannerImage && (
                  <div className="hidden sm:block shrink-0 w-20 h-16 rounded-lg overflow-hidden bg-white/[0.05]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.bannerImage}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                  </div>
                )}
              </div>
            </GlassCard>
          </a>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="animate-fade-in flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]" style={{ animationDelay: "240ms" }}>
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground/70">
          Market news is updated regularly. Sentiment scores are estimates
          and should not be used as the sole basis for financial decisions.
        </p>
      </div>
    </div>
  )
}
