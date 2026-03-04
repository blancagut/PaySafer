"use client"

import { useState, useEffect } from "react"
import {
  Scissors,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Send,
  DollarSign,
  Utensils,
  Home,
  Plane,
  ShoppingBag,
  PartyPopper,
  Trash2,
  Copy,
  Share2,
  User,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getSplitBills, createSplitBill, markParticipantPaid, deleteSplitBill } from '@/lib/actions/split'

// ─── Split Categories ───

const splitCategories = [
  { id: "dining", label: "Dining", icon: Utensils, color: "text-orange-400" },
  { id: "rent", label: "Rent", icon: Home, color: "text-blue-400" },
  { id: "travel", label: "Travel", icon: Plane, color: "text-cyan-400" },
  { id: "shopping", label: "Shopping", icon: ShoppingBag, color: "text-pink-400" },
  { id: "party", label: "Event / Party", icon: PartyPopper, color: "text-purple-400" },
  { id: "other", label: "Other", icon: DollarSign, color: "text-emerald-400" },
]

// ─── Mock Data ───

interface Participant {
  id: string
  name: string
  amount: number
  paid: boolean
}

interface SplitGroup {
  id: string
  title: string
  categoryId: string
  totalAmount: number
  date: string
  status: "active" | "settled" | "pending"
  participants: Participant[]
  createdBy: string
}

const mockSplits: SplitGroup[] = [
  {
    id: "sp1",
    title: "Dinner at Nobu",
    categoryId: "dining",
    totalAmount: 840,
    date: "Mar 2, 2026",
    status: "active",
    createdBy: "You",
    participants: [
      { id: "p1", name: "You", amount: 210, paid: true },
      { id: "p2", name: "Ahmed", amount: 210, paid: true },
      { id: "p3", name: "Sarah", amount: 210, paid: false },
      { id: "p4", name: "Liam", amount: 210, paid: false },
    ],
  },
  {
    id: "sp2",
    title: "Apartment Rent — March",
    categoryId: "rent",
    totalAmount: 6000,
    date: "Mar 1, 2026",
    status: "pending",
    createdBy: "You",
    participants: [
      { id: "p1", name: "You", amount: 3000, paid: true },
      { id: "p2", name: "Omar", amount: 3000, paid: false },
    ],
  },
  {
    id: "sp3",
    title: "Ski Trip — Ras Al Khaimah",
    categoryId: "travel",
    totalAmount: 2400,
    date: "Feb 22, 2026",
    status: "settled",
    createdBy: "Fatima",
    participants: [
      { id: "p1", name: "You", amount: 600, paid: true },
      { id: "p2", name: "Fatima", amount: 600, paid: true },
      { id: "p3", name: "Layla", amount: 600, paid: true },
      { id: "p4", name: "Zain", amount: 600, paid: true },
    ],
  },
  {
    id: "sp4",
    title: "Birthday Gift for Maya",
    categoryId: "party",
    totalAmount: 500,
    date: "Feb 18, 2026",
    status: "settled",
    createdBy: "Ahmed",
    participants: [
      { id: "p1", name: "You", amount: 125, paid: true },
      { id: "p2", name: "Ahmed", amount: 125, paid: true },
      { id: "p3", name: "Sarah", amount: 125, paid: true },
      { id: "p4", name: "Liam", amount: 125, paid: true },
    ],
  },
]

const statusConfig: Record<string, { label: string; badge: "emerald" | "amber" | "blue" }> = {
  active: { label: "Active", badge: "blue" },
  pending: { label: "Pending", badge: "amber" },
  settled: { label: "Settled", badge: "emerald" },
}

type Filter = "all" | "active" | "settled"

