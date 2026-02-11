"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Clock,
  RefreshCw,
  Shield,
  CreditCard,
  Send,
  QrCode,
  Plus,
  ArrowRight,
  Receipt,
  Copy,
  Check,
  Sparkles,
  Users,
} from "lucide-react"
import { GlassCard, GlassContainer } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getWallet, getWalletHistory, createTopUpSession, getMyProfile, claimUsername } from "@/lib/actions/wallet"
import { getRecentRecipients } from "@/lib/actions/contacts"
import { getPaymentRequests, type PaymentRequest, acceptPaymentRequest, declinePaymentRequest } from "@/lib/actions/transfers"
import { getUserTransactions } from "@/lib/actions/transactions"
import { toast } from "sonner"
import type { WalletTransaction } from "@/lib/actions/wallet"

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function getInitials(name: string | null | undefined) {
  if (!name) return "?"
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

// ─── Top-Up Dialog ───
function TopUpDialog() {
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const presets = [10, 25, 50, 100, 250, 500]

  async function handleTopUp() {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount < 1) {
      toast.error("Minimum top-up is €1.00")
      return
    }
    setLoading(true)
    const result = await createTopUpSession(numAmount)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    if (result.url) {
      window.location.href = result.url
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Top Up
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle>Top Up Wallet</DialogTitle>
          <DialogDescription>Add funds via card. Powered by Stripe.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-3 gap-2">
            {presets.map(p => (
              <Button
                key={p}
                variant="outline"
                size="sm"
                onClick={() => setAmount(p.toString())}
                className={`bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] ${amount === p.toString() ? "border-emerald-500/50 bg-emerald-500/10" : ""}`}
              >
                €{p}
              </Button>
            ))}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Custom amount</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                min="1"
                max="10000"
                step="0.01"
                className="pl-7 bg-white/[0.04] border-white/[0.10]"
              />
            </div>
          </div>
          <Button
            onClick={handleTopUp}
            disabled={loading || !amount}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? "Redirecting to Stripe..." : `Top Up €${amount || "0.00"}`}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">Secure payment via Stripe. No fees on deposits.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Username Claim Banner ───
function UsernameBanner({ onClaimed }: { onClaimed: () => void }) {
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleClaim() {
    if (!username.trim()) return
    setLoading(true)
    const result = await claimUsername(username.trim().toLowerCase())
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`You're now $${username}!`)
      onClaimed()
    }
  }

  return (
    <GlassCard variant="glow" glowColor="purple" padding="sm" className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Claim your PaySafe ID</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set your unique $username so people can send you money easily.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="username"
              maxLength={20}
              className="pl-6 w-40 h-8 text-sm bg-white/[0.04] border-white/[0.10]"
            />
          </div>
          <Button size="sm" onClick={handleClaim} disabled={loading || !username.trim()} className="h-8">
            {loading ? "..." : "Claim"}
          </Button>
        </div>
      </div>
    </GlassCard>
  )
}

