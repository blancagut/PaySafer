"use client"

import { useState } from "react"
import {
  Heart,
  Search,
  TrendingUp,
  RefreshCw,
  Globe2,
  Baby,
  Stethoscope,
  BookOpen,
  Leaf,
  Dog,
  Droplets,
  HandHeart,
  History,
  Coins,
  Star,
  ChevronRight,
  Check,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Categories & Causes ───

interface Cause {
  id: string
  name: string
  category: string
  icon: typeof Heart
  iconColor: string
  description: string
  raised: number
  goal: number
  supporters: number
  featured?: boolean
}

const categories = [
  { key: "all", label: "All Causes", icon: Globe2 },
  { key: "health", label: "Health", icon: Stethoscope },
  { key: "education", label: "Education", icon: BookOpen },
  { key: "children", label: "Children", icon: Baby },
  { key: "environment", label: "Environment", icon: Leaf },
  { key: "animals", label: "Animals", icon: Dog },
  { key: "water", label: "Clean Water", icon: Droplets },
  { key: "humanitarian", label: "Humanitarian", icon: HandHeart },
]

const mockCauses: Cause[] = [
  {
    id: "c1", name: "Save the Children UAE", category: "children",
    icon: Baby, iconColor: "text-rose-400",
    description: "Providing education and healthcare to underprivileged children across the UAE and MENA region.",
    raised: 245000, goal: 500000, supporters: 1892, featured: true,
  },
  {
    id: "c2", name: "Emirates Red Crescent", category: "humanitarian",
    icon: HandHeart, iconColor: "text-red-400",
    description: "Emergency relief and humanitarian aid across the Middle East and beyond.",
    raised: 1200000, goal: 2000000, supporters: 8450, featured: true,
  },
  {
    id: "c3", name: "Dubai Cares", category: "education",
    icon: BookOpen, iconColor: "text-blue-400",
    description: "Improving children's access to quality primary education in developing countries.",
    raised: 890000, goal: 1000000, supporters: 5230,
  },
  {
    id: "c4", name: "Arabian Wildlife Center", category: "animals",
    icon: Dog, iconColor: "text-amber-400",
    description: "Protecting endangered species native to the Arabian Peninsula.",
    raised: 67000, goal: 150000, supporters: 420,
  },
  {
    id: "c5", name: "Clean Seas Initiative", category: "environment",
    icon: Leaf, iconColor: "text-emerald-400",
    description: "Cleaning coastal waters and reducing ocean plastic pollution in the Gulf.",
    raised: 340000, goal: 750000, supporters: 2100, featured: true,
  },
  {
    id: "c6", name: "Water.org MENA", category: "water",
    icon: Droplets, iconColor: "text-cyan-400",
    description: "Providing safe water and sanitation access to families in the MENA region.",
    raised: 512000, goal: 800000, supporters: 3200,
  },
  {
    id: "c7", name: "Medical Aid UAE", category: "health",
    icon: Stethoscope, iconColor: "text-violet-400",
    description: "Free medical treatments for those who can't afford healthcare.",
    raised: 178000, goal: 300000, supporters: 945,
  },
]

interface DonationRecord {
  id: string
  causeName: string
  amount: number
  date: string
  type: "one-time" | "round-up" | "recurring"
}

const mockHistory: DonationRecord[] = [
  { id: "d1", causeName: "Save the Children UAE", amount: 100, date: "Mar 15, 2025", type: "one-time" },
  { id: "d2", causeName: "Round-up donations", amount: 2.45, date: "Mar 14, 2025", type: "round-up" },
  { id: "d3", causeName: "Dubai Cares", amount: 50, date: "Mar 12, 2025", type: "recurring" },
  { id: "d4", causeName: "Round-up donations", amount: 1.80, date: "Mar 11, 2025", type: "round-up" },
  { id: "d5", causeName: "Clean Seas Initiative", amount: 200, date: "Mar 8, 2025", type: "one-time" },
  { id: "d6", causeName: "Round-up donations", amount: 3.10, date: "Mar 7, 2025", type: "round-up" },
]

type TabType = "causes" | "history"

export default function DonationsPage() {
  const [tab, setTab] = useState<TabType>("causes")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [search, setSearch] = useState("")
  const [roundUpEnabled, setRoundUpEnabled] = useState(true)
  const [donateDialog, setDonateDialog] = useState<Cause | null>(null)
  const [amount, setAmount] = useState("")
  const [donationType, setDonationType] = useState<"one-time" | "monthly">("one-time")
  const [history, setHistory] = useState<DonationRecord[]>(mockHistory)

  const filteredCauses = mockCauses.filter((c) => {
    const matchesCategory = selectedCategory === "all" || c.category === selectedCategory
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const totalDonated = history.reduce((s, d) => s + d.amount, 0)
  const roundUpTotal = history.filter((d) => d.type === "round-up").reduce((s, d) => s + d.amount, 0)
  const featuredCauses = mockCauses.filter((c) => c.featured)

  const handleDonate = () => {
    const num = parseFloat(amount)
    if (!num || num <= 0) { toast.error("Enter a valid amount"); return }
    if (!donateDialog) return

    const record: DonationRecord = {
      id: `d${Date.now()}`,
      causeName: donateDialog.name,
      amount: num,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      type: donationType === "monthly" ? "recurring" : "one-time",
    }
    setHistory((h) => [record, ...h])
    toast.success(`AED ${num.toFixed(2)} donated!`, { description: donateDialog.name })
    setDonateDialog(null)
    setAmount("")
  }

  const formatCurrency = (n: number) =>
    n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toFixed(0)

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Donations
            </h2>
            <p className="text-sm text-muted-foreground font-light tracking-wide">
              Give back — round-ups & direct donations
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Total Given</span>
          <span className="text-xl font-semibold text-foreground">AED {totalDonated.toFixed(2)}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Round-Ups</span>
          <span className="text-xl font-semibold text-emerald-400">AED {roundUpTotal.toFixed(2)}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Causes Helped</span>
          <span className="text-xl font-semibold text-foreground">{new Set(history.filter(h => h.type !== "round-up").map(h => h.causeName)).size}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">This Month</span>
          <span className="text-xl font-semibold text-foreground">{history.length} donations</span>
        </GlassCard>
      </div>

      {/* Round-Up Banner */}
      <div className="animate-fade-in" style={{ animationDelay: "130ms" }}>
        <GlassCard variant="glow" padding="md">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Coins className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground block">Round-Up Donations</span>
                <span className="text-xs text-muted-foreground">
                  Automatically round up every purchase and donate the spare change
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{roundUpEnabled ? "Active" : "Off"}</span>
              <Switch checked={roundUpEnabled} onCheckedChange={setRoundUpEnabled} />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Tabs */}
      <div className="animate-fade-in flex gap-1 p-0.5 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit" style={{ animationDelay: "160ms" }}>
        {[
          { key: "causes" as TabType, label: "Causes" },
          { key: "history" as TabType, label: "History" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
              tab === t.key ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CAUSES TAB */}
      {tab === "causes" && (
        <div className="space-y-6">
          {/* Featured Causes */}
          <div className="animate-fade-in-up space-y-3" style={{ animationDelay: "200ms" }}>
            <h3 className="text-sm font-medium text-muted-foreground tracking-wide flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-yellow-400" /> Featured Causes
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {featuredCauses.map((cause) => {
                const percent = Math.round((cause.raised / cause.goal) * 100)
                return (
                  <GlassCard
                    key={cause.id}
                    variant="hover"
                    padding="md"
                    className="cursor-pointer"
                    onClick={() => { setDonateDialog(cause); setAmount("") }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <cause.icon className={cn("w-4 h-4", cause.iconColor)} />
                      <span className="text-sm font-medium text-foreground line-clamp-1">{cause.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{cause.description}</p>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>AED {formatCurrency(cause.raised)} raised</span>
                      <span>{percent}% of AED {formatCurrency(cause.goal)}</span>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          </div>

          {/* Category filters */}
          <div className="animate-fade-in-up" style={{ animationDelay: "230ms" }}>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0",
                    selectedCategory === cat.key
                      ? "bg-primary/20 text-primary"
                      : "bg-white/[0.03] text-muted-foreground hover:text-foreground border border-white/[0.06]"
                  )}
                >
                  <cat.icon className="w-3 h-3" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search causes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* All Causes List */}
          <div className="space-y-2">
            {filteredCauses.map((cause) => {
              const percent = Math.round((cause.raised / cause.goal) * 100)
              return (
                <GlassCard
                  key={cause.id}
                  variant="hover"
                  padding="none"
                  className="cursor-pointer"
                  onClick={() => { setDonateDialog(cause); setAmount("") }}
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                      "bg-white/[0.04] border-white/[0.08]"
                    )}>
                      <cause.icon className={cn("w-5 h-5", cause.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground block">{cause.name}</span>
                      <p className="text-xs text-muted-foreground line-clamp-1">{cause.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{percent}%</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>{cause.supporters.toLocaleString()} supporters</span>
                        <span>AED {formatCurrency(cause.raised)} raised</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                  </div>
                </GlassCard>
              )
            })}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === "history" && (
        <div className="animate-fade-in-up space-y-2" style={{ animationDelay: "200ms" }}>
          {history.length === 0 ? (
            <GlassCard padding="lg" className="text-center">
              <Heart className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No donations yet</p>
            </GlassCard>
          ) : (
            history.map((d) => (
              <GlassCard key={d.id} padding="none">
                <div className="flex items-center gap-3 p-4">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                    d.type === "round-up" ? "bg-emerald-500/10 border-emerald-500/20" :
                    d.type === "recurring" ? "bg-blue-500/10 border-blue-500/20" :
                    "bg-rose-500/10 border-rose-500/20"
                  )}>
                    {d.type === "round-up" ? <Coins className="w-4 h-4 text-emerald-400" /> :
                     d.type === "recurring" ? <RefreshCw className="w-4 h-4 text-blue-400" /> :
                     <Heart className="w-4 h-4 text-rose-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground block">{d.causeName}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{d.date}</span>
                      <GlassBadge
                        variant={d.type === "round-up" ? "emerald" : d.type === "recurring" ? "blue" : "purple"}
                        size="sm"
                      >
                        {d.type === "round-up" ? "Round-up" : d.type === "recurring" ? "Monthly" : "One-time"}
                      </GlassBadge>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-foreground shrink-0">
                    AED {d.amount.toFixed(2)}
                  </span>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* DONATE DIALOG */}
      <Dialog open={!!donateDialog} onOpenChange={(o) => !o && setDonateDialog(null)}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Heart className="w-5 h-5 text-rose-400" />
              Donate to {donateDialog?.name}
            </DialogTitle>
            <DialogDescription>
              {donateDialog?.description}
            </DialogDescription>
          </DialogHeader>

          {donateDialog && (
            <div className="space-y-4 py-2">
              {/* Progress */}
              <div>
                <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all"
                    style={{ width: `${Math.min(Math.round((donateDialog.raised / donateDialog.goal) * 100), 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>AED {formatCurrency(donateDialog.raised)} raised</span>
                  <span>AED {formatCurrency(donateDialog.goal)} goal</span>
                </div>
              </div>

              {/* Type toggle */}
              <div className="flex gap-2">
                {(["one-time", "monthly"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setDonationType(t)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-medium transition-all border",
                      donationType === t
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-white/[0.03] text-muted-foreground border-white/[0.06]"
                    )}
                  >
                    {t === "one-time" ? "One-time" : "Monthly"}
                  </button>
                ))}
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(String(a))}
                    className={cn(
                      "py-2 rounded-xl text-xs font-medium transition-all border",
                      amount === String(a)
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-white/[0.03] text-muted-foreground border-white/[0.06] hover:border-white/[0.12]"
                    )}
                  >
                    AED {a}
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Custom Amount (AED)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {donationType === "monthly" && (
                <p className="text-xs text-muted-foreground bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
                  You&apos;ll be charged AED {amount || "0"} on the 1st of every month. Cancel anytime from your donation history.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDonateDialog(null)} className="text-muted-foreground hover:text-foreground">
              Cancel
            </Button>
            <Button onClick={handleDonate} className="bg-rose-500 hover:bg-rose-600 text-white">
              <Heart className="w-4 h-4 mr-1.5" />
              Donate {amount ? `AED ${parseFloat(amount).toFixed(2)}` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
