"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageCircle,
  Send,
  Minimize2,
  RotateCcw,
  Headphones,
  Loader2,
  CheckCheck,
  Bot,
  User,
  Sparkles,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getOrCreateActiveTicket,
  getTicketMessages,
  sendSupportMessage,
  closeTicket,
  type SupportMessage,
  type SupportTicket,
} from "@/lib/actions/support"
import { useSupportChatSubscription } from "@/lib/supabase/realtime"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

// --- FAQ Answers (client-side, instant) ---

const faqAnswers: Record<string, string> = {
  "How does escrow work?":
    "PaySafer works as an escrow service:\n\n1. A seller creates an offer\n2. The buyer pays - funds are held securely\n3. The seller delivers the goods/service\n4. The buyer confirms delivery\n5. Funds are released to the seller\n\nThis protects both parties throughout the process.",
  "I need help with a payment":
    "Payments on PaySafer are processed securely through Stripe. Once a buyer pays, funds are held in escrow until the transaction is completed.\n\nIf you're having a payment issue, please tap Live Chat below to connect with our support team - they can look up your transaction right away.",
  "How do I open a dispute?":
    "You can open a dispute directly from your Transactions page:\n\n1. Go to Transactions\n2. Find the transaction in question\n3. Click \"Open Dispute\"\n4. Describe the issue and upload evidence\n\nOur team reviews all evidence from both parties and reaches a fair resolution.",
  "What are the fees?":
    "PaySafer charges a 2.9% + $0.30 fee per transaction. There are no hidden fees, monthly subscriptions, or account maintenance costs.\n\nThe exact fee is always shown upfront before you confirm any payment.",
}

// --- Chat Bubble (Floating Button) ---

function ChatBubble({ onClick, unread }: { onClick: () => void; unread: number }) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "w-16 h-16 rounded-full",
        "bg-gradient-to-br from-emerald-500 to-teal-600",
        "shadow-[0_8px_32px_rgba(16,185,129,0.4)]",
        "hover:shadow-[0_8px_40px_rgba(16,185,129,0.55)]",
        "flex items-center justify-center",
        "transition-all duration-300 hover:scale-105",
        "group cursor-pointer"
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
    >
      <MessageCircle className="w-7 h-7 text-white transition-transform group-hover:rotate-12" />

      {unread > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-background"
        >
          {unread > 9 ? "9+" : unread}
        </motion.span>
      )}

      <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping opacity-30" />

      <span className="absolute right-full mr-3 whitespace-nowrap bg-popover text-popover-foreground text-sm px-3 py-1.5 rounded-lg shadow-lg border border-white/[0.08] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Chat with us
      </span>
    </motion.button>
  )
}

// --- Message Bubble ---

function MessageBubble({ msg, isLast }: { msg: SupportMessage; isLast: boolean }) {
  const isUser = msg.sender_type === "user"
  const isSystem = msg.sender_type === "system"

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-3"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>{msg.message}</span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex gap-2.5 max-w-[85%]",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      <div
        className={cn(
          "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-1",
          isUser
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-blue-500/20 text-blue-400"
        )}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-emerald-500/15 border border-emerald-500/20 text-foreground rounded-br-md"
            : "bg-white/[0.06] border border-white/[0.10] text-foreground rounded-bl-md"
        )}
      >
        {!isUser && (
          <p className="text-[10px] font-medium text-blue-400/80 mb-1">
            {(msg.metadata as Record<string, string>)?.agent_name || "PaySafer Support"}
          </p>
        )}
        <p className="whitespace-pre-wrap">{msg.message}</p>
        <div
          className={cn(
            "flex items-center gap-1 mt-1.5",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          <span className="text-[10px] text-muted-foreground/60">
            {new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {isUser && isLast && (
            <CheckCheck className="w-3 h-3 text-emerald-400/60" />
          )}
        </div>
      </div>
    </motion.div>
  )
}

// --- Typing Indicator ---

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-2.5 max-w-[85%]"
    >
      <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
        <Bot className="w-3.5 h-3.5 text-blue-400" />
      </div>
      <div className="rounded-2xl rounded-bl-md bg-white/[0.06] border border-white/[0.10] px-4 py-3 flex items-center gap-1">
        <motion.span
          className="w-2 h-2 bg-muted-foreground/50 rounded-full"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
        />
        <motion.span
          className="w-2 h-2 bg-muted-foreground/50 rounded-full"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        />
        <motion.span
          className="w-2 h-2 bg-muted-foreground/50 rounded-full"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </motion.div>
  )
}

