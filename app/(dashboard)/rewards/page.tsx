"use client"

import { useState } from "react"
import {
  Gift,
  Star,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
  CreditCard,
  DollarSign,
  ShoppingCart,
  Plane,
  Coffee,
  Percent,
  ChevronRight,
  CheckCircle2,
} from "lucide-react"
import { GlassCard, GlassContainer, GlassStat } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Mock Data ───

interface CashbackTransaction {
  id: string
  merchant: string
  category: string
  amount: number
  cashback: number
  rate: string
  date: string
  status: "credited" | "pending"
}

const cashbackHistory: CashbackTransaction[] = [
  { id: "c1", merchant: "Carrefour", category: "Groceries", amount: 245.80, cashback: 4.92, rate: "2%", date: "Mar 2, 2026", status: "credited" },
  { id: "c2", merchant: "Emirates", category: "Travel", amount: 1200.00, cashback: 36.00, rate: "3%", date: "Mar 1, 2026", status: "pending" },
  { id: "c3", merchant: "Starbucks", category: "Dining", amount: 18.50, cashback: 0.37, rate: "2%", date: "Feb 28, 2026", status: "credited" },
  { id: "c4", merchant: "Amazon", category: "Shopping", amount: 189.99, cashback: 1.90, rate: "1%", date: "Feb 27, 2026", status: "credited" },
  { id: "c5", merchant: "Uber", category: "Transport", amount: 34.00, cashback: 0.68, rate: "2%", date: "Feb 26, 2026", status: "credited" },
  { id: "c6", merchant: "Netflix", category: "Entertainment", amount: 15.99, cashback: 0.16, rate: "1%", date: "Feb 25, 2026", status: "credited" },
]

interface RewardTier {
  name: string
  cashbackBase: string
  cashbackBoost: string
  perks: string[]
  color: string
  textColor: string
  borderColor: string
}

const rewardTiers: RewardTier[] = [
  {
    name: "Standard",
    cashbackBase: "1%",
    cashbackBoost: "2% on groceries & dining",
    perks: ["Basic cashback on all purchases", "Monthly cashback payout"],
    color: "bg-emerald-500/10",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
  },
  {
    name: "Gold",
    cashbackBase: "1.5%",
    cashbackBoost: "3% on travel & dining",
    perks: ["Higher base cashback", "Weekly cashback payout", "No FX markup on cashback"],
    color: "bg-amber-500/10",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/20",
  },
  {
    name: "Platinum",
    cashbackBase: "2%",
    cashbackBoost: "5% on travel, 3% on everything else",
    perks: ["Highest cashback rates", "Instant cashback credit", "Airport lounge access", "Price protection"],
    color: "bg-purple-500/10",
    textColor: "text-purple-400",
    borderColor: "border-purple-500/20",
  },
]

const boostOffers = [
  { id: "bo1", merchant: "Amazon", boost: "5%", expires: "Mar 15", icon: ShoppingCart, color: "text-orange-400" },
  { id: "bo2", merchant: "Emirates", boost: "6%", expires: "Mar 31", icon: Plane, color: "text-blue-400" },
  { id: "bo3", merchant: "Starbucks", boost: "10%", expires: "Mar 10", icon: Coffee, color: "text-emerald-400" },
]

