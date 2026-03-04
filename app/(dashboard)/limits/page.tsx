"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Gauge,
  CreditCard,
  ArrowUpRight,
  Banknote,
  ShoppingCart,
  Globe,
  Shield,
  TrendingUp,
  Loader2,
  AlertTriangle,
  Info,
  ChevronRight,
  CheckCircle2,
} from "lucide-react"
import { GlassCard, GlassContainer } from "@/components/glass"
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
import { getLimitsData, requestLimitIncrease, TIER_LIMITS } from "@/lib/actions/limits"

// ─── Limit display config ───

type LimitKey = "daily_spend" | "daily_atm" | "single_txn" | "monthly_transfer" | "international" | "crypto"

const LIMIT_META: Record<LimitKey, {
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  period: string
}> = {
  daily_spend:       { label: "Daily Spending",         description: "Maximum daily card & wallet transactions", icon: ShoppingCart, color: "text-emerald-400", period: "day" },
  daily_atm:         { label: "ATM Withdrawal",          description: "Cash withdrawal limit per day",            icon: Banknote,     color: "text-blue-400",   period: "day" },
  single_txn:        { label: "Single Transaction",      description: "Maximum per-transaction amount",           icon: CreditCard,   color: "text-purple-400", period: "per txn" },
  monthly_transfer:  { label: "Monthly Transfers",       description: "Total outgoing transfers per month",       icon: ArrowUpRight, color: "text-amber-400",  period: "month" },
  international:     { label: "International Transfers", description: "Cross-border payments per month",          icon: Globe,        color: "text-cyan-400",   period: "month" },
  crypto:            { label: "Crypto Purchases",        description: "Cryptocurrency buy limit per month",       icon: TrendingUp,   color: "text-pink-400",   period: "month" },
}

const TIER_DISPLAY = {
  standard: { color: "text-gray-400",   badgeVariant: "default" as const },
  gold:      { color: "text-yellow-400", badgeVariant: "amber"   as const },
  platinum:  { color: "text-purple-400", badgeVariant: "purple"  as const },
}

const NEXT_TIER: Record<string, string | null> = {
  standard: "gold",
  gold:     "platinum",
  platinum: null,
}

