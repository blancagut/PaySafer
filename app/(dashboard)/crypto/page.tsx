"use client"

import { useState, useEffect } from "react"
import {
  Bitcoin,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw,
  Wallet,
  Info,
  ChevronRight,
  Clock,
  Star,
  Minus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Crypto Assets ───

interface CryptoAsset {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
  holdings: number
  color: string
  icon: string
}

const mockAssets: CryptoAsset[] = [
  { id: "btc", symbol: "BTC", name: "Bitcoin", price: 94285.40, change24h: 2.34, holdings: 0.0125, color: "bg-orange-500", icon: "₿" },
  { id: "eth", symbol: "ETH", name: "Ethereum", price: 3245.80, change24h: -1.12, holdings: 0.85, color: "bg-indigo-500", icon: "Ξ" },
  { id: "usdt", symbol: "USDT", name: "Tether", price: 1.00, change24h: 0.01, holdings: 500.00, color: "bg-green-500", icon: "₮" },
  { id: "sol", symbol: "SOL", name: "Solana", price: 178.22, change24h: 5.67, holdings: 3.5, color: "bg-purple-500", icon: "◎" },
  { id: "bnb", symbol: "BNB", name: "BNB", price: 612.30, change24h: 0.85, holdings: 0, color: "bg-yellow-500", icon: "B" },
  { id: "xrp", symbol: "XRP", name: "XRP", price: 2.48, change24h: -0.32, holdings: 0, color: "bg-blue-500", icon: "X" },
  { id: "ada", symbol: "ADA", name: "Cardano", price: 0.98, change24h: 3.21, holdings: 0, color: "bg-blue-600", icon: "₳" },
  { id: "avax", symbol: "AVAX", name: "Avalanche", price: 42.10, change24h: -2.45, holdings: 0, color: "bg-red-500", icon: "A" },
]

interface TradeHistory {
  id: string
  type: "buy" | "sell"
  symbol: string
  amount: number
  price: number
  total: number
  date: string
}

const mockHistory: TradeHistory[] = [
  { id: "t1", type: "buy", symbol: "BTC", amount: 0.005, price: 93200, total: 466.00, date: "Mar 1, 2026" },
  { id: "t2", type: "buy", symbol: "ETH", amount: 0.25, price: 3198, total: 799.50, date: "Feb 28, 2026" },
  { id: "t3", type: "sell", symbol: "SOL", amount: 5.0, price: 172.50, total: 862.50, date: "Feb 25, 2026" },
  { id: "t4", type: "buy", symbol: "USDT", amount: 500, price: 1.00, total: 500.00, date: "Feb 20, 2026" },
  { id: "t5", type: "buy", symbol: "SOL", amount: 8.5, price: 165.30, total: 1405.05, date: "Feb 15, 2026" },
]

type Tab = "market" | "portfolio" | "history"
type TradeType = "buy" | "sell"

export default function CryptoPage() {
  const [assets, setAssets] = useState<CryptoAsset[]>(mockAssets)
  const [tab, setTab] = useState<Tab>("market")
  const [showTrade, setShowTrade] = useState<string | null>(null)
  const [tradeType, setTradeType] = useState<TradeType>("buy")
  const [tradeAmount, setTradeAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const portfolio = assets.filter((a) => a.holdings > 0)
  const portfolioValue = portfolio.reduce((sum, a) => sum + a.holdings * a.price, 0)

  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 1200))
    // Simulate slight price changes
    setAssets(assets.map((a) => ({
      ...a,
      price: a.price * (1 + (Math.random() - 0.5) * 0.004),
      change24h: a.change24h + (Math.random() - 0.5) * 0.5,
    })))
    toast.success("Prices updated")
    setRefreshing(false)
  }

  const handleTrade = async () => {
    const amount = parseFloat(tradeAmount)
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1500))
    const asset = assets.find((a) => a.id === showTrade)!
    const coinAmount = amount / asset.price

    if (tradeType === "buy") {
      setAssets(assets.map((a) =>
        a.id === showTrade ? { ...a, holdings: a.holdings + coinAmount } : a
      ))
      toast.success(`Bought ${coinAmount.toFixed(6)} ${asset.symbol}`, {
        description: `$${amount.toFixed(2)} debited from wallet`,
      })
    } else {
      if (coinAmount > asset.holdings) {
        toast.error(`Insufficient ${asset.symbol} balance`)
        setLoading(false)
        return
      }
      setAssets(assets.map((a) =>
        a.id === showTrade ? { ...a, holdings: a.holdings - coinAmount } : a
      ))
      toast.success(`Sold ${coinAmount.toFixed(6)} ${asset.symbol}`, {
        description: `$${amount.toFixed(2)} credited to wallet`,
      })
    }
    setShowTrade(null)
    setTradeAmount("")
    setLoading(false)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "market", label: "Market" },
    { key: "portfolio", label: "Portfolio" },
    { key: "history", label: "History" },
  ]

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
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-sm"
          >
            <RefreshCw className={cn("w-4 h-4 mr-1.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
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
                <span className="text-xs text-primary font-medium">Wallet connected</span>
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
          {assets.map((asset) => (
            <GlassCard
              key={asset.id}
              padding="none"
              className="hover:bg-white/[0.06] transition-colors cursor-pointer"
              onClick={() => { setShowTrade(asset.id); setTradeType("buy") }}
            >
              <div className="flex items-center gap-4 p-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-lg font-bold", asset.color)}>
                  {asset.icon}
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
          ))}
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
              {/* Allocation */}
              <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                {portfolio.map((a) => (
                  <div
                    key={a.id}
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
                  return (
                    <GlassCard key={asset.id} padding="md" className="hover:bg-white/[0.06] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-lg font-bold", asset.color)}>
                          {asset.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground">{asset.name}</span>
                          <p className="text-xs text-muted-foreground">
                            {asset.holdings.toFixed(asset.holdings < 1 ? 6 : 2)} {asset.symbol}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-mono text-foreground">${value.toFixed(2)}</span>
                          <p className="text-xs text-muted-foreground">{pct.toFixed(1)}%</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => { setShowTrade(asset.id); setTradeType("buy") }}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs h-7 px-2"
                          >
                            Buy
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => { setShowTrade(asset.id); setTradeType("sell") }}
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
          {mockHistory.map((trade) => (
            <GlassCard key={trade.id} padding="md" className="hover:bg-white/[0.06] transition-colors">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  trade.type === "buy" ? "bg-emerald-500/10" : "bg-red-500/10"
                )}>
                  {trade.type === "buy"
                    ? <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                    : <ArrowUpRight className="w-4 h-4 text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground capitalize">{trade.type} {trade.symbol}</span>
                    <GlassBadge variant={trade.type === "buy" ? "emerald" : "red"} size="sm">
                      {trade.type === "buy" ? "Buy" : "Sell"}
                    </GlassBadge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {trade.amount} {trade.symbol} @ ${trade.price.toLocaleString()} · {trade.date}
                  </span>
                </div>
                <span className={cn("text-sm font-mono", trade.type === "buy" ? "text-foreground" : "text-emerald-400")}>
                  {trade.type === "buy" ? "-" : "+"}${trade.total.toFixed(2)}
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="animate-fade-in flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]" style={{ animationDelay: "250ms" }}>
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground/70">
          Cryptocurrency is volatile and high-risk. Past performance doesn&apos;t guarantee future returns.
          Not FDIC insured. Trade responsibly.
        </p>
      </div>

      {/* Trade Dialog */}
      <Dialog open={!!showTrade} onOpenChange={() => { setShowTrade(null); setTradeAmount("") }}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          {showTrade && (() => {
            const asset = assets.find((a) => a.id === showTrade)
            if (!asset) return null
            const usdAmount = parseFloat(tradeAmount) || 0
            const coinAmount = usdAmount / asset.price

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold", asset.color)}>
                      {asset.icon}
                    </div>
                    <div>
                      <DialogTitle className="text-foreground">{tradeType === "buy" ? "Buy" : "Sell"} {asset.name}</DialogTitle>
                      <DialogDescription>
                        1 {asset.symbol} = ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* Toggle Buy/Sell */}
                <div className="flex gap-1 p-0.5 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                  <button
                    onClick={() => setTradeType("buy")}
                    className={cn("flex-1 py-2 rounded-md text-sm font-medium transition-all", tradeType === "buy" ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground")}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setTradeType("sell")}
                    className={cn("flex-1 py-2 rounded-md text-sm font-medium transition-all", tradeType === "sell" ? "bg-red-500/20 text-red-400" : "text-muted-foreground")}
                  >
                    Sell
                  </button>
                </div>

                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Amount (USD)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  {usdAmount > 0 && (
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">You {tradeType === "buy" ? "receive" : "sell"}</span>
                        <span className="text-foreground font-mono">{coinAmount.toFixed(6)} {asset.symbol}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Fee (0.5%)</span>
                        <span className="text-foreground font-mono">${(usdAmount * 0.005).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  {tradeType === "sell" && (
                    <p className="text-xs text-muted-foreground">
                      Available: {asset.holdings.toFixed(asset.holdings < 1 ? 6 : 2)} {asset.symbol} (${(asset.holdings * asset.price).toFixed(2)})
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => { setShowTrade(null); setTradeAmount("") }}>Cancel</Button>
                  <Button
                    onClick={handleTrade}
                    disabled={loading}
                    className={cn(
                      "text-white",
                      tradeType === "buy" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
                    )}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                    {tradeType === "buy" ? "Buy" : "Sell"} {asset.symbol}
                  </Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