export default function RewardsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "tiers">("overview")

  const totalEarned = 284.65
  const thisMonth = 43.87
  const pendingCashback = 36.00
  const currentTier = "Gold"

  const handleRedeem = () => {
    toast.success("$43.87 cashback credited to your wallet!", {
      description: "This month's cashback has been added to your balance.",
    })
  }

  const handleActivateBoost = (merchant: string) => {
    toast.success(`${merchant} boost activated!`, {
      description: "Enhanced cashback rate is now active for this merchant.",
    })
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Rewards & Cashback
            </h2>
            <p className="text-sm text-muted-foreground font-light tracking-wide">
              Earn cashback on every purchase with your PaySafer card
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Total Earned</span>
          <span className="text-xl font-semibold text-emerald-400 font-mono">${totalEarned.toFixed(2)}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">This Month</span>
          <span className="text-xl font-semibold text-foreground font-mono">${thisMonth.toFixed(2)}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Pending</span>
          <span className="text-xl font-semibold text-amber-400 font-mono">${pendingCashback.toFixed(2)}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Your Tier</span>
          <span className="text-xl font-semibold text-amber-400">{currentTier}</span>
        </GlassCard>
      </div>

      {/* Redeem CTA */}
      <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
        <GlassCard padding="md" variant="glow">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-foreground">Ready to redeem</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                ${thisMonth.toFixed(2)} cashback available for instant wallet credit
              </p>
            </div>
            <Button onClick={handleRedeem} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm">
              <DollarSign className="w-4 h-4 mr-1" />
              Redeem Now
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Boost Offers */}
      <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <GlassContainer
          header={{
            title: "Cashback Boosts",
            description: "Activate for enhanced rates at select merchants",
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {boostOffers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4 flex flex-col"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
                    <offer.icon className={cn("w-4.5 h-4.5", offer.color)} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">{offer.merchant}</span>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span className="text-xs text-amber-400 font-medium">{offer.boost} cashback</span>
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground mb-3">
                  Expires {offer.expires}
                </span>
                <Button
                  size="sm"
                  onClick={() => handleActivateBoost(offer.merchant)}
                  className="mt-auto bg-white/[0.06] hover:bg-white/[0.10] text-foreground text-xs border border-white/[0.08]"
                >
                  Activate Boost
                </Button>
              </div>
            ))}
          </div>
        </GlassContainer>
      </div>

      {/* Tabs */}
      <div className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] w-fit mb-4">
          {(["overview", "history", "tiers"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm transition-colors capitalize",
                activeTab === tab
                  ? "bg-white/[0.08] text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <GlassCard padding="md">
            <h3 className="text-sm font-medium text-foreground mb-4">Your Cashback Rates (Gold Tier)</h3>
            <div className="space-y-3">
              {[
                { category: "Travel & Airlines", rate: "3%", icon: Plane, color: "text-blue-400" },
                { category: "Dining & Restaurants", rate: "3%", icon: Coffee, color: "text-amber-400" },
                { category: "Groceries", rate: "2%", icon: ShoppingCart, color: "text-emerald-400" },
                { category: "Everything Else", rate: "1.5%", icon: CreditCard, color: "text-slate-400" },
              ].map((item) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <item.icon className={cn("w-4 h-4", item.color)} />
                    <span className="text-sm text-muted-foreground">{item.category}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground font-mono">{item.rate}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-2">
            {cashbackHistory.map((tx) => (
              <GlassCard key={tx.id} padding="none" className="hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center gap-3 p-3.5">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                    <Percent className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{tx.merchant}</span>
                      <GlassBadge
                        variant={tx.status === "credited" ? "emerald" : "amber"}
                        size="sm"
                      >
                        {tx.status === "credited" ? "Credited" : "Pending"}
                      </GlassBadge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {tx.category} · {tx.rate} · {tx.date}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm text-emerald-400 font-mono block">
                      +${tx.cashback.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      on ${tx.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Tiers Tab */}
        {activeTab === "tiers" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {rewardTiers.map((tier) => {
              const isCurrent = tier.name === currentTier
              return (
                <div
                  key={tier.name}
                  className={cn(
                    "rounded-xl border p-5",
                    tier.color,
                    tier.borderColor,
                    isCurrent && "ring-1 ring-amber-400/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Star className={cn("w-5 h-5", tier.textColor)} />
                    <span className={cn("text-lg font-semibold", tier.textColor)}>{tier.name}</span>
                    {isCurrent && (
                      <GlassBadge variant="amber" size="sm">Current</GlassBadge>
                    )}
                  </div>
                  <div className="mb-3">
                    <span className="text-2xl font-semibold text-foreground">{tier.cashbackBase}</span>
                    <span className="text-sm text-muted-foreground ml-1">base</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{tier.cashbackBoost}</p>
                  <div className="space-y-1.5">
                    {tier.perks.map((perk) => (
                      <div key={perk} className="flex items-center gap-2">
                        <CheckCircle2 className={cn("w-3.5 h-3.5 shrink-0", tier.textColor)} />
                        <span className="text-xs text-muted-foreground">{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
