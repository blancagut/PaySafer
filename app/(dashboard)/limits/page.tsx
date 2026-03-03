"use client"

import { useState } from "react"
import {
  Gauge,
  CreditCard,
  ArrowUpRight,
  Banknote,
  Landmark,
  ShoppingCart,
  Globe,
  Shield,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Limit Types ───

interface LimitItem {
  id: string
  label: string
  description: string
  icon: typeof CreditCard
  color: string
  current: number
  max: number
  unit: string
  period: string
  tier: string
  upgradeAvailable: boolean
  nextTierMax: number
  nextTier: string
}

const mockLimits: LimitItem[] = [
  { id: "daily_spend", label: "Daily Spending", description: "Maximum daily card & wallet transactions", icon: ShoppingCart, color: "text-emerald-400", current: 2400, max: 5000, unit: "$", period: "day", tier: "Gold", upgradeAvailable: true, nextTierMax: 25000, nextTier: "Platinum" },
  { id: "daily_atm", label: "ATM Withdrawal", description: "Cash withdrawal limit per day", icon: Banknote, color: "text-blue-400", current: 800, max: 2000, unit: "$", period: "day", tier: "Gold", upgradeAvailable: true, nextTierMax: 5000, nextTier: "Platinum" },
  { id: "single_txn", label: "Single Transaction", description: "Maximum per-transaction amount", icon: CreditCard, color: "text-purple-400", current: 0, max: 10000, unit: "$", period: "per txn", tier: "Gold", upgradeAvailable: true, nextTierMax: 50000, nextTier: "Platinum" },
  { id: "monthly_transfer", label: "Monthly Transfers", description: "Total outgoing transfers per month", icon: ArrowUpRight, color: "text-amber-400", current: 12500, max: 25000, unit: "$", period: "month", tier: "Gold", upgradeAvailable: true, nextTierMax: 100000, nextTier: "Platinum" },
  { id: "international", label: "International Transfers", description: "Cross-border payments per month", icon: Globe, color: "text-cyan-400", current: 3200, max: 10000, unit: "$", period: "month", tier: "Gold", upgradeAvailable: true, nextTierMax: 50000, nextTier: "Platinum" },
  { id: "crypto", label: "Crypto Purchases", description: "Cryptocurrency buy limit per month", icon: TrendingUp, color: "text-pink-400", current: 500, max: 2000, unit: "$", period: "month", tier: "Gold", upgradeAvailable: true, nextTierMax: 10000, nextTier: "Platinum" },
]

// ─── Tiers ───

const tiers = [
  { name: "Standard", color: "text-gray-400", limits: "$2,500/day spend · $1,000 ATM · $15,000/mo transfers" },
  { name: "Gold", color: "text-yellow-400", limits: "$5,000/day spend · $2,000 ATM · $25,000/mo transfers" },
  { name: "Platinum", color: "text-purple-400", limits: "$25,000/day spend · $5,000 ATM · $100,000/mo transfers" },
]

export default function LimitsPage() {
  const [limits] = useState<LimitItem[]>(mockLimits)
  const [showRequestDialog, setShowRequestDialog] = useState<string | null>(null)
  const [requestReason, setRequestReason] = useState("")
  const [requesting, setRequesting] = useState(false)
  const [showTierInfo, setShowTierInfo] = useState(false)

  const currentTier = "Gold"

  const handleRequestIncrease = async (limitId: string) => {
    setRequesting(true)
    await new Promise((r) => setTimeout(r, 1500))
    const limit = limits.find((l) => l.id === limitId)!
    toast.success(`Limit increase requested for ${limit.label}`, {
      description: "We'll review your request within 24 hours",
    })
    setShowRequestDialog(null)
    setRequestReason("")
    setRequesting(false)
  }

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
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Your Tier</span>
                  <GlassBadge variant="amber" size="sm">{currentTier}</GlassBadge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Upgrade to Platinum for higher limits across all categories
                </p>
              </div>
            </div>
            <Button size="sm" className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              Upgrade
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Limits Grid */}
      <div className="animate-fade-in-up grid grid-cols-1 md:grid-cols-2 gap-3" style={{ animationDelay: "200ms" }}>
        {limits.map((limit) => {
          const Icon = limit.icon
          const usagePercent = limit.max > 0 ? Math.min((limit.current / limit.max) * 100, 100) : 0
          const isHigh = usagePercent >= 80
          const isCritical = usagePercent >= 95

          return (
            <GlassCard key={limit.id} padding="md" className="hover:bg-white/[0.06] transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                    <Icon className={cn("w-4 h-4", limit.color)} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">{limit.label}</span>
                    <p className="text-xs text-muted-foreground font-light">{limit.description}</p>
                  </div>
                </div>
                {isCritical && (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                )}
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
                    {limit.unit}{limit.current.toLocaleString()} used
                  </span>
                  <span className="text-xs font-mono text-foreground">
                    {limit.unit}{limit.max.toLocaleString()} / {limit.period}
                  </span>
                </div>
              </div>

              {/* Upgrade prompt */}
              {limit.upgradeAvailable && (
                <button
                  onClick={() => setShowRequestDialog(limit.id)}
                  className="mt-3 w-full flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors group"
                >
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    {limit.nextTier}: {limit.unit}{limit.nextTierMax.toLocaleString()}/{limit.period}
                  </span>
                  <span className="text-xs text-primary flex items-center gap-0.5 group-hover:gap-1 transition-all">
                    Request Increase <ChevronRight className="w-3 h-3" />
                  </span>
                </button>
              )}
            </GlassCard>
          )
        })}
      </div>

      {/* Info Note */}
      <div className="animate-fade-in flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]" style={{ animationDelay: "280ms" }}>
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground/70">
          Limits are set based on your verification level and account tier. Complete KYC verification
          and maintain good standing to qualify for higher limits. Enterprise accounts can request
          custom limits.
        </p>
      </div>

      {/* Request Increase Dialog */}
      <Dialog open={!!showRequestDialog} onOpenChange={() => setShowRequestDialog(null)}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Request Limit Increase</DialogTitle>
            <DialogDescription>
              {showRequestDialog && (() => {
                const limit = limits.find((l) => l.id === showRequestDialog)
                return limit ? `Increase ${limit.label} from ${limit.unit}${limit.max.toLocaleString()} to ${limit.unit}${limit.nextTierMax.toLocaleString()}/${limit.period}` : ""
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
              Your limits depend on your verification level and account tier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={cn(
                  "p-3 rounded-lg border",
                  tier.name === currentTier
                    ? "bg-white/[0.06] border-white/[0.12]"
                    : "bg-white/[0.02] border-white/[0.06]"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-sm font-medium", tier.color)}>{tier.name}</span>
                  {tier.name === currentTier && <GlassBadge variant="emerald" size="sm">Current</GlassBadge>}
                </div>
                <p className="text-xs text-muted-foreground">{tier.limits}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTierInfo(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
