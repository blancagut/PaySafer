"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Activity,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

// ─── Service status definitions ───

type Status = "operational" | "degraded" | "outage" | "maintenance"

interface Service {
  name: string
  description: string
  status: Status
}

interface Incident {
  id: string
  title: string
  status: "resolved" | "monitoring" | "investigating"
  severity: "minor" | "major" | "critical"
  date: string
  updates: { time: string; message: string }[]
}

const statusConfig: Record<Status, { label: string; color: string; icon: typeof CheckCircle; bg: string }> = {
  operational: { label: "Operational", color: "text-emerald-400", icon: CheckCircle, bg: "bg-emerald-500" },
  degraded: { label: "Degraded Performance", color: "text-amber-400", icon: AlertTriangle, bg: "bg-amber-500" },
  outage: { label: "Major Outage", color: "text-red-400", icon: XCircle, bg: "bg-red-500" },
  maintenance: { label: "Under Maintenance", color: "text-blue-400", icon: Clock, bg: "bg-blue-500" },
}

// ─── Services ───

const services: Service[] = [
  { name: "API", description: "REST API & Webhooks", status: "operational" },
  { name: "Dashboard", description: "Web application", status: "operational" },
  { name: "Mobile App", description: "iOS & Android", status: "operational" },
  { name: "Payments Processing", description: "Card & wallet payments", status: "operational" },
  { name: "Payouts", description: "Withdrawals & bank transfers", status: "operational" },
  { name: "Crypto Services", description: "Buy, sell & exchange", status: "operational" },
  { name: "Escrow Engine", description: "Transaction escrow", status: "operational" },
  { name: "Notifications", description: "Push, email & SMS", status: "operational" },
  { name: "Authentication", description: "Login & 2FA", status: "operational" },
  { name: "Support Chat", description: "In-app chat support", status: "operational" },
]

// ─── Recent incidents ───

const incidents: Incident[] = [
  {
    id: "inc-2026-0215",
    title: "Elevated API latency in EU region",
    status: "resolved",
    severity: "minor",
    date: "Feb 15, 2026",
    updates: [
      { time: "14:32 UTC", message: "We identified elevated latency for API requests routed through our EU-West region. Investigating." },
      { time: "14:48 UTC", message: "Root cause identified: a misconfigured load balancer after a routine deployment. Rolling back." },
      { time: "15:05 UTC", message: "Rollback complete. API latency has returned to normal levels. Monitoring." },
      { time: "16:00 UTC", message: "Resolved. Post-incident review scheduled. No data loss or payment failures occurred." },
    ],
  },
  {
    id: "inc-2026-0201",
    title: "Scheduled maintenance: Database migration",
    status: "resolved",
    severity: "minor",
    date: "Feb 1, 2026",
    updates: [
      { time: "02:00 UTC", message: "Scheduled maintenance window begins. Read-only mode enabled for dashboard." },
      { time: "02:45 UTC", message: "Database migration complete. Running verification checks." },
      { time: "03:10 UTC", message: "All systems back to full operation. Maintenance window closed." },
    ],
  },
  {
    id: "inc-2026-0118",
    title: "Push notification delays",
    status: "resolved",
    severity: "minor",
    date: "Jan 18, 2026",
    updates: [
      { time: "09:15 UTC", message: "Some users reporting delayed push notifications. Investigating third-party provider." },
      { time: "10:00 UTC", message: "Third-party push provider confirmed degraded performance on their end. Failover to backup provider initiated." },
      { time: "10:30 UTC", message: "Resolved. Push notifications flowing normally through backup provider." },
    ],
  },
]

// ─── Uptime data (90 days) ───

function generateUptimeDays() {
  const days = []
  for (let i = 89; i >= 0; i--) {
    const rand = Math.random()
    let status: "up" | "degraded" | "down" = "up"
    if (i === 45) status = "degraded" // one degraded day
    else if (rand < 0.01) status = "degraded"
    days.push({ day: i, status })
  }
  return days
}

