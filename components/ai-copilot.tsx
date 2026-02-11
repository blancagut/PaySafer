"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  X,
  Send,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  ChevronDown,
  Bot,
  User,
  BarChart3,
  Clock,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ───

interface CopilotMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  suggestions?: string[]
  chart?: { type: "bar" | "line"; data: { label: string; value: number }[] }
}

// ─── Quick Actions ───

const quickActions = [
  { label: "Spending summary", prompt: "Show my spending summary this month", icon: BarChart3 },
  { label: "Cash flow forecast", prompt: "What's my cash flow forecast for 30 days?", icon: TrendingUp },
  { label: "Pending actions", prompt: "What pending transactions or offers need my attention?", icon: Clock },
  { label: "Recent activity", prompt: "Summarize my recent transaction activity", icon: RefreshCw },
]

// ─── Main Copilot Component ───

export function AICopilot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hey! I'm SafeAI, your financial copilot. I can help you understand your spending, forecast cash flow, manage transactions, and more. What would you like to know?",
      timestamp: new Date(),
      suggestions: [
        "How much did I spend this month?",
        "Any pending offers expiring soon?",
        "Show my wallet balance trend",
      ],
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return

      const userMsg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setIsLoading(true)

      try {
        const response = await fetch("/api/ai/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            history: messages.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        })

        if (!response.ok) throw new Error("Failed to get response")

        const data = await response.json()

        const assistantMsg: CopilotMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message || "I couldn't process that request. Try rephrasing?",
          timestamp: new Date(),
          suggestions: data.suggestions,
          chart: data.chart,
        }

        setMessages((prev) => [...prev, assistantMsg])
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
            timestamp: new Date(),
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, messages]
  )

  if (!isOpen) {
    return (
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div className="relative">
          {/* Glow ring */}
          <div className="absolute -inset-2 bg-primary/20 rounded-full blur-xl animate-pulse" />
          {/* Button */}
          <div className="relative flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-full shadow-2xl shadow-primary/30 font-medium text-sm">
            <Sparkles className="w-5 h-5" />
            <span className="hidden sm:inline">SafeAI</span>
          </div>
          {/* Notification dot */}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-background animate-pulse" />
        </div>
      </motion.button>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          height: isMinimized ? 56 : "auto",
        }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[400px] max-h-[600px] flex flex-col",
          "bg-background/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/40",
          "overflow-hidden"
        )}
      >
        {/* ─── Header ─── */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] cursor-pointer shrink-0"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-background" />
            </div>
            <div>
              <p className="text-sm font-semibold">SafeAI Copilot</p>
              <p className="text-[10px] text-muted-foreground">Your financial brain</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized) }}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform", isMinimized && "rotate-180")} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* ─── Messages ─── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[420px] scrollbar-thin">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-2.5", msg.role === "user" && "flex-row-reverse")}>
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    msg.role === "assistant" ? "bg-primary/15" : "bg-white/[0.08]"
                  )}>
                    {msg.role === "assistant" ? (
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className={cn("max-w-[85%] space-y-2", msg.role === "user" && "items-end")}>
                    <div
                      className={cn(
                        "px-3.5 py-2.5 rounded-xl text-sm leading-relaxed",
                        msg.role === "assistant"
                          ? "bg-white/[0.04] border border-white/[0.06]"
                          : "bg-primary/15 text-foreground"
                      )}
                    >
                      {msg.content}
                    </div>

                    {/* Inline chart */}
                    {msg.chart && (
                      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3">
                        <div className="flex items-end gap-1.5 h-24">
                          {msg.chart.data.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className="w-full bg-primary/60 rounded-t transition-all"
                                style={{ height: `${(d.value / Math.max(...msg.chart!.data.map((x) => x.value))) * 80}px` }}
                              />
                              <span className="text-[9px] text-muted-foreground truncate">{d.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    {msg.suggestions && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(s)}
                            className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="flex gap-1.5">
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ─── Quick Actions ─── */}
            {messages.length <= 1 && (
              <div className="px-4 py-2 border-t border-white/[0.04]">
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.prompt)}
                      className="flex items-center gap-2 text-left px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors group"
                    >
                      <action.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Input ─── */}
            <div className="p-3 border-t border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 focus-within:border-primary/40 transition-colors">
                <Zap className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                  placeholder="Ask SafeAI anything..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  disabled={isLoading}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="p-1.5 rounded-lg hover:bg-primary/20 text-primary disabled:opacity-30 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
