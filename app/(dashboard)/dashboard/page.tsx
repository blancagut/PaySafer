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
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getTransactionStats, getUserTransactions } from "@/lib/actions/transactions"
import { getOfferStats, getMyOffers } from "@/lib/actions/offers"
import { getProfile } from "@/lib/actions/profile"
import { toast } from "sonner"

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  awaiting_payment: { label: "Awaiting Payment", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  in_escrow: { label: "In Escrow", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  delivered: { label: "Delivered", className: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400" },
  released: { label: "Released", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  dispute: { label: "Dispute", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
}

const offerStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  accepted: { label: "Accepted", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  expired: { label: "Expired", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
}

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [txnStats, setTxnStats] = useState<{ active: number; completed: number; disputes: number; total: number } | null>(null)
  const [offerStats, setOfferStats] = useState<{ total: number; pending: number; accepted: number } | null>(null)
  const [recentTxns, setRecentTxns] = useState<any[]>([])
  const [recentOffers, setRecentOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

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
      if (txnRes.data) setRecentTxns(txnRes.data.slice(0, 5))
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
    toast.success("Offer link copied to clipboard")
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const userName = profile?.full_name || profile?.email?.split("@")[0] || "there"

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome + CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Welcome back, {userName}</h2>
          <p className="text-muted-foreground mt-1">{"Here's what's happening with your escrow activity"}</p>
        </div>
        <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/transactions/new">
            <Plus className="w-5 h-5 mr-2" />
            Create Offer
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{txnStats?.active ?? 0}</p>
                <p className="text-xs text-muted-foreground">Active Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{txnStats?.completed ?? 0}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{txnStats?.disputes ?? 0}</p>
                <p className="text-xs text-muted-foreground">In Dispute</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{offerStats?.pending ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pending Offers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Offers */}
      {recentOffers.length > 0 && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">My Offers</CardTitle>
              <CardDescription>Your most recent offers</CardDescription>
            </div>
            <Button variant="outline" asChild size="sm">
              <Link href="/transactions/new">View all offers</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentOffers.map((offer) => {
                const cfg = offerStatusConfig[offer.status] || { label: offer.status, className: "bg-muted text-muted-foreground" }
                return (
                  <div key={offer.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Link2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{offer.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(Number(offer.amount), offer.currency)} · You are the {offer.creator_role}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={cfg.className}>{cfg.label}</Badge>
                      {offer.status === "pending" && (
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => copyOfferLink(offer.token)}>
                          {copiedToken === offer.token ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Recent Transactions</CardTitle>
            <CardDescription className="text-muted-foreground">Your latest escrow activities</CardDescription>
          </div>
          <Button variant="outline" asChild className="text-sm bg-transparent">
            <Link href="/transactions">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentTxns.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create an offer and share the link to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentTxns.map((txn) => {
                const isBuyer = txn.buyer_id === profile?.id
                const role = isBuyer ? "buyer" : "seller"
                const cfg = statusConfig[txn.status] || { label: txn.status, className: "bg-muted text-muted-foreground" }
                return (
                  <Link
                    key={txn.id}
                    href={`/transactions/${txn.id}`}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        role === "buyer" ? "bg-blue-100" : "bg-emerald-100"
                      }`}>
                        {role === "buyer" ? (
                          <ArrowUpRight className="w-5 h-5 text-blue-600" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{txn.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {role === "buyer" ? "Seller: " : "Buyer: "}
                          {txn.seller_email || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {formatCurrency(Number(txn.amount), txn.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(txn.created_at)}</p>
                      </div>
                      <Badge className={cfg.className}>{cfg.label}</Badge>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">How SecureEscrow protects you</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              When you create a transaction, funds are held securely until both parties confirm the deal is complete.
              We are not a bank and do not store balances. All payments are processed by Stripe.
            </p>
            <Link href="/trust" className="text-sm font-medium text-primary hover:underline mt-2 inline-block">
              Learn more about our escrow process
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
