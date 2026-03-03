"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import {
  DollarSign,
  CreditCard,
  ArrowLeftRight,
  Globe,
  Building2,
  Percent,
  Info,
  ChevronRight,
  CheckCircle,
  ArrowLeft,
} from "lucide-react"

// ─── Fee Data ───

interface FeeRow {
  item: string
  standard: string
  gold: string
  platinum: string
}

const transferFees: FeeRow[] = [
  { item: "Internal (PaySafer → PaySafer)", standard: "Free", gold: "Free", platinum: "Free" },
  { item: "Bank Transfer (ACH)", standard: "1.5%", gold: "1.0%", platinum: "Free" },
  { item: "Bank Transfer (Wire)", standard: "$4.99", gold: "$2.99", platinum: "Free" },
  { item: "IBAN Transfer", standard: "$5.99", gold: "$3.99", platinum: "$1.99" },
  { item: "Crypto Transfer", standard: "Network fee + 1%", gold: "Network fee + 0.5%", platinum: "Network fee only" },
  { item: "Escrow Service Fee", standard: "2.5%", gold: "1.5%", platinum: "1.0%" },
]

const cardFees: FeeRow[] = [
  { item: "Card Issuance", standard: "$9.99", gold: "$4.99", platinum: "Free" },
  { item: "Monthly Maintenance", standard: "$2.99/mo", gold: "$1.99/mo", platinum: "Free" },
  { item: "ATM Withdrawal (In-network)", standard: "$1.50", gold: "Free", platinum: "Free" },
  { item: "ATM Withdrawal (Out-of-network)", standard: "$3.00", gold: "$1.50", platinum: "Free" },
  { item: "International ATM", standard: "$5.00 + 3%", gold: "$2.50 + 1.5%", platinum: "Free" },
  { item: "Card Replacement", standard: "$14.99", gold: "$9.99", platinum: "Free" },
]

const fxFees: FeeRow[] = [
  { item: "FX Spread (Major currencies)", standard: "2.5%", gold: "1.5%", platinum: "0.5%" },
  { item: "FX Spread (Minor currencies)", standard: "3.5%", gold: "2.5%", platinum: "1.5%" },
  { item: "Weekend FX Markup", standard: "+1.0%", gold: "+0.5%", platinum: "+0.25%" },
]

const limits: { item: string; standard: string; gold: string; platinum: string }[] = [
  { item: "Daily Spending Limit", standard: "$2,500", gold: "$10,000", platinum: "$50,000" },
  { item: "Monthly Spending Limit", standard: "$10,000", gold: "$50,000", platinum: "$250,000" },
  { item: "Daily ATM Withdrawal", standard: "$500", gold: "$2,000", platinum: "$10,000" },
  { item: "Single Transfer Maximum", standard: "$5,000", gold: "$25,000", platinum: "$100,000" },
  { item: "Maximum Balance", standard: "$25,000", gold: "$100,000", platinum: "Unlimited" },
]