// --- Quick Replies ---

const quickReplies = [
  "How does escrow work?",
  "I need help with a payment",
  "How do I open a dispute?",
  "What are the fees?",
]

// --- Chat Modes ---
type ChatMode = "faq" | "live"

// --- Main Chat Widget ---

export function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<ChatMode>("faq")
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [faqMessages, setFaqMessages] = useState<{ role: "user" | "bot"; text: string }[]>([])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
  const [liveStarted, setLiveStarted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Get user
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Subscribe to realtime messages (only in live mode)
  useSupportChatSubscription(ticket?.id, (newMsg) => {
    const message = newMsg as unknown as SupportMessage
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev
      return [...prev, message]
    })
    if (!isOpen && message.sender_type !== "user") {
      setUnread((n) => n + 1)
    }
  })

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, faqMessages])

  // Open chat
  const handleOpen = useCallback(async () => {
    setIsOpen(true)
    setUnread(0)
    setTimeout(() => inputRef.current?.focus(), 200)
  }, [])

  // Listen for external open events
  useEffect(() => {
    const handler = () => handleOpen()
    document.addEventListener("open-support-chat", handler)
    return () => document.removeEventListener("open-support-chat", handler)
  }, [handleOpen])

  // Handle FAQ quick reply (instant, client-side)
  const handleFaqSelect = (question: string) => {
    const answer = faqAnswers[question]
    if (!answer) return
    setFaqMessages((prev) => [
      ...prev,
      { role: "user", text: question },
      { role: "bot", text: answer },
    ])
  }

  // Start live chat - connect to real support ticket
  const handleStartLiveChat = useCallback(async () => {
    setMode("live")
    setLiveStarted(true)

    if (!ticket) {
      setIsLoading(true)
      const { data, error } = await getOrCreateActiveTicket()
      if (error) {
        toast.error("Could not start live chat", { description: error })
        setIsLoading(false)
        return
      }
      if (data) {
        setTicket(data)
        const { data: msgs } = await getTicketMessages(data.id)
        if (msgs) setMessages(msgs)
      }
      setIsLoading(false)
    }

    setTimeout(() => inputRef.current?.focus(), 200)
  }, [ticket])

  // Send message (live mode - goes to real admin)
  const handleSend = useCallback(async () => {
    if (!input.trim() || !ticket || isSending) return

    const msg = input.trim()
    setInput("")
    setIsSending(true)

    const optimistic: SupportMessage = {
      id: `temp-${Date.now()}`,
      ticket_id: ticket.id,
      sender_type: "user",
      sender_id: userId || "",
      message: msg,
      metadata: {},
      read: false,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    const { data, error } = await sendSupportMessage(ticket.id, msg)
    if (error) {
      toast.error("Failed to send message")
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
    } else if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? data : m))
      )
    }
    setIsSending(false)
  }, [input, ticket, isSending, userId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (mode === "live") handleSend()
    }
  }

  // New conversation
  const handleNewConversation = useCallback(async () => {
    if (ticket) {
      await closeTicket(ticket.id)
    }
    setTicket(null)
    setMessages([])
    setFaqMessages([])
    setMode("faq")
    setLiveStarted(false)
  }, [ticket])

  const hasAskedFaq = faqMessages.length > 0

  return (
    <>
      <AnimatePresence>
        {!isOpen && <ChatBubble onClick={handleOpen} unread={unread} />}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed bottom-6 right-6 z-50",
              "w-[400px] max-w-[calc(100vw-2rem)]",
              "h-[600px] max-h-[calc(100vh-6rem)]",
              "rounded-2xl overflow-hidden",
              "border border-white/[0.10]",
              "bg-[hsl(222,47%,6%)]/95 backdrop-blur-2xl",
              "shadow-[0_25px_80px_rgba(0,0,0,0.5),0_0_40px_rgba(16,185,129,0.08)]",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="relative px-5 py-4 border-b border-white/[0.08] bg-gradient-to-r from-emerald-500/[0.08] to-teal-500/[0.04]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <Headphones className="w-5 h-5 text-white" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[hsl(222,47%,6%)] rounded-full" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">PaySafer Support</h3>
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      {mode === "live" ? "Live Chat - Connected to support" : "Online - Ask us anything"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {liveStarted && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNewConversation}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                      title="New conversation"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/[0.08]">

              {/* --- FAQ Mode --- */}
              {mode === "faq" && (
                <>
                  {/* Welcome */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center my-2"
                  >
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs text-muted-foreground">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>Welcome to PaySafer Support!</span>
                    </div>
                  </motion.div>

                  {/* Bot greeting */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex gap-2.5 max-w-[85%] mr-auto"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 flex-shrink-0 flex items-center justify-center mt-1">
                      <Bot className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="rounded-2xl rounded-bl-md bg-white/[0.06] border border-white/[0.10] px-4 py-2.5 text-sm leading-relaxed">
                      <p className="text-[10px] font-medium text-blue-400/80 mb-1">PaySafer Support</p>
                      <p className="text-foreground whitespace-pre-wrap">How can we help you today? Choose a quick question below, or tap <strong>Live Chat</strong> to talk directly with our support team.</p>
                    </div>
                  </motion.div>

                  {/* FAQ conversation */}
                  {faqMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={cn(
                        "flex gap-2.5 max-w-[85%]",
                        msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-1",
                          msg.role === "user"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-blue-500/20 text-blue-400"
                        )}
                      >
                        {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                          msg.role === "user"
                            ? "bg-emerald-500/15 border border-emerald-500/20 text-foreground rounded-br-md"
                            : "bg-white/[0.06] border border-white/[0.10] text-foreground rounded-bl-md"
                        )}
                      >
                        {msg.role === "bot" && (
                          <p className="text-[10px] font-medium text-blue-400/80 mb-1">PaySafer Support</p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </motion.div>
                  ))}

                  {/* Quick reply buttons */}
                  <div className="pt-2">
                    <p className="text-[11px] text-muted-foreground/60 mb-2 px-1">
                      {hasAskedFaq ? "More questions:" : "Quick questions:"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {quickReplies
                        .filter((q) => !faqMessages.some((m) => m.role === "user" && m.text === q))
                        .map((reply) => (
                          <button
                            key={reply}
                            onClick={() => handleFaqSelect(reply)}
                            className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          >
                            {reply}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Live Chat Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="pt-3"
                  >
                    <button
                      onClick={handleStartLiveChat}
                      className={cn(
                        "w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl",
                        "bg-gradient-to-r from-emerald-500/15 to-teal-500/10",
                        "border border-emerald-500/25",
                        "text-emerald-400 text-sm font-semibold",
                        "hover:from-emerald-500/25 hover:to-teal-500/15 hover:border-emerald-500/40",
                        "transition-all duration-200 group"
                      )}
                    >
                      <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Live Chat - Talk to our team
                    </button>
                    <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">
                      A real person will respond to your message
                    </p>
                  </motion.div>
                </>
              )}

              {/* --- Live Mode --- */}
              {mode === "live" && (
                <>
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                      <p className="text-sm">Connecting to support...</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, i) => (
                        <MessageBubble
                          key={msg.id}
                          msg={msg}
                          isLast={i === messages.length - 1}
                        />
                      ))}

                      {/* Waiting for agent notice */}
                      {messages.length > 0 &&
                        messages[messages.length - 1]?.sender_type === "user" && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2 }}
                            className="flex justify-center my-2"
                          >
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/[0.08] border border-amber-500/15 text-[11px] text-amber-400/80">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Waiting for a support agent to respond...
                            </div>
                          </motion.div>
                        )}
                    </>
                  )}
                </>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-4 py-3 border-t border-white/[0.08] bg-white/[0.02]">
              {mode === "faq" ? (
                <div className="text-center py-1">
                  <p className="text-[11px] text-muted-foreground/50">
                    Select a question above or start a live chat
                  </p>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message to support..."
                      rows={1}
                      className={cn(
                        "w-full resize-none rounded-xl px-4 py-2.5 pr-12 text-sm",
                        "bg-white/[0.06] border border-white/[0.10]",
                        "text-foreground placeholder:text-muted-foreground/50",
                        "focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20",
                        "transition-colors max-h-[100px]"
                      )}
                      style={{ height: "auto", minHeight: "40px" }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = "auto"
                        target.style.height = `${Math.min(target.scrollHeight, 100)}px`
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isSending || isLoading}
                    size="icon"
                    className={cn(
                      "h-10 w-10 rounded-xl flex-shrink-0",
                      "bg-gradient-to-br from-emerald-500 to-teal-600",
                      "hover:from-emerald-400 hover:to-teal-500",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                      "shadow-lg shadow-emerald-500/20",
                      "transition-all duration-200"
                    )}
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
                Powered by PaySafer Support
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
