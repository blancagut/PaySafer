"use client"

import { useState } from "react"
import {
  Bell,
  BellRing,
  BellOff,
  CreditCard,
  ShieldAlert,
  Megaphone,
  Repeat,
  Users,
  TrendingUp,
  Gift,
  MessageCircle,
  Loader2,
  CheckCircle2,
  Smartphone,
  Mail,
  Volume2,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Notification Categories ───

interface NotifCategory {
  id: string
  label: string
  description: string
  icon: typeof Bell
  color: string
  push: boolean
  email: boolean
  sound: boolean
}

const initialCategories: NotifCategory[] = [
  { id: "transactions", label: "Transactions", description: "Payments received, sent, and failed transactions", icon: CreditCard, color: "text-emerald-400", push: true, email: true, sound: true },
  { id: "security", label: "Security Alerts", description: "Login attempts, password changes, and suspicious activity", icon: ShieldAlert, color: "text-red-400", push: true, email: true, sound: true },
  { id: "marketing", label: "Promotions & Offers", description: "Cashback boosts, partner deals, and seasonal offers", icon: Megaphone, color: "text-purple-400", push: true, email: false, sound: false },
  { id: "recurring", label: "Recurring Payments", description: "Upcoming auto-payments, subscription renewals", icon: Repeat, color: "text-blue-400", push: true, email: true, sound: false },
  { id: "social", label: "Social & Messages", description: "New messages, payment requests from contacts", icon: MessageCircle, color: "text-pink-400", push: true, email: false, sound: true },
  { id: "savings", label: "Savings & Goals", description: "Goal milestones, auto-save confirmations", icon: TrendingUp, color: "text-amber-400", push: true, email: false, sound: false },
  { id: "referrals", label: "Referral Updates", description: "When friends sign up or you earn rewards", icon: Users, color: "text-cyan-400", push: true, email: true, sound: false },
  { id: "rewards", label: "Rewards & Cashback", description: "Cashback earned, tier upgrades, and redemptions", icon: Gift, color: "text-yellow-400", push: true, email: false, sound: false },
]

type Channel = "push" | "email" | "sound"

export default function NotificationsSettingsPage() {
  const [categories, setCategories] = useState<NotifCategory[]>(initialCategories)
  const [saving, setSaving] = useState(false)
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false)
  const [quietFrom, setQuietFrom] = useState("22:00")
  const [quietTo, setQuietTo] = useState("07:00")

  const allPush = categories.every((c) => c.push)
  const allEmail = categories.every((c) => c.email)

  const handleToggle = (id: string, channel: Channel) => {
    setCategories(categories.map((c) =>
      c.id === id ? { ...c, [channel]: !c[channel] } : c
    ))
  }

  const handleToggleAll = (channel: Channel) => {
    const allOn = categories.every((c) => c[channel])
    setCategories(categories.map((c) => ({ ...c, [channel]: !allOn })))
    toast.success(`${channel === "push" ? "Push" : channel === "email" ? "Email" : "Sound"} notifications ${allOn ? "disabled" : "enabled"} for all`)
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 1200))
    toast.success("Notification preferences saved")
    setSaving(false)
  }

  const handleTestNotification = () => {
    toast("🔔 Test notification", {
      description: "This is how your notifications will appear",
    })
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Notification Settings
              </h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Choose what alerts you receive and how
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
            Save
          </Button>
        </div>
      </div>

      {/* Quick Toggles */}
      <div className="animate-fade-in grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md" className="hover:bg-white/[0.06] transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-primary" />
              <div>
                <span className="text-sm font-medium text-foreground">All Push</span>
                <p className="text-xs text-muted-foreground">{categories.filter((c) => c.push).length}/{categories.length}</p>
              </div>
            </div>
            <Switch checked={allPush} onCheckedChange={() => handleToggleAll("push")} />
          </div>
        </GlassCard>

        <GlassCard padding="md" className="hover:bg-white/[0.06] transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-sm font-medium text-foreground">All Email</span>
                <p className="text-xs text-muted-foreground">{categories.filter((c) => c.email).length}/{categories.length}</p>
              </div>
            </div>
            <Switch checked={allEmail} onCheckedChange={() => handleToggleAll("email")} />
          </div>
        </GlassCard>

        <GlassCard padding="md" className="hover:bg-white/[0.06] transition-colors cursor-pointer" onClick={handleTestNotification}>
          <div className="flex items-center gap-2.5">
            <BellRing className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-sm font-medium text-foreground">Test Notification</span>
              <p className="text-xs text-muted-foreground">Send a sample alert</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Quiet Hours */}
      <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
        <GlassCard padding="md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <BellOff className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Quiet Hours</span>
                <p className="text-xs text-muted-foreground font-light">Mute non-critical notifications during set times</p>
              </div>
            </div>
            <Switch checked={quietHoursEnabled} onCheckedChange={setQuietHoursEnabled} />
          </div>
          {quietHoursEnabled && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/[0.06]">
              <span className="text-xs text-muted-foreground">From</span>
              <input
                type="time"
                value={quietFrom}
                onChange={(e) => setQuietFrom(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="time"
                value={quietTo}
                onChange={(e) => setQuietTo(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <span className="text-xs text-muted-foreground ml-2">(Security alerts always come through)</span>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Categories Table Header */}
      <div className="animate-fade-in hidden sm:grid grid-cols-[1fr_80px_80px_80px] gap-4 px-4" style={{ animationDelay: "180ms" }}>
        <span className="text-xs text-muted-foreground tracking-wide uppercase">Category</span>
        <span className="text-xs text-muted-foreground tracking-wide uppercase text-center">Push</span>
        <span className="text-xs text-muted-foreground tracking-wide uppercase text-center">Email</span>
        <span className="text-xs text-muted-foreground tracking-wide uppercase text-center">Sound</span>
      </div>

      {/* Category Rows */}
      <div className="animate-fade-in-up space-y-2" style={{ animationDelay: "200ms" }}>
        {categories.map((cat) => {
          const Icon = cat.icon
          return (
            <GlassCard key={cat.id} padding="md" className="hover:bg-white/[0.06] transition-colors">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_80px_80px_80px] gap-4 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                    <Icon className={cn("w-4 h-4", cat.color)} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">{cat.label}</span>
                    <p className="text-xs text-muted-foreground font-light">{cat.description}</p>
                  </div>
                </div>

                {/* Mobile: horizontal badges, Desktop: grid columns */}
                <div className="flex sm:justify-center items-center gap-3 sm:gap-0 pl-12 sm:pl-0">
                  <span className="text-xs text-muted-foreground sm:hidden mr-1">Push</span>
                  <Switch
                    checked={cat.push}
                    onCheckedChange={() => handleToggle(cat.id, "push")}
                  />
                </div>
                <div className="flex sm:justify-center items-center gap-3 sm:gap-0 pl-12 sm:pl-0">
                  <span className="text-xs text-muted-foreground sm:hidden mr-1">Email</span>
                  <Switch
                    checked={cat.email}
                    onCheckedChange={() => handleToggle(cat.id, "email")}
                  />
                </div>
                <div className="flex sm:justify-center items-center gap-3 sm:gap-0 pl-12 sm:pl-0">
                  <span className="text-xs text-muted-foreground sm:hidden mr-1">Sound</span>
                  <Switch
                    checked={cat.sound}
                    onCheckedChange={() => handleToggle(cat.id, "sound")}
                  />
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Info */}
      <div className="animate-fade-in text-center py-4" style={{ animationDelay: "250ms" }}>
        <p className="text-xs text-muted-foreground/60">
          Security alerts (login attempts, suspicious activity) cannot be fully disabled for your protection.
        </p>
      </div>
    </div>
  )
}
