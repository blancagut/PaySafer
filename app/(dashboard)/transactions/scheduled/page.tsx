"use client"

import { useState } from "react"
import {
  CalendarClock,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Repeat,
  Pause,
  Play,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter,
  User,
  Building2,
  CreditCard,
  Zap,
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

// ─── Scheduled Transactions ───

interface ScheduledTxn {
  id: string
  type: "send" | "receive" | "bill" | "recurring"
  recipient: string
  amount: number
  currency: string
  scheduledDate: string
  status: "pending" | "processing" | "paused" | "completed" | "failed"
  description: string
  frequency: "once" | "weekly" | "monthly" | "yearly"
  icon: typeof ArrowUpRight
  iconColor: string
}

const mockScheduled: ScheduledTxn[] = [
  { id: "st1", type: "send", recipient: "Ahmed Al-Mansour", amount: 5000, currency: "AED", scheduledDate: "Mar 10, 2026", status: "pending", description: "Monthly rent", frequency: "monthly", icon: ArrowUpRight, iconColor: "text-blue-400" },
  { id: "st2", type: "bill", recipient: "DEWA", amount: 385, currency: "AED", scheduledDate: "Mar 10, 2026", status: "pending", description: "Electricity bill", frequency: "monthly", icon: Zap, iconColor: "text-yellow-400" },
  { id: "st3", type: "send", recipient: "Sarah Johnson", amount: 250, currency: "USD", scheduledDate: "Mar 12, 2026", status: "pending", description: "Freelance payment", frequency: "once", icon: ArrowUpRight, iconColor: "text-emerald-400" },
  { id: "st4", type: "recurring", recipient: "Netflix", amount: 55.99, currency: "AED", scheduledDate: "Mar 20, 2026", status: "paused", description: "Streaming subscription", frequency: "monthly", icon: Repeat, iconColor: "text-pink-400" },
  { id: "st5", type: "send", recipient: "Mom", amount: 1500, currency: "AED", scheduledDate: "Mar 25, 2026", status: "pending", description: "Family support", frequency: "monthly", icon: ArrowUpRight, iconColor: "text-purple-400" },
  { id: "st6", type: "bill", recipient: "Etisalat", amount: 399, currency: "AED", scheduledDate: "Mar 15, 2026", status: "processing", description: "Internet + Mobile", frequency: "monthly", icon: Building2, iconColor: "text-cyan-400" },
  { id: "st7", type: "send", recipient: "Gym Membership", amount: 299, currency: "AED", scheduledDate: "Apr 1, 2026", status: "pending", description: "Fitness First monthly", frequency: "monthly", icon: CreditCard, iconColor: "text-amber-400" },
  { id: "st8", type: "recurring", recipient: "Savings Goal", amount: 500, currency: "AED", scheduledDate: "Mar 28, 2026", status: "pending", description: "Auto-save to vacation fund", frequency: "monthly", icon: ArrowDownLeft, iconColor: "text-emerald-400" },
]

const statusConfig: Record<string, { label: string; badge: "emerald" | "amber" | "blue" | "red" | "purple" }> = {
  pending: { label: "Scheduled", badge: "blue" },
  processing: { label: "Processing", badge: "amber" },
  paused: { label: "Paused", badge: "purple" },
  completed: { label: "Completed", badge: "emerald" },
  failed: { label: "Failed", badge: "red" },
}

const frequencyLabels: Record<string, string> = {
  once: "One-time",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
}

type FilterType = "all" | "pending" | "paused" | "recurring"

export default function ScheduledTransactionsPage() {
  const [transactions, setTransactions] = useState<ScheduledTxn[]>(mockScheduled)
  const [filter, setFilter] = useState<FilterType>("all")
  const [showCancelDialog, setShowCancelDialog] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const filtered = transactions.filter((txn) => {
    if (filter === "all") return true
    if (filter === "pending") return txn.status === "pending" || txn.status === "processing"
    if (filter === "paused") return txn.status === "paused"
    if (filter === "recurring") return txn.frequency !== "once"
    return true
  })

  const totalPending = transactions
    .filter((t) => t.status === "pending" || t.status === "processing")
    .reduce((s, t) => s + t.amount, 0)

  const recurringCount = transactions.filter((t) => t.frequency !== "once").length
  const pausedCount = transactions.filter((t) => t.status === "paused").length

  const handlePauseResume = async (txnId: string) => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    setTransactions(transactions.map((t) =>
      t.id === txnId
        ? { ...t, status: t.status === "paused" ? "pending" as const : "paused" as const }
        : t
    ))
    const txn = transactions.find((t) => t.id === txnId)!
    toast.success(txn.status === "paused" ? `${txn.recipient} resumed` : `${txn.recipient} paused`)
    setLoading(false)
  }

  const handleCancel = async (txnId: string) => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    const txn = transactions.find((t) => t.id === txnId)!
    setTransactions(transactions.filter((t) => t.id !== txnId))
    toast.success(`Cancelled: ${txn.description}`, {
      description: `${txn.currency} ${txn.amount.toFixed(2)} to ${txn.recipient}`,
    })
    setShowCancelDialog(null)
    setLoading(false)
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Upcoming" },
    { key: "recurring", label: "Recurring" },
    { key: "paused", label: "Paused" },
  ]

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarClock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Scheduled Payments
            </h2>
            <p className="text-sm text-muted-foreground font-light tracking-wide">
              View, pause, or cancel upcoming & recurring payments
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Total Upcoming</span>
          <span className="text-xl font-semibold text-foreground font-mono">
            AED {totalPending.toLocaleString()}
          </span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Scheduled</span>
          <span className="text-xl font-semibold text-foreground">{transactions.filter((t) => t.status === "pending").length}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Recurring</span>
          <span className="text-xl font-semibold text-blue-400">{recurringCount}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Paused</span>
          <span className={cn("text-xl font-semibold", pausedCount > 0 ? "text-amber-400" : "text-foreground")}>{pausedCount}</span>
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

      {/* Transactions List */}
      <div className="animate-fade-in-up space-y-2" style={{ animationDelay: "200ms" }}>
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <CalendarClock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No scheduled payments in this category</p>
          </div>
        ) : (
          filtered.map((txn) => {
            const Icon = txn.icon
            const sc = statusConfig[txn.status]

            return (
              <GlassCard key={txn.id} padding="none" className="hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center gap-4 p-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                    <Icon className={cn("w-5 h-5", txn.iconColor)} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{txn.recipient}</span>
                      <GlassBadge variant={sc.badge} size="sm">{sc.label}</GlassBadge>
                      {txn.frequency !== "once" && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Repeat className="w-2.5 h-2.5" /> {frequencyLabels[txn.frequency]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{txn.description}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" /> {txn.scheduledDate}
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0 mr-2">
                    <span className={cn(
                      "text-sm font-mono",
                      txn.status === "paused" ? "text-muted-foreground" : "text-foreground"
                    )}>
                      {txn.currency} {txn.amount.toFixed(2)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {(txn.status === "pending" || txn.status === "paused") && txn.frequency !== "once" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePauseResume(txn.id)}
                        disabled={loading}
                        className={cn(
                          "text-xs",
                          txn.status === "paused" ? "text-emerald-400" : "text-amber-400"
                        )}
                        title={txn.status === "paused" ? "Resume" : "Pause"}
                      >
                        {txn.status === "paused" ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                    {txn.status !== "completed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCancelDialog(txn.id)}
                        className="text-xs text-muted-foreground hover:text-red-400"
                        title="Cancel"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </GlassCard>
            )
          })
        )}
      </div>

      {/* Timeline hint */}
      <div className="animate-fade-in text-center py-4" style={{ animationDelay: "280ms" }}>
        <p className="text-xs text-muted-foreground/60">
          Payments are processed at 9:00 AM UAE time on the scheduled date.
          Cancel up to 1 hour before processing.
        </p>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={!!showCancelDialog} onOpenChange={() => setShowCancelDialog(null)}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Cancel Scheduled Payment</DialogTitle>
            <DialogDescription>
              {showCancelDialog && (() => {
                const txn = transactions.find((t) => t.id === showCancelDialog)
                if (!txn) return ""
                return txn.frequency !== "once"
                  ? `This will cancel all future ${frequencyLabels[txn.frequency].toLowerCase()} payments to ${txn.recipient}.`
                  : `Cancel the ${txn.currency} ${txn.amount.toFixed(2)} payment to ${txn.recipient}?`
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(null)}>Keep</Button>
            <Button
              onClick={() => showCancelDialog && handleCancel(showCancelDialog)}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Cancel Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
