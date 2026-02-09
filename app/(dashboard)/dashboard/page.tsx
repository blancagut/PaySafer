"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Shield,
  RefreshCw,
  Send,
  FileText,
  Link2,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  BarChart3,
  Zap,
  ChevronRight,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlassCard, GlassStat, GlassContainer } from "@/components/glass"
import { GlassBadge, statusBadgeMap, offerStatusBadgeMap } from "@/components/glass"
import { getTransactionStats, getUserTransactions } from "@/lib/actions/transactions"
import { getOfferStats, getMyOffers } from "@/lib/actions/offers"
import { getProfile } from "@/lib/actions/profile"
import { toast } from "sonner"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Placeholder chart data (will be replaced by real analytics in Phase 5)
function generateVolumeData() {
  const data = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    data.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      inflow: Math.floor(Math.random() * 5000) + 1000,
      outflow: Math.floor(Math.random() * 4000) + 800,
    })
  }
  return data
}

function generateStatusData() {
  return [
    { name: "Escrow", value: 12, fill: "hsl(200, 80%, 55%)" },
    { name: "Delivered", value: 8, fill: "hsl(180, 70%, 45%)" },
    { name: "Released", value: 24, fill: "hsl(160, 84%, 45%)" },
    { name: "Disputed", value: 3, fill: "hsl(0, 72%, 55%)" },
    { name: "Pending", value: 6, fill: "hsl(45, 90%, 55%)" },
  ]
}

