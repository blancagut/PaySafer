"use client"

import { useState } from "react"
import {
  CreditCard,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Shield,
  Smartphone,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Hash,
  Wallet,
  ArrowUpDown,
  Copy,
  Snowflake,
} from "lucide-react"
import { GlassCard, GlassContainer } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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

// ─── Mock card data ───

interface CardData {
  id: string
  tier: "standard" | "gold" | "platinum"
  last4: string
  expiry: string
  status: "active" | "frozen" | "inactive" | "expired"
  type: "virtual" | "physical"
  dailyLimit: number
  monthlyLimit: number
  atmLimit: number
  contactless: boolean
  onlinePurchases: boolean
  internationalPayments: boolean
  magStripe: boolean
}

const mockCard: CardData = {
  id: "card_1",
  tier: "gold",
  last4: "8421",
  expiry: "03/28",
  status: "active",
  type: "physical",
  dailyLimit: 15000,
  monthlyLimit: 50000,
  atmLimit: 2000,
  contactless: true,
  onlinePurchases: true,
  internationalPayments: true,
  magStripe: false,
}

const tierConfig = {
  standard: { label: "Standard", color: "emerald", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  gold: { label: "Gold", color: "amber", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  platinum: { label: "Platinum", color: "purple", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
}

const statusConfig = {
  active: { label: "Active", badge: "emerald" as const },
  frozen: { label: "Frozen", badge: "blue" as const },
  inactive: { label: "Inactive", badge: "red" as const },
  expired: { label: "Expired", badge: "red" as const },
}

export default function CardManagePage() {
  const [card, setCard] = useState<CardData>(mockCard)
  const [showPin, setShowPin] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false)
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [loading, setLoading] = useState("")

  const tier = tierConfig[card.tier]
  const status = statusConfig[card.status]

  const handleFreeze = async () => {
    setLoading("freeze")
    await new Promise((r) => setTimeout(r, 1000))
    const newStatus = card.status === "frozen" ? "active" : "frozen"
    setCard((c) => ({ ...c, status: newStatus }))
    toast.success(newStatus === "frozen" ? "Card frozen instantly" : "Card unfrozen — ready to use")
    setFreezeDialogOpen(false)
    setLoading("")
  }

  const handleToggle = async (key: keyof CardData) => {
    setLoading(key)
    await new Promise((r) => setTimeout(r, 500))
    setCard((c) => ({ ...c, [key]: !c[key] }))
    toast.success("Setting updated")
    setLoading("")
  }

  const handleReplace = async () => {
    setLoading("replace")
    await new Promise((r) => setTimeout(r, 1500))
    toast.success("Replacement card ordered!", {
      description: "Your new card will arrive in 5-7 business days.",
    })
    setReplaceDialogOpen(false)
    setLoading("")
  }

  const handleSetPin = async () => {
    setLoading("pin")
    await new Promise((r) => setTimeout(r, 1000))
    toast.success("PIN updated successfully")
    setPinDialogOpen(false)
    setLoading("")
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Card Management
            </h2>
            <p className="text-sm text-muted-foreground font-light tracking-wide">
              Control your PaySafer {tier.label} Card
            </p>
          </div>
        </div>
      </div>

      {/* Card Summary */}
      <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="none" className={tier.border}>
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center", tier.bg)}>
                  <CreditCard className={cn("w-7 h-7", tier.text)} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium text-foreground">
                      PaySafer {tier.label}
                    </span>
                    <GlassBadge variant={status.badge} size="sm">
                      {status.label}
                    </GlassBadge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {card.type === "physical" ? "Physical" : "Virtual"} · •••• {card.last4} · Exp {card.expiry}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-muted-foreground"
              >
                {showDetails ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                {showDetails ? "Hide" : "Show"} Details
              </Button>
            </div>

            {showDetails && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Card Number", value: "5412 •••• •••• 8421" },
                  { label: "Expiry", value: card.expiry },
                  { label: "CVV", value: "•••" },
                ].map((d) => (
                  <div key={d.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                    <span className="text-[10px] text-muted-foreground tracking-wider uppercase block mb-1">
                      {d.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-foreground">{d.value}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(d.value)
                          toast.success("Copied")
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Quick Actions */}
      <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: card.status === "frozen" ? "Unfreeze" : "Freeze",
              icon: card.status === "frozen" ? Unlock : Snowflake,
              color: card.status === "frozen" ? "emerald" : "blue",
              action: () => setFreezeDialogOpen(true),
            },
            {
              label: "Change PIN",
              icon: Hash,
              color: "amber",
              action: () => setPinDialogOpen(true),
            },
            {
              label: "Replace Card",
              icon: RefreshCw,
              color: "purple",
              action: () => setReplaceDialogOpen(true),
            },
            {
              label: "View PIN",
              icon: showPin ? EyeOff : Eye,
              color: "emerald",
              action: () => {
                setShowPin(!showPin)
                if (!showPin) toast.info("PIN: ••••", { description: "For security, PINs are shown in-app only" })
              },
            },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.action}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  btn.color === "emerald" && "bg-emerald-500/10",
                  btn.color === "blue" && "bg-blue-500/10",
                  btn.color === "amber" && "bg-amber-500/10",
                  btn.color === "purple" && "bg-purple-500/10"
                )}
              >
                <btn.icon
                  className={cn(
                    "w-5 h-5",
                    btn.color === "emerald" && "text-emerald-400",
                    btn.color === "blue" && "text-blue-400",
                    btn.color === "amber" && "text-amber-400",
                    btn.color === "purple" && "text-purple-400"
                  )}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Spending Limits */}
      <div className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
        <GlassContainer header={{ title: "Spending Limits", description: "Adjust daily, monthly, and ATM limits" }}>
          <div className="space-y-4">
            {[
              { label: "Daily Limit", value: card.dailyLimit, max: 50000, icon: ArrowUpDown },
              { label: "Monthly Limit", value: card.monthlyLimit, max: 200000, icon: Wallet },
              { label: "ATM Withdrawal", value: card.atmLimit, max: 5000, icon: CreditCard },
            ].map((limit) => (
              <div key={limit.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <limit.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{limit.label}</span>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground">
                    ${limit.value.toLocaleString()} / ${limit.max.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/60 rounded-full transition-all"
                    style={{ width: `${(limit.value / limit.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              Need higher limits? Complete Full (Tier 3) verification or contact support.
            </p>
          </div>
        </GlassContainer>
      </div>

      {/* Security Controls */}
      <div className="animate-fade-in-up" style={{ animationDelay: "350ms" }}>
        <GlassContainer header={{ title: "Security Controls", description: "Toggle card features on or off instantly" }}>
          <div className="space-y-1">
            {[
              { key: "contactless" as const, label: "Contactless Payments", desc: "Tap to pay at terminals", icon: Smartphone },
              { key: "onlinePurchases" as const, label: "Online Purchases", desc: "E-commerce and web transactions", icon: Globe },
              { key: "internationalPayments" as const, label: "International Payments", desc: "Transactions outside your home country", icon: Globe },
              { key: "magStripe" as const, label: "Magnetic Stripe", desc: "Legacy swipe payments (less secure)", icon: CreditCard },
            ].map((ctrl) => (
              <div
                key={ctrl.key}
                className="flex items-center justify-between py-3.5 border-b border-white/[0.04] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                    <ctrl.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="text-sm text-foreground">{ctrl.label}</span>
                    <p className="text-xs text-muted-foreground">{ctrl.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={card[ctrl.key] as boolean}
                  onCheckedChange={() => handleToggle(ctrl.key)}
                  disabled={loading === ctrl.key}
                />
              </div>
            ))}
          </div>
        </GlassContainer>
      </div>

      {/* Freeze Dialog */}
      <Dialog open={freezeDialogOpen} onOpenChange={setFreezeDialogOpen}>
        <DialogContent className="glass-card border-white/[0.10] max-w-sm">
          <DialogHeader>
            <div className="flex items-center justify-center mb-3">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", card.status === "frozen" ? "bg-emerald-500/10" : "bg-blue-500/10")}>
                {card.status === "frozen" ? (
                  <Unlock className="w-7 h-7 text-emerald-400" />
                ) : (
                  <Snowflake className="w-7 h-7 text-blue-400" />
                )}
              </div>
            </div>
            <DialogTitle className="text-center">
              {card.status === "frozen" ? "Unfreeze Your Card?" : "Freeze Your Card?"}
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              {card.status === "frozen"
                ? "Your card will be reactivated immediately and you can start using it again."
                : "All transactions will be blocked instantly. You can unfreeze anytime."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" onClick={() => setFreezeDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleFreeze}
              disabled={loading === "freeze"}
              className={cn(
                "flex-1 font-medium",
                card.status === "frozen"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              {loading === "freeze" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {card.status === "frozen" ? "Unfreeze" : "Freeze Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Card Dialog */}
      <Dialog open={replaceDialogOpen} onOpenChange={setReplaceDialogOpen}>
        <DialogContent className="glass-card border-white/[0.10] max-w-sm">
          <DialogHeader>
            <DialogTitle>Replace Card</DialogTitle>
            <DialogDescription className="text-sm">
              Your current card will be cancelled and a new one shipped. This takes 5-7 business days.
              A $5 replacement fee may apply.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {["Lost / Stolen", "Damaged", "Compromised", "Other"].map((reason) => (
              <button
                key={reason}
                className="w-full text-left px-4 py-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-sm text-foreground transition-colors"
              >
                {reason}
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setReplaceDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleReplace}
              disabled={loading === "replace"}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {loading === "replace" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Order Replacement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change PIN Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="glass-card border-white/[0.10] max-w-sm">
          <DialogHeader>
            <DialogTitle>Change PIN</DialogTitle>
            <DialogDescription className="text-sm">
              Enter a new 4-digit PIN for your card
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
                New PIN
              </label>
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                className="w-full h-10 rounded-lg bg-white/[0.04] border border-white/[0.10] px-3 text-center text-lg font-mono tracking-[0.5em] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
                Confirm PIN
              </label>
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                className="w-full h-10 rounded-lg bg-white/[0.04] border border-white/[0.10] px-3 text-center text-lg font-mono tracking-[0.5em] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPinDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSetPin}
              disabled={loading === "pin"}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {loading === "pin" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Update PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
