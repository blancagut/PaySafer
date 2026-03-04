"use client"

import { useState, useEffect, useCallback } from "react"
import {
  RotateCcw,
  Plus,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pause,
  Play,
  ExternalLink,
  Music,
  Tv,
  Cloud,
  Gamepad2,
  Newspaper,
  Dumbbell,
  ShoppingBag,
  BookOpen,
  Wifi,
  Shield,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  getSubscriptions,
  toggleSubscriptionPause,
  cancelSubscription,
  type UserSubscription,
} from "@/lib/actions/subscriptions"

// ─── Subscription Categories ───

const subCategories: Record<string, { icon: typeof Tv; color: string }> = {
  streaming: { icon: Tv, color: "text-pink-400" },
  music: { icon: Music, color: "text-purple-400" },
  cloud: { icon: Cloud, color: "text-blue-400" },
  gaming: { icon: Gamepad2, color: "text-green-400" },
  news: { icon: Newspaper, color: "text-amber-400" },
  fitness: { icon: Dumbbell, color: "text-red-400" },
  shopping: { icon: ShoppingBag, color: "text-orange-400" },
  education: { icon: BookOpen, color: "text-cyan-400" },
  internet: { icon: Wifi, color: "text-indigo-400" },
  security: { icon: Shield, color: "text-emerald-400" },
}

// ─── Subscription interface for UI rendering ───

interface Subscription {
  id: string
  name: string
  category: string
  amount: number
  currency: string
  billingCycle: "monthly" | "yearly"
  nextBilling: string
  status: "active" | "paused" | "trial" | "expiring"
  color: string
  startDate: string
}

function mapSub(s: UserSubscription): Subscription {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    amount: Number(s.amount),
    currency: s.currency,
    billingCycle: s.billing_cycle,
    nextBilling: s.next_billing
      ? new Date(s.next_billing).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    status: s.status as Subscription["status"],
    color: s.color || "bg-blue-500",
    startDate: s.start_date ?? "—",
  }
}