// Custom chart tooltip
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg bg-[hsl(222,47%,8%)] border border-white/[0.10] p-3 shadow-xl backdrop-blur-xl">
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.dataKey}:</span>
          <span className="font-semibold text-foreground">${entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [txnStats, setTxnStats] = useState<{ active: number; completed: number; disputes: number; total: number } | null>(null)
  const [offerStats, setOfferStats] = useState<{ total: number; pending: number; accepted: number } | null>(null)
  const [recentTxns, setRecentTxns] = useState<any[]>([])
  const [recentOffers, setRecentOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [volumeData] = useState(generateVolumeData)
  const [statusData] = useState(generateStatusData)
  const [chartRange, setChartRange] = useState<"7d" | "30d" | "90d">("30d")

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, statsRes, offerStatsRes, txnRes, offersRes] = await Promise.all([
        getProfile(),
        getTransactionStats(),
        getOfferStats(),
        getUserTransactions(),
        getMyOffers({ pageSize: 5 }),
      ])

      if (profileRes.data) setProfile(profileRes.data)
      if (statsRes.data) setTxnStats(statsRes.data)
      if (offerStatsRes.data) setOfferStats(offerStatsRes.data)
      if (txnRes.data) setRecentTxns(txnRes.data.slice(0, 6))
      if (offersRes.data) setRecentOffers(offersRes.data)
    } catch {
      toast.error("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const copyOfferLink = (token: string) => {
    const url = `${window.location.origin}/offer/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    toast.success("Offer link copied!")
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const userName = profile?.full_name || profile?.email?.split("@")[0] || "there"
  const successRate = txnStats && txnStats.total > 0 
    ? Math.round((txnStats.completed / txnStats.total) * 100) 
    : 0

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton header */}
        <div className="space-y-2">
          <div className="h-8 w-64 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-4 w-96 bg-white/[0.03] rounded animate-pulse" />
        </div>
        {/* Skeleton stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 glass-card animate-pulse" />
          ))}
        </div>
        {/* Skeleton chart */}
        <div className="h-80 glass-card animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* ─── Welcome Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="animate-fade-in">
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back, {userName}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Here&apos;s your escrow activity overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Link href="/transactions/new">
              <Plus className="w-4 h-4 mr-1.5" />
              New Offer
            </Link>
          </Button>
        </div>
      </div>

      {/* ─── KPI Stats Row ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <GlassStat
          label="Active Escrows"
          value={txnStats?.active ?? 0}
          icon={<Clock className="w-5 h-5" />}
          glowColor="blue"
          trend={{ value: 12, label: "vs last month" }}
        />
        <GlassStat
          label="Completed"
          value={txnStats?.completed ?? 0}
          icon={<CheckCircle2 className="w-5 h-5" />}
          glowColor="emerald"
          trend={{ value: 8, label: "vs last month" }}
        />
        <GlassStat
          label="Success Rate"
          value={`${successRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          glowColor="emerald"
        />
        <GlassStat
          label="Open Disputes"
          value={txnStats?.disputes ?? 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          glowColor="red"
          trend={{ value: -25, label: "vs last month" }}
        />
        <GlassStat
          label="Pending Offers"
          value={offerStats?.pending ?? 0}
          icon={<Send className="w-5 h-5" />}
          glowColor="amber"
        />
        <GlassStat
          label="Total Volume"
          value={formatCurrency(0)}
          icon={<Wallet className="w-5 h-5" />}
          glowColor="purple"
          trend={{ value: 15, label: "vs last month" }}
        />
      </div>

      {/* ─── Charts Row ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Volume Chart — 2/3 width */}
        <GlassCard padding="none" className="xl:col-span-2 animate-fade-in-up">
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Escrow Volume</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Transaction flow over time</p>
            </div>
            <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
              {(["7d", "30d", "90d"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setChartRange(range)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    chartRange === range
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[280px] px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(200, 80%, 55%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(200, 80%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(215, 15%, 55%)" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(215, 15%, 55%)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  stroke="hsl(160, 84%, 45%)"
                  strokeWidth={2}
                  fill="url(#inflowGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="outflow"
                  stroke="hsl(200, 80%, 55%)"
                  strokeWidth={2}
                  fill="url(#outflowGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-6 px-6 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-muted-foreground">Inflow (Buyer)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 rounded-full bg-blue-400" />
              <span className="text-xs text-muted-foreground">Outflow (Seller)</span>
            </div>
          </div>
        </GlassCard>

        {/* Status Distribution — 1/3 width */}
        <GlassCard padding="none" className="animate-fade-in-up">
          <div className="px-6 pt-5 pb-3">
            <h3 className="text-sm font-semibold text-foreground">Transaction Status</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Current distribution</p>
          </div>
          <div className="h-[180px] px-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(215, 15%, 55%)" }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Quick actions under the chart */}
          <div className="p-4 border-t border-white/[0.06] space-y-2">
            <Link
              href="/analytics"
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-foreground">View Full Analytics</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
            <Link
              href="/wallet"
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-foreground">View Wallet</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </div>
        </GlassCard>
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Create Offer", href: "/transactions/new", icon: Plus, color: "emerald" as const, desc: "Start a new escrow" },
          { label: "View Transactions", href: "/transactions", icon: History, color: "blue" as const, desc: "Track your deals" },
          { label: "Explore Services", href: "/services", icon: Sparkles, color: "purple" as const, desc: "Find trusted sellers" },
          { label: "Open Dispute", href: "/disputes/new", icon: AlertTriangle, color: "amber" as const, desc: "Resolve an issue" },
        ].map((action) => {
          const bgClass = {
            emerald: "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20",
            blue: "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20",
            purple: "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20",
            amber: "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20",
          }[action.color]

          return (
            <Link key={action.href} href={action.href}>
              <GlassCard
                variant="hover"
                padding="sm"
                className="group cursor-pointer h-full"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${bgClass}`}>
                  <action.icon className="w-4.5 h-4.5" />
                </div>
                <p className="text-sm font-medium text-foreground mt-3">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
              </GlassCard>
            </Link>
          )
        })}
      </div>

      {/* ─── Offers + Transactions Grid ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Offers */}
        <GlassContainer
          header={{
            title: "Recent Offers",
            description: `${recentOffers.length} recent offers`,
            action: (
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
                <Link href="/transactions/new">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            ),
          }}
        >
          {recentOffers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                <Link2 className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No offers yet</p>
              <Button asChild size="sm" variant="ghost" className="mt-2 text-primary text-xs">
                <Link href="/transactions/new">Create your first offer</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOffers.map((offer) => {
                const cfg = offerStatusBadgeMap[offer.status] || { label: offer.status, variant: "muted" as const }
                return (
                  <div
                    key={offer.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Link2 className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{offer.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(offer.amount), offer.currency)} · {offer.creator_role}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <GlassBadge
                        variant={cfg.variant}
                        dot={cfg.dot}
                        pulse={cfg.pulse}
                      >
                        {cfg.label}
                      </GlassBadge>
                      {offer.status === "pending" && (
                        <button
                          onClick={() => copyOfferLink(offer.token)}
                          className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors"
                        >
                          {copiedToken === offer.token ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassContainer>

        {/* Recent Transactions */}
        <GlassContainer
          header={{
            title: "Recent Transactions",
            description: "Latest escrow activities",
            action: (
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
                <Link href="/transactions">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            ),
          }}
        >
          {recentTxns.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create an offer and share the link to get started
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTxns.map((txn) => {
                const isBuyer = txn.buyer_id === profile?.id
                const cfg = statusBadgeMap[txn.status] || { label: txn.status, variant: "muted" as const }
                return (
                  <Link
                    key={txn.id}
                    href={`/transactions/${txn.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.04] transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isBuyer ? "bg-blue-500/10" : "bg-emerald-500/10"
                        }`}
                      >
                        {isBuyer ? (
                          <ArrowUpRight className="w-4 h-4 text-blue-400" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {txn.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(txn.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(Number(txn.amount), txn.currency)}
                      </span>
                      <GlassBadge
                        variant={cfg.variant}
                        dot={cfg.dot}
                        pulse={cfg.pulse}
                      >
                        {cfg.label}
                      </GlassBadge>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </GlassContainer>
      </div>

      {/* ─── Trust / Info Card ─── */}
      <GlassCard variant="gradient" padding="none" className="animate-fade-in-up">
        <div className="p-6 flex flex-col md:flex-row items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">How PaySafer protects you</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              When you create a transaction, funds are held securely until both parties confirm the deal is complete.
              All payments are processed by Stripe with bank-grade encryption.
            </p>
            <Link
              href="/trust"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 mt-3 transition-colors"
            >
              Learn about our escrow process
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
