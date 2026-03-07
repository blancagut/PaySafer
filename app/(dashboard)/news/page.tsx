"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Newspaper,
  Loader2,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Globe,
  Briefcase,
  Coins,
  ArrowLeftRight,
  Landmark,
  Scale,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface NewsArticle {
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

interface NewsApiResponse {
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

// ─── Category config ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "All", icon: Globe },
  { id: "finance", label: "Finance", icon: Briefcase },
  { id: "crypto", label: "Crypto", icon: Coins },
  { id: "forex", label: "Forex", icon: ArrowLeftRight },
  { id: "stocks", label: "Stocks", icon: TrendingUp },
  { id: "economy", label: "Economy", icon: Landmark },
  { id: "politics", label: "Politics", icon: Scale },
] as const

type CategoryId = (typeof CATEGORIES)[number]["id"]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function sentimentColors(label: string) {
  const l = label.toLowerCase()
  if (l.includes("bullish")) return { text: "text-emerald-400", badge: "emerald" as const, icon: TrendingUp  }
  if (l.includes("bearish")) return { text: "text-red-400",     badge: "red" as const,     icon: TrendingDown }
  return                             { text: "text-zinc-400",    badge: "default" as const, icon: Minus       }
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/5 bg-white/[0.03] p-4 space-y-3">
      <div className="h-4 w-3/4 rounded bg-white/10" />
      <div className="h-3 w-full rounded bg-white/5" />
      <div className="h-3 w-5/6 rounded bg-white/5" />
      <div className="flex gap-2 mt-2">
        <div className="h-5 w-16 rounded-full bg-white/10" />
        <div className="h-5 w-16 rounded-full bg-white/10" />
      </div>
    </div>
  )
}

// ─── Article card ─────────────────────────────────────────────────────────────
function ArticleCard({ article }: { article: NewsArticle }) {
  const { text, badge, icon: SentIcon } = sentimentColors(article.sentiment.label)

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200 overflow-hidden"
    >
      {/* Thumbnail */}
      {article.image && (
        <div className="relative w-full h-40 overflow-hidden bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
          />
        </div>
      )}

      <div className="p-4 space-y-2">
        {/* Title */}
        <h3 className="text-sm font-semibold text-white/90 line-clamp-2 leading-snug group-hover:text-white transition-colors">
          {article.title}
        </h3>

        {/* Description */}
        {article.description && (
          <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
            {article.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-white/40 truncate max-w-[100px]">
              {article.sourceDomain || article.author || "News"}
            </span>
            <span className="flex items-center gap-1 text-xs text-white/30 shrink-0">
              <Clock className="w-3 h-3" />
              {timeAgo(article.published)}
            </span>
          </div>

          <GlassBadge variant={badge} className="flex items-center gap-1 shrink-0 text-xs">
            <SentIcon className={cn("w-3 h-3", text)} />
            <span className={cn("hidden sm:inline", text)}>{article.sentiment.label}</span>
          </GlassBadge>
        </div>

        {/* Category chips (max 3) */}
        {article.category.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {article.category.slice(0, 3).map((c) => (
              <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/5 capitalize">
                {c}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-white/20 group-hover:text-white/40 transition-colors">
          <ExternalLink className="w-3 h-3" />
          <span>Read full article</span>
        </div>
      </div>
    </a>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all")
  const [data, setData] = useState<NewsApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  const fetchCategory = useCallback(async (cat: CategoryId, silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)

    try {
      const res = await fetch(`/api/news/currents?category=${cat}&limit=60`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: NewsApiResponse = await res.json()
      setData(json)
    } catch (err) {
      console.error("[NewsPage] fetch error:", err)
      setError("Failed to load news. Please try again.")
      if (silent) toast.error("Could not refresh news")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchCategory(activeCategory)
  }, [activeCategory, fetchCategory])

  function handleTabClick(cat: CategoryId) {
    if (cat === activeCategory) return
    setActiveCategory(cat)
  }

  function scrollTabs(dir: "left" | "right") {
    if (!tabsRef.current) return
    tabsRef.current.scrollBy({ left: dir === "left" ? -160 : 160, behavior: "smooth" })
  }

  const stats = data?.stats
  const bullishPct = stats ? Math.round((stats.bullish / Math.max(1, stats.total)) * 100) : 0
  const bearishPct = stats ? Math.round((stats.bearish / Math.max(1, stats.total)) * 100) : 0

  return (
    <div className="space-y-6 pb-20">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-primary" />
            Market News
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Market news is updated regularly. Not financial advice.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchCategory(activeCategory, true)}
          disabled={refreshing || loading}
          className="shrink-0"
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* ── Category tab slider ─────────────────────────────────────────────── */}
      <div className="relative">
        <button
          onClick={() => scrollTabs("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/80 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={tabsRef}
          className="flex gap-2 overflow-x-auto scrollbar-none px-8 py-1 scroll-smooth"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style={{ WebkitOverflowScrolling: "touch" } as any}
        >
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabClick(id as CategoryId)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium shrink-0 transition-all duration-200",
                activeCategory === id
                  ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "border-white/10 text-white/60 hover:border-white/20 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => scrollTabs("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/80 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      {stats && !loading && (
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="p-3 text-center space-y-0.5">
            <div className="text-xs text-white/40 uppercase tracking-wider">Articles</div>
            <div className="text-lg font-bold text-white">{stats.total}</div>
          </GlassCard>
          <GlassCard className="p-3 text-center space-y-0.5">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <div className="text-xs text-white/40 uppercase tracking-wider">Bullish</div>
            </div>
            <div className="text-lg font-bold text-emerald-400">{bullishPct}%</div>
          </GlassCard>
          <GlassCard className="p-3 text-center space-y-0.5">
            <div className="flex items-center justify-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <div className="text-xs text-white/40 uppercase tracking-wider">Bearish</div>
            </div>
            <div className="text-lg font-bold text-red-400">{bearishPct}%</div>
          </GlassCard>
        </div>
      )}

      {/* ── Sentiment blend bar ────────────────────────────────────────────── */}
      {stats && !loading && stats.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-white/40">
            <span className="flex items-center gap-1">
              <BarChart2 className="w-3 h-3" /> Sentiment mix
            </span>
            <span>{stats.bullish}B · {stats.neutral}N · {stats.bearish}Be</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            {stats.bullish > 0 && <div className="bg-emerald-500 rounded-l-full" style={{ flex: stats.bullish }} />}
            {stats.neutral > 0 && <div className="bg-zinc-500"                   style={{ flex: stats.neutral }} />}
            {stats.bearish > 0 && <div className="bg-red-500 rounded-r-full"     style={{ flex: stats.bearish }} />}
          </div>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <GlassCard className="p-8 text-center space-y-4">
          <Newspaper className="w-10 h-10 text-white/20 mx-auto" />
          <p className="text-white/60">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchCategory(activeCategory)}>
            Try again
          </Button>
        </GlassCard>
      ) : !data || data.articles.length === 0 ? (
        <GlassCard className="p-8 text-center space-y-2">
          <Newspaper className="w-10 h-10 text-white/20 mx-auto" />
          <p className="text-white/60">No articles found for this category.</p>
          <p className="text-xs text-white/30">Try another category or refresh.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* ── Footer disclaimer ──────────────────────────────────────────────── */}
      <p className="text-center text-xs text-white/20 pt-2">
        Market news is updated regularly. Sentiment scores are estimates only. Not financial advice.
      </p>
    </div>
  )
}
