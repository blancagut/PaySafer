"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Link2,
  Plus,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRight,
  Trash2,
  ExternalLink,
  Filter,
  Search,
} from "lucide-react"
import { GlassCard, GlassStat, GlassContainer } from "@/components/glass"
import { GlassBadge, offerStatusBadgeMap } from "@/components/glass"
import { GlassInput } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { getMyOffers, getOfferStats, cancelOffer } from "@/lib/actions/offers"
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

type OfferTab = "all" | "pending" | "accepted" | "expired" | "cancelled"

export default function OffersPage() {
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<OfferTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [offersRes, statsRes] = await Promise.all([
        getMyOffers({ pageSize: 50 }),
        getOfferStats(),
      ])
      if (offersRes.data) setOffers(offersRes.data)
      if (statsRes.data) setStats(statsRes.data)
    } catch {
      toast.error("Failed to load offers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const copyOfferLink = (token: string) => {
    const url = `${window.location.origin}/offer/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    toast.success("Link copied!")
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleCancel = async (offerId: string) => {
    const res = await cancelOffer(offerId)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Offer cancelled")
      loadData()
    }
  }

  const filteredOffers = offers.filter((offer) => {
    if (activeTab !== "all" && offer.status !== activeTab) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        offer.title?.toLowerCase().includes(q) ||
        offer.description?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const tabs: { key: OfferTab; label: string; count?: number }[] = [
    { key: "all", label: "All", count: offers.length },
    { key: "pending", label: "Pending", count: stats?.pending ?? 0 },
    { key: "accepted", label: "Accepted", count: stats?.accepted ?? 0 },
    { key: "expired", label: "Expired", count: stats?.expired ?? 0 },
    { key: "cancelled", label: "Cancelled", count: stats?.cancelled ?? 0 },
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
        <div className="h-96 glass-card animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Offers</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your escrow offers and share links</p>
        </div>
        <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 w-fit">
          <Link href="/transactions/new">
            <Plus className="w-4 h-4 mr-1.5" />
            New Offer
          </Link>
        </Button>
      </div>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassStat
          label="Total Offers"
          value={stats?.total ?? 0}
          icon={<Link2 className="w-5 h-5" />}
          glowColor="blue"
        />
        <GlassStat
          label="Pending"
          value={stats?.pending ?? 0}
          icon={<Clock className="w-5 h-5" />}
          glowColor="amber"
        />
        <GlassStat
          label="Accepted"
          value={stats?.accepted ?? 0}
          icon={<CheckCircle2 className="w-5 h-5" />}
          glowColor="emerald"
        />
        <GlassStat
          label="Expired"
          value={stats?.expired ?? 0}
          icon={<XCircle className="w-5 h-5" />}
          glowColor="red"
        />
      </div>

      {/* ─── Tabs + Search ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1 border border-white/[0.06] overflow-x-auto">
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
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? "bg-primary/30" : "bg-white/[0.06]"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="w-full md:w-64">
          <GlassInput
            placeholder="Search offers..."
            icon={<Search className="w-3.5 h-3.5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ─── Offer List ─── */}
      <GlassCard padding="none">
        {filteredOffers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
              <Link2 className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {searchQuery ? "No offers match your search" : "No offers yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Create an offer and share the link with your counterparty</p>
            <Button asChild size="sm" className="mt-4 bg-primary text-primary-foreground">
              <Link href="/transactions/new">Create Offer</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filteredOffers.map((offer) => {
              const cfg = offerStatusBadgeMap[offer.status] || { label: offer.status, variant: "muted" as const }
              return (
                <div
                  key={offer.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-white/[0.03] transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Link2 className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {offer.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency(Number(offer.amount), offer.currency)}
                        {" · "}
                        <span className="capitalize">{offer.creator_role}</span>
                        {" · "}
                        {timeAgo(offer.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-13 md:ml-0">
                    <GlassBadge variant={cfg.variant} dot={cfg.dot} pulse={cfg.pulse}>
                      {cfg.label}
                    </GlassBadge>

                    {offer.status === "pending" && (
                      <>
                        <button
                          onClick={() => copyOfferLink(offer.token)}
                          className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors border border-white/[0.08]"
                          title="Copy link"
                        >
                          {copiedToken === offer.token ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCancel(offer.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
                          title="Cancel offer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {offer.status === "accepted" && offer.transaction_id && (
                      <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-primary">
                        <Link href={`/transactions/${offer.transaction_id}`}>
                          View Transaction
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