const statusStyle: Record<string, { label: string; badge: "emerald" | "amber" | "blue" | "purple" }> = {
  active: { label: "Active", badge: "emerald" },
  paused: { label: "Paused", badge: "purple" },
  trial: { label: "Free Trial", badge: "blue" },
  expiring: { label: "Expiring", badge: "amber" },
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [search, setSearch] = useState("")
  const [showCancel, setShowCancel] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  const loadSubs = useCallback(async () => {
    const { data, error } = await getSubscriptions()
    if (error) toast.error(error)
    setSubs(data.map(mapSub))
    setPageLoading(false)
  }, [])

  useEffect(() => { loadSubs() }, [loadSubs])

  const activeSubs = subs.filter((s) => s.status === "active" || s.status === "trial")
  const monthlyTotal = subs
    .filter((s) => s.status === "active" || s.status === "trial")
    .reduce((sum, s) => sum + (s.billingCycle === "yearly" ? s.amount / 12 : s.amount), 0)
  const yearlyProjected = monthlyTotal * 12

  const filtered = subs.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  )

  // Group by upcoming billing date
  const sortedByDate = [...filtered].sort((a, b) => {
    if (a.status === "paused" && b.status !== "paused") return 1
    if (b.status === "paused" && a.status !== "paused") return -1
    return new Date(a.nextBilling).getTime() - new Date(b.nextBilling).getTime()
  })

  const handlePauseResume = async (subId: string) => {
    setLoading(true)
    const { data: updated, error } = await toggleSubscriptionPause(subId)
    if (error) {
      toast.error(error)
    } else if (updated) {
      const mapped = mapSub(updated)
      setSubs(subs.map((s) => (s.id === subId ? mapped : s)))
      toast.success(mapped.status === "paused" ? `${mapped.name} paused` : `${mapped.name} resumed`)
    }
    setLoading(false)
  }

  const handleCancel = async (subId: string) => {
    setLoading(true)
    const sub = subs.find((s) => s.id === subId)!
    const { error } = await cancelSubscription(subId)
    if (error) {
      toast.error(error)
    } else {
      setSubs(subs.filter((s) => s.id !== subId))
      toast.success(`${sub.name} cancelled`, {
        description: `You'll save ${sub.currency} ${sub.amount.toFixed(2)}/${sub.billingCycle === "monthly" ? "mo" : "yr"}`,
      })
    }
    setShowCancel(null)
    setLoading(false)
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Subscriptions
            </h2>
            <p className="text-sm text-muted-foreground font-light tracking-wide">
              Track, manage & cancel recurring charges
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Monthly Cost</span>
          <span className="text-xl font-semibold font-mono text-foreground">
            AED {monthlyTotal.toFixed(2)}
          </span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Yearly Cost</span>
          <span className="text-xl font-semibold font-mono text-amber-400">
            AED {yearlyProjected.toFixed(0)}
          </span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Active</span>
          <span className="text-xl font-semibold text-emerald-400">{activeSubs.length}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Paused</span>
          <span className="text-xl font-semibold text-foreground">{subs.filter((s) => s.status === "paused").length}</span>
        </GlassCard>
      </div>

      {/* Insight Banner */}
      <div className="animate-fade-in" style={{ animationDelay: "140ms" }}>
        <GlassCard padding="md" variant="glow">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-sm font-medium text-foreground">Savings Opportunity</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                You have {subs.filter((s) => s.status === "paused").length} paused subscription{subs.filter((s) => s.status === "paused").length !== 1 ? "s" : ""}. Consider cancelling unused ones to save AED {subs.filter((s) => s.status === "paused").reduce((sum, s) => sum + s.amount, 0).toFixed(0)}/mo.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Search */}
      <div className="animate-fade-in" style={{ animationDelay: "170ms" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search subscriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="animate-fade-in-up space-y-2" style={{ animationDelay: "200ms" }}>
        {sortedByDate.map((sub) => {
          const catConfig = subCategories[sub.category]
          const CatIcon = catConfig?.icon ?? RotateCcw
          const ss = statusStyle[sub.status]

          return (
            <GlassCard key={sub.id} padding="none" className="hover:bg-white/[0.06] transition-colors">
              <div className="flex items-center gap-4 p-4">
                {/* Logo / Brand pill */}
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-semibold", sub.color)}>
                  {sub.name.charAt(0)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{sub.name}</span>
                    <GlassBadge variant={ss.badge} size="sm">{ss.label}</GlassBadge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <CatIcon className={cn("w-2.5 h-2.5", catConfig?.color)} />
                      {sub.category}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Calendar className="w-2.5 h-2.5" />
                      Next: {sub.nextBilling}
                    </span>
                    <span>·</span>
                    <span>Since {sub.startDate}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0 mr-2">
                  <span className={cn("text-sm font-mono", sub.status === "paused" ? "text-muted-foreground line-through" : "text-foreground")}>
                    {sub.currency} {sub.amount.toFixed(2)}
                  </span>
                  <p className="text-[10px] text-muted-foreground">/{sub.billingCycle === "monthly" ? "mo" : "yr"}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePauseResume(sub.id)}
                    disabled={loading}
                    className={cn("text-xs", sub.status === "paused" ? "text-emerald-400" : "text-amber-400")}
                    title={sub.status === "paused" ? "Resume" : "Pause"}
                  >
                    {sub.status === "paused" ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCancel(sub.id)}
                    className="text-xs text-muted-foreground hover:text-red-400"
                    title="Cancel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Cancel Dialog */}
      <Dialog open={!!showCancel} onOpenChange={() => setShowCancel(null)}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Cancel Subscription</DialogTitle>
            <DialogDescription>
              {showCancel && (() => {
                const sub = subs.find((s) => s.id === showCancel)
                return sub ? `Cancel ${sub.name}? You'll lose access at the end of your current billing period.` : ""
              })()}
            </DialogDescription>
          </DialogHeader>
          {showCancel && (() => {
            const sub = subs.find((s) => s.id === showCancel)
            if (!sub) return null
            return (
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly savings</span>
                  <span className="text-emerald-400 font-mono">
                    +{sub.currency} {(sub.billingCycle === "monthly" ? sub.amount : sub.amount / 12).toFixed(2)}/mo
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Yearly savings</span>
                  <span className="text-emerald-400 font-mono">
                    +{sub.currency} {(sub.billingCycle === "yearly" ? sub.amount : sub.amount * 12).toFixed(2)}/yr
                  </span>
                </div>
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancel(null)}>Keep</Button>
            <Button
              onClick={() => showCancel && handleCancel(showCancel)}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
