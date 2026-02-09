"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Wallet,
  Activity,
} from "lucide-react"
import { GlassCard, GlassStat, GlassContainer } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { getUserTransactions, getTransactionStats } from "@/lib/actions/transactions"
import { getOfferStats } from "@/lib/actions/offers"
import { toast } from "sonner"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

// Chart tooltip
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-[hsl(222,47%,8%)] border border-white/[0.10] p-3 shadow-xl backdrop-blur-xl">
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color || entry.fill }} />
          <span className="text-muted-foreground capitalize">{entry.name || entry.dataKey}:</span>
          <span className="font-semibold text-foreground">
            {typeof entry.value === "number" ? `$${entry.value.toLocaleString()}` : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { name, value, payload: inner } = payload[0]
  return (
    <div className="rounded-lg bg-[hsl(222,47%,8%)] border border-white/[0.10] p-3 shadow-xl backdrop-blur-xl">
      <div className="flex items-center gap-2 text-sm">
        <div className="w-2 h-2 rounded-full" style={{ background: inner.fill }} />
        <span className="text-muted-foreground">{name}:</span>
        <span className="font-semibold text-foreground">{value}</span>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [txnStats, setTxnStats] = useState<any>(null)
  const [offerStats, setOfferStats] = useState<any>(null)
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d")

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [txnRes, statsRes, offerRes] = await Promise.all([
        getUserTransactions(),
        getTransactionStats(),
        getOfferStats(),
      ])
      if (txnRes.data) setTransactions(txnRes.data)
      if (statsRes.data) setTxnStats(statsRes.data)
      if (offerRes.data) setOfferStats(offerRes.data)
    } catch {
      toast.error("Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Compute chart data from real transactions
  const volumeByMonth = (() => {
    const months: Record<string, { month: string; volume: number; count: number }> = {}
    transactions.forEach((txn) => {
      const d = new Date(txn.created_at)
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      if (!months[key]) months[key] = { month: key, volume: 0, count: 0 }
      months[key].volume += Number(txn.amount)
      months[key].count += 1
    })
    return Object.values(months).slice(-12)
  })()

  const statusDistribution = (() => {
    const counts: Record<string, number> = {}
    transactions.forEach((txn) => {
      counts[txn.status] = (counts[txn.status] || 0) + 1
    })
    const colors: Record<string, string> = {
      draft: "hsl(220, 10%, 50%)",
      awaiting_payment: "hsl(45, 90%, 55%)",
      in_escrow: "hsl(200, 80%, 55%)",
      delivered: "hsl(180, 70%, 45%)",
      released: "hsl(160, 84%, 45%)",
      cancelled: "hsl(0, 0%, 45%)",
      dispute: "hsl(0, 72%, 55%)",
    }
    return Object.entries(counts).map(([status, count]) => ({
      name: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: count,
      fill: colors[status] || "hsl(220, 15%, 40%)",
    }))
  })()

  const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
  const avgAmount = transactions.length > 0 ? totalVolume / transactions.length : 0

  // Funnel data
  const funnelData = [
    { stage: "Created", count: transactions.length, fill: "hsl(215, 15%, 55%)" },
    { stage: "Paid", count: transactions.filter((t) => !["draft", "awaiting_payment", "cancelled"].includes(t.status)).length, fill: "hsl(200, 80%, 55%)" },
    { stage: "In Escrow", count: transactions.filter((t) => ["in_escrow", "delivered", "released"].includes(t.status)).length, fill: "hsl(180, 70%, 50%)" },
    { stage: "Delivered", count: transactions.filter((t) => ["delivered", "released"].includes(t.status)).length, fill: "hsl(160, 84%, 45%)" },
    { stage: "Released", count: transactions.filter((t) => t.status === "released").length, fill: "hsl(140, 80%, 45%)" },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 glass-card animate-pulse" />
          ))}
        </div>
        <div className="h-80 glass-card animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">Insights into your escrow activity</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.08]">
            {(["7d", "30d", "90d", "1y"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassStat
          label="Total Volume"
          value={formatCurrency(totalVolume)}
          icon={<DollarSign className="w-5 h-5" />}
          glowColor="emerald"
        />
        <GlassStat
          label="Total Transactions"
          value={transactions.length}
          icon={<Activity className="w-5 h-5" />}
          glowColor="blue"
        />
        <GlassStat
          label="Avg. Amount"
          value={formatCurrency(avgAmount)}
          icon={<TrendingUp className="w-5 h-5" />}
          glowColor="purple"
        />
        <GlassStat
          label="Success Rate"
          value={transactions.length > 0
            ? `${Math.round((transactions.filter((t) => t.status === "released").length / transactions.length) * 100)}%`
            : "0%"
          }
          icon={<CheckCircle2 className="w-5 h-5" />}
          glowColor="emerald"
        />
      </div>

      {/* ─── Charts ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Volume Over Time */}
        <GlassCard padding="none" className="xl:col-span-2 animate-fade-in-up">
          <div className="px-6 pt-5 pb-2">
            <h3 className="text-sm font-semibold text-foreground">Transaction Volume</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Monthly transaction amount</p>
          </div>
          <div className="h-[280px] px-2 pb-4">
            {volumeByMonth.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">No data yet. Complete transactions to see analytics.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "hsl(215, 15%, 55%)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(215, 15%, 55%)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="volume" fill="url(#volumeGrad)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        {/* Status Distribution Pie */}
        <GlassCard padding="none" className="animate-fade-in-up">
          <div className="px-6 pt-5 pb-2">
            <h3 className="text-sm font-semibold text-foreground">Status Distribution</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Current breakdown</p>
          </div>
          <div className="h-[220px]">
            {statusDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-muted-foreground">No data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="px-6 pb-4 space-y-1.5">
            {statusDistribution.slice(0, 5).map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.fill }} />
                  <span className="text-muted-foreground">{s.name}</span>
                </div>
                <span className="font-medium text-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ─── Transaction Funnel ─── */}
      <GlassCard padding="none" className="animate-fade-in-up">
        <div className="px-6 pt-5 pb-2">
          <h3 className="text-sm font-semibold text-foreground">Transaction Funnel</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Conversion through escrow stages</p>
        </div>
        <div className="h-[200px] px-2 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="stage"
                tick={{ fontSize: 11, fill: "hsl(215, 15%, 55%)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(215, 15%, 55%)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* ─── Bottom Info ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard variant="hover" padding="sm" className="animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-sm font-semibold text-foreground">Counterparties</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Track your most frequent trading partners and transaction history with each.
          </p>
          <p className="text-xs text-primary mt-2">Coming soon</p>
        </GlassCard>

        <GlassCard variant="hover" padding="sm" className="animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-foreground">Export Reports</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Download CSV or PDF reports of your transaction history for accounting.
          </p>
          <p className="text-xs text-primary mt-2">Coming soon</p>
        </GlassCard>

        <GlassCard variant="hover" padding="sm" className="animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-sm font-semibold text-foreground">Advanced Insights</span>
          </div>
          <p className="text-xs text-muted-foreground">
            AI-powered insights about your transaction patterns and risk analysis.
          </p>
          <p className="text-xs text-primary mt-2">Coming soon</p>
        </GlassCard>
      </div>
    </div>
  )
}
