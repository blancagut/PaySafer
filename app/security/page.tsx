"use client"

import Link from "next/link"
import {
  Shield,
  Lock,
  Eye,
  Server,
  Fingerprint,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  ScanFace,
  Database,
  Globe,
  FileCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

// ─── Security layers ───

const layers = [
  {
    icon: Lock,
    title: "256-bit AES Encryption",
    description:
      "All data at rest is encrypted using AES-256, the same standard used by governments and military organizations worldwide. Data in transit is protected with TLS 1.3.",
    color: "emerald",
  },
  {
    icon: Fingerprint,
    title: "Biometric Authentication",
    description:
      "Face ID, Touch ID, and fingerprint authentication add a physical layer of security that can't be phished or stolen. Every sensitive action requires biometric confirmation.",
    color: "blue",
  },
  {
    icon: ShieldCheck,
    title: "PCI DSS Level 1",
    description:
      "We maintain the highest level of PCI compliance — Level 1 — meaning we undergo annual on-site audits by a Qualified Security Assessor and quarterly network scans.",
    color: "purple",
  },
  {
    icon: ScanFace,
    title: "AI Fraud Detection",
    description:
      "Our machine learning models analyze every transaction in real time, scoring risk across 150+ signals — device fingerprint, location, velocity, behavioral patterns, and more.",
    color: "amber",
  },
  {
    icon: Server,
    title: "SOC 2 Type II Certified",
    description:
      "Our infrastructure, processes, and controls are independently audited against the SOC 2 trust criteria for security, availability, processing integrity, and confidentiality.",
    color: "cyan",
  },
  {
    icon: KeyRound,
    title: "Zero-Knowledge Architecture",
    description:
      "Sensitive credentials are never stored in plain text. We use hardware security modules (HSMs) and tokenization so your card numbers never touch our servers.",
    color: "rose",
  },
]

// ─── Protection features ───

const protections = [
  {
    icon: AlertTriangle,
    title: "Real-Time Fraud Alerts",
    description: "Instant push notifications for suspicious activity. Freeze your account with one tap from anywhere in the world.",
  },
  {
    icon: Database,
    title: "Redundant Infrastructure",
    description: "Multi-region deployment across geographically distributed data centers with automatic failover. 99.99% uptime SLA.",
  },
  {
    icon: Globe,
    title: "DDoS Protection",
    description: "Enterprise-grade DDoS mitigation powered by Cloudflare, absorbing attacks of up to 100+ Tbps without affecting your service.",
  },
  {
    icon: Eye,
    title: "24/7 Security Operations",
    description: "Our Security Operations Center monitors threats around the clock. Security incidents are triaged and responded to within minutes.",
  },
  {
    icon: FileCheck,
    title: "Regular Penetration Testing",
    description: "We engage third-party security firms to perform penetration tests quarterly, with results reviewed and remediated within 72 hours.",
  },
  {
    icon: Shield,
    title: "Deposit Protection",
    description: "Funds held in PaySafer are safeguarded in segregated accounts at licensed banks, separate from our operating capital, in compliance with CBUAE regulations.",
  },
]

// ─── Compliance badges ───

const certifications = [
  { name: "PCI DSS Level 1", detail: "Payment Card Industry" },
  { name: "SOC 2 Type II", detail: "Service Organization Controls" },
  { name: "ISO 27001", detail: "Information Security Management" },
  { name: "CBUAE Licensed", detail: "Central Bank of the UAE" },
  { name: "GDPR Compliant", detail: "EU Data Protection" },
  { name: "AML/KYC", detail: "Anti-Money Laundering" },
]

export default function SecurityPage() {
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
              Security
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
            <Shield className="w-4 h-4" />
            Bank-Grade Security
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight">
            How we protect
            <br />
            <span className="text-emerald-500">your money</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Your security isn&apos;t a feature — it&apos;s the foundation everything
            else is built on. Multiple layers of protection work together so you
            never have to worry.
          </p>
        </div>
      </section>

      {/* ────── Security Layers ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Six layers of defense
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
              Every transaction passes through multiple independent security systems before it&apos;s approved.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {layers.map((layer, i) => {
              const colorMap: Record<string, string> = {
                emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
                amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
                rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
              }
              const colors = colorMap[layer.color] ?? colorMap.emerald
              const Icon = layer.icon
              return (
                <div
                  key={layer.title}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 animate-fade-in-up"
                  style={{ animationDelay: `${150 + i * 80}ms` }}
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border ${colors} mb-5`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">{layer.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{layer.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ────── How We Protect You ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Always-on protection
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
              From infrastructure to incident response, every layer is designed to keep your accounts and data safe.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {protections.map((p, i) => {
              const Icon = p.icon
              return (
                <div
                  key={p.title}
                  className="flex items-start gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 animate-fade-in-up"
                  style={{ animationDelay: `${150 + i * 80}ms` }}
                >
                  <div className="shrink-0 mt-1">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-1">{p.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ────── Certifications ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Certifications & compliance
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
              We don&apos;t just claim to be secure — we prove it through independent audits and globally recognized certifications.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {certifications.map((cert, i) => (
              <div
                key={cert.name}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 text-center animate-fade-in-up"
                style={{ animationDelay: `${150 + i * 60}ms` }}
              >
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-foreground">{cert.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{cert.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Responsible Disclosure ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
            Found a vulnerability?
          </h2>
          <p className="text-lg text-muted-foreground font-light leading-relaxed">
            We run a bug bounty program and take responsible disclosure seriously.
            If you&apos;ve found a security issue, we want to hear from you — and we&apos;ll reward you for it.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
            <Link href="mailto:security@paysafer.me">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white text-base px-8">
                Report a Vulnerability
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Email <span className="text-emerald-400 font-mono">security@paysafer.me</span> — we respond within 24 hours.
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
                Security-first financial platform.
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