function FeeTable({ title, icon: Icon, rows }: { title: string; icon: React.ElementType; rows: FeeRow[] }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs tracking-wide uppercase">Item</th>
              <th className="text-center py-3 px-4 text-emerald-400 font-medium text-xs tracking-wide uppercase">Standard</th>
              <th className="text-center py-3 px-4 text-amber-400 font-medium text-xs tracking-wide uppercase">Gold</th>
              <th className="text-center py-3 px-4 text-purple-400 font-medium text-xs tracking-wide uppercase">Platinum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
              >
                <td className="py-3 px-4 text-white/90 font-light">{row.item}</td>
                <td className="py-3 px-4 text-center text-white/70 font-mono text-xs">
                  <span className={row.standard === "Free" ? "text-emerald-400 font-medium" : ""}>
                    {row.standard}
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-white/70 font-mono text-xs">
                  <span className={row.gold === "Free" ? "text-emerald-400 font-medium" : ""}>
                    {row.gold}
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-white/70 font-mono text-xs">
                  <span className={row.platinum === "Free" ? "text-emerald-400 font-medium" : ""}>
                    {row.platinum}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function FeesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0F1A] via-[#0A0F1A] to-[#0F1B2D]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0F1B2D]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="sm" linkTo="/" />
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>

        {/* Title */}
        <div className="animate-fade-in mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Fees & Limits
              </h1>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Transparent pricing across all PaySafer plans
              </p>
            </div>
          </div>
          <p className="text-muted-foreground font-light leading-relaxed max-w-2xl mt-4">
            We believe in clear, upfront pricing with no hidden charges. All fees are disclosed
            below per card tier. Upgrade anytime to unlock lower fees and higher limits.
          </p>
        </div>

        {/* Tier badges */}
        <div className="animate-fade-in grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12" style={{ animationDelay: "100ms" }}>
          {[
            { name: "Standard", color: "emerald", desc: "Free to open", icon: CreditCard },
            { name: "Gold", color: "amber", desc: "$9.99/month", icon: CreditCard },
            { name: "Platinum", color: "purple", desc: "$24.99/month", icon: CreditCard },
          ].map((tier) => {
            const colors: Record<string, string> = {
              emerald: "border-emerald-500/20 bg-emerald-500/5",
              amber: "border-amber-500/20 bg-amber-500/5",
              purple: "border-purple-500/20 bg-purple-500/5",
            }
            const textColors: Record<string, string> = {
              emerald: "text-emerald-400",
              amber: "text-amber-400",
              purple: "text-purple-400",
            }
            return (
              <div
                key={tier.name}
                className={`rounded-xl border p-4 flex items-center gap-3 ${colors[tier.color]}`}
              >
                <tier.icon className={`w-5 h-5 ${textColors[tier.color]}`} />
                <div>
                  <span className={`text-sm font-semibold ${textColors[tier.color]}`}>{tier.name}</span>
                  <span className="text-xs text-muted-foreground block">{tier.desc}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Fee Tables */}
        <div className="space-y-10">
          <div className="animate-fade-in-up rounded-xl bg-white/[0.03] border border-white/[0.08] p-6" style={{ animationDelay: "150ms" }}>
            <FeeTable title="Transfer Fees" icon={ArrowLeftRight} rows={transferFees} />
          </div>

          <div className="animate-fade-in-up rounded-xl bg-white/[0.03] border border-white/[0.08] p-6" style={{ animationDelay: "200ms" }}>
            <FeeTable title="Card Fees" icon={CreditCard} rows={cardFees} />
          </div>

          <div className="animate-fade-in-up rounded-xl bg-white/[0.03] border border-white/[0.08] p-6" style={{ animationDelay: "250ms" }}>
            <FeeTable title="Foreign Exchange" icon={Globe} rows={fxFees} />
          </div>

          <div className="animate-fade-in-up rounded-xl bg-white/[0.03] border border-white/[0.08] p-6" style={{ animationDelay: "300ms" }}>
            <FeeTable title="Account Limits" icon={Building2} rows={limits} />
          </div>
        </div>

        {/* Additional info */}
        <div className="animate-fade-in-up mt-12 space-y-4" style={{ animationDelay: "350ms" }}>
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                <p>
                  <strong className="text-white/80">Effective Date:</strong> These fees are effective
                  as of January 1, 2026 and are subject to change with 30 days' prior notice.
                </p>
                <p>
                  <strong className="text-white/80">Regulatory Compliance:</strong> PaySafer is
                  registered with FinCEN (US) and licensed by CBUAE (UAE). All fees comply with
                  applicable consumer protection regulations.
                </p>
                <p>
                  <strong className="text-white/80">Disputes & Refunds:</strong> Unauthorized
                  transaction disputes are free to file. See our{" "}
                  <Link href="/terms" className="text-emerald-400 hover:underline">
                    Terms of Service
                  </Link>{" "}
                  for the full refund policy.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="animate-fade-in-up mt-12 text-center" style={{ animationDelay: "400ms" }}>
          <p className="text-muted-foreground text-sm mb-4">
            Ready to get started with transparent banking?
          </p>
          <Link href="/register">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8">
              Create Free Account
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Footer links */}
        <div className="mt-16 pt-8 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link>
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
        </div>
      </main>
    </div>
  )
}
