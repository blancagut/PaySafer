"use client"

import Link from "next/link"
import {
  ArrowRight,
  Download,
  Newspaper,
  ExternalLink,
  Mail,
  Calendar,
  Quote,
  Image as ImageIcon,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

// ─── Press releases ───

const releases = [
  {
    date: "Feb 20, 2026",
    title: "PaySafer Surpasses $2 Billion in Total Transaction Volume",
    excerpt:
      "PaySafer announces it has processed over $2 billion in cumulative transaction volume since launch, solidifying its position as the fastest-growing payment platform in the UAE.",
  },
  {
    date: "Jan 15, 2026",
    title: "PaySafer Launches Business Accounts for SMEs in the UAE",
    excerpt:
      "New multi-currency business accounts allow UAE-based companies to accept payments, issue team cards, and manage expenses from a single dashboard.",
  },
  {
    date: "Dec 3, 2025",
    title: "PaySafer Receives CBUAE License for Digital Payment Services",
    excerpt:
      "The Central Bank of the UAE has granted PaySafer a full retail payment service provider license, enabling regulated money transfers and escrow services.",
  },
  {
    date: "Oct 18, 2025",
    title: "PaySafer Raises $35M Series B to Expand Across the GCC",
    excerpt:
      "The round was led by Sequoia Capital with participation from Tiger Global and Wamda Capital, bringing total funding to $52M.",
  },
  {
    date: "Aug 5, 2025",
    title: "PaySafer Adds Crypto Buy/Sell Feature with USDT, BTC, and ETH",
    excerpt:
      "Users can now buy, sell, and hold crypto directly within the PaySafer app, with instant conversion between AED and digital assets.",
  },
]

// ─── Media coverage ───

const coverage = [
  {
    outlet: "TechCrunch",
    title: "PaySafer is building Stripe for the Middle East",
    date: "Jan 2026",
    url: "#",
  },
  {
    outlet: "Arabian Business",
    title: "Top 10 Fintech Startups in the UAE for 2026",
    date: "Dec 2025",
    url: "#",
  },
  {
    outlet: "Forbes Middle East",
    title: "How PaySafer is making cross-border payments cheaper",
    date: "Nov 2025",
    url: "#",
  },
  {
    outlet: "Gulf News",
    title: "UAE startup raises $35M to challenge traditional banks",
    date: "Oct 2025",
    url: "#",
  },
  {
    outlet: "Wired Middle East",
    title: "The escrow payment model that's winning over freelancers",
    date: "Sep 2025",
    url: "#",
  },
]

// ─── Brand assets ───

const brandAssets = [
  {
    name: "Logo Pack",
    description: "SVG, PNG (light & dark), and icon-only variants",
    format: "ZIP — 2.4 MB",
    icon: ImageIcon,
  },
  {
    name: "Brand Guidelines",
    description: "Colors, typography, spacing, and usage rules",
    format: "PDF — 8.1 MB",
    icon: FileText,
  },
  {
    name: "Product Screenshots",
    description: "High-res screenshots of the dashboard, mobile app, and key features",
    format: "ZIP — 15 MB",
    icon: ImageIcon,
  },
  {
    name: "Executive Headshots",
    description: "Professional photos of the founding team",
    format: "ZIP — 5.2 MB",
    icon: ImageIcon,
  },
]

// ─── Company facts ───

const facts = [
  { label: "Founded", value: "2024" },
  { label: "Headquarters", value: "Dubai, UAE" },
  { label: "Team size", value: "35+" },
  { label: "Countries served", value: "30+" },
  { label: "Total funding", value: "$52M" },
  { label: "Transaction volume", value: "$2B+" },
]

export default function PressPage() {
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
              Press
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

      {/* ────── Hero ────── */}
      <section className="container mx-auto px-4 pt-20 pb-16 lg:pt-32 lg:pb-24">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
            <Newspaper className="w-4 h-4" />
            Press &amp; Media
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight">
            News &amp; <span className="text-emerald-500">media kit</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Press releases, brand assets, and everything journalists and partners
            need to tell the PaySafer story.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
            <a href="#media-kit">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white text-base px-8">
                Download Media Kit
                <Download className="w-4 h-4 ml-2" />
              </Button>
            </a>
            <a href="mailto:press@paysafer.me">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5 text-base">
                <Mail className="w-4 h-4 mr-2" />
                Press Inquiries
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ────── Company Facts ────── */}
      <section className="border-y border-white/[0.06] bg-white/[0.02]">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
            {facts.map((f) => (
              <div key={f.label} className="text-center">
                <div className="text-2xl font-bold text-foreground">{f.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Press Releases ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Press releases
            </h2>
            <p className="text-lg text-muted-foreground font-light">
              Official announcements from PaySafer.
            </p>
          </div>

          <div className="space-y-4">
            {releases.map((r, i) => (
              <div
                key={r.title}
                className="group rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-colors cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${100 + i * 60}ms` }}
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {r.date}
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-emerald-400 transition-colors mb-2">
                  {r.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {r.excerpt}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Media Coverage ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              In the press
            </h2>
            <p className="text-lg text-muted-foreground font-light">
              What others are saying about PaySafer.
            </p>
          </div>

          <div className="space-y-3">
            {coverage.map((c, i) => (
              <a
                key={c.title}
                href={c.url}
                className="group flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 hover:border-white/[0.15] transition-colors animate-fade-in-up"
                style={{ animationDelay: `${100 + i * 60}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      {c.outlet}
                    </span>
                    <span className="text-xs text-muted-foreground">{c.date}</span>
                  </div>
                  <h3 className="text-sm font-medium text-foreground truncate group-hover:text-emerald-400 transition-colors">
                    {c.title}
                  </h3>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 ml-4 group-hover:text-emerald-400 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Media Kit / Brand Assets ────── */}
      <section id="media-kit" className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Brand &amp; media assets
            </h2>
            <p className="text-lg text-muted-foreground font-light">
              Download logos, screenshots, brand guidelines, and executive headshots.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {brandAssets.map((asset, i) => {
              const Icon = asset.icon
              return (
                <div
                  key={asset.name}
                  className="group rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-colors cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${100 + i * 60}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                        {asset.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{asset.description}</p>
                      <p className="text-xs text-muted-foreground mt-2 font-mono">{asset.format}</p>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ────── Boilerplate ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 md:p-12">
            <Quote className="w-8 h-8 text-emerald-500 mb-6" />
            <h3 className="text-lg font-semibold text-foreground mb-4">About PaySafer</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              PaySafer is a UAE-based fintech company making digital payments safer, faster,
              and more transparent for individuals and businesses across the Middle East.
              Founded in 2024, PaySafer offers a full-stack financial platform including
              escrow payments, multi-currency wallets, business accounts, and developer APIs.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Licensed by the Central Bank of the UAE (CBUAE), PaySafer serves over 200,000
              users across 30+ countries, with a focus on trust and security in peer-to-peer
              and business-to-business transactions.
            </p>
            <p className="text-sm text-muted-foreground">
              Media contact: <span className="text-emerald-400 font-mono">press@paysafer.me</span>
            </p>
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
                Press &amp; media resources.
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
