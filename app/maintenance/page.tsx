"use client"

import { useEffect, useState } from "react"
import { Logo } from "@/components/logo"
import { Wrench, Clock, Mail, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MaintenancePage() {
  const [dots, setDots] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."))
    }, 600)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0F1A] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-lg animate-fade-in">
        {/* Logo */}
        <div className="mb-8">
          <Logo size="md" />
        </div>

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-8">
          <Wrench className="w-10 h-10 text-amber-400" />
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-white mb-3">
          We&apos;ll Be Right Back
        </h1>
        <p className="text-muted-foreground font-light leading-relaxed mb-8">
          PaySafer is currently undergoing scheduled maintenance to improve our
          services. Your funds are safe and all transactions will be processed
          once we&apos;re back online.
        </p>

        {/* Status */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-5 mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm text-amber-400 font-medium">
              Maintenance in progress{dots}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <span className="text-xs text-muted-foreground block">Estimated Duration</span>
              <span className="text-sm text-white font-medium">2 hours</span>
            </div>
            <div>
              <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <span className="text-xs text-muted-foreground block">Expected Back</span>
              <span className="text-sm text-white font-medium">6:00 AM UTC</span>
            </div>
          </div>
        </div>

        {/* What's safe */}
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4 mb-8">
          <div className="flex items-start gap-3 text-left">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <ArrowRight className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong className="text-emerald-400">Your funds are secure.</strong> All balances and pending transactions are protected.</p>
              <p>Scheduled payments will process automatically once services resume.</p>
              <p>Debit cards remain active for in-person and ATM transactions.</p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <p className="text-xs text-muted-foreground mb-3">
          Questions? Reach us anytime:
        </p>
        <a href="mailto:support@paysafer.app">
          <Button variant="outline" className="border-white/[0.12] hover:bg-white/[0.06] text-sm">
            <Mail className="w-3.5 h-3.5 mr-2" />
            support@paysafer.app
          </Button>
        </a>

        {/* Status page link */}
        <p className="text-[11px] text-muted-foreground mt-8">
          Follow real-time updates at{" "}
          <span className="text-emerald-400">status.paysafer.app</span>
        </p>
      </div>
    </div>
  )
}