export default function SplitPage() {
  const [splits, setSplits] = useState<SplitGroup[]>([])
  const [filter, setFilter] = useState<Filter>("all")
  const [showCreate, setShowCreate] = useState(false)
  const [showDetail, setShowDetail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Create form
  const [newTitle, setNewTitle] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [newTotal, setNewTotal] = useState("")
  const [newParticipants, setNewParticipants] = useState("")

  const youOwe = splits
    .filter((s) => s.status !== "settled")
    .flatMap((s) => s.participants)
    .filter((p) => p.name === "You" && !p.paid)
    .reduce((sum, p) => sum + p.amount, 0)

  const owedToYou = splits
    .filter((s) => s.status !== "settled" && s.createdBy === "You")
    .flatMap((s) => s.participants)
    .filter((p) => p.name !== "You" && !p.paid)
    .reduce((sum, p) => sum + p.amount, 0)

  const filtered = splits.filter((s) => {
    if (filter === "all") return true
    if (filter === "active") return s.status === "active" || s.status === "pending"
    return s.status === "settled"
  })

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const res = await getSplitBills()
      if (res.error) {
        toast.error(res.error)
      } else if (res.data) {
        const mapped = res.data.map((b) => ({
          id: b.id,
          title: b.title,
          categoryId: b.category_id,
          totalAmount: Number(b.total_amount),
          date: new Date(b.created_at).toLocaleDateString(),
          status: b.status,
          createdBy: b.is_creator ? 'You' : 'Other',
          participants: (b.participants ?? []).map((p) => ({ id: p.id, name: p.participant_name, amount: Number(p.amount), paid: !!p.is_paid })),
        }))
        setSplits(mapped)
      }
      setLoading(false)
    })()
  }, [])

  const handleCreate = async () => {
    if (!newTitle || !newCategory || !newTotal || !newParticipants) {
      toast.error("Fill in all fields")
      return
    }
    setLoading(true)
    const names = newParticipants.split(",").map((n) => n.trim()).filter(Boolean)
    const total = parseFloat(newTotal)
    const perPerson = total / (names.length + 1)
    const participants = [
      { participant_name: 'You', amount: perPerson },
      ...names.map((name) => ({ participant_name: name, amount: perPerson })),
    ]

    const res = await createSplitBill({ title: newTitle, category_id: newCategory, total_amount: total, participants })
    if (res.error) {
      toast.error(res.error)
    } else if (res.data) {
      const b = res.data
      const mapped: SplitGroup = {
        id: b.id,
        title: b.title,
        categoryId: b.category_id,
        totalAmount: Number(b.total_amount),
        date: new Date(b.created_at).toLocaleDateString(),
        status: b.status,
        createdBy: b.is_creator ? 'You' : 'Other',
        participants: (b.participants ?? []).map((p) => ({ id: p.id, name: p.participant_name, amount: Number(p.amount), paid: !!p.is_paid })),
      }
      setSplits((cur) => [mapped, ...cur])
      toast.success(`Split created! ${names.length} people owe you`, { description: `$${perPerson.toFixed(2)} each` })
      setShowCreate(false)
      setNewTitle("")
      setNewCategory("")
      setNewTotal("")
      setNewParticipants("")
    }
    setLoading(false)
  }

  const handleRemind = (splitId: string, participantId: string) => {
    const split = splits.find((s) => s.id === splitId)!
    const person = split.participants.find((p) => p.id === participantId)!
    toast.success(`Reminder sent to ${person.name}`, {
      description: `$${person.amount.toFixed(2)} for "${split.title}"`,
    })
  }

  const handleSettle = async (splitId: string) => {
    setLoading(true)
    const split = splits.find((s) => s.id === splitId)
    if (!split) {
      setLoading(false)
      return
    }
    // Mark each unpaid participant as paid via server
    for (const p of split.participants) {
      if (!p.paid) {
        await markParticipantPaid(p.id, true)
      }
    }
    // Refresh list
    const res = await getSplitBills()
    if (res.error) {
      toast.error(res.error)
    } else if (res.data) {
      const mapped = res.data.map((b) => ({
        id: b.id,
        title: b.title,
        categoryId: b.category_id,
        totalAmount: Number(b.total_amount),
        date: new Date(b.created_at).toLocaleDateString(),
        status: b.status,
        createdBy: b.is_creator ? 'You' : 'Other',
        participants: (b.participants ?? []).map((p) => ({ id: p.id, name: p.participant_name, amount: Number(p.amount), paid: !!p.is_paid })),
      }))
      setSplits(mapped)
    }
    toast.success("Split settled!")
    setShowDetail(null)
    setLoading(false)
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "settled", label: "Settled" },
  ]

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Split Expenses
              </h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Split bills with friends — dining, rent, trips
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            New Split
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">You Owe</span>
          <span className={cn("text-xl font-semibold font-mono", youOwe > 0 ? "text-red-400" : "text-foreground")}>
            ${youOwe.toFixed(2)}
          </span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Owed to You</span>
          <span className={cn("text-xl font-semibold font-mono", owedToYou > 0 ? "text-emerald-400" : "text-foreground")}>
            ${owedToYou.toFixed(2)}
          </span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Active Splits</span>
          <span className="text-xl font-semibold text-foreground">{splits.filter((s) => s.status !== "settled").length}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Total Splits</span>
          <span className="text-xl font-semibold text-foreground">{splits.length}</span>
        </GlassCard>
      </div>

      {/* Filters */}
      <div className="animate-fade-in flex gap-1 p-0.5 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit" style={{ animationDelay: "150ms" }}>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              filter === f.key ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Splits List */}
      <div className="animate-fade-in-up space-y-2" style={{ animationDelay: "200ms" }}>
        {filtered.map((split) => {
          const cat = splitCategories.find((c) => c.id === split.categoryId)
          const sc = statusConfig[split.status]
          const CatIcon = cat?.icon ?? DollarSign
          const paidCount = split.participants.filter((p) => p.paid).length

          return (
            <GlassCard
              key={split.id}
              padding="none"
              className="hover:bg-white/[0.06] transition-colors cursor-pointer"
              onClick={() => setShowDetail(split.id)}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                  <CatIcon className={cn("w-5 h-5", cat?.color ?? "text-muted-foreground")} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{split.title}</span>
                    <GlassBadge variant={sc.badge} size="sm">{sc.label}</GlassBadge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Users className="w-2.5 h-2.5" /> {split.participants.length} people
                    </span>
                    <span>·</span>
                    <span>{paidCount}/{split.participants.length} paid</span>
                    <span>·</span>
                    <span>{split.date}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-mono text-foreground">${split.totalAmount.toFixed(2)}</span>
                  <p className="text-xs text-muted-foreground">${(split.totalAmount / split.participants.length).toFixed(2)}/person</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-4 pb-3">
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${(paidCount / split.participants.length) * 100}%` }}
                  />
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08] max-w-md">
          {showDetail && (() => {
            const split = splits.find((s) => s.id === showDetail)
            if (!split) return null
            const cat = splitCategories.find((c) => c.id === split.categoryId)
            const CatIcon = cat?.icon ?? DollarSign
            const sc = statusConfig[split.status]

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                      <CatIcon className={cn("w-5 h-5", cat?.color)} />
                    </div>
                    <div>
                      <DialogTitle className="text-foreground">{split.title}</DialogTitle>
                      <DialogDescription>
                        ${split.totalAmount.toFixed(2)} · {split.date} · <span className="capitalize">{sc.label}</span>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-2 py-2 max-h-64 overflow-y-auto">
                  {split.participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-foreground">{p.name}</span>
                          <p className="text-xs text-muted-foreground font-mono">${p.amount.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.paid ? (
                          <GlassBadge variant="emerald" size="sm">Paid</GlassBadge>
                        ) : (
                          <>
                            <GlassBadge variant="amber" size="sm">Unpaid</GlassBadge>
                            {p.name !== "You" && split.createdBy === "You" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleRemind(split.id, p.id) }}
                                className="text-xs text-primary h-7 px-2"
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Remind
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setShowDetail(null)}>Close</Button>
                  {split.status !== "settled" && split.createdBy === "You" && (
                    <Button
                      onClick={() => handleSettle(split.id)}
                      disabled={loading}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Mark Settled
                    </Button>
                  )}
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Split</DialogTitle>
            <DialogDescription>Split an expense equally among friends.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Title</label>
              <input
                type="text"
                placeholder="e.g., Dinner at Nobu"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {splitCategories.map((cat) => {
                  const Icon = cat.icon
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setNewCategory(cat.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                        newCategory === cat.id
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-white/[0.02] border-white/[0.06] text-muted-foreground hover:bg-white/[0.04]"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Total Amount ($)</label>
              <input
                type="number"
                placeholder="0.00"
                value={newTotal}
                onChange={(e) => setNewTotal(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Participants (comma-separated)</label>
              <input
                type="text"
                placeholder="Ahmed, Sarah, Liam"
                value={newParticipants}
                onChange={(e) => setNewParticipants(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-[10px] text-muted-foreground/50 mt-1">You are included automatically</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Create Split
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
