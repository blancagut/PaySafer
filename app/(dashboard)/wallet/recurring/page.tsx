"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  Calendar,
  Repeat,
  Pause,
  Play,
  Trash2,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { getRecurringPayments, pauseRecurringPayment, resumeRecurringPayment, cancelRecurringPayment } from "@/lib/actions/recurring"
import { haptic } from "@/lib/haptics"
import { format } from "date-fns"

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: "Active", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  paused: { label: "Paused", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Pause },
  completed: { label: "Completed", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: XCircle },
  cancelled: { label: "Cancelled", color: "text-gray-400 bg-gray-400/10 border-gray-400/20", icon: XCircle },
}

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
}

export default function RecurringPaymentsPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPayments()
  }, [])

  async function loadPayments() {
    try {
      const data = await getRecurringPayments()
      setPayments(data)
    } catch {
      // Show empty state
    } finally {
      setLoading(false)
    }
  }

  async function handlePause(id: string) {
    try {
      await pauseRecurringPayment(id)
      haptic("medium")
      toast.success("Payment paused")
      loadPayments()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function handleResume(id: string) {
    try {
      await resumeRecurringPayment(id)
      haptic("success")
      toast.success("Payment resumed")
      loadPayments()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancelRecurringPayment(id)
      haptic("medium")
      toast.success("Payment cancelled")
      loadPayments()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recurring Payments</h1>
            <p className="text-sm text-muted-foreground">Automate your regular payments</p>
          </div>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          New
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active", value: payments.filter(p => p.status === "active").length, color: "text-emerald-400" },
          { label: "Monthly Total", value: `€${payments.filter(p => p.status === "active").reduce((s: number, p: any) => s + Number(p.amount), 0).toFixed(2)}`, color: "text-foreground" },
          { label: "Total Paid", value: payments.reduce((s: number, p: any) => s + p.executions_count, 0), color: "text-blue-400" },
        ].map((stat, i) => (
          <GlassCard key={i} className="p-4 text-center">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Payment List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-white/[0.06] rounded" />
                  <div className="h-3 w-1/4 bg-white/[0.04] rounded" />
                </div>
                <div className="h-6 w-16 bg-white/[0.06] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : payments.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Repeat className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Recurring Payments</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Set up automatic payments for rent, subscriptions, or regular transfers. Never miss a payment.
          </p>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Create Your First Recurring Payment
          </Button>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => {
            const status = statusConfig[payment.status] || statusConfig.active
            const StatusIcon = status.icon
            return (
              <GlassCard key={payment.id} className="p-5 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {payment.recipient?.full_name || `$${payment.recipient?.username}`}
                      </p>
                      <Badge variant="outline" className={`text-[10px] ${status.color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        {frequencyLabels[payment.frequency]}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Next: {format(new Date(payment.next_execution), "MMM d")}
                      </span>
                      {payment.description && (
                        <span className="truncate">{payment.description}</span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">€{Number(payment.amount).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{payment.executions_count} sent</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {payment.status === "active" && (
                      <button onClick={() => handlePause(payment.id)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title="Pause">
                        <Pause className="w-4 h-4 text-amber-400" />
                      </button>
                    )}
                    {payment.status === "paused" && (
                      <button onClick={() => handleResume(payment.id)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title="Resume">
                        <Play className="w-4 h-4 text-emerald-400" />
                      </button>
                    )}
                    {["active", "paused"].includes(payment.status) && (
                      <button onClick={() => handleCancel(payment.id)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title="Cancel">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
