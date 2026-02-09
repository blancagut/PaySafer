"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageCircle,
  Send,
  X,
  Minimize2,
  RotateCcw,
  Headphones,
  Loader2,
  CheckCheck,
  Bot,
  User,
  Sparkles,
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

// ─── Chat Bubble (Floating Button) ───

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
      
      {/* Unread badge */}
      {unread > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-background"
        >
          {unread > 9 ? "9+" : unread}
        </motion.span>
      )}

      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping opacity-30" />
      
      {/* Tooltip */}
      <span className="absolute right-full mr-3 whitespace-nowrap bg-popover text-popover-foreground text-sm px-3 py-1.5 rounded-lg shadow-lg border border-white/[0.08] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Chat with us
      </span>
    </motion.button>
  )
}

// ─── Message Bubble ───

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
      {/* Avatar */}
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

      {/* Bubble */}
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

// ─── Typing Indicator ───

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

// ─── Quick Replies ───

const quickReplies = [
  "How does escrow work?",
  "I need help with a payment",
  "How do I open a dispute?",
  "What are the fees?",
]

function QuickReplies({ onSelect }: { onSelect: (msg: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {quickReplies.map((reply) => (
        <button
          key={reply}
          onClick={() => onSelect(reply)}
          className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          {reply}
        </button>
      ))}
    </div>
  )
}

// ─── Main Chat Widget ───

export function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [unread, setUnread] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Get user
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Subscribe to realtime messages
  useSupportChatSubscription(ticket?.id, (newMsg) => {
    const message = newMsg as unknown as SupportMessage
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.id === message.id)) return prev
      return [...prev, message]
    })
    // Count unread if chat is closed
    if (!isOpen && message.sender_type !== "user") {
      setUnread((n) => n + 1)
    }
    // Stop typing indicator on agent reply
    if (message.sender_type === "agent") {
      setIsTyping(false)
    }
  })

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  // Open chat
  const handleOpen = useCallback(async () => {
    setIsOpen(true)
    setUnread(0)

    if (!ticket) {
      setIsLoading(true)
      const { data, error } = await getOrCreateActiveTicket()
      if (error) {
        toast.error("Could not open support chat", { description: error })
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

  // Listen for external open events (from "Chat with us" buttons)
  useEffect(() => {
    const handler = () => handleOpen()
    document.addEventListener("open-support-chat", handler)
    return () => document.removeEventListener("open-support-chat", handler)
  }, [handleOpen])

  // Send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || !ticket || isSending) return

    const msg = input.trim()
    setInput("")
    setIsSending(true)

    // Optimistic message
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
      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? data : m))
      )
      // Show typing indicator for agent
      setIsTyping(true)
    }
    setIsSending(false)
  }, [input, ticket, isSending, userId])

  // Handle enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // New conversation
  const handleNewConversation = useCallback(async () => {
    if (ticket) {
      await closeTicket(ticket.id)
    }
    setTicket(null)
    setMessages([])
    setIsLoading(true)
    const { data } = await getOrCreateActiveTicket()
    if (data) {
      setTicket(data)
      const { data: msgs } = await getTicketMessages(data.id)
      if (msgs) setMessages(msgs)
    }
    setIsLoading(false)
  }, [ticket])

  const showQuickReplies = messages.length <= 2

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <ChatBubble onClick={handleOpen} unread={unread} />
        )}
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
                      Online — We typically reply instantly
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNewConversation}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                    title="New conversation"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
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
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <p className="text-sm">Starting conversation...</p>
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

                  {isTyping && <TypingIndicator />}

                  {showQuickReplies && !isTyping && (
                    <div className="pt-2">
                      <p className="text-[11px] text-muted-foreground/60 mb-2 px-1">
                        Quick questions:
                      </p>
                      <QuickReplies
                        onSelect={async (msg) => {
                          if (!ticket || isSending) return
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
                            setIsTyping(true)
                          }
                          setIsSending(false)
                        }}
                      />
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-4 py-3 border-t border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    rows={1}
                    className={cn(
                      "w-full resize-none rounded-xl px-4 py-2.5 pr-12 text-sm",
                      "bg-white/[0.06] border border-white/[0.10]",
                      "text-foreground placeholder:text-muted-foreground/50",
                      "focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20",
                      "transition-colors max-h-[100px]"
                    )}
                    style={{
                      height: "auto",
                      minHeight: "40px",
                    }}
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
