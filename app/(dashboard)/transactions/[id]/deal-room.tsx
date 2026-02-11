"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Handshake, CreditCard, Lock, Package, Eye, CheckCircle,
  Shield, DollarSign, Clock, Send, AlertTriangle, XCircle,
  ArrowLeft, Copy, Loader2, MessageSquare, Sparkles,
  PartyPopper, Ban, ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlassBadge, statusBadgeMap } from "@/components/glass"
import { toast } from "sonner"
import { createCheckoutSession } from "@/lib/stripe/checkout"
import {
  markDelivered,
  confirmAndRelease,
  cancelTransaction,
  openDispute,
  type TransactionStatus,
} from "@/lib/actions/transactions"
import {
  sendTransactionMessage,
  type TransactionMessage,
} from "@/lib/actions/transaction-messages"
import {
  useTransactionChatSubscription,
  useRealtimeSubscription,
} from "@/lib/supabase/realtime"

// ============================================================================
// TYPES
// ============================================================================
interface DealRoomProps {
  transaction: {
    id: string
    description: string
    amount: number
    currency: string
    buyer_id: string
    seller_id: string
    seller_email: string
    status: TransactionStatus
    created_at: string
    paid_at: string | null
    delivered_at: string | null
    released_at: string | null
    metadata: Record<string, unknown>
  }
  isBuyer: boolean
  isSeller: boolean
  userId: string
  buyerName: string
  sellerName: string
  buyerEmail: string
  sellerEmail: string
  initialMessages: TransactionMessage[]
}

// ============================================================================
// PHASE STEPPER CONFIG
// ============================================================================
const phases = [
  { key: "agreed", label: "Agreed", icon: Handshake },
  { key: "payment", label: "Payment", icon: CreditCard },
  { key: "escrow", label: "In Escrow", icon: Lock },
  { key: "delivery", label: "Delivery", icon: Package },
  { key: "inspection", label: "Inspection", icon: Eye },
  { key: "complete", label: "Complete", icon: CheckCircle },
]

function getActivePhaseIndex(status: TransactionStatus): number {
  switch (status) {
    case "draft":
    case "awaiting_payment": return 1
    case "in_escrow": return 2
    case "delivered": return 4
    case "released": return 5
    case "cancelled": return -1
    case "dispute": return -2
    default: return 0
  }
}

