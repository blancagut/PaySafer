"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Mail,
  MapPin,
  Phone,
  Building2,
  Users,
  Newspaper,
  HelpCircle,
  Send,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

// ─── Contact reasons ───

const reasons = [
  {
    icon: Building2,
    title: "Partnerships & Business Development",
    description: "Interested in integrating PaySafer or exploring a partnership? Let's talk.",
    email: "partnerships@paysafer.me",
  },
  {
    icon: Users,
    title: "Investor Relations",
    description: "For investor inquiries, funding updates, and financial information.",
    email: "investors@paysafer.me",
  },
  {
    icon: Newspaper,
    title: "Press & Media",
    description: "Journalist or content creator? Get press releases, brand assets, and interviews.",
    email: "press@paysafer.me",
  },
  {
    icon: HelpCircle,
    title: "Customer Support",
    description: "Need help with your account? Our support team is available 24/7.",
    email: "support@paysafer.me",
  },
]

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

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
              Contact
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
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight">
            Get in <span className="text-emerald-500">touch</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Whether you&apos;re interested in a partnership, have a press inquiry,
            or want to invest — we&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* ────── Contact Reasons ────── */}
      <section className="container mx-auto px-4 pb-20 lg:pb-28">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-4">
          {reasons.map((r, i) => {
            const Icon = r.icon
            return (
              <a
                key={r.title}
                href={`mailto:${r.email}`}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-colors animate-fade-in-up"
                style={{ animationDelay: `${100 + i * 60}ms` }}
              >
                <Icon className="w-8 h-8 text-emerald-400 mb-4" />
                <h3 className="font-semibold text-foreground group-hover:text-emerald-400 transition-colors mb-2">
                  {r.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{r.description}</p>
                <span className="text-sm text-emerald-400 font-mono">{r.email}</span>
              </a>
            )
          })}
        </div>
      </section>

      {/* ────── Contact Form + Info ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-12">
          {/* Form */}
          <div className="lg:col-span-3">
            <h2 className="text-2xl font-bold tracking-tight mb-2 animate-fade-in">Send us a message</h2>
            <p className="text-muted-foreground mb-8 animate-fade-in">We respond within 24 hours on business days.</p>

            {submitted ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-12 text-center animate-fade-in">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Message sent!</h3>
                <p className="text-muted-foreground">
                  Thank you for reaching out. We&apos;ll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setSubmitted(true)
                }}
                className="space-y-5 animate-fade-in-up"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">First name</label>
                    <input
                      type="text"
                      required
                      className="w-full h-12 px-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 text-sm"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Last name</label>
                    <input
                      type="text"
                      required
                      className="w-full h-12 px-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 text-sm"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full h-12 px-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 text-sm"
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
                  <select className="w-full h-12 px-4 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 text-sm appearance-none">
                    <option value="" className="bg-[#0F1B2D]">Select a topic...</option>
                    <option value="partnership" className="bg-[#0F1B2D]">Partnership</option>
                    <option value="investor" className="bg-[#0F1B2D]">Investor Relations</option>
                    <option value="press" className="bg-[#0F1B2D]">Press / Media</option>
                    <option value="enterprise" className="bg-[#0F1B2D]">Enterprise Sales</option>
                    <option value="other" className="bg-[#0F1B2D]">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Message</label>
                  <textarea
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 text-sm resize-none"
                    placeholder="How can we help?"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto px-8"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </form>
            )}
          </div>

          {/* Info sidebar */}
          <div className="lg:col-span-2 space-y-8 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div>
              <h3 className="font-semibold text-foreground mb-4">Office</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p>PaySafer Technologies Inc.</p>
                    <p>DIFC Innovation Hub, Level 3</p>
                    <p>Dubai International Financial Centre</p>
                    <p>Dubai, United Arab Emirates</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-mono text-emerald-400">hello@paysafer.me</span>
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>+971 4 XXX XXXX</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
              <h3 className="font-semibold text-foreground mb-3">Response times</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center justify-between">
                  <span>General inquiries</span>
                  <span className="text-foreground font-medium">24 hrs</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Press inquiries</span>
                  <span className="text-foreground font-medium">12 hrs</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Partnerships</span>
                  <span className="text-foreground font-medium">48 hrs</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Customer support</span>
                  <span className="text-emerald-400 font-medium">&lt; 2 hrs</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-6">
              <h3 className="font-semibold text-foreground mb-2">Need immediate help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you have an urgent account issue, our support team is available 24/7 through the app.
              </p>
              <Link href="/help">
                <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                  Go to Help Center
                </Button>
              </Link>
            </div>
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
                We&apos;d love to hear from you.
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
