"use client"

import { useState, useEffect, useRef, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Send,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  X,
  Loader2,
  DollarSign,
  ChevronDown,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  getDirectMessages,
  sendDirectMessage,
  sendMoneyInChat,
  requestMoneyInChat,
  acceptRequestInChat,
  declineRequestInChat,
  type DirectMessage,
} from "@/lib/actions/direct-messages"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

const CURRENCIES = [
  { code: "EUR", symbol: "€" },
  { code: "USD", symbol: "$" },
  { code: "GBP", symbol: "£" },
] as const

function getCurrencySymbol(code: string) {
  return CURRENCIES.find(c => c.code === code)?.symbol ?? "€"
}

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

function getInitials(name: string | null | undefined) {
  if (!name) return "?"
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

type PaymentMode = null | "send" | "request"

export default function ChatPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params)
  const router = useRouter()
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [otherUser, setOtherUser] = useState<{
    id: string; full_name: string | null; username: string | null; email: string
  } | null>(null)

  // Payment mode
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(null)
  const [payAmount, setPayAmount] = useState("")
  const [payCurrency, setPayCurrency] = useState<string>("EUR")
  const [payNote, setPayNote] = useState("")
  const [payProcessing, setPayProcessing] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Load initial data
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      // Get conversation details
      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single()

      if (conv) {
        const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, username, email")
          .eq("id", otherId)
          .single()
        if (profile) setOtherUser(profile)
      }

      // Get messages
      const res = await getDirectMessages(conversationId)
      if (res.data) setMessages(res.data)
      setLoading(false)
    }
    load()
  }, [conversationId])

  // Realtime subscription for new messages
  useEffect(() => {
    if (!conversationId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as DirectMessage
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Send text message
  async function handleSend() {
    if (!message.trim() || sending) return
    const text = message.trim()
    setMessage("")
    setSending(true)
    const res = await sendDirectMessage(conversationId, text)
    setSending(false)
    if (res.error) toast.error(res.error)
  }

  // Handle payment action
  async function handlePayment() {
    if (!otherUser || !payAmount || payProcessing) return
    const amount = parseFloat(payAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount")
      return
    }

    setPayProcessing(true)
    let res
    if (paymentMode === "send") {
      res = await sendMoneyInChat({
        conversationId,
        recipientId: otherUser.id,
        amount,
        currency: payCurrency,
        note: payNote || undefined,
      })
    } else {
      res = await requestMoneyInChat({
        conversationId,
        payerId: otherUser.id,
        amount,
        currency: payCurrency,
        note: payNote || undefined,
      })
    }
    setPayProcessing(false)

    if (res?.error) {
      toast.error(res.error)
      return
    }

    toast.success(paymentMode === "send" ? "Money sent!" : "Request sent!")
    setPaymentMode(null)
    setPayAmount("")
    setPayNote("")
  }

  // Accept/Decline request
  async function handleAcceptRequest(requestId: string) {
    const res = await acceptRequestInChat(requestId, conversationId)
    if (res.error) toast.error(res.error)
    else toast.success("Payment sent!")
  }

  async function handleDeclineRequest(requestId: string) {
    const res = await declineRequestInChat(requestId, conversationId)
    if (res.error) toast.error(res.error)
  }

  function handleAmountChange(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, "")
    const parts = cleaned.split(".")
    if (parts.length > 2) return
    if (parts[1] && parts[1].length > 2) return
    setPayAmount(cleaned)
  }

  function renderMessage(msg: DirectMessage) {
    const isMine = msg.sender_id === currentUserId
    const isPayment = ["payment_sent", "payment_request", "payment_accepted", "payment_declined"].includes(msg.message_type)

    // Payment message bubble
    if (isPayment) {
      return (
        <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} mb-3`}>
          <div className={`max-w-[80%] ${isMine ? "items-end" : "items-start"}`}>
            <div className={`rounded-2xl px-4 py-3 border ${
              msg.message_type === "payment_sent"
                ? "bg-emerald-500/10 border-emerald-500/20"
                : msg.message_type === "payment_request"
                ? "bg-amber-500/10 border-amber-500/20"
                : msg.message_type === "payment_accepted"
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {msg.message_type === "payment_sent" && (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                )}
                {msg.message_type === "payment_request" && (
                  <ArrowDownRight className="w-4 h-4 text-amber-400" />
                )}
                {msg.message_type === "payment_accepted" && (
                  <Check className="w-4 h-4 text-emerald-400" />
                )}
                {msg.message_type === "payment_declined" && (
                  <X className="w-4 h-4 text-red-400" />
                )}
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  {msg.message_type === "payment_sent" && "Sent"}
                  {msg.message_type === "payment_request" && "Requested"}
                  {msg.message_type === "payment_accepted" && "Paid"}
                  {msg.message_type === "payment_declined" && "Declined"}
                </span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(Number(msg.amount), msg.currency || "EUR")}
              </p>
              {msg.message && msg.message_type !== "payment_accepted" && msg.message_type !== "payment_declined" && (
                <p className="text-xs text-muted-foreground mt-1">{msg.message}</p>
              )}

              {/* Accept/Decline buttons for pending requests (only for the payer) */}
              {msg.message_type === "payment_request" && !isMine && msg.request_id && (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptRequest(msg.request_id!)}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                  >
                    <Check className="w-3 h-3" /> Pay
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeclineRequest(msg.request_id!)}
                    className="h-7 text-xs border-white/[0.10] bg-white/[0.04] gap-1"
                  >
                    <X className="w-3 h-3" /> Decline
                  </Button>
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 px-1">
              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      )
    }

    // Normal text message
    return (
      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
        <div className={`max-w-[80%]`}>
          <div className={`rounded-2xl px-4 py-2 ${
            isMine
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-white/[0.06] text-foreground rounded-bl-md"
          }`}>
            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
          </div>
          <p className={`text-[10px] text-muted-foreground mt-0.5 px-1 ${isMine ? "text-right" : ""}`}>
            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06] shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/messages")}
          className="h-9 w-9 p-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-10 h-10 border border-white/[0.06]">
          <AvatarFallback className="bg-white/[0.06] text-foreground text-sm">
            {getInitials(otherUser?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {otherUser?.full_name || otherUser?.email || "User"}
          </p>
          {otherUser?.username && (
            <p className="text-xs text-primary">${otherUser.username}</p>
          )}
        </div>
        {/* Quick action buttons */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setPaymentMode(paymentMode === "send" ? null : "send"); setPayAmount(""); setPayNote("") }}
          className={`gap-1 text-xs h-8 ${paymentMode === "send" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/[0.04] border-white/[0.10]"}`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" /> Send
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setPaymentMode(paymentMode === "request" ? null : "request"); setPayAmount(""); setPayNote("") }}
          className={`gap-1 text-xs h-8 ${paymentMode === "request" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-white/[0.04] border-white/[0.10]"}`}
        >
          <ArrowDownRight className="w-3.5 h-3.5" /> Request
        </Button>
      </div>

      {/* Payment Panel (slide down) */}
      {paymentMode && (
        <div className={`border-b py-4 px-2 shrink-0 animate-fade-in ${
          paymentMode === "send" ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-amber-500/20 bg-amber-500/[0.03]"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {paymentMode === "send" ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-amber-400" />
            )}
            <span className="text-sm font-semibold text-foreground">
              {paymentMode === "send" ? "Send Money" : "Request Money"}
            </span>
            <span className="text-xs text-muted-foreground">
              to {otherUser?.username ? `$${otherUser.username}` : otherUser?.full_name}
            </span>
            <button onClick={() => setPaymentMode(null)} className="ml-auto text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Currency toggle */}
            <div className="flex rounded-lg overflow-hidden border border-white/[0.10]">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => setPayCurrency(c.code)}
                  className={`px-2 py-1.5 text-xs font-semibold transition-colors ${
                    payCurrency === c.code
                      ? paymentMode === "send" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]"
                  }`}
                >
                  {c.symbol}
                </button>
              ))}
            </div>

            {/* Amount */}
            <Input
              type="text"
              inputMode="decimal"
              value={payAmount}
              onChange={e => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className="bg-white/[0.04] border-white/[0.10] w-28 text-center font-semibold"
              autoFocus
            />

            {/* Note */}
            <Input
              value={payNote}
              onChange={e => setPayNote(e.target.value)}
              placeholder="Note (optional)"
              maxLength={100}
              className="bg-white/[0.04] border-white/[0.10] flex-1"
            />

            {/* Submit */}
            <Button
              onClick={handlePayment}
              disabled={payProcessing || !payAmount || parseFloat(payAmount) <= 0}
              size="sm"
              className={`gap-1 h-9 ${
                paymentMode === "send"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {payProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : paymentMode === "send" ? (
                <>
                  <Send className="w-3.5 h-3.5" />
                  {getCurrencySymbol(payCurrency)}{payAmount || "0"}
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  {getCurrencySymbol(payCurrency)}{payAmount || "0"}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto py-4 px-1 space-y-1">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Start chatting with {otherUser?.full_name || "this user"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You can also send or request money right here
            </p>
          </div>
        )}
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-white/[0.06] pt-3 pb-2 shrink-0">
        <form
          onSubmit={e => { e.preventDefault(); handleSend() }}
          className="flex items-center gap-2"
        >
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="bg-white/[0.04] border-white/[0.10] flex-1"
            disabled={sending}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!message.trim() || sending}
            className="h-9 w-9 p-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