function getStatusColor(status: TransactionStatus) {
  switch (status) {
    case "awaiting_payment": return "text-amber-400"
    case "in_escrow": return "text-blue-400"
    case "delivered": return "text-cyan-400"
    case "released": return "text-emerald-400"
    case "dispute": return "text-red-400"
    case "cancelled": return "text-zinc-500"
    default: return "text-zinc-400"
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function DealRoom({
  transaction: initialTransaction,
  isBuyer,
  isSeller,
  userId,
  buyerName,
  sellerName,
  buyerEmail,
  sellerEmail,
  initialMessages,
}: DealRoomProps) {
  const router = useRouter()
  const [transaction, setTransaction] = useState(initialTransaction)
  const [messages, setMessages] = useState<TransactionMessage[]>(initialMessages)
  const [chatInput, setChatInput] = useState("")
  const [sending, setSending] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [disputeReason, setDisputeReason] = useState("")
  const [showDisputeInput, setShowDisputeInput] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const counterpartyName = isBuyer ? sellerName : buyerName
  const myRole = isBuyer ? "Buyer" : "Seller"
  const status = transaction.status
  const activePhase = getActivePhaseIndex(status)

  // Real-time chat messages
  useTransactionChatSubscription(transaction.id, useCallback((msg: Record<string, unknown>) => {
    const newMsg = msg as unknown as TransactionMessage
    setMessages(prev => {
      if (prev.some(m => m.id === newMsg.id)) return prev
      return [...prev, newMsg]
    })
  }, []))

  // Real-time transaction state updates
  useRealtimeSubscription({
    table: "transactions",
    event: "UPDATE",
    filter: `id=eq.${transaction.id}`,
    onData: (payload) => {
      if (payload.new && typeof payload.new === "object") {
        setTransaction(payload.new as typeof transaction)
      }
    },
  })

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── Actions ──
  const handlePay = async () => {
    setActionLoading("pay")
    try {
      const result = await createCheckoutSession(transaction.id)
      if (result.error) { toast.error(result.error); return }
      if (result.url) window.location.href = result.url
    } catch { toast.error("Failed to start payment") }
    finally { setActionLoading(null) }
  }

  const handleMarkDelivered = async () => {
    setActionLoading("deliver")
    try {
      const result = await markDelivered(transaction.id)
      if (result.error) { toast.error(result.error); return }
      toast.success("Marked as delivered!")
    } catch { toast.error("Failed to mark delivery") }
    finally { setActionLoading(null) }
  }

  const handleRelease = async () => {
    setActionLoading("release")
    try {
      const result = await confirmAndRelease(transaction.id)
      if (result.error) { toast.error(result.error); return }
      toast.success("Funds released!")
    } catch { toast.error("Failed to release funds") }
    finally { setActionLoading(null) }
  }

  const handleCancel = async () => {
    setActionLoading("cancel")
    try {
      const result = await cancelTransaction(transaction.id)
      if (result.error) { toast.error(result.error); return }
      toast.success("Transaction cancelled")
    } catch { toast.error("Failed to cancel") }
    finally { setActionLoading(null) }
  }

  const handleDispute = async () => {
    if (!disputeReason.trim()) { toast.error("Please provide a reason"); return }
    setActionLoading("dispute")
    try {
      const result = await openDispute(transaction.id, disputeReason)
      if (result.error) { toast.error(result.error); return }
      setShowDisputeInput(false)
      setDisputeReason("")
      toast.success("Dispute opened")
    } catch { toast.error("Failed to open dispute") }
    finally { setActionLoading(null) }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || sending) return
    setSending(true)
    const text = chatInput.trim()
    setChatInput("")
    // Optimistic
    const optimistic: TransactionMessage = {
      id: `temp-${Date.now()}`,
      transaction_id: transaction.id,
      sender_id: userId,
      message: text,
      message_type: "text",
      metadata: {},
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    try {
      const result = await sendTransactionMessage(transaction.id, text)
      if (result.error) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        toast.error(result.error)
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      toast.error("Failed to send")
    } finally { setSending(false) }
  }

  const copyId = () => {
    navigator.clipboard.writeText(transaction.id)
    toast.success("Transaction ID copied")
  }

  const isTerminal = ["released", "cancelled"].includes(status)

  // ── Unread count for mobile chat toggle ──
  const unreadCount = 0 // Simplified: no read tracking in v1

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* ── Top Bar ── */}
      <div className="glass-card rounded-none border-x-0 border-t-0 px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push("/transactions")} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">{transaction.description}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <button onClick={copyId} className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground font-mono flex items-center gap-1 transition-colors">
                {transaction.id.slice(0, 8)}… <Copy className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-lg font-bold text-foreground tabular-nums">
              {transaction.currency} {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          {statusBadgeMap[status] ? (
            <GlassBadge variant={statusBadgeMap[status].variant} dot={statusBadgeMap[status].dot} pulse={statusBadgeMap[status].pulse}>
              {statusBadgeMap[status].label}
            </GlassBadge>
          ) : (
            <GlassBadge variant="muted">{status}</GlassBadge>
          )}
        </div>
      </div>

      {/* ── Phase Stepper ── */}
      {activePhase >= 0 && (
        <div className="px-4 py-4 overflow-x-auto">
          <div className="flex items-center justify-center gap-1 min-w-[500px] mx-auto max-w-2xl">
            {phases.map((phase, i) => {
              const isComplete = i < activePhase
              const isActive = i === activePhase
              const Icon = phase.icon
              return (
                <div key={phase.key} className="flex items-center gap-1 flex-1 last:flex-initial">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isActive ? 1 : 0.9,
                      opacity: isComplete || isActive ? 1 : 0.35,
                    }}
                    className="flex flex-col items-center gap-1.5 relative"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                      isComplete
                        ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                        : isActive
                        ? "bg-primary/15 border-primary/30 text-primary glow-emerald"
                        : "bg-white/[0.04] border-white/[0.08] text-muted-foreground/40"
                    }`}>
                      {isComplete ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                          <CheckCircle className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span className={`text-[10px] font-medium whitespace-nowrap ${
                      isActive ? "text-foreground" : isComplete ? "text-emerald-400/80" : "text-muted-foreground/40"
                    }`}>
                      {phase.label}
                    </span>
                  </motion.div>
                  {i < phases.length - 1 && (
                    <div className={`h-px flex-1 mx-1 mt-[-18px] transition-colors duration-500 ${
                      isComplete ? "bg-emerald-500/40" : "bg-white/[0.06]"
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 lg:gap-0 min-h-0">
        {/* ── Left: Deal Flow ── */}
        <div className="flex-1 lg:w-[65%] p-4 lg:p-6 space-y-5 overflow-y-auto lg:border-r border-white/[0.06]">
          {/* Amount (mobile) */}
          <div className="sm:hidden text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {transaction.currency} {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Phase Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              {/* AWAITING PAYMENT */}
              {status === "awaiting_payment" && (
                <div className="space-y-5">
                  {isBuyer ? (
                    <>
                      <div className="glass-card rounded-2xl p-6 text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                          <CreditCard className="w-8 h-8 text-amber-400" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-foreground">Deposit Funds into Escrow</h2>
                          <p className="text-sm text-muted-foreground mt-1">
                            Your payment will be held securely until you confirm delivery.
                          </p>
                        </div>
                        <div className="glass-card rounded-xl p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Escrow amount</span>
                            <span className="font-semibold text-foreground">{transaction.currency} {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        <Button
                          onClick={handlePay}
                          disabled={actionLoading === "pay"}
                          className="w-full h-12 text-[15px] font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white border-0 shadow-lg shadow-emerald-500/20 transition-all"
                          size="lg"
                        >
                          {actionLoading === "pay" ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to checkout…</>
                          ) : (
                            <><Lock className="w-4 h-4 mr-2" /> Pay Now — Secure Checkout</>
                          )}
                        </Button>
                        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground/50 pt-1">
                          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> 256-bit encrypted</span>
                          <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Stripe secured</span>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Button variant="ghost" size="sm" onClick={handleCancel} disabled={!!actionLoading} className="text-xs text-muted-foreground/60 hover:text-red-400">
                          Cancel Transaction
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="glass-card rounded-2xl p-6 text-center space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                        <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
                      </div>
                      <h2 className="text-lg font-bold text-foreground">Waiting for Payment</h2>
                      <p className="text-sm text-muted-foreground">
                        The buyer is depositing funds into escrow. You&apos;ll be notified once payment is secured.
                      </p>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full w-1/3 bg-amber-500/40 rounded-full animate-shimmer" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* IN ESCROW */}
              {status === "in_escrow" && (
                <div className="space-y-5">
                  <div className="glass-card rounded-2xl p-6 text-center space-y-4 glow-blue">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", duration: 0.6 }}
                      className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center mx-auto"
                    >
                      <Lock className="w-8 h-8 text-blue-400" />
                    </motion.div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Funds Secured in Escrow</h2>
                      <p className="text-2xl font-bold text-blue-400 tabular-nums mt-1">
                        {transaction.currency} {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isSeller
                        ? "You can now proceed with delivery. Mark as delivered when complete."
                        : "The seller is working on delivery. You'll be asked to confirm when complete."
                      }
                    </p>
                  </div>
                  {isSeller && (
                    <Button
                      onClick={handleMarkDelivered}
                      disabled={!!actionLoading}
                      className="w-full h-12 text-[15px] font-semibold rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white border-0 shadow-lg shadow-cyan-500/20"
                      size="lg"
                    >
                      {actionLoading === "deliver" ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                      ) : (
                        <><Package className="w-4 h-4 mr-2" /> Mark as Delivered</>
                      )}
                    </Button>
                  )}
                  {isBuyer && !showDisputeInput && (
                    <div className="flex justify-center">
                      <Button variant="ghost" size="sm" onClick={() => setShowDisputeInput(true)} className="text-xs text-muted-foreground/60 hover:text-red-400">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Open Dispute
                      </Button>
                    </div>
                  )}
                  {showDisputeInput && (
                    <div className="glass-card rounded-xl p-4 space-y-3">
                      <p className="text-sm font-medium text-foreground">Why are you opening a dispute?</p>
                      <textarea
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Describe the issue…"
                        className="w-full h-20 glass-input rounded-lg p-3 text-sm resize-none"
                      />
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowDisputeInput(false)}>Cancel</Button>
                        <Button variant="destructive" size="sm" onClick={handleDispute} disabled={!!actionLoading}>
                          {actionLoading === "dispute" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Submit Dispute"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DELIVERED — INSPECTION */}
              {status === "delivered" && (
                <div className="space-y-5">
                  <div className="glass-card rounded-2xl p-6 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto">
                      <Eye className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Delivery Submitted</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isBuyer
                          ? "The seller has delivered. Please inspect and confirm if satisfactory."
                          : "Waiting for the buyer to inspect and approve delivery."
                        }
                      </p>
                    </div>
                    {transaction.delivered_at && (
                      <p className="text-xs text-muted-foreground/60">
                        Delivered {new Date(transaction.delivered_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  {isBuyer && (
                    <div className="space-y-3">
                      <Button
                        onClick={handleRelease}
                        disabled={!!actionLoading}
                        className="w-full h-12 text-[15px] font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white border-0 shadow-lg shadow-emerald-500/20"
                        size="lg"
                      >
                        {actionLoading === "release" ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Releasing…</>
                        ) : (
                          <><CheckCircle className="w-4 h-4 mr-2" /> Approve &amp; Release Funds</>
                        )}
                      </Button>
                      {!showDisputeInput ? (
                        <div className="flex justify-center">
                          <Button variant="ghost" size="sm" onClick={() => setShowDisputeInput(true)} className="text-xs text-muted-foreground/60 hover:text-red-400">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Something wrong? Open Dispute
                          </Button>
                        </div>
                      ) : (
                        <div className="glass-card rounded-xl p-4 space-y-3">
                          <p className="text-sm font-medium text-foreground">What&apos;s the issue?</p>
                          <textarea
                            value={disputeReason}
                            onChange={(e) => setDisputeReason(e.target.value)}
                            placeholder="Describe the problem…"
                            className="w-full h-20 glass-input rounded-lg p-3 text-sm resize-none"
                          />
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowDisputeInput(false)}>Cancel</Button>
                            <Button variant="destructive" size="sm" onClick={handleDispute} disabled={!!actionLoading}>
                              {actionLoading === "dispute" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Submit Dispute"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* RELEASED — COMPLETE */}
              {status === "released" && (
                <div className="space-y-5">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", bounce: 0.4 }}
                    className="glass-card rounded-2xl p-8 text-center space-y-4 glow-emerald"
                  >
                    <motion.div
                      initial={{ rotate: -20, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                      className="w-20 h-20 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto"
                    >
                      <PartyPopper className="w-10 h-10 text-emerald-400" />
                    </motion.div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Transaction Complete!</h2>
                      <p className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">
                        {transaction.currency} {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Funds have been released to the seller. Both parties confirmed satisfaction.
                      </p>
                    </div>
                    {transaction.released_at && (
                      <p className="text-xs text-muted-foreground/60">
                        Completed {new Date(transaction.released_at).toLocaleString()}
                      </p>
                    )}
                  </motion.div>
                  <Button variant="outline" onClick={() => router.push("/offers")} className="w-full rounded-xl">
                    <Sparkles className="w-4 h-4 mr-2" /> Create New Offer
                  </Button>
                </div>
              )}

              {/* DISPUTE */}
              {status === "dispute" && (
                <div className="space-y-5">
                  <div className="glass-card rounded-2xl p-6 text-center space-y-4 border-red-500/20 glow-red">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Under Dispute</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        An admin is reviewing this transaction. You can continue messaging to provide evidence.
                      </p>
                    </div>
                    <GlassBadge variant="red" dot pulse>Under Review</GlassBadge>
                  </div>
                </div>
              )}

              {/* CANCELLED */}
              {status === "cancelled" && (
                <div className="space-y-5">
                  <div className="glass-card rounded-2xl p-6 text-center space-y-4 opacity-70">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center mx-auto">
                      <Ban className="w-8 h-8 text-zinc-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Transaction Cancelled</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        This transaction has been cancelled. No funds were exchanged.
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => router.push("/offers")} className="w-full rounded-xl">
                    <Sparkles className="w-4 h-4 mr-2" /> Create New Offer
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Deal Details (Collapsible) ── */}
          <details className="group">
            <summary className="flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-muted-foreground cursor-pointer transition-colors py-2">
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
              Transaction Details
            </summary>
            <div className="glass-card rounded-xl p-4 mt-2 space-y-3 text-sm animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/50 mb-1">Buyer</p>
                  <p className="font-medium text-foreground">{buyerName}</p>
                  <p className="text-xs text-muted-foreground">{buyerEmail}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/50 mb-1">Seller</p>
                  <p className="font-medium text-foreground">{sellerName}</p>
                  <p className="text-xs text-muted-foreground">{sellerEmail}</p>
                </div>
              </div>
              <div className="border-t border-white/[0.06] pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium text-foreground">{transaction.currency} {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground">{new Date(transaction.created_at).toLocaleDateString()}</span>
                </div>
                {transaction.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="text-foreground">{new Date(transaction.paid_at).toLocaleDateString()}</span>
                  </div>
                )}
                {transaction.delivered_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivered</span>
                    <span className="text-foreground">{new Date(transaction.delivered_at).toLocaleDateString()}</span>
                  </div>
                )}
                {transaction.released_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="text-foreground">{new Date(transaction.released_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              {transaction.description && (
                <div className="border-t border-white/[0.06] pt-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/50 mb-1">Description</p>
                  <p className="text-foreground whitespace-pre-wrap">{transaction.description}</p>
                  {transaction.metadata?.offer_description && (
                    <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{String(transaction.metadata.offer_description)}</p>
                  )}
                </div>
              )}
            </div>
          </details>

          {/* Security Footer */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/40 py-4">
            <Shield className="w-3.5 h-3.5" />
            <span>Protected by PaySafer Escrow</span>
          </div>
        </div>

        {/* ── Right: Chat Panel (Desktop) ── */}
        <div className="hidden lg:flex lg:w-[35%] flex-col min-h-0">
          <ChatPanel
            messages={messages}
            userId={userId}
            counterpartyName={counterpartyName}
            buyerName={buyerName}
            sellerName={sellerName}
            buyerId={transaction.buyer_id}
            chatInput={chatInput}
            setChatInput={setChatInput}
            handleSendMessage={handleSendMessage}
            sending={sending}
            isTerminal={isTerminal}
            chatEndRef={chatEndRef}
            chatContainerRef={chatContainerRef}
          />
        </div>
      </div>

      {/* ── Mobile Chat FAB ── */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setShowChat(true)}
          className="w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/30 hover:bg-primary/90 p-0"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      </div>

      {/* ── Mobile Chat Sheet ── */}
      <AnimatePresence>
        {showChat && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChat(false)}
              className="lg:hidden fixed inset-0 bg-black/60 z-50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 h-[75vh] z-50 bg-background border-t border-white/[0.08] rounded-t-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{counterpartyName}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowChat(false)} className="text-muted-foreground">
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              <ChatPanel
                messages={messages}
                userId={userId}
                counterpartyName={counterpartyName}
                buyerName={buyerName}
                sellerName={sellerName}
                buyerId={transaction.buyer_id}
                chatInput={chatInput}
                setChatInput={setChatInput}
                handleSendMessage={handleSendMessage}
                sending={sending}
                isTerminal={isTerminal}
                chatEndRef={chatEndRef}
                chatContainerRef={chatContainerRef}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// CHAT PANEL COMPONENT
// ============================================================================
interface ChatPanelProps {
  messages: TransactionMessage[]
  userId: string
  counterpartyName: string
  buyerName: string
  sellerName: string
  buyerId: string
  chatInput: string
  setChatInput: (v: string) => void
  handleSendMessage: (e: React.FormEvent) => void
  sending: boolean
  isTerminal: boolean
  chatEndRef: React.RefObject<HTMLDivElement | null>
  chatContainerRef: React.RefObject<HTMLDivElement | null>
}

function ChatPanel({
  messages, userId, counterpartyName, buyerName, sellerName, buyerId,
  chatInput, setChatInput, handleSendMessage, sending, isTerminal,
  chatEndRef, chatContainerRef,
}: ChatPanelProps) {

  const getSystemIcon = (metadata: Record<string, unknown>) => {
    const event = metadata?.event as string
    switch (event) {
      case "payment_confirmed": return <DollarSign className="w-3 h-3 text-emerald-400" />
      case "payment_expired": return <Clock className="w-3 h-3 text-amber-400" />
      case "delivery_submitted": return <Package className="w-3 h-3 text-cyan-400" />
      case "funds_released": return <CheckCircle className="w-3 h-3 text-emerald-400" />
      case "dispute_opened": return <AlertTriangle className="w-3 h-3 text-red-400" />
      case "cancelled": return <Ban className="w-3 h-3 text-zinc-400" />
      default: return <Sparkles className="w-3 h-3 text-primary" />
    }
  }

  const getSenderName = (senderId: string | null) => {
    if (!senderId) return "System"
    if (senderId === buyerId) return buyerName
    return sellerName
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Chat Header (desktop) */}
      <div className="hidden lg:flex items-center gap-3 p-4 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold">
          {counterpartyName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{counterpartyName}</p>
          <p className="text-[10px] text-muted-foreground/60">Escrow Protected</p>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground/40">No messages yet</p>
            <p className="text-xs text-muted-foreground/30 mt-1">Start the conversation</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender_id === userId
          const isSystem = msg.message_type !== "text"

          if (isSystem) {
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] text-muted-foreground/70 max-w-[85%]">
                  {getSystemIcon(msg.metadata)}
                  <span className="truncate">{msg.message}</span>
                </div>
              </motion.div>
            )
          }

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex gap-2 max-w-[85%] ${isOwn ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-1 ${
                isOwn ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"
              }`}>
                {getSenderName(msg.sender_id).charAt(0).toUpperCase()}
              </div>
              <div>
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  isOwn
                    ? "bg-emerald-500/12 border border-emerald-500/15 text-foreground rounded-br-md"
                    : "bg-white/[0.06] border border-white/[0.08] text-foreground rounded-bl-md"
                }`}>
                  {msg.message}
                </div>
                <p className={`text-[10px] text-muted-foreground/40 mt-0.5 ${isOwn ? "text-right" : ""}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          )
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      {!isTerminal ? (
        <form onSubmit={handleSendMessage} className="p-3 border-t border-white/[0.06]">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 h-10 glass-input rounded-xl px-4 text-sm"
              disabled={sending}
            />
            <Button type="submit" size="icon" disabled={!chatInput.trim() || sending} className="h-10 w-10 rounded-xl shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground/30 text-center mt-1.5">Messages are end-to-end secured</p>
        </form>
      ) : (
        <div className="p-3 border-t border-white/[0.06] text-center">
          <p className="text-xs text-muted-foreground/40">This conversation is closed</p>
        </div>
      )}
    </div>
  )
}