export default function StatusPage() {
  const [uptimeDays, setUptimeDays] = useState<{ day: number; status: "up" | "degraded" | "down" }[]>([])
  const [lastChecked, setLastChecked] = useState("")

  useEffect(() => {
    setUptimeDays(generateUptimeDays())
    setLastChecked(new Date().toLocaleTimeString())
  }, [])

  const allOperational = services.every((s) => s.status === "operational")

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0F1A] via-[#0A0F1A] to-[#0F1B2D] text-foreground">
      {/* ────── Header ────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0F1B2D]/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Logo size="sm" />
            </Link>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              System Status
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ────── Overall Status Banner ────── */}
      <section className="container mx-auto px-4 pt-20 pb-8 lg:pt-28 lg:pb-12">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div
            className={`rounded-2xl border p-8 text-center ${
              allOperational
                ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                : "border-amber-500/20 bg-amber-500/[0.04]"
            }`}
          >
            {allOperational ? (
              <>
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                  All Systems Operational
                </h1>
                <p className="text-muted-foreground">
                  All PaySafer services are running normally.
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                  Partial System Disruption
                </h1>
                <p className="text-muted-foreground">
                  Some services are experiencing issues. We&apos;re working on it.
                </p>
              </>
            )}

            {lastChecked && (
              <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Last checked: {lastChecked}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ────── 90-Day Uptime Chart ────── */}
      <section className="container mx-auto px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-foreground">90-Day Uptime</h2>
            <span className="text-sm font-semibold text-emerald-400">99.98%</span>
          </div>
          <div className="flex gap-[2px]">
            {uptimeDays.map((d, i) => (
              <div
                key={i}
                className={`flex-1 h-8 rounded-sm ${
                  d.status === "up"
                    ? "bg-emerald-500/80"
                    : d.status === "degraded"
                      ? "bg-amber-500/80"
                      : "bg-red-500/80"
                }`}
                title={`${90 - d.day} days ago — ${d.status}`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
        </div>
      </section>

      {/* ────── Services List ────── */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-semibold mb-6">Current Status</h2>

          <div className="space-y-2">
            {services.map((svc) => {
              const cfg = statusConfig[svc.status]
              const Icon = cfg.icon
              return (
                <div
                  key={svc.name}
                  className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4"
                >
                  <div>
                    <h3 className="font-medium text-foreground text-sm">{svc.name}</h3>
                    <p className="text-xs text-muted-foreground">{svc.description}</p>
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline font-medium">{cfg.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ────── Incidents ────── */}
      <section className="container mx-auto px-4 py-16 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-semibold mb-8">Recent Incidents</h2>

          <div className="space-y-8">
            {incidents.map((inc) => (
              <div key={inc.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{inc.title}</h3>
                    <span className="text-xs text-muted-foreground">{inc.date}</span>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                      inc.status === "resolved"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : inc.status === "monitoring"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {inc.status.charAt(0).toUpperCase() + inc.status.slice(1)}
                  </span>
                </div>

                <div className="px-6 py-4 space-y-4">
                  {inc.updates.map((u, i) => (
                    <div key={i} className="flex gap-4 text-sm">
                      <span className="text-xs text-muted-foreground font-mono w-20 shrink-0 pt-0.5">
                        {u.time}
                      </span>
                      <p className="text-muted-foreground leading-relaxed">{u.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Subscribe ────── */}
      <section className="container mx-auto px-4 py-16 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto text-center space-y-6 animate-fade-in">
          <Activity className="w-10 h-10 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-bold tracking-tight">
            Get notified about incidents
          </h2>
          <p className="text-muted-foreground font-light">
            Subscribe to email or SMS alerts when PaySafer experiences downtime or degraded performance.
          </p>
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="you@example.com"
              className="flex-1 h-12 px-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 text-sm"
            />
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white h-12 px-6">
              Subscribe
            </Button>
          </div>
        </div>
      </section>

      {/* ────── Footer ────── */}
      <footer className="border-t border-white/10 bg-[#0F1B2D]">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="mb-4"><Logo size="sm" /></div>
              <p className="text-sm text-white/60">
                Real-time system status.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Product</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/business" className="hover:text-emerald-500">Business</Link></li>
                <li><Link href="/developers" className="hover:text-emerald-500">Developers</Link></li>
                <li><Link href="/security" className="hover:text-emerald-500">Security</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Company</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/about" className="hover:text-emerald-500">About Us</Link></li>
                <li><Link href="/blog" className="hover:text-emerald-500">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-emerald-500">Careers</Link></li>
                <li><Link href="/press" className="hover:text-emerald-500">Press</Link></li>
                <li><Link href="/contact" className="hover:text-emerald-500">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Legal</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/privacy" className="hover:text-emerald-500">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-emerald-500">Terms of Service</Link></li>
                <li><Link href="/accessibility" className="hover:text-emerald-500">Accessibility</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-white/50">
            © 2026 PaySafer.me — All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
