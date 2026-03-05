"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Bitcoin,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw,
  Wallet,
  Info,
  ChevronRight,
  Clock,
  AlertTriangle,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  getCryptoHoldings,
  getCryptoTradeHistory,
  executeCryptoBuy,
  executeCryptoSell,
} from "@/lib/actions/crypto"
import type { CryptoPrice, CryptoHolding, CryptoTrade } from "@/lib/binance/types"
import { SUPPORTED_TRADING_PAIRS } from "@/lib/binance/types"

// ─── Asset config (colors/icons for display) ───

const ASSET_META: Record<string, { color: string; logo: string; name: string }> = {
  BTC:  { color: "bg-orange-500", logo: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png", name: "Bitcoin" },
  ETH:  { color: "bg-indigo-500", logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png", name: "Ethereum" },
  SOL:  { color: "bg-purple-500", logo: "https://assets.coingecko.com/coins/images/4128/small/solana.png", name: "Solana" },
  BNB:  { color: "bg-yellow-500", logo: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png", name: "BNB" },
  XRP:  { color: "bg-blue-500",   logo: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png", name: "XRP" },
  ADA:  { color: "bg-blue-600",   logo: "https://assets.coingecko.com/coins/images/975/small/cardano.png", name: "Cardano" },
  AVAX: { color: "bg-red-500",    logo: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png", name: "Avalanche" },
  USDT: { color: "bg-green-500",  logo: "https://assets.coingecko.com/coins/images/325/small/Tether.png", name: "Tether" },
  USDC: { color: "bg-blue-400",   logo: "https://assets.coingecko.com/coins/images/6319/small/usdc.png", name: "USD Coin" },
}

interface DisplayAsset {
  symbol: string
  name: string
  price: number
  change24h: number
  holdings: number
  avgBuyPrice: number
  color: string
  logo: string
}

type Tab = "market" | "portfolio" | "history"
type TradeType = "buy" | "sell"

const FEE_RATE = 0.005 // 0.5%

export default function CryptoPage() {
  // ─── State ───
  const [assets, setAssets] = useState<DisplayAsset[]>([])
  const [trades, setTrades] = useState<CryptoTrade[]>([])
  const [tab, setTab] = useState<Tab>("market")
  const [showTrade, setShowTrade] = useState<string | null>(null)
  const [tradeType, setTradeType] = useState<TradeType>("buy")
  const [tradeAmount, setTradeAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [confirmStep, setConfirmStep] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Data fetching ───

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/crypto/prices")
      if (!res.ok) {
        console.error("Price API returned", res.status)
        setLoadError("Failed to load prices (API error)")
        return
      }
      const json = await res.json()
      const prices = json.prices as CryptoPrice[] | undefined

      if (!prices || prices.length === 0) {
        console.warn("Price API returned empty prices")
        if (assets.length === 0) setLoadError("No price data available")
        return
      }

      setLoadError(null)

      setAssets((prev) => {
        const holdingsMap = new Map(prev.map((a) => [a.symbol, { holdings: a.holdings, avgBuyPrice: a.avgBuyPrice }]))
        const all: DisplayAsset[] = []

        for (const p of prices) {
          const meta = ASSET_META[p.symbol] || { color: "bg-gray-500", logo: "", name: p.symbol }
          const h = holdingsMap.get(p.symbol)
          all.push({
            symbol: p.symbol,
            name: meta.name,
            price: p.price,
            change24h: p.change24h,
            holdings: h?.holdings ?? 0,
            avgBuyPrice: h?.avgBuyPrice ?? 0,
            color: meta.color,
            logo: meta.logo,
          })
        }

        all.sort((a, b) => {
          if (a.holdings > 0 && b.holdings === 0) return -1
          if (a.holdings === 0 && b.holdings > 0) return 1
          const order = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "AVAX", "USDT", "USDC"]
          return order.indexOf(a.symbol) - order.indexOf(b.symbol)
        })

        return all
      })

      setLastUpdate(new Date())
    } catch (err) {
      console.error("Failed to fetch prices:", err)
      if (assets.length === 0) setLoadError("Network error fetching prices")
    }
  }, [assets.length])

  const fetchHoldings = useCallback(async () => {
    try {
      const result = await getCryptoHoldings()
      if (result.data) {
        setAssets((prev) =>
          prev.map((a) => {
            const holding = result.data!.find((h: CryptoHolding) => h.symbol === a.symbol)
            return holding
              ? { ...a, holdings: holding.amount, avgBuyPrice: holding.avgBuyPrice }
              : { ...a, holdings: 0, avgBuyPrice: 0 }
          })
        )
      }
    } catch (err) {
      console.error("Failed to fetch holdings:", err)
    }
  }, [])

  const fetchTrades = useCallback(async () => {
    try {
      const result = await getCryptoTradeHistory({ limit: 20 })
      if (result.data) setTrades(result.data)
    } catch (err) {
      console.error("Failed to fetch trades:", err)
    }
  }, [])

  // ─── Initial load ───
  useEffect(() => {
    async function init() {
      await fetchPrices()
      await Promise.all([fetchHoldings(), fetchTrades()])
      setInitialLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Price polling every 5 minutes (Alpha Vantage free tier = 25 calls/day) ───
  useEffect(() => {
    pollRef.current = setInterval(fetchPrices, 300_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchPrices])

  // ─── Computed ───
  const portfolio = assets.filter((a) => a.holdings > 0)
  const portfolioValue = portfolio.reduce((sum, a) => sum + a.holdings * a.price, 0)
  const tradableAssets = assets.filter((a) => SUPPORTED_TRADING_PAIRS[a.symbol])

  // ─── Handlers ───

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchPrices()
    await fetchHoldings()
    toast.success("Prices updated")
    setRefreshing(false)
  }

  const handleTrade = async () => {
    const amount = parseFloat(tradeAmount)
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return }
    const asset = assets.find((a) => a.symbol === showTrade)
    if (!asset) return

    // Show confirmation step first
    if (!confirmStep) { setConfirmStep(true); return }

    setLoading(true)
    try {
      if (tradeType === "buy") {
        const result = await executeCryptoBuy({ symbol: asset.symbol, amountUsd: amount })
        if (result.error) { toast.error(result.error); setLoading(false); return }
        toast.success(`Bought ${result.data!.cryptoAmount.toFixed(6)} ${asset.symbol}`, {
          description: `$${result.data!.quoteAmount.toFixed(2)} debited (fee: $${result.data!.feeAmount.toFixed(2)})`,
        })
      } else {
        const cryptoAmount = amount / asset.price
        const result = await executeCryptoSell({ symbol: asset.symbol, amountCrypto: cryptoAmount })
        if (result.error) { toast.error(result.error); setLoading(false); return }
        toast.success(`Sold ${result.data!.cryptoAmount.toFixed(6)} ${asset.symbol}`, {
          description: `$${(result.data!.quoteAmount - result.data!.feeAmount).toFixed(2)} credited (fee: $${result.data!.feeAmount.toFixed(2)})`,
        })
      }
      await Promise.all([fetchPrices(), fetchHoldings(), fetchTrades()])
      setShowTrade(null); setTradeAmount(""); setConfirmStep(false)
    } catch { toast.error("Trade failed. Please try again.") }
    finally { setLoading(false) }
  }

  const closeTradeDialog = () => { setShowTrade(null); setTradeAmount(""); setConfirmStep(false) }

  const timeSinceUpdate = lastUpdate ? Math.round((Date.now() - lastUpdate.getTime()) / 1000) : null

  const tabs: { key: Tab; label: string }[] = [
    { key: "market", label: "Market" },
    { key: "portfolio", label: "Portfolio" },
    { key: "history", label: "History" },
  ]

  // ─── Loading state ───
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading crypto markets...</p>
        </div>
      </div>
    )
  }

  if (loadError && assets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-foreground font-medium mb-1">Could not load crypto data</p>
          <p className="text-xs text-muted-foreground mb-4">{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => { setLoadError(null); setInitialLoading(true); fetchPrices().then(() => setInitialLoading(false)) }}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Try again
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
              <Bitcoin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Crypto
              </h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Buy, sell & hold cryptocurrency
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {timeSinceUpdate !== null && (
              <span className="text-[10px] text-muted-foreground/50 hidden sm:block">
                <Clock className="w-3 h-3 inline mr-0.5" />
                {timeSinceUpdate < 60 ? "just now" : timeSinceUpdate < 3600 ? `${Math.round(timeSinceUpdate / 60)}m ago` : `${Math.round(timeSinceUpdate / 3600)}h ago`}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="text-sm">
              <RefreshCw className={cn("w-4 h-4 mr-1.5", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="animate-fade-in" style={{ animationDelay: "80ms" }}>
        <GlassCard padding="md" variant="glow">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Portfolio Value</span>
              <span className="text-2xl font-semibold font-mono text-foreground">
                ${portfolioValue.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block mb-1">{portfolio.length} assets</span>
              <div className="flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-primary font-medium">Live prices</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Tabs */}
      <div className="animate-fade-in flex gap-1 p-0.5 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit" style={{ animationDelay: "120ms" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === t.key ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Market Tab */}
      {tab === "market" && (
        <div className="animate-fade-in-up space-y-2" style={{ animationDelay: "180ms" }}>
          {assets.length === 0 ? (
            <div className="text-center py-16">
              <AlertTriangle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Unable to load market data</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Check your connection and try refreshing</p>
            </div>
          ) : (
            tradableAssets.map((asset) => (
              <GlassCard
                key={asset.symbol}
                padding="none"
                className="hover:bg-white/[0.06] transition-colors cursor-pointer"
                onClick={() => { setShowTrade(asset.symbol); setTradeType("buy"); setConfirmStep(false) }}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden", asset.color)}>
                    <img src={asset.logo} alt={asset.symbol} className="w-7 h-7 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{asset.name}</span>
                      <span className="text-xs text-muted-foreground">{asset.symbol}</span>
                    </div>
                    {asset.holdings > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {asset.holdings.toFixed(asset.holdings < 1 ? 6 : 2)} {asset.symbol} · ${(asset.holdings * asset.price).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-mono text-foreground">
                      ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <div className="flex items-center justify-end gap-0.5 mt-0.5">
                      {asset.change24h >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-400" />
                      )}
                      <span className={cn("text-xs font-mono", asset.change24h >= 0 ? "text-emerald-400" : "text-red-400")}>
                        {asset.change24h >= 0 ? "+" : ""}{asset.change24h.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                </div>
              </GlassCard>
            ))
          )}

          {/* Stablecoins section */}
          {assets.filter((a) => a.symbol === "USDT" || a.symbol === "USDC").length > 0 && (
            <div className="pt-4">
              <p className="text-xs text-muted-foreground/50 uppercase tracking-wider mb-2 px-1">Stablecoins</p>
              {assets.filter((a) => a.symbol === "USDT" || a.symbol === "USDC").map((asset) => (
                <GlassCard key={asset.symbol} padding="none" className="mb-2">
                  <div className="flex items-center gap-4 p-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden", asset.color)}>
                      <img src={asset.logo} alt={asset.symbol} className="w-7 h-7 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{asset.name}</span>
                        <span className="text-xs text-muted-foreground">{asset.symbol}</span>
                      </div>
                      {asset.holdings > 0 && (
                        <span className="text-xs text-muted-foreground">{asset.holdings.toFixed(2)} {asset.symbol}</span>
                      )}
                    </div>
                    <span className="text-sm font-mono text-foreground">$1.00</span>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Portfolio Tab */}
      {tab === "portfolio" && (
        <div className="animate-fade-in-up space-y-4" style={{ animationDelay: "180ms" }}>
          {portfolio.length === 0 ? (
            <div className="text-center py-16">
              <Bitcoin className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No crypto holdings yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Buy your first cryptocurrency from the Market tab</p>
            </div>
          ) : (
            <>
              {/* Allocation bar */}
              <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                {portfolio.map((a) => (
                  <div
                    key={a.symbol}
                    className={cn("h-full transition-all", a.color)}
                    style={{ width: `${((a.holdings * a.price) / portfolioValue) * 100}%` }}
                    title={`${a.symbol}: ${(((a.holdings * a.price) / portfolioValue) * 100).toFixed(1)}%`}
                  />
                ))}
              </div>

              <div className="space-y-2">
                {portfolio.map((asset) => {
                  const value = asset.holdings * asset.price
                  const pct = (value / portfolioValue) * 100
                  const pnl = asset.avgBuyPrice > 0 ? ((asset.price - asset.avgBuyPrice) / asset.avgBuyPrice) * 100 : 0
                  return (
                    <GlassCard key={asset.symbol} padding="md" className="hover:bg-white/[0.06] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden", asset.color)}>
                          <img src={asset.logo} alt={asset.symbol} className="w-7 h-7 object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground">{asset.name}</span>
                          <p className="text-xs text-muted-foreground">
                            {asset.holdings.toFixed(asset.holdings < 1 ? 6 : 2)} {asset.symbol}
                            {asset.avgBuyPrice > 0 && (
                              <span className={cn("ml-2", pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                                {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-mono text-foreground">${value.toFixed(2)}</span>
                          <p className="text-xs text-muted-foreground">{pct.toFixed(1)}%</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => { setShowTrade(asset.symbol); setTradeType("buy"); setConfirmStep(false) }}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs h-7 px-2"
                          >
                            Buy
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => { setShowTrade(asset.symbol); setTradeType("sell"); setConfirmStep(false) }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs h-7 px-2"
                          >
                            Sell
                          </Button>
                        </div>
                      </div>
                    </GlassCard>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div className="animate-fade-in-up space-y-2" style={{ animationDelay: "180ms" }}>
          {trades.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No trade history yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Your buy and sell transactions will appear here</p>
            </div>
          ) : (
            trades.map((trade) => (
              <GlassCard key={trade.id} padding="md" className="hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    trade.side === "buy" ? "bg-emerald-500/10" : "bg-red-500/10"
                  )}>
                    {trade.side === "buy"
                      ? <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                      : <ArrowUpRight className="w-4 h-4 text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground capitalize">{trade.side} {trade.symbol}</span>
                      <GlassBadge variant={trade.side === "buy" ? "emerald" : "red"} size="sm">
                        {trade.side === "buy" ? "Buy" : "Sell"}
                      </GlassBadge>
                      {trade.status !== "completed" && (
                        <GlassBadge variant="amber" size="sm">{trade.status}</GlassBadge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {trade.cryptoAmount.toFixed(6)} {trade.symbol} @ ${trade.pricePerCoin.toLocaleString()} · {new Date(trade.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={cn("text-sm font-mono", trade.side === "buy" ? "text-foreground" : "text-emerald-400")}>
                      {trade.side === "buy" ? "-" : "+"}${trade.quoteAmount.toFixed(2)}
                    </span>
                    {trade.feeAmount > 0 && (
                      <p className="text-[10px] text-muted-foreground/50">fee: ${trade.feeAmount.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="animate-fade-in flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]" style={{ animationDelay: "250ms" }}>
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground/70">
          Cryptocurrency is volatile and high-risk. Past performance doesn&apos;t guarantee future returns.
          Not FDIC insured. Trade responsibly. Prices powered by Alpha Vantage (updated every ~6h).
        </p>
      </div>

      {/* Trade Dialog */}
      <Dialog open={!!showTrade} onOpenChange={() => closeTradeDialog()}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          {showTrade && (() => {
            const asset = assets.find((a) => a.symbol === showTrade)
            if (!asset) return null
            const usdAmount = parseFloat(tradeAmount) || 0
            const coinAmount = usdAmount / asset.price
            const fee = usdAmount * FEE_RATE
            const totalCost = tradeType === "buy" ? usdAmount + fee : usdAmount - fee

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden", asset.color)}>
                      <img src={asset.logo} alt={asset.symbol} className="w-7 h-7 object-contain" />
                    </div>
                    <div>
                      <DialogTitle className="text-foreground">{tradeType === "buy" ? "Buy" : "Sell"} {asset.name}</DialogTitle>
                      <DialogDescription>
                        1 {asset.symbol} = ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-muted-foreground/40 ml-1">live</span>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* Toggle Buy/Sell */}
                <div className="flex gap-1 p-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                  <button
                    onClick={() => { setTradeType("buy"); setConfirmStep(false) }}
                    className={cn("flex-1 py-2 rounded-md text-sm font-medium transition-all", tradeType === "buy" ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground")}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => { setTradeType("sell"); setConfirmStep(false) }}
                    className={cn("flex-1 py-2 rounded-md text-sm font-medium transition-all", tradeType === "sell" ? "bg-red-500/20 text-red-400" : "text-muted-foreground")}
                  >
                    Sell
                  </button>
                </div>

                <div className="space-y-4 py-2">
                  {!confirmStep ? (
                    <>
                      <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Amount (USD)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={tradeAmount}
                          onChange={(e) => setTradeAmount(e.target.value)}
                          min={10}
                          max={10000}
                          step="0.01"
                          className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <p className="text-[10px] text-muted-foreground/40 mt-1">Min $10 · Max $10,000</p>
                      </div>
                      {usdAmount > 0 && (
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">You {tradeType === "buy" ? "receive" : "sell"}</span>
                            <span className="text-foreground font-mono">~{coinAmount.toFixed(6)} {asset.symbol}</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-muted-foreground">Fee (0.5%)</span>
                            <span className="text-foreground font-mono">${fee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1 pt-1 border-t border-white/[0.06]">
                            <span className="text-muted-foreground font-medium">
                              {tradeType === "buy" ? "Total cost" : "You receive"}
                            </span>
                            <span className="text-foreground font-mono font-medium">${totalCost.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Confirmation step */
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-white/[0.03] border border-amber-500/20">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-medium text-amber-400">Confirm Trade</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Action</span>
                            <span className={cn("font-medium", tradeType === "buy" ? "text-emerald-400" : "text-red-400")}>
                              {tradeType === "buy" ? "Buy" : "Sell"} {asset.symbol}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="text-foreground font-mono">~{coinAmount.toFixed(6)} {asset.symbol}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Price</span>
                            <span className="text-foreground font-mono">${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Fee</span>
                            <span className="text-foreground font-mono">${fee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-white/[0.06]">
                            <span className="text-muted-foreground font-medium">
                              {tradeType === "buy" ? "Total cost" : "You receive"}
                            </span>
                            <span className="text-foreground font-mono font-bold">${totalCost.toFixed(2)}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 mt-3">
                          Final amounts may vary slightly due to market movement. Order executes at market price.
                        </p>
                      </div>
                    </div>
                  )}

                  {tradeType === "sell" && !confirmStep && (
                    <p className="text-xs text-muted-foreground">
                      Available: {asset.holdings.toFixed(asset.holdings < 1 ? 6 : 2)} {asset.symbol} (${(asset.holdings * asset.price).toFixed(2)})
                    </p>
                  )}
                </div>

                <DialogFooter>
                  {confirmStep ? (
                    <>
                      <Button variant="outline" onClick={() => setConfirmStep(false)}>Back</Button>
                      <Button
                        onClick={handleTrade}
                        disabled={loading}
                        className={cn("text-white", tradeType === "buy" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600")}
                      >
                        {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                        {loading ? "Executing..." : `Confirm ${tradeType === "buy" ? "Buy" : "Sell"}`}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={closeTradeDialog}>Cancel</Button>
                      <Button
                        onClick={handleTrade}
                        disabled={!tradeAmount || parseFloat(tradeAmount) < 10}
                        className={cn("text-white", tradeType === "buy" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600")}
                      >
                        Review {tradeType === "buy" ? "Buy" : "Sell"}
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
