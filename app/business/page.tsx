"use client"

import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Globe,
  CreditCard,
  Users,
  FileText,
  Code2,
  ShieldCheck,
  Zap,
  TrendingUp,
  Clock,
  Building2,
  Banknote,
  BarChart3,
  Headphones,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"

// ─── Features ───

const features = [
  {
    icon: CreditCard,
    title: "Accept Payments Anywhere",
    description: "Online, in-app, or in-person — accept cards, wallets, bank transfers, and crypto from customers worldwide.",
  },
  {
    icon: Globe,
    title: "Multi-Currency Accounts",
    description: "Hold, send, and receive in 25+ currencies. No conversion fees between AED, USD, EUR, and GBP.",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Role-based access for your finance team. Separate permissions for viewing, approving, and issuing payouts.",
  },
  {
    icon: FileText,
    title: "Invoicing & Billing",
    description: "Send professional invoices, set up recurring billing, and automate payment reminders — all from one dashboard.",
  },
  {
    icon: Code2,
    title: "API & Integrations",
    description: "Powerful REST API, webhooks, and SDKs for Node.js, Python, PHP, Go, and Ruby. Build custom payment flows.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Built-In",
    description: "PCI DSS Level 1, UAE Central Bank licensed, AML/KYC screening. We handle compliance so you can focus on growth.",
  },
]

// ─── Stats ───

const stats = [
  { value: "AED 2.4B+", label: "Processed in 2025" },
  { value: "< 24 hrs", label: "Avg. payout speed" },
  { value: "99.99%", label: "Uptime SLA" },
  { value: "2,000+", label: "Businesses in UAE" },
]

// ─── Advantages ───

const advantages = [
  {
    icon: Building2,
    title: "UAE-First Platform",
    description: "Built for the Middle East market. AED settlement, Arabic dashboard, local entity support.",
  },
  {
    icon: Banknote,
    title: "Same-Day AED Settlement",
    description: "Get your money faster. Settlement directly to your UAE bank account — no intermediaries.",
  },
  {
    icon: Headphones,
    title: "Local Support in Arabic & English",
    description: "Dubai-based support team available by phone, chat, and email. No overseas call centers.",
  },
  {
    icon: ShieldCheck,
    title: "CBUAE Licensed & Compliant",
    description: "Fully authorized by the Central Bank of the UAE. VAT invoicing, AML screening, and data residency handled.",
  },
]

export default function BusinessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0F1A] via-[#0A0F1A] to-[#0F1B2D]">
      {/* ────── Header ────── */}
      <header className="border-b border-white/10 bg-[#0F1B2D] sticky top-0 z-50 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" linkTo="/" />
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Business
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/developers" className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block">
              Developers
            </Link>
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

      {/* ────── Hero ────── */}
      <section className="container mx-auto px-4 pt-20 pb-16 lg:pt-32 lg:pb-24">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
            <Zap className="w-4 h-4" />
            PaySafer for Business
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight">
            Accept payments.
            <br />
            <span className="text-emerald-500">Grow globally.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            The all-in-one payment platform for businesses in the UAE and beyond.
            Accept cards, send invoices, manage multi-currency accounts, and pay out
            your team — all from a single dashboard.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
            <Link href="/register">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white text-base px-8">
                Open Business Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/developers">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5 text-base">
                <Code2 className="w-4 h-4 mr-2" />
                View API Docs
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 sm:gap-8 pt-6 text-sm text-muted-foreground flex-wrap">
            {["No setup fees", "Go live in minutes", "Cancel anytime"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Stats Strip ────── */}
      <section className="border-y border-white/[0.06] bg-white/[0.02]">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in" style={{ animationDelay: "100ms" }}>
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Features Grid ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-fade-in" style={{ animationDelay: "150ms" }}>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Everything your business needs
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
              From accepting your first payment to managing global operations — PaySafer scales with you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 hover:border-emerald-500/30 hover:bg-white/[0.05] transition-all animate-fade-in-up"
                style={{ animationDelay: `${200 + i * 80}ms` }}
              >
                <div className="w-11 h-11 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Why Switch ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Why businesses switch to PaySafer
            </h2>
            <p className="text-lg text-muted-foreground font-light">
              Purpose-built for the UAE market, with global reach when you need it.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {advantages.map((adv, i) => (
              <div
                key={adv.title}
                className="flex items-start gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 animate-fade-in-up"
                style={{ animationDelay: `${200 + i * 80}ms` }}
              >
                <div className="w-11 h-11 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <adv.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{adv.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{adv.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Final CTA ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            Ready to grow?
          </div>
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
            Start accepting payments
            <br />
            <span className="text-emerald-500">in minutes, not months</span>
          </h2>
          <p className="text-lg text-muted-foreground font-light">
            Join 2,000+ businesses in the UAE already using PaySafer.
            No setup fees, no long-term contracts.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white text-base px-8">
                Open Business Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
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
                The payment platform for businesses in the UAE and beyond.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Product</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/business" className="hover:text-emerald-500">Business</Link></li>
                <li><Link href="/developers" className="hover:text-emerald-500">Developers</Link></li>
                <li><Link href="/security" className="hover:text-emerald-500">Security</Link></li>
                <li><Link href="/status" className="hover:text-emerald-500">System Status</Link></li>
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
