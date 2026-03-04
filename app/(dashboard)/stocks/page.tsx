"use client"

import { useState, useCallback } from "react"
import {
  Search,
  Loader2,
  Star,
  StarOff,
  TrendingUp,
  TrendingDown,
  Info,
  LineChart,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { GlassInput } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  searchStockSymbols,
  getStockDailyData,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  type StockSearchResult,
  type StockDailyPoint,
  type WatchlistItem,
} from "@/lib/actions/stocks"
import { useEffect } from "react"

export default function StocksPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<StockSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [dailyData, setDailyData] = useState<StockDailyPoint[]>([])
  const [loadingChart, setLoadingChart] = useState(false)
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])

  // Load watchlist on mount
  useEffect(() => {
    getWatchlist().then((r) => {
      if (r.data) setWatchlist(r.data)
    })
  }, [])

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const result = await searchStockSymbols(query)
      if (result.data) setResults(result.data)
      if (result.error) toast.error(result.error)
    } catch {
      toast.error("Search failed")
    } finally {
      setSearching(false)
    }
  }, [query])

  const handleSelectStock = async (symbol: string) => {
    setSelectedSymbol(symbol)
    setLoadingChart(true)
    try {
      const result = await getStockDailyData(symbol)
      if (result.data) setDailyData(result.data.points)
      if (result.error) toast.error(result.error)
    } catch {
      toast.error("Failed to load stock data")
    } finally {
      setLoadingChart(false)
    }
  }

  const handleToggleWatchlist = async (symbol: string, name?: string) => {
    const existing = watchlist.find((w) => w.symbol === symbol)
    if (existing) {
      const result = await removeFromWatchlist(symbol)
      if (result.success) {
        setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol))
        toast.success(`${symbol} removed from watchlist`)
      } else {
        toast.error(result.error || "Failed")
      }
    } else {
      const result = await addToWatchlist(symbol, name)
      if (result.success) {
        setWatchlist((prev) => [{ id: crypto.randomUUID(), symbol, name: name || null, addedAt: new Date().toISOString() }, ...prev])
        toast.success(`${symbol} added to watchlist`)
      } else {
        toast.error(result.error || "Failed")
      }
    }
  }

  const isInWatchlist = (symbol: string) => watchlist.some((w) => w.symbol === symbol)

  // Simple mini chart from daily data
  const latestPrice = dailyData.length > 0 ? dailyData[0].close : null
  const prevPrice = dailyData.length > 1 ? dailyData[1].close : null
  const priceChange = latestPrice && prevPrice ? ((latestPrice - prevPrice) / prevPrice) * 100 : 0

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <LineChart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Stocks</h2>
            <p className="text-sm text-muted-foreground font-light tracking-wide">
              Search & track stock prices
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="animate-fade-in flex gap-2" style={{ animationDelay: "80ms" }}>
        <div className="flex-1">
          <GlassInput
            placeholder="Search stocks (e.g. AAPL, Tesla)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={searching || !query.trim()}>
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span className="ml-1.5 hidden sm:inline">Search</span>
        </Button>
      </div>

      {/* Note about API limits */}
      <p className="text-[10px] text-muted-foreground/40 -mt-4">
        Each search uses 1 API call (25/day limit). Viewing a stock chart uses 1 additional call.
      </p>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="animate-fade-in-up space-y-2" style={{ animationDelay: "120ms" }}>
          <h3 className="text-sm font-medium text-muted-foreground">Search Results</h3>
          {results.map((stock) => (
            <GlassCard
              key={stock.symbol}
              padding="md"
              className="hover:bg-white/[0.06] transition-colors cursor-pointer"
              onClick={() => handleSelectStock(stock.symbol)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{stock.symbol.slice(0, 3)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{stock.symbol}</span>
                    <GlassBadge variant="default" size="sm">{stock.type}</GlassBadge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{stock.name}</p>
                  <p className="text-[10px] text-muted-foreground/50">{stock.region} · {stock.currency}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleWatchlist(stock.symbol, stock.name) }}
                  className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  {isInWatchlist(stock.symbol)
                    ? <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    : <StarOff className="w-4 h-4 text-muted-foreground/40" />}
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Selected Stock Detail */}
      {selectedSymbol && (
        <div className="animate-fade-in-up space-y-4" style={{ animationDelay: "160ms" }}>
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">{selectedSymbol}</h3>
            {latestPrice && (
              <span className="text-sm font-mono text-foreground">
                ${latestPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
            {priceChange !== 0 && (
              <div className="flex items-center gap-0.5">
                {priceChange >= 0
                  ? <TrendingUp className="w-3 h-3 text-emerald-400" />
                  : <TrendingDown className="w-3 h-3 text-red-400" />}
                <span className={cn("text-xs font-mono", priceChange >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {loadingChart ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : dailyData.length > 0 ? (
            <GlassCard padding="md">
              {/* Simple text-based price table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground/60 border-b border-white/[0.06]">
                      <th className="text-left py-2 font-medium">Date</th>
                      <th className="text-right py-2 font-medium">Open</th>
                      <th className="text-right py-2 font-medium">High</th>
                      <th className="text-right py-2 font-medium">Low</th>
                      <th className="text-right py-2 font-medium">Close</th>
                      <th className="text-right py-2 font-medium">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyData.slice(0, 20).map((d, i) => {
                      const prevClose = dailyData[i + 1]?.close
                      const dayChange = prevClose ? ((d.close - prevClose) / prevClose) * 100 : 0
                      return (
                        <tr key={d.date} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="py-1.5 text-foreground">
                            {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                          <td className="py-1.5 text-right font-mono text-muted-foreground">${d.open.toFixed(2)}</td>
                          <td className="py-1.5 text-right font-mono text-muted-foreground">${d.high.toFixed(2)}</td>
                          <td className="py-1.5 text-right font-mono text-muted-foreground">${d.low.toFixed(2)}</td>
                          <td className={cn("py-1.5 text-right font-mono", dayChange >= 0 ? "text-emerald-400" : "text-red-400")}>
                            ${d.close.toFixed(2)}
                          </td>
                          <td className="py-1.5 text-right font-mono text-muted-foreground/60">
                            {(d.volume / 1_000_000).toFixed(1)}M
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
          )}
        </div>
      )}

      {/* Watchlist */}
      {watchlist.length > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-yellow-400" /> Your Watchlist
          </h3>
          <div className="flex flex-wrap gap-2">
            {watchlist.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectStock(item.symbol)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-sm"
              >
                <span className="font-medium text-foreground">{item.symbol}</span>
                {item.name && <span className="text-xs text-muted-foreground/60 hidden sm:inline">{item.name}</span>}
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleWatchlist(item.symbol) }}
                  className="ml-1 p-0.5 rounded hover:bg-white/[0.1]"
                >
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="animate-fade-in flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]" style={{ animationDelay: "280ms" }}>
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground/70">
          Stock data powered by Alpha Vantage (free tier, 25 calls/day). Prices may be delayed 15-20 min.
          Not financial advice.
        </p>
      </div>
    </div>
  )
}
