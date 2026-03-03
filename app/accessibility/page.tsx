"use client"

import Link from "next/link"
import {
  Accessibility,
  Eye,
  Keyboard,
  Monitor,
  MessageSquare,
  Volume2,
  MousePointer2,
  CheckCircle,
  Mail,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

// ─── Accessibility features ───

const features = [
  {
    icon: Keyboard,
    title: "Full Keyboard Navigation",
    description:
      "Every feature in PaySafer can be accessed without a mouse. Tab through controls, use arrow keys in menus, and press Enter or Space to activate buttons. Skip-to-content links are available on every page.",
  },
  {
    icon: Eye,
    title: "Screen Reader Compatible",
    description:
      "We use semantic HTML, ARIA labels, and live regions so screen readers like VoiceOver, NVDA, and JAWS can accurately convey the interface. Form fields, alerts, and dynamic content are all properly announced.",
  },
  {
    icon: Monitor,
    title: "Responsive & Zoomable",
    description:
      "The interface works at up to 200% zoom without loss of functionality. All layouts are responsive and fully usable on mobile, tablet, and desktop devices of any size.",
  },
  {
    icon: Volume2,
    title: "Motion & Sound Controls",
    description:
      "We respect the prefers-reduced-motion system setting. All animations can be disabled. Sound effects are optional and controlled through settings — they never auto-play without consent.",
  },
  {
    icon: MousePointer2,
    title: "Touch Target Sizing",
    description:
      "Interactive elements meet WCAG 2.2 Level AA minimum target size requirements (24x24 CSS pixels). Buttons, links, and interactive controls are sized for comfortable tapping on touch devices.",
  },
  {
    icon: MessageSquare,
    title: "Plain Language",
    description:
      "Financial jargon is kept to a minimum. Where technical terms are necessary, we provide contextual help text. Error messages explain what went wrong and how to fix it in clear, human language.",
  },
]

// ─── Standards ───

const standards = [
  {
    name: "WCAG 2.2 Level AA",
    description: "We aim to meet or exceed the Web Content Accessibility Guidelines (WCAG) 2.2 at the AA conformance level across all pages.",
  },
  {
    name: "Section 508",
    description: "PaySafer is designed to comply with Section 508 of the Rehabilitation Act, applicable to entities operating in or serving the United States.",
  },
  {
    name: "EN 301 549",
    description: "We follow the European standard for digital accessibility, ensuring compliance for users in the EU and EEA.",
  },
  {
    name: "ADA Title III",
    description: "As a digital service, we follow best practices aligned with the Americans with Disabilities Act (ADA) for places of public accommodation.",
  },
]

export default function AccessibilityPage() {
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
              Accessibility
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
            <Accessibility className="w-4 h-4" />
            Accessibility
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight">
            Financial tools
            <br />
            <span className="text-emerald-500">for everyone</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            PaySafer is committed to making our products usable by the widest
            possible audience, regardless of ability. Access to financial tools
            is not a privilege — it&apos;s a right.
          </p>
        </div>
      </section>

      {/* ────── Our Commitment ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto animate-fade-in">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-8 text-center">
            Our commitment
          </h2>
          <div className="space-y-6 text-muted-foreground leading-relaxed">
            <p>
              We believe everyone deserves equal access to modern financial services.
              Accessibility is not an afterthought at PaySafer — it&apos;s embedded
              in our design process, engineering standards, and quality assurance pipeline.
            </p>
            <p>
              Our product and engineering teams work continuously to improve the accessibility
              of our web and mobile applications. We conduct regular audits with both
              automated tools and manual testing (including with assistive technologies)
              to identify and address barriers.
            </p>
            <p>
              We are actively working toward meeting <strong className="text-foreground">WCAG 2.2 Level AA</strong> standards
              across all customer-facing pages and features. Where we fall short, we document
              known issues and include them in our engineering roadmap with clear timelines.
            </p>
          </div>
        </div>
      </section>

      {/* ────── Accessibility Features ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              What we&apos;ve built
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
              Concrete accessibility features implemented across PaySafer.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 animate-fade-in-up"
                  style={{ animationDelay: `${150 + i * 80}ms` }}
                >
                  <Icon className="w-8 h-8 text-emerald-400 mb-5" />
                  <h3 className="text-lg font-semibold text-foreground mb-3">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ────── Standards ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Standards we follow
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {standards.map((s, i) => (
              <div
                key={s.name}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 animate-fade-in-up"
                style={{ animationDelay: `${100 + i * 60}ms` }}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{s.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Known Limitations ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto animate-fade-in">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-8 text-center">
            Known limitations
          </h2>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-8 space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              While we strive for full compliance, we are aware of the following areas
              where improvements are underway:
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Some older chart visualizations in the analytics dashboard may not be fully accessible to screen readers. We are migrating to an accessible charting library (target: Q2 2026).</li>
              <li>PDF-generated invoices and receipts may not meet all PDF/UA accessibility standards. We are implementing tagged PDF output (target: Q3 2026).</li>
              <li>Third-party embeds (e.g., support chat widget) may have accessibility gaps outside our direct control. We work with vendors to advocate for improvements.</li>
            </ul>
            <p>
              We update this section as issues are identified and resolved.
              Last updated: <strong className="text-foreground">March 1, 2026</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* ────── Feedback ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in">
          <Mail className="w-10 h-10 text-emerald-500 mx-auto" />
          <h2 className="text-3xl font-bold tracking-tight">
            Report an accessibility issue
          </h2>
          <p className="text-muted-foreground font-light leading-relaxed max-w-xl mx-auto">
            If you encounter any barriers while using PaySafer, we want to know.
            Describe what happened, the assistive technology you were using, and the
            page or feature affected. We aim to respond within 5 business days.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
            <a href="mailto:accessibility@paysafer.me">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white text-base px-8">
                <Mail className="w-4 h-4 mr-2" />
                accessibility@paysafer.me
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            You can also reach us by mail: PaySafer Technologies Inc., DIFC Innovation Hub, Level 3, Dubai, UAE.
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
                Financial tools for everyone.
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