// ─── Pending Requests Card ───
function PendingRequestsCard({ requests, onAction }: { requests: PaymentRequest[]; onAction: () => void }) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  if (requests.length === 0) return null

  async function handleAccept(id: string) {
    setActionLoading(id)
    const result = await acceptPaymentRequest(id)
    setActionLoading(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Payment sent!")
      onAction()
    }
  }

  async function handleDecline(id: string) {
    setActionLoading(id)
    const result = await declinePaymentRequest(id)
    setActionLoading(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Request declined")
      onAction()
    }
  }

  return (
    <GlassCard variant="glow" glowColor="amber" padding="sm" className="animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-foreground">Pending Requests</span>
        <GlassBadge variant="warning">{requests.length}</GlassBadge>
      </div>
      <div className="space-y-2">
        {requests.map(req => (
          <div key={req.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div>
              <p className="text-sm font-medium text-foreground">{formatCurrency(Number(req.amount), req.currency)}</p>
              {req.note && <p className="text-xs text-muted-foreground truncate max-w-48">{req.note}</p>}
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDecline(req.id)}
                disabled={actionLoading === req.id}
                className="h-7 text-xs bg-white/[0.04] border-white/[0.10]"
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={() => handleAccept(req.id)}
                disabled={actionLoading === req.id}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
              >
                Pay
              </Button>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

// ─── Main Wallet Page ───
export default function WalletPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [history, setHistory] = useState<WalletTransaction[]>([])
  const [recentRecipients, setRecentRecipients] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<PaymentRequest[]>([])
  const [escrowData, setEscrowData] = useState({ inEscrow: 0, pending: 0 })
  const [copied, setCopied] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [walletRes, profileRes, historyRes, recipientsRes, requestsRes, txnRes] = await Promise.all([
        getWallet(),
        getMyProfile(),
        getWalletHistory({ limit: 10 }),
        getRecentRecipients(6),
        getPaymentRequests({ role: "payer", status: "pending" }),
        getUserTransactions(),
      ])

      if (walletRes.data) setWallet(walletRes.data)
      if (profileRes.data) setProfile(profileRes.data)
      if (historyRes.data) setHistory(historyRes.data)
      if (recipientsRes.data) setRecentRecipients(recipientsRes.data)
      if (requestsRes.data) setPendingRequests(requestsRes.data)

      if (txnRes.data) {
        const inEscrow = txnRes.data
          .filter((t: any) => t.status === "in_escrow" || t.status === "delivered")
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
        const pending = txnRes.data
          .filter((t: any) => t.status === "awaiting_payment")
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
        setEscrowData({ inEscrow, pending })
      }
    } catch {
      toast.error("Failed to load wallet data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("topup") === "success") {
      toast.success("Top-up successful! Your balance will update shortly.")
      window.history.replaceState({}, "", "/wallet")
    }
    if (params.get("topup") === "cancelled") {
      toast.info("Top-up cancelled.")
      window.history.replaceState({}, "", "/wallet")
    }
  }, [])

  function copyPaymentLink() {
    if (!profile?.username) return
    const url = `${window.location.origin}/pay/${profile.username}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Payment link copied!")
    setTimeout(() => setCopied(false), 2000)
  }

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

  const balance = Number(wallet?.balance || 0)
  const currency = wallet?.currency || "EUR"

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Wallet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {profile?.username ? (
              <span>
                Your PaySafe ID: <span className="text-primary font-medium">${profile.username}</span>
              </span>
            ) : (
              "Send, receive, and manage your money"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <TopUpDialog />
        </div>
      </div>

      {/* Username claim banner */}
      {!profile?.username && <UsernameBanner onClaimed={loadData} />}

      {/* Pending payment requests */}
      <PendingRequestsCard requests={pendingRequests} onAction={loadData} />

      {/* ─── Main Balance + Actions ─── */}
      <GlassCard variant="glow" glowColor="emerald" padding="none" className="animate-fade-in-up overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Available Balance</p>
              <p className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                {formatCurrency(balance, currency)}
              </p>
              {(escrowData.inEscrow > 0 || escrowData.pending > 0) && (
                <div className="flex items-center gap-4 mt-2">
                  {escrowData.inEscrow > 0 && (
                    <span className="text-xs text-blue-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {formatCurrency(escrowData.inEscrow, currency)} in escrow
                    </span>
                  )}
                  {escrowData.pending > 0 && (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatCurrency(escrowData.pending, currency)} pending
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push("/wallet/send")}
                className="bg-primary hover:bg-primary/90 gap-1.5 h-11 px-6"
              >
                <Send className="w-4 h-4" />
                Send
              </Button>
              <Button
                onClick={() => router.push("/wallet/request")}
                variant="outline"
                className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] gap-1.5 h-11 px-6"
              >
                <ArrowDownRight className="w-4 h-4" />
                Request
              </Button>
            </div>
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-emerald-500/40 via-primary/20 to-emerald-500/0" />
      </GlassCard>

      {/* ─── Quick Send (Recent Recipients) ─── */}
      {recentRecipients.length > 0 && (
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Quick Send</span>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
              <Link href="/wallet/send">See all</Link>
            </Button>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recentRecipients.map((r: any) => (
              <button
                key={r.id}
                onClick={() => router.push(`/wallet/send?to=${r.username || r.email}`)}
                className="flex flex-col items-center gap-1.5 min-w-[72px] p-2 rounded-xl hover:bg-white/[0.04] transition-colors group"
              >
                <Avatar className="w-12 h-12 border-2 border-white/[0.06] group-hover:border-primary/30 transition-colors">
                  <AvatarFallback className="bg-white/[0.06] text-foreground text-sm">
                    {getInitials(r.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] text-muted-foreground truncate max-w-[68px] group-hover:text-foreground transition-colors">
                  {r.username ? `$${r.username}` : r.full_name?.split(" ")[0] || r.email.split("@")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Activity + Info Grid ─── */}
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
          {history.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                <Wallet className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground mt-1">Top up your wallet or send money to get started</p>
            </div>
          ) : (
            <div className="space-y-1">
              {history.map(txn => {
                const isCredit = txn.direction === "credit"
                return (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCredit ? "bg-emerald-500/10" : "bg-red-500/10"
                      }`}>
                        {isCredit ? (
                          <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-64">
                          {txn.description || txn.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">{timeAgo(txn.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
                        {isCredit ? "+" : "-"}{formatCurrency(Number(txn.amount), currency)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatCurrency(Number(txn.balance_after), currency)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassContainer>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Payment Link */}
          {profile?.username && (
            <GlassCard variant="gradient" padding="sm" className="animate-fade-in-up">
              <div className="flex items-center gap-3 mb-3">
                <QrCode className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Your Payment Link</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <code className="text-xs text-primary flex-1 truncate">
                  paysafer.site/pay/{profile.username}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyPaymentLink}
                  className="h-7 w-7 p-0 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Share this link to receive payments instantly.
              </p>
            </GlassCard>
          )}

          {/* Security */}
          <GlassCard variant="gradient" padding="sm" className="animate-fade-in-up">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Bank-Grade Security</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  All transfers are atomic and verified. Wallet balances are
                  protected by database-level constraints. Payments via Stripe.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Quick Links */}
          <GlassCard padding="sm" className="animate-fade-in-up">
            <div className="space-y-2">
              <Link
                href="/wallet/send"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Send className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground">Send Money</span>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
              <Link
                href="/wallet/request"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <ArrowDownRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground">Request Money</span>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
              <Link
                href="/transactions/new"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground">Create Escrow Deal</span>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
              <Link
                href="/payouts"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground">Withdraw to Bank</span>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