export default function LimitsPage() {
  const [tierData, setTierData] = useState<any>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [showRequestDialog, setShowRequestDialog] = useState<string | null>(null)
  const [requestReason, setRequestReason] = useState("")
  const [requesting, setRequesting] = useState(false)
  const [showTierInfo, setShowTierInfo] = useState(false)

  const load = useCallback(async () => {
    setPageLoading(true)
    const result = await getLimitsData()
    if (result.error) {
      toast.error(result.error)
    } else {
      setTierData(result.data)
    }
    setPageLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleRequestIncrease = async (limitId: string) => {
    setRequesting(true)
    const result = await requestLimitIncrease({ limitType: limitId, reason: requestReason || undefined })
    if (result.error) {
      toast.error(result.error)
    } else if ((result.data as any)?.already_pending) {
      toast.info("A request for this limit is already pending review")
    } else {
      const meta = LIMIT_META[limitId as LimitKey]
      toast.success(`Limit increase requested for ${meta?.label ?? limitId}`, {
        description: "We'll review your request within 24 hours",
      })
      // Refresh to update pending badge
      await load()
    }
    setShowRequestDialog(null)
    setRequestReason("")
    setRequesting(false)
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  const tier = tierData?.tier ?? "standard"
  const tierLabel = tierData?.tierLabel ?? "Standard"
  const limits = tierData?.limits ?? TIER_LIMITS.standard
  const usage = tierData?.usage ?? {}
  const pendingRequests: string[] = tierData?.pendingRequests ?? []
  const nextTier = NEXT_TIER[tier] as string | null
  const nextLimits = nextTier ? TIER_LIMITS[nextTier as keyof typeof TIER_LIMITS] : null
  const tierDisplay = TIER_DISPLAY[tier as keyof typeof TIER_DISPLAY] ?? TIER_DISPLAY.standard

  const limitKeys = Object.keys(LIMIT_META) as LimitKey[]

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Gauge className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Limits Center
              </h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                View & manage your spending and transfer limits
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setShowTierInfo(true)} className="text-sm">
            <Shield className="w-4 h-4 mr-1.5" />
            Tier Info
          </Button>
        </div>
      </div>

      {/* Current Tier Banner */}
      <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md" variant="glow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border",
                tier === "platinum" ? "bg-purple-400/10 border-purple-400/20" :
                tier === "gold"     ? "bg-yellow-400/10 border-yellow-400/20" :
                                      "bg-gray-400/10 border-gray-400/20"
              )}>
                <Shield className={cn("w-5 h-5", tierDisplay.color)} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Your Tier</span>
                  <GlassBadge variant={tierDisplay.badgeVariant} size="sm">{tierLabel}</GlassBadge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {nextTier
                    ? `Complete enhanced verification to upgrade to ${TIER_LIMITS[nextTier as keyof typeof TIER_LIMITS].label} for higher limits`
                    : "You have the highest tier — maximum limits unlocked"}
                </p>
              </div>
            </div>
            {nextTier && (
              <Button size="sm" className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                Upgrade
              </Button>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Limits Grid */}
      <div className="animate-fade-in-up grid grid-cols-1 md:grid-cols-2 gap-3" style={{ animationDelay: "200ms" }}>
        {limitKeys.map((key) => {
          const meta = LIMIT_META[key]
          const Icon = meta.icon
          const max = limits[key] as number
          const current = (usage[key] as number) ?? 0
          const usagePercent = max > 0 ? Math.min((current / max) * 100, 100) : 0
          const isHigh = usagePercent >= 80
          const isCritical = usagePercent >= 95
          const isPending = pendingRequests.includes(key)

          return (
            <GlassCard key={key} padding="md" className="hover:bg-white/[0.06] transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                    <Icon className={cn("w-4 h-4", meta.color)} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">{meta.label}</span>
                    <p className="text-xs text-muted-foreground font-light">{meta.description}</p>
                  </div>
                </div>
                {isCritical && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isCritical ? "bg-gradient-to-r from-red-500 to-red-400"
                        : isHigh ? "bg-gradient-to-r from-amber-500 to-amber-400"
                        : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                    )}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    ${current.toLocaleString()} used
                  </span>
                  <span className="text-xs font-mono text-foreground">
                    ${max.toLocaleString()} / {meta.period}
                  </span>
                </div>
              </div>

              {/* Upgrade prompt or pending badge */}
              {nextLimits ? (
                isPending ? (
                  <div className="mt-3 flex items-center gap-1.5 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs text-amber-400">Request pending review</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowRequestDialog(key)}
                    className="mt-3 w-full flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors group"
                  >
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      {nextLimits.label}: ${(nextLimits[key] as number).toLocaleString()}/{meta.period}
                    </span>
                    <span className="text-xs text-primary flex items-center gap-0.5 group-hover:gap-1 transition-all">
                      Request Increase <ChevronRight className="w-3 h-3" />
                    </span>
                  </button>
                )
              ) : (
                <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <span className="text-xs text-emerald-400">Maximum tier — no limit increase available</span>
                </div>
              )}
            </GlassCard>
          )
        })}
      </div>

      {/* Info Note */}
      <div className="animate-fade-in flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]" style={{ animationDelay: "280ms" }}>
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground/70">
          Limits are set based on your verification level. Complete KYC verification
          to unlock higher tiers. Limit increase requests are reviewed within 24 hours.
        </p>
      </div>

      {/* Request Increase Dialog */}
      <Dialog open={!!showRequestDialog} onOpenChange={() => setShowRequestDialog(null)}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Request Limit Increase</DialogTitle>
            <DialogDescription>
              {showRequestDialog && (() => {
                const meta = LIMIT_META[showRequestDialog as LimitKey]
                if (!meta) return ""
                const nextLimit = nextLimits ? nextLimits[showRequestDialog as LimitKey] : null
                const currentMax = limits[showRequestDialog as LimitKey]
                return meta
                  ? `Increase ${meta.label} from $${Number(currentMax).toLocaleString()} to $${Number(nextLimit).toLocaleString()}/${meta.period}`
                  : ""
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Reason (optional)</label>
              <textarea
                rows={3}
                placeholder="Why do you need a higher limit?"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <p className="text-xs text-muted-foreground">
                Requests are typically reviewed within 24 hours. You may be asked to provide
                additional documentation for significant increases.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(null)}>Cancel</Button>
            <Button
              onClick={() => showRequestDialog && handleRequestIncrease(showRequestDialog)}
              disabled={requesting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {requesting && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tier Info Dialog */}
      <Dialog open={showTierInfo} onOpenChange={setShowTierInfo}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Account Tiers</DialogTitle>
            <DialogDescription>
              Your limits depend on your verification level.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {(Object.entries(TIER_LIMITS) as [string, typeof TIER_LIMITS.standard][]).map(([key, t]) => {
              const display = TIER_DISPLAY[key as keyof typeof TIER_DISPLAY]
              return (
                <div
                  key={key}
                  className={cn(
                    "p-3 rounded-lg border",
                    key === tier
                      ? "bg-white/[0.06] border-white/[0.12]"
                      : "bg-white/[0.02] border-white/[0.06]"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-sm font-medium", display?.color ?? "text-foreground")}>{t.label}</span>
                    {key === tier && <GlassBadge variant="emerald" size="sm">Current</GlassBadge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ${t.daily_spend.toLocaleString()}/day spend · ${t.daily_atm.toLocaleString()} ATM · ${t.monthly_transfer.toLocaleString()}/mo transfers
                  </p>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTierInfo(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
