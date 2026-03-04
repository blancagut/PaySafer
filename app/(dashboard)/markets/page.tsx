"use client"

import { useState, useEffect, useCallback } from "react"
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw,
  Landmark,
  Gem,
  Fuel,
  Flame,
  BarChart3,
  Clock,
  Info,
} from "lucide-react"
import { GlassCard, GlassStat } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getCommodityPrices, type CommodityPrice } from "@/lib/actions/commodities"
import { getEconomicIndicators, type EconomicIndicator } from "@/lib/actions/economic"

// ─── Commodity display config ───

const COMMODITY_META: Record<string, { icon: typeof Gem; color: string }> = {
  GOLD:        { icon: Gem,   color: "text-yellow-400" },
  SILVER:      { icon: Gem,   color: "text-gray-400" },
  WTI:         { icon: Fuel,  color: "text-amber-500" },
  NATURAL_GAS: { icon: Flame, color: "text-blue-400" },
  COPPER:      { icon: Gem,   color: "text-orange-400" },
}

// ─── Economic indicator display config ───

const INDICATOR_META: Record<string, { description: string }> = {
  REAL_GDP:            { description: "Total economic output (quarterly)" },
  INFLATION:           { description: "Annual inflation rate (%)" },
  UNEMPLOYMENT:        { description: "Monthly unemployment rate (%)" },
  FEDERAL_FUNDS_RATE:  { description: "Fed interest rate target (%)" },
  CPI:                 { description: "Consumer Price Index" },
  TREASURY_YIELD:      { description: "10-Year Treasury Yield (%)" },
}

export default function MarketsPage() {
  const [commodities, setCommodities] = useState<CommodityPrice[]>([])
  const [indicators, setIndicators] = useState<EconomicIndicator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [commResult, ecoResult] = await Promise.all([
        getCommodityPrices(),
        getEconomicIndicators(),
      ])

      if (commResult.data) setCommodities(commResult.data)
      if (ecoResult.data) setIndicators(ecoResult.data)

      if (commResult.error && ecoResult.error) {
        setError("Failed to load market data")
      } else {
        setError(null)
      }
    } catch {
      setError("Failed to load market data")
    }
  }, [])

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    toast.success("Market data updated")
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading market data...</p>
        </div>
      </div>
    )
  }

  if (error && commodities.length === 0 && indicators.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-foreground font-medium mb-1">Could not load market data</p>
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
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Markets</h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Commodities & economic indicators
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("w-4 h-4 mr-1.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Commodities Section */}
      <div className="animate-fade-in" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center gap-2 mb-4">
          <Gem className="w-4 h-4 text-yellow-400" />
          <h3 className="text-lg font-semibold text-foreground">Commodities</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {commodities.map((c) => {
            const meta = COMMODITY_META[c.symbol] || { icon: Gem, color: "text-muted-foreground" }
            const Icon = meta.icon
            return (
              <GlassCard key={c.symbol} padding="md" className="hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center">
                    <Icon className={cn("w-5 h-5", meta.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-foreground">
                      ${c.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {c.changePct !== 0 && (
                      <div className="flex items-center justify-end gap-0.5">
                        {c.changePct >= 0
                          ? <TrendingUp className="w-3 h-3 text-emerald-400" />
                          : <TrendingDown className="w-3 h-3 text-red-400" />}
                        <span className={cn("text-xs font-mono", c.changePct >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {c.changePct >= 0 ? "+" : ""}{c.changePct.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <Clock className="w-3 h-3 text-muted-foreground/40" />
                  <span className="text-[10px] text-muted-foreground/40">
                    Updated {new Date(c.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </div>

      {/* Economic Indicators Section */}
      <div className="animate-fade-in" style={{ animationDelay: "160ms" }}>
        <div className="flex items-center gap-2 mb-4">
          <Landmark className="w-4 h-4 text-blue-400" />
          <h3 className="text-lg font-semibold text-foreground">Economic Indicators</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {indicators.map((ind) => {
            const meta = INDICATOR_META[ind.indicator] || { description: ind.interval }
            const isPercent = ind.unit === 'percent' || ind.unit === '%'
            const isCurrency = ind.unit.includes('dollar') || ind.unit.includes('USD')

            let formatted: string
            if (isCurrency) {
              formatted = `$${(ind.latestValue / 1).toLocaleString(undefined, { maximumFractionDigits: 1 })}B`
            } else if (isPercent) {
              formatted = `${ind.latestValue.toFixed(2)}%`
            } else {
              formatted = ind.latestValue.toLocaleString(undefined, { maximumFractionDigits: 2 })
            }

            return (
              <GlassStat
                key={ind.indicator}
                icon={<BarChart3 className="w-4 h-4" />}
                label={ind.name}
                value={formatted}
              />
            )
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="animate-fade-in flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]" style={{ animationDelay: "240ms" }}>
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground/70">
          Market data powered by Alpha Vantage. Prices may be delayed. Economic indicators updated {" "}
          weekly. Not financial advice.
        </p>
      </div>
    </div>
  )
}
