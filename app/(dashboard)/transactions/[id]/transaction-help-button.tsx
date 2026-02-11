"use client"

import { useState } from "react"
import { Sparkles, X, Loader2, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TransactionHelpProps {
  status: string
  userRole: "buyer" | "seller"
  amount: number
  currency: string
  description: string
}

export function TransactionHelpButton({
  status,
  userRole,
  amount,
  currency,
  description,
}: TransactionHelpProps) {
  const [open, setOpen] = useState(false)
  const [help, setHelp] = useState<{ explanation: string; next_steps: string[]; tips: string[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchHelp = async () => {
    if (help) { setOpen(true); return }
    setOpen(true)
    setLoading(true)
    try {
      const res = await fetch("/api/ai/transaction-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, user_role: userRole, amount, currency, description }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setHelp(data)
    } catch {
      setHelp({
        explanation: "Unable to load AI help right now. Please try again later.",
        next_steps: [],
        tips: [],
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={fetchHelp}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25 flex items-center justify-center transition-all hover:scale-105"
        title="AI Transaction Help"
      >
        <Sparkles className="w-5 h-5" />
      </button>

      {/* Help panel */}
      {open && (
        <div className="fixed bottom-20 right-4 md:bottom-20 md:right-6 z-50 w-80 max-h-[400px] overflow-y-auto rounded-2xl bg-[hsl(222,47%,8%)] border border-violet-500/20 shadow-2xl shadow-violet-500/10">
          <div className="sticky top-0 bg-[hsl(222,47%,8%)] px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold text-foreground">AI Help</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
              </div>
            ) : help ? (
              <>
                <p className="text-sm text-foreground/90 leading-relaxed">{help.explanation}</p>
                
                {help.next_steps.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-violet-400">Next Steps</p>
                    {help.next_steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-violet-400 font-bold mt-px">{i + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                {help.tips.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                    <p className="text-xs font-semibold text-emerald-400">Tips</p>
                    {help.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <span className="text-emerald-400">•</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setHelp(null); fetchHelp() }}
                  className="w-full text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 mt-1"
                >
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  Refresh
                </Button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}
