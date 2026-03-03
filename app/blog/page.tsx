"use client"

import Link from "next/link"
import {
  ArrowRight,
  Clock,
  TrendingUp,
  Shield,
  BookOpen,
  Tag,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

// ─── Blog posts ───

const featuredPost = {
  slug: "escrow-payments-explained",
  category: "Education",
  title: "Escrow Payments Explained: How They Protect Both Buyers and Sellers",
  excerpt:
    "Escrow isn't just for real estate. Learn how modern escrow payments work in peer-to-peer transactions, freelancing, and international trade — and why they're the safest way to transact with strangers.",
  date: "Feb 28, 2026",
  readTime: "8 min read",
  image: null,
}

const posts = [
  {
    slug: "uae-fintech-regulations-2026",
    category: "Regulation",
    title: "UAE Fintech Regulations in 2026: What You Need to Know",
    excerpt:
      "The CBUAE has introduced new licensing frameworks for digital payment providers. Here's what changed and how PaySafer stays compliant.",
    date: "Feb 22, 2026",
    readTime: "6 min read",
  },
  {
    slug: "protect-yourself-from-payment-scams",
    category: "Security",
    title: "5 Ways to Protect Yourself from Payment Scams in the UAE",
    excerpt:
      "From fake invoices to phishing links — these are the most common scams targeting UAE residents and how to avoid them.",
    date: "Feb 15, 2026",
    readTime: "5 min read",
  },
  {
    slug: "send-money-internationally",
    category: "Guides",
    title: "The Cheapest Way to Send Money Internationally from the UAE",
    excerpt:
      "We compared fees across 8 services — banks, remittance apps, and crypto — to find the cheapest corridor from AED to USD, EUR, PHP, and INR.",
    date: "Feb 8, 2026",
    readTime: "7 min read",
  },
  {
    slug: "crypto-wallets-beginners",
    category: "Crypto",
    title: "Crypto Wallets for Beginners: Custodial vs Non-Custodial",
    excerpt:
      "Should you let PaySafer hold your keys or manage them yourself? A plain-English guide to the tradeoffs of custodial and self-custody wallets.",
    date: "Feb 1, 2026",
    readTime: "6 min read",
  },
  {
    slug: "building-credit-score-uae",
    category: "Finance",
    title: "How to Build Your Credit Score in the UAE (Even as an Expat)",
    excerpt:
      "The Al Etihad Credit Bureau tracks your financial behavior. Learn the strategies that actually move your score — and the myths that don't.",
    date: "Jan 25, 2026",
    readTime: "5 min read",
  },
  {
    slug: "paysafer-api-integration",
    category: "Engineering",
    title: "Integrating PaySafer Payments into Your Next.js App",
    excerpt:
      "A step-by-step technical walkthrough for accepting payments with the PaySafer API — from API keys to webhooks to production go-live.",
    date: "Jan 18, 2026",
    readTime: "10 min read",
  },
]

const categories = [
  "All",
  "Education",
  "Security",
  "Regulation",
  "Guides",
  "Finance",
  "Crypto",
  "Engineering",
]

// ─── Category colors ───

const categoryColor: Record<string, string> = {
  Education: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Regulation: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Security: "bg-red-500/10 text-red-400 border-red-500/20",
  Guides: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Crypto: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Finance: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Engineering: "bg-orange-500/10 text-orange-400 border-orange-500/20",
}

export default function BlogPage() {
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
              Blog
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
      <section className="container mx-auto px-4 pt-20 pb-8 lg:pt-28 lg:pb-12">
        <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            The PaySafer <span className="text-emerald-500">Blog</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Insights on fintech, security, payments, and building with confidence in the UAE and beyond.
          </p>
        </div>
      </section>

      {/* ────── Categories ────── */}
      <section className="container mx-auto px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`shrink-0 px-4 py-2 text-sm rounded-full border transition-colors ${
                  cat === "All"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-white/[0.03] text-white/60 border-white/[0.08] hover:border-white/20 hover:text-white/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Featured Post ────── */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8 md:p-12 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs font-medium px-3 py-1 rounded-full border ${categoryColor[featuredPost.category] ?? "bg-white/5 text-white/60 border-white/10"}`}>
                {featuredPost.category}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Featured
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-4">
              {featuredPost.title}
            </h2>

            <p className="text-muted-foreground leading-relaxed mb-6 max-w-3xl">
              {featuredPost.excerpt}
            </p>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{featuredPost.date}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {featuredPost.readTime}
                </span>
              </div>

              <Button variant="ghost" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-2">
                Read Article <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ────── Posts Grid ────── */}
      <section className="container mx-auto px-4 pb-20 lg:pb-28 border-t border-white/[0.06] pt-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight mb-10 animate-fade-in">Latest Articles</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, i) => (
              <article
                key={post.slug}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden hover:border-white/[0.15] transition-colors animate-fade-in-up"
                style={{ animationDelay: `${100 + i * 80}ms` }}
              >
                {/* Color top bar */}
                <div className="h-1 bg-gradient-to-r from-emerald-500/80 to-emerald-500/20" />

                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${categoryColor[post.category] ?? "bg-white/5 text-white/60 border-white/10"}`}>
                      {post.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground leading-snug group-hover:text-emerald-400 transition-colors">
                    {post.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                    <span>{post.date}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Newsletter CTA ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto text-center space-y-6 animate-fade-in">
          <BookOpen className="w-10 h-10 text-emerald-500 mx-auto" />
          <h2 className="text-3xl font-bold tracking-tight">
            Stay informed
          </h2>
          <p className="text-muted-foreground font-light">
            Get our latest articles on fintech, security, and financial education
            delivered to your inbox. No spam — just insights that matter.
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
          <p className="text-xs text-muted-foreground">
            Unsubscribe anytime. Read our <Link href="/privacy" className="text-emerald-400 hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </section>

      {/* ────── Footer ────── */}
      <footer className="border-t border-white/10 bg-[#0F1B2D]">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="mb-4"><Logo size="sm" /></div>
              <p className="text-sm text-white/60">
                Insights on fintech, security, and payments.
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
