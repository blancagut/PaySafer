"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Inbox,
  Search,
  RefreshCw,
  MessageSquare,
  ArrowRight,
  Shield,
} from "lucide-react"
import { GlassCard, GlassStat, GlassContainer } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { GlassInput } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { getUserDisputes } from "@/lib/actions/disputes"
import { toast } from "sonner"

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

const disputeBadgeMap: Record<string, { label: string; variant: "amber" | "emerald" | "muted"; dot?: boolean; pulse?: boolean }> = {
  under_review: { label: "Under Review", variant: "amber", dot: true, pulse: true },
  resolved: { label: "Resolved", variant: "emerald", dot: true },
  closed: { label: "Closed", variant: "muted" },
}

type DisputeTab = "all" | "under_review" | "resolved"

export default function DisputesPage() {
  const [loading, setLoading] = useState(true)
  const [disputes, setDisputes] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<DisputeTab>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getUserDisputes()
      if (result.data) setDisputes(result.data)
    } catch {
      toast.error("Failed to load disputes")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const activeDisputes = disputes.filter((d) => d.status === "under_review")
  const resolvedDisputes = disputes.filter((d) => d.status !== "under_review")

  const filtered = disputes
    .filter((d) => {
      if (activeTab === "under_review") return d.status === "under_review"
      if (activeTab === "resolved") return d.status !== "under_review"
      return true
    })
    .filter((d) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        d.reason?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.transaction?.description?.toLowerCase().includes(q)
      )
    })

  const tabs: { key: DisputeTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: disputes.length },
    { key: "under_review", label: "Active", count: activeDisputes.length },
    { key: "resolved", label: "Resolved", count: resolvedDisputes.length },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
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
          <h2 className="text-2xl font-bold text-foreground">Disputes</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage and track your dispute cases</p>
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

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <GlassStat
          label="Under Review"
          value={activeDisputes.length}
          icon={<Clock className="w-5 h-5" />}
          glowColor="amber"
        />
        <GlassStat
          label="Resolved"
          value={resolvedDisputes.length}
          icon={<CheckCircle2 className="w-5 h-5" />}
          glowColor="emerald"
        />
        <GlassStat
          label="Total Disputes"
          value={disputes.length}
          icon={<AlertTriangle className="w-5 h-5" />}
          glowColor="red"
        />
      </div>

      {/* ─── Tabs + Search ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1 border border-white/[0.06]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? "bg-primary/30" : "bg-white/[0.06]"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="w-full md:w-56">
          <GlassInput
            placeholder="Search disputes..."
            icon={<Search className="w-3.5 h-3.5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ─── Dispute List ─── */}
      <GlassCard padding="none">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {searchQuery ? "No disputes match your search" : "No disputes"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Disputes can be opened from a transaction page.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filtered.map((dispute) => {
              const cfg = disputeBadgeMap[dispute.status] || disputeBadgeMap.under_review
              const isActive = dispute.status === "under_review"

              return (
                <Link
                  key={dispute.id}
                  href={`/disputes/${dispute.id}`}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-white/[0.03] transition-colors group gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? "bg-red-500/10" : "bg-white/[0.04]"
                    }`}>
                      {isActive ? (
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {dispute.transaction?.description || "Transaction dispute"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {dispute.reason}
                        {" · "}{timeAgo(dispute.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-13 md:ml-0">
                    {dispute.transaction && (
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(Number(dispute.transaction.amount), dispute.transaction.currency)}
                      </span>
                    )}
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

      {/* ─── Info Card ─── */}
      <GlassCard variant="gradient" padding="sm" className="animate-fade-in-up">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">How Disputes Work</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              All disputed funds are frozen and held securely in the platform. <strong className="text-foreground">Only the platform administrator</strong> decides
              where funds go — not Stripe, not either party. Both sides can present evidence
              and communicate through the dispute thread. The admin will review all documentation
              and make a final, binding decision. In cases of suspected fraud or money laundering,
              funds may be held indefinitely or forwarded to the appropriate authorities.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
