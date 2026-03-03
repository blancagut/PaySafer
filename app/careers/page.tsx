"use client"

import Link from "next/link"
import {
  ArrowRight,
  MapPin,
  Briefcase,
  Heart,
  Coffee,
  Globe,
  Rocket,
  Users,
  GraduationCap,
  Plane,
  Laptop,
  Shield,
  Banknote,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"

// ─── Values ───

const values = [
  {
    icon: Shield,
    title: "Security First",
    description: "We handle people's money. Every decision starts with 'is this safe?' before 'is this fast?'",
  },
  {
    icon: Users,
    title: "Build for Everyone",
    description: "Our users live in 30+ countries, speak different languages, and have different needs. We design for all of them.",
  },
  {
    icon: Rocket,
    title: "Move Fast, Don't Break Money",
    description: "We ship fast but never recklessly. Payments demand precision — we've found the balance.",
  },
  {
    icon: Heart,
    title: "Radical Transparency",
    description: "No hidden fees for users, no hidden agendas internally. We share context widely and trust people to make good decisions.",
  },
]

// ─── Benefits ───

const benefits = [
  { icon: Banknote, text: "Competitive salary + equity" },
  { icon: Laptop, text: "Remote-first — work from anywhere" },
  { icon: Plane, text: "Unlimited PTO (really)" },
  { icon: GraduationCap, text: "$3,000/yr learning budget" },
  { icon: Coffee, text: "Home office stipend" },
  { icon: Heart, text: "Health, dental & vision insurance" },
  { icon: Globe, text: "Annual team retreat" },
  { icon: Shield, text: "Parental leave (16 weeks)" },
]

// ─── Open positions ───

const departments = [
  {
    name: "Engineering",
    positions: [
      { title: "Senior Backend Engineer", location: "Remote / Dubai", type: "Full-time" },
      { title: "Mobile Engineer (React Native)", location: "Remote", type: "Full-time" },
      { title: "Staff Security Engineer", location: "Dubai", type: "Full-time" },
      { title: "DevOps / Platform Engineer", location: "Remote", type: "Full-time" },
    ],
  },
  {
    name: "Product & Design",
    positions: [
      { title: "Senior Product Designer", location: "Remote / Dubai", type: "Full-time" },
      { title: "Product Manager — Payments", location: "Dubai", type: "Full-time" },
    ],
  },
  {
    name: "Compliance & Risk",
    positions: [
      { title: "AML/KYC Compliance Officer", location: "Dubai", type: "Full-time" },
      { title: "Fraud Analyst", location: "Dubai", type: "Full-time" },
    ],
  },
  {
    name: "Operations & Growth",
    positions: [
      { title: "Head of Business Development — UAE", location: "Dubai", type: "Full-time" },
      { title: "Customer Success Lead", location: "Remote / Dubai", type: "Full-time" },
      { title: "Content Marketing Manager", location: "Remote", type: "Full-time" },
    ],
  },
]

export default function CareersPage() {
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
              Careers
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
            <Briefcase className="w-4 h-4" />
            We&apos;re Hiring
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight">
            Build the future of
            <br />
            <span className="text-emerald-500">money in the UAE</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            PaySafer is redefining how people and businesses move money across the
            Middle East. Join a team of builders, designers, and operators who
            care deeply about getting it right.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
            <a href="#openings">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white text-base px-8">
                View Open Positions
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>

          <div className="flex items-center justify-center gap-6 sm:gap-8 pt-4 text-sm text-muted-foreground flex-wrap">
            {["35+ team members", "12 countries", "Remote-first"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Values ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              What drives us
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
              Four principles that guide every decision we make — from product features to hiring.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {values.map((val, i) => {
              const Icon = val.icon
              return (
                <div
                  key={val.title}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 animate-fade-in-up"
                  style={{ animationDelay: `${150 + i * 80}ms` }}
                >
                  <Icon className="w-8 h-8 text-emerald-400 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">{val.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{val.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ────── Benefits ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Benefits & perks
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
              We take care of the details so you can focus on building.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {benefits.map((b, i) => {
              const Icon = b.icon
              return (
                <div
                  key={b.text}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 text-center animate-fade-in-up"
                  style={{ animationDelay: `${100 + i * 60}ms` }}
                >
                  <Icon className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground leading-snug">{b.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ────── Open Positions ────── */}
      <section id="openings" className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Open positions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">
              Don&apos;t see your role? Email us at <span className="text-emerald-400 font-mono text-base">careers@paysafer.me</span> — we&apos;re always looking for exceptional people.
            </p>
          </div>

          <div className="space-y-10">
            {departments.map((dept) => (
              <div key={dept.name}>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {dept.name}
                </h3>

                <div className="space-y-3">
                  {dept.positions.map((pos) => (
                    <div
                      key={pos.title}
                      className="group flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-colors cursor-pointer"
                    >
                      <div>
                        <h4 className="font-medium text-foreground group-hover:text-emerald-400 transition-colors">
                          {pos.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {pos.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5" />
                            {pos.type}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── CTA ────── */}
      <section className="container mx-auto px-4 py-20 lg:py-28 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
            Ready to make an impact?
          </h2>
          <p className="text-lg text-muted-foreground font-light">
            We&apos;re building something meaningful. If you want to work on
            problems that affect real people&apos;s finances — come build with us.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="mailto:careers@paysafer.me">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white text-base px-8">
                Send Your Resume
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
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
                Join the team building the future of payments.
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
