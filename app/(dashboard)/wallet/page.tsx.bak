"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Unlock,
  Clock,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Shield,
  CreditCard,
  DollarSign,
  AlertCircle,
} from "lucide-react"
import { GlassCard, GlassStat, GlassContainer } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { getUserTransactions, getTransactionStats } from "@/lib/actions/transactions"
import { toast } from "sonner"

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function WalletPage() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [walletData, setWalletData] = useState({
    inEscrow: 0,
    released: 0,
    pending: 0,
    totalVolume: 0,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [txnRes, statsRes] = await Promise.all([
        getUserTransactions(),
        getTransactionStats(),
      ])

      if (txnRes.data) {
        setTransactions(txnRes.data)

        // Calculate wallet balances from transaction data
        const inEscrow = txnRes.data
          .filter((t: any) => t.status === "in_escrow" || t.status === "delivered")
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        const released = txnRes.data
          .filter((t: any) => t.status === "released")
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        const pending = txnRes.data
          .filter((t: any) => t.status === "awaiting_payment")
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        const totalVolume = txnRes.data.reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        setWalletData({ inEscrow, released, pending, totalVolume })
      }
      if (statsRes.data) setStats(statsRes.data)
    } catch {
      toast.error("Failed to load wallet data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 glass-card animate-pulse" />
          ))}
        </div>
        <div className="h-96 glass-card animate-pulse" />
      </div>
    )
  }

  const recentActivity = transactions.slice(0, 10)

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Wallet</h2>
          <p className="text-sm text-muted-foreground mt-1">Your funds overview and activity</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] text-muted-foreground w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* ─── Balance Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Volume */}
        <GlassCard variant="glow" glowColor="emerald" padding="none" className="animate-fade-in-up">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Volume</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {formatCurrency(walletData.totalVolume)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">All-time transaction volume</p>
          </div>
          <div className="h-1 bg-gradient-to-r from-emerald-500/40 to-emerald-500/0" />
        </GlassCard>

        {/* In Escrow */}
        <GlassCard variant="glow" glowColor="blue" padding="none" className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">In Escrow</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Lock className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {formatCurrency(walletData.inEscrow)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Funds held securely</p>
          </div>
          <div className="h-1 bg-gradient-to-r from-blue-500/40 to-blue-500/0" />
        </GlassCard>

        {/* Released */}
        <GlassCard variant="hover" padding="none" className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Released</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Unlock className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {formatCurrency(walletData.released)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Successfully completed</p>
          </div>
        </GlassCard>

        {/* Pending */}
        <GlassCard variant="hover" padding="none" className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pending</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {formatCurrency(walletData.pending)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Awaiting payment</p>
          </div>
        </GlassCard>
      </div>

      {/* ─── Activity + Info ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <GlassContainer
          className="xl:col-span-2"
          header={{
            title: "Recent Activity",
            description: "Your latest fund movements",
            action: (
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
                <Link href="/transactions">View all</Link>
              </Button>
            ),
          }}
        >
          {recentActivity.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                <Wallet className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start a transaction to see your wallet activity</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((txn) => {
                const isInflow = ["in_escrow", "released"].includes(txn.status)
                return (
                  <Link
                    key={txn.id}
                    href={`/transactions/${txn.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.04] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isInflow ? "bg-emerald-500/10" : "bg-amber-500/10"
                      }`}>
                        {isInflow ? (
                          <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {txn.description}
                        </p>
                        <p className="text-xs text-muted-foreground">{timeAgo(txn.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${isInflow ? "text-emerald-400" : "text-foreground"}`}>
                        {isInflow ? "+" : ""}{formatCurrency(Number(txn.amount), txn.currency)}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">{txn.status.replace("_", " ")}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </GlassContainer>

        {/* Info Sidebar */}
        <div className="space-y-4">
          {/* Security notice */}
          <GlassCard variant="gradient" padding="sm" className="animate-fade-in-up">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Secure Escrow</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  All funds are held securely by Stripe until both parties confirm completion. PaySafer does not store any balances.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Payment methods placeholder */}
          <GlassCard padding="sm" className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Payment Methods</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="w-10 h-7 rounded bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white tracking-wider">STRIPE</span>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Connect Stripe</p>
                <p className="text-[10px] text-muted-foreground">Coming soon</p>
              </div>
            </div>
          </GlassCard>

          {/* Quick links */}
          <GlassCard padding="sm" className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Need Help?</span>
            </div>
            <div className="space-y-2">
              <Link
                href="/help"
                className="block text-xs text-primary hover:text-primary/80 transition-colors"
              >
                How escrow payments work
              </Link>
              <Link
                href="/disputes"
                className="block text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Open a dispute
              </Link>
              <Link
                href="/trust"
                className="block text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Trust & security center
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
