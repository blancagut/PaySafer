"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CalendarClock,
  Calendar,
  Repeat,
  Pause,
  Play,
  Loader2,
  XCircle,
  ArrowUpRight,
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
  getRecurringPayments,
  pauseRecurringPayment,
  resumeRecurringPayment,
  cancelRecurringPayment,
} from "@/lib/actions/recurring"

// ─── Types ───

interface ScheduledTxn {
  id: string
  recipientName: string
  recipientAvatar: string | null
  amount: number
  currency: string
  nextExecution: string
  status: "active" | "paused" | "cancelled" | "completed"
  description: string | null
  frequency: string
}

// ─── Config ───

const statusConfig: Record<string, { label: string; badge: "emerald" | "amber" | "blue" | "red" | "purple" }> = {
  active:    { label: "Scheduled", badge: "blue" },
  paused:    { label: "Paused",    badge: "purple" },
  cancelled: { label: "Cancelled", badge: "red" },
  completed: { label: "Completed", badge: "emerald" },
}

const frequencyLabels: Record<string, string> = {
  daily:     "Daily",
  weekly:    "Weekly",
  biweekly:  "Bi-weekly",
  monthly:   "Monthly",
  quarterly: "Quarterly",
  yearly:    "Yearly",
}

type FilterType = "all" | "active" | "paused" | "recurring"

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function ScheduledTransactionsPage() {
  const [transactions, setTransactions] = useState<ScheduledTxn[]>([])
  const [filter, setFilter] = useState<FilterType>("all")
  const [showCancelDialog, setShowCancelDialog] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  // ─── Load data ───
  const loadData = useCallback(async () => {
    setPageLoading(true)
    try {
      const data = await getRecurringPayments()
      const mapped: ScheduledTxn[] = (data || [])
        .filter((r: any) => r.status !== "cancelled")
        .map((r: any) => ({
          id: r.id,
          recipientName:
            r.recipient?.full_name || r.recipient?.username || "Unknown Recipient",
          recipientAvatar: r.recipient?.avatar_url || null,
          amount: r.amount,
          currency: r.currency || "EUR",
          nextExecution: r.next_execution,
          status: r.status as ScheduledTxn["status"],
          description: r.description || null,
          frequency: r.frequency,
        }))
      setTransactions(mapped)
    } catch (err: any) {
      toast.error(err?.message || "Failed to load scheduled payments")
    } finally {
      setPageLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ─── Filter ───
  const filtered = transactions.filter((txn) => {
    if (filter === "all") return true
    if (filter === "active") return txn.status === "active"
    if (filter === "paused") return txn.status === "paused"
    if (filter === "recurring") return true // all recurring by nature
    return true
  })

  const totalUpcoming = transactions
    .filter((t) => t.status === "active")
    .reduce((s, t) => s + t.amount, 0)

  const pausedCount = transactions.filter((t) => t.status === "paused").length

  // ─── Actions ───
  const handlePauseResume = async (txnId: string) => {
    const txn = transactions.find((t) => t.id === txnId)
    if (!txn) return
    setLoading(true)
    try {
      if (txn.status === "paused") {
        await resumeRecurringPayment(txnId)
        setTransactions((prev) =>
          prev.map((t) => (t.id === txnId ? { ...t, status: "active" as const } : t))
        )
        toast.success(`${txn.recipientName} resumed`)
      } else {
        await pauseRecurringPayment(txnId)
        setTransactions((prev) =>
          prev.map((t) => (t.id === txnId ? { ...t, status: "paused" as const } : t))
        )
        toast.success(`${txn.recipientName} paused`)
      }
    } catch (err: any) {
      toast.error(err?.message || "Action failed")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (txnId: string) => {
    const txn = transactions.find((t) => t.id === txnId)
    if (!txn) return
    setLoading(true)
    try {
      await cancelRecurringPayment(txnId)
      setTransactions((prev) => prev.filter((t) => t.id !== txnId))
      toast.success(`Cancelled: ${txn.description || txn.recipientName}`, {
        description: `${txn.currency} ${txn.amount.toFixed(2)} to ${txn.recipientName}`,
      })
      setShowCancelDialog(null)
    } catch (err: any) {
      toast.error(err?.message || "Cancel failed")
    } finally {
      setLoading(false)
    }
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: "all",      label: "All" },
    { key: "active",   label: "Upcoming" },
    { key: "recurring", label: "Recurring" },
    { key: "paused",   label: "Paused" },
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
            {transactions[0]?.currency || "EUR"}{" "}
            {totalUpcoming.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Scheduled</span>
          <span className="text-xl font-semibold text-foreground">
            {pageLoading ? "—" : transactions.filter((t) => t.status === "active").length}
          </span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Recurring</span>
          <span className="text-xl font-semibold text-blue-400">
            {pageLoading ? "—" : transactions.length}
          </span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Paused</span>
          <span className={cn("text-xl font-semibold", pausedCount > 0 ? "text-amber-400" : "text-foreground")}>
            {pageLoading ? "—" : pausedCount}
          </span>
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
        {pageLoading ? (
          <GlassCard padding="lg" className="text-center">
            <Loader2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading scheduled payments…</p>
          </GlassCard>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <CalendarClock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {transactions.length === 0
                ? "No recurring payments set up yet. Create one from the send money page."
                : "No scheduled payments in this category."}
            </p>
          </div>
        ) : (
          filtered.map((txn) => {
            const sc = statusConfig[txn.status] ?? { label: txn.status, badge: "blue" as const }
            const initials = txn.recipientName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()

            return (
              <GlassCard key={txn.id} padding="none" className="hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center gap-4 p-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 text-xs font-medium text-muted-foreground overflow-hidden">
                    {txn.recipientAvatar ? (
                      <img src={txn.recipientAvatar} alt={txn.recipientName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{txn.recipientName}</span>
                      <GlassBadge variant={sc.badge} size="sm">{sc.label}</GlassBadge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Repeat className="w-2.5 h-2.5" /> {frequencyLabels[txn.frequency] ?? txn.frequency}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {txn.description && <span>{txn.description}</span>}
                      {txn.description && <span>·</span>}
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" /> {formatDate(txn.nextExecution)}
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
                    {(txn.status === "active" || txn.status === "paused") && (
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
          Recurring payments execute automatically on the scheduled date.
          Cancel at least 1 hour before the next execution.
        </p>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={!!showCancelDialog} onOpenChange={() => setShowCancelDialog(null)}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Cancel Recurring Payment</DialogTitle>
            <DialogDescription>
              {showCancelDialog && (() => {
                const txn = transactions.find((t) => t.id === showCancelDialog)
                if (!txn) return ""
                return `This will cancel all future ${frequencyLabels[txn.frequency]?.toLowerCase() ?? txn.frequency} payments to ${txn.recipientName}.`
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
