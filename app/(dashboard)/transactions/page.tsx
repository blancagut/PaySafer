"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  ArrowDownRight,
  Inbox,
  Search,
  Filter,
  RefreshCw,
  Plus,
  SortDesc,
  Download,
  ArrowRight,
} from "lucide-react"
import { GlassCard, GlassStat, GlassContainer } from "@/components/glass"
import { GlassBadge, statusBadgeMap } from "@/components/glass"
import { GlassInput } from "@/components/glass"
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

type StatusTab = "all" | "in_escrow" | "delivered" | "released" | "awaiting_payment" | "dispute" | "cancelled"

export default function TransactionsPage() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [activeTab, setActiveTab] = useState<StatusTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "amount">("newest")

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [txnRes, statsRes] = await Promise.all([
        getUserTransactions(),
        getTransactionStats(),
      ])
      if (txnRes.data) setTransactions(txnRes.data)
      if (statsRes.data) setStats(statsRes.data)
      // Get user from supabase client-side
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
    } catch {
      toast.error("Failed to load transactions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredTransactions = transactions
    .filter((txn) => {
      if (activeTab !== "all" && txn.status !== activeTab) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          txn.description?.toLowerCase().includes(q) ||
          txn.seller_email?.toLowerCase().includes(q) ||
          txn.id?.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      if (sortOrder === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortOrder === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return Number(b.amount) - Number(a.amount)
    })

  const tabs: { key: StatusTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "in_escrow", label: "In Escrow" },
    { key: "delivered", label: "Delivered" },
    { key: "released", label: "Released" },
    { key: "awaiting_payment", label: "Awaiting" },
    { key: "dispute", label: "Dispute" },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 bg-white/[0.04] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 glass-card animate-pulse" />
          ))}
        </div>
        <div className="h-96 glass-card animate-pulse" />
      </div>
    )
  }

  const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
  const inEscrowCount = transactions.filter((t) => t.status === "in_escrow").length
  const completedCount = transactions.filter((t) => t.status === "released").length
  const disputeCount = transactions.filter((t) => t.status === "dispute").length

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transactions</h2>
          <p className="text-sm text-muted-foreground mt-1">View and manage all your escrow transactions</p>
        </div>
        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 w-fit">
          <Link href="/transactions/new">
            <Plus className="w-4 h-4 mr-1.5" />
            New Transaction
          </Link>
        </Button>
      </div>

      {/* ─── Quick Stats ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassStat label="Total Volume" value={formatCurrency(totalVolume)} icon={<ArrowUpRight className="w-5 h-5" />} glowColor="emerald" />
        <GlassStat label="In Escrow" value={inEscrowCount} icon={<ArrowDownRight className="w-5 h-5" />} glowColor="blue" />
        <GlassStat label="Completed" value={completedCount} icon={<ArrowUpRight className="w-5 h-5" />} glowColor="emerald" />
        <GlassStat label="Disputes" value={disputeCount} icon={<ArrowUpRight className="w-5 h-5" />} glowColor="red" />
      </div>

      {/* ─── Tabs + Search + Sort ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1 border border-white/[0.06] overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="w-full md:w-56">
            <GlassInput
              placeholder="Search..."
              icon={<Search className="w-3.5 h-3.5" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : sortOrder === "oldest" ? "amount" : "newest")}
            className="p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-muted-foreground"
            title={`Sort by: ${sortOrder}`}
          >
            <SortDesc className="w-3.5 h-3.5" />
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] text-muted-foreground h-9"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
        {activeTab !== "all" && ` · filtered by ${activeTab.replace("_", " ")}`}
        {searchQuery && ` · matching "${searchQuery}"`}
      </p>

      {/* ─── Transaction List ─── */}
      <GlassCard padding="none">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {searchQuery ? "No transactions match your search" : "No transactions yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Create an offer to start your first escrow</p>
            <Button asChild size="sm" className="mt-4 bg-primary text-primary-foreground">
              <Link href="/transactions/new">Create Transaction</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredTransactions.map((txn) => {
              const isBuyer = txn.buyer_id === currentUserId
              const role = isBuyer ? "buyer" : "seller"
              const counterparty = isBuyer ? (txn.seller_email || "Pending") : "You (seller)"
              const cfg = statusBadgeMap[txn.status] || { label: txn.status, variant: "muted" as const }

              return (
                <Link
                  key={txn.id}
                  href={`/transactions/${txn.id}`}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-white/[0.03] transition-colors group gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      role === "buyer" ? "bg-blue-500/10" : "bg-emerald-500/10"
                    }`}>
                      {role === "buyer" ? (
                        <ArrowUpRight className="w-5 h-5 text-blue-400" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {txn.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {role === "buyer" ? "To: " : "From: "}{counterparty}
                        {" · "}{timeAgo(txn.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-13 md:ml-0">
                    <div className="text-right">
                      <p className={`text-sm font-bold ${role === "seller" ? "text-emerald-400" : "text-foreground"}`}>
                        {role === "buyer" ? "-" : "+"}
                        {formatCurrency(Number(txn.amount), txn.currency)}
                      </p>
                    </div>
                    <GlassBadge variant={cfg.variant} dot={cfg.dot} pulse={cfg.pulse}>
                      {cfg.label}
                    </GlassBadge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
