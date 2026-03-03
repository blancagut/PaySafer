"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeftRight,
  ChevronDown,
  Loader2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  Info,
  Wallet,
  ArrowRight,
  Star,
} from "lucide-react"
import { GlassCard, GlassContainer, GlassStat } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Currency Config ───

interface Currency {
  code: string
  name: string
  symbol: string
  flag: string
  balance: number
}

const currencies: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", balance: 4825.50 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪", balance: 12340.00 },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", balance: 1250.75 },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", balance: 890.20 },
]

// Mock rates (base: USD)
const mockRates: Record<string, number> = {
  "USD-AED": 3.6725,
  "USD-EUR": 0.9215,
  "USD-GBP": 0.7890,
  "AED-USD": 0.2723,
  "AED-EUR": 0.2510,
  "AED-GBP": 0.2149,
  "EUR-USD": 1.0852,
  "EUR-AED": 3.9862,
  "EUR-GBP": 0.8562,
  "GBP-USD": 1.2674,
  "GBP-AED": 4.6551,
  "GBP-EUR": 1.1680,
}

interface RecentSwap {
  id: string
  from: string
  to: string
  fromAmount: number
  toAmount: number
  rate: number
  date: string
}

const recentSwaps: RecentSwap[] = [
  { id: "r1", from: "USD", to: "AED", fromAmount: 500, toAmount: 1836.25, rate: 3.6725, date: "Feb 28, 2026" },
  { id: "r2", from: "EUR", to: "USD", fromAmount: 200, toAmount: 217.04, rate: 1.0852, date: "Feb 25, 2026" },
  { id: "r3", from: "GBP", to: "AED", fromAmount: 100, toAmount: 465.51, rate: 4.6551, date: "Feb 20, 2026" },
  { id: "r4", from: "USD", to: "EUR", fromAmount: 1000, toAmount: 921.50, rate: 0.9215, date: "Feb 15, 2026" },
]

export default function ExchangePage() {
  const [fromCurrency, setFromCurrency] = useState("USD")
  const [toCurrency, setToCurrency] = useState("AED")
  const [amount, setAmount] = useState("")
  const [converting, setConverting] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const rate = mockRates[`${fromCurrency}-${toCurrency}`] ?? 1
  const converted = amount ? (parseFloat(amount) * rate) : 0
  const fromC = currencies.find((c) => c.code === fromCurrency)!
  const toC = currencies.find((c) => c.code === toCurrency)!

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  const handleConvert = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    if (parseFloat(amount) > fromC.balance) {
      toast.error(`Insufficient ${fromCurrency} balance`)
      return
    }
    setConverting(true)
    await new Promise((r) => setTimeout(r, 1800))
    toast.success("Conversion complete!", {
      description: `${fromC.symbol}${parseFloat(amount).toLocaleString()} → ${toC.symbol}${converted.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    })
    setAmount("")
    setConverting(false)
  }

  const handleRefreshRates = () => {
    setLastRefresh(new Date())
    toast.success("Rates refreshed")
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Currency Exchange
              </h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Convert between your multi-currency wallets
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefreshRates} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Rates
          </Button>
        </div>
      </div>

      {/* Wallet Balances */}
      <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ animationDelay: "100ms" }}>
        {currencies.map((c) => (
          <GlassCard key={c.code} padding="sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{c.flag}</span>
              <span className="text-xs text-muted-foreground font-medium">{c.code}</span>
            </div>
            <span className="text-lg font-semibold text-foreground font-mono">
              {c.symbol}{c.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </GlassCard>
        ))}
      </div>

      {/* Conversion Card */}
      <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <GlassCard padding="lg" variant="glow">
          <div className="space-y-5">
            {/* From */}
            <div>
              <label className="text-xs text-muted-foreground font-medium tracking-wide uppercase mb-2 block">
                You Send
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-3 text-lg font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                  />
                </div>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger className="w-[130px] h-12 bg-white/[0.04] border-white/[0.10]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.filter((c) => c.code !== toCurrency).map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">
                          <span>{c.flag}</span> {c.code}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-xs text-muted-foreground mt-1.5 block">
                Balance: {fromC.symbol}{fromC.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Swap button */}
            <div className="flex items-center justify-center">
              <button
                onClick={handleSwapCurrencies}
                className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.10] flex items-center justify-center hover:bg-white/[0.10] transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* To */}
            <div>
              <label className="text-xs text-muted-foreground font-medium tracking-wide uppercase mb-2 block">
                They Receive
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-3 text-lg font-mono text-foreground/80">
                    {converted ? converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                  </div>
                </div>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger className="w-[130px] h-12 bg-white/[0.04] border-white/[0.10]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.filter((c) => c.code !== fromCurrency).map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">
                          <span>{c.flag}</span> {c.code}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rate display */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Updated {lastRefresh.toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Convert button */}
            <Button
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium"
              onClick={handleConvert}
              disabled={converting || !amount}
            >
              {converting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowLeftRight className="w-4 h-4 mr-2" />
              )}
              {converting ? "Converting..." : "Convert Now"}
            </Button>

            {/* Fee notice */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3 h-3 shrink-0" />
              <span>No hidden fees. FX spread included in the rate shown above. See <a href="/fees" className="text-emerald-400 hover:underline">Fees & Limits</a> for details.</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Recent Conversions */}
      <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <GlassContainer
          header={{
            title: "Recent Conversions",
            description: "Your last currency exchanges",
          }}
        >
          <div className="divide-y divide-white/[0.06]">
            {recentSwaps.map((swap) => {
              const fC = currencies.find((c) => c.code === swap.from)!
              const tC = currencies.find((c) => c.code === swap.to)!
              return (
                <div key={swap.id} className="flex items-center gap-4 py-3 px-1">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                    <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="text-foreground font-medium">{fC.flag} {swap.from}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-foreground font-medium">{tC.flag} {swap.to}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{swap.date} · Rate: {swap.rate}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm text-red-400 font-mono block">-{fC.symbol}{swap.fromAmount.toLocaleString()}</span>
                    <span className="text-sm text-emerald-400 font-mono block">+{tC.symbol}{swap.toAmount.toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassContainer>
      </div>

      {/* Regulatory note */}
      <div className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Exchange rates are indicative and may vary at the time of execution. Rates are sourced from
            institutional providers and updated every 30 seconds during market hours. Weekend rates may
            include a small markup. PaySafer is not a forex broker.
          </p>
        </div>
      </div>
    </div>
  )
}
