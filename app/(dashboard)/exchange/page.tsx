"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ArrowLeftRight,
  Loader2,
  TrendingUp,
  RefreshCw,
  Clock,
  Info,
  ArrowRight,
} from "lucide-react"
import { GlassCard, GlassContainer } from "@/components/glass"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  getExchangeData,
  executeExchange,
  type CurrencyWallet,
  type CurrencyExchange,
} from "@/lib/actions/exchange"

// ─── Static currency metadata ───

const currencyMeta: Record<string, { name: string; symbol: string; flag: string }> = {
  USD: { name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  AED: { name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪" },
  EUR: { name: "Euro", symbol: "€", flag: "🇪🇺" },
  GBP: { name: "British Pound", symbol: "£", flag: "🇬🇧" },
}

export default function ExchangePage() {
  const [fromCurrency, setFromCurrency] = useState("USD")
  const [toCurrency, setToCurrency] = useState("AED")
  const [amount, setAmount] = useState("")
  const [converting, setConverting] = useState(false)
  const [loading, setLoading] = useState(true)

  const [rates, setRates] = useState<Record<string, number>>({})
  const [wallets, setWallets] = useState<CurrencyWallet[]>([])
  const [recentExchanges, setRecentExchanges] = useState<CurrencyExchange[]>([])
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState("")

  const loadData = useCallback(async () => {
    const res = await getExchangeData()
    if (res.error) {
      toast.error(res.error)
      setLoading(false)
      return
    }
    if (res.data) {
      setRates(res.data.rates)
      setWallets(res.data.wallets)
      setRecentExchanges(res.data.recentExchanges)
      setRatesUpdatedAt(res.data.ratesUpdatedAt)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const rate = rates[`${fromCurrency}-${toCurrency}`] ?? 1
  const converted = amount ? parseFloat(amount) * rate : 0
  const fromWallet = wallets.find((w) => w.currency === fromCurrency)
  const fromMeta = currencyMeta[fromCurrency] ?? { name: fromCurrency, symbol: "", flag: "💱" }
  const toMeta = currencyMeta[toCurrency] ?? { name: toCurrency, symbol: "", flag: "💱" }

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
  }

  const handleConvert = async () => {
    const num = parseFloat(amount)
    if (!amount || num <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    if (fromWallet && num > fromWallet.balance) {
      toast.error(`Insufficient ${fromCurrency} balance`)
      return
    }
    setConverting(true)
    const res = await executeExchange({ fromCurrency, toCurrency, amount: num })
    if (res.error) {
      toast.error(res.error)
    } else if (res.data) {
      toast.success("Conversion complete!", {
        description: `${fromMeta.symbol}${num.toLocaleString()} → ${toMeta.symbol}${converted.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      })
      setWallets(res.data)
      setAmount("")
      const fresh = await getExchangeData()
      if (fresh.data) setRecentExchanges(fresh.data.recentExchanges)
    }
    setConverting(false)
  }

  const handleRefreshRates = async () => {
    const res = await getExchangeData()
    if (res.data) {
      setRates(res.data.rates)
      setRatesUpdatedAt(res.data.ratesUpdatedAt)
      toast.success("Rates refreshed")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const currencyCodes = wallets.map((w) => w.currency)

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
        {wallets.map((w) => {
          const meta = currencyMeta[w.currency] ?? { name: w.currency, symbol: "", flag: "💱" }
          return (
            <GlassCard key={w.currency} padding="sm">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{meta.flag}</span>
                <span className="text-xs text-muted-foreground font-medium">{w.currency}</span>
              </div>
              <span className="text-lg font-semibold text-foreground font-mono">
                {meta.symbol}{w.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </GlassCard>
          )
        })}
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
                    {currencyCodes.filter((c) => c !== toCurrency).map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2">
                          <span>{currencyMeta[c]?.flag ?? "💱"}</span> {c}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-xs text-muted-foreground mt-1.5 block">
                Balance: {fromMeta.symbol}{(fromWallet?.balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
                    {currencyCodes.filter((c) => c !== fromCurrency).map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2">
                          <span>{currencyMeta[c]?.flag ?? "💱"}</span> {c}
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
                <span>{ratesUpdatedAt ? `Updated ${new Date(ratesUpdatedAt).toLocaleTimeString()}` : "Live rate"}</span>
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
          {recentExchanges.length === 0 ? (
            <div className="text-center py-8">
              <ArrowLeftRight className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No conversions yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Your exchange history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {recentExchanges.map((ex) => {
                const fMeta = currencyMeta[ex.from_currency] ?? { symbol: "", flag: "💱" }
                const tMeta = currencyMeta[ex.to_currency] ?? { symbol: "", flag: "💱" }
                return (
                  <div key={ex.id} className="flex items-center gap-4 py-3 px-1">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-foreground font-medium">{fMeta.flag} {ex.from_currency}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-foreground font-medium">{tMeta.flag} {ex.to_currency}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ex.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · Rate: {ex.rate}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm text-red-400 font-mono block">-{fMeta.symbol}{ex.from_amount.toLocaleString()}</span>
                      <span className="text-sm text-emerald-400 font-mono block">+{tMeta.symbol}{ex.to_amount.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
