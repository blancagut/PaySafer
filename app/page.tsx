"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, Users, CheckCircle, ArrowRight, Zap, Globe, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Logo } from "@/components/logo"

const slides = [
  { src: "/slides/slide-1.jpg", alt: "PaySafer — Secure escrow transactions" },
  { src: "/slides/slide-2.jpg", alt: "PaySafer — Track your payments" },
  { src: "/slides/slide-3.jpg", alt: "PaySafer — Full transaction dashboard" },
]

export default function LandingPage() {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [])
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [])

  useEffect(() => {
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [next])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
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

      {/* Section 1 — Image Slider */}
      <section className="relative w-full overflow-hidden bg-[#0A0F1A]">
        <div className="relative w-full" style={{ aspectRatio: "12/5" }}>
          {slides.map((slide, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{ opacity: i === current ? 1 : 0 }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                className="object-cover"
                priority={i === 0}
              />
            </div>
          ))}

          {/* Arrows */}
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur flex items-center justify-center text-white transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur flex items-center justify-center text-white transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === current ? "bg-emerald-400" : "bg-white/30 hover:bg-white/50"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section 2 — Hero */}
      <section className="container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
            <Zap className="w-4 h-4" />
            Secure Escrow Platform
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
            Pay <span className="text-emerald-500">Safer</span>
            <br />
            <span className="text-muted-foreground">Transact with Confidence</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The trusted escrow platform for secure transactions between buyers and sellers worldwide. 
            Your funds are protected until both parties are satisfied.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/register">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                Create Free Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Bank-level security
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              24/7 support
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Global coverage
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 border-t border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold">Why Choose PaySafer?</h2>
            <p className="text-xl text-muted-foreground">
              Built for buyers and sellers who value security and trust
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-border/50 hover:border-emerald-500/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <CardTitle>Secure Escrow</CardTitle>
                <CardDescription>
                  Your funds are held safely in escrow until both parties confirm satisfaction
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 hover:border-emerald-500/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-emerald-500" />
                </div>
                <CardTitle>Buyer Protection</CardTitle>
                <CardDescription>
                  Never worry about scams. Funds only release when you approve the delivery
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 hover:border-emerald-500/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-emerald-500" />
                </div>
                <CardTitle>Seller Confidence</CardTitle>
                <CardDescription>
                  Get paid quickly once delivery is confirmed. No chargebacks or payment disputes
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 hover:border-emerald-500/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-emerald-500" />
                </div>
                <CardTitle>Global Transactions</CardTitle>
                <CardDescription>
                  Buy and sell internationally with confidence. Multi-currency support
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 hover:border-emerald-500/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <CardTitle>Dispute Resolution</CardTitle>
                <CardDescription>
                  Fair mediation process if issues arise. Dedicated support team to help resolve
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 hover:border-emerald-500/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-emerald-500" />
                </div>
                <CardTitle>Instant Setup</CardTitle>
                <CardDescription>
                  Create your account in seconds and start your first transaction immediately
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 border-t border-border/40">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold">
            Ready to Transact Safely?
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of buyers and sellers who trust PaySafer for secure transactions
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white">
              Create Your Free Account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0F1B2D] mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="mb-4">
                <Logo size="sm" />
              </div>
              <p className="text-sm text-white/60">
                Secure escrow platform for global transactions
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Product</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/register" className="hover:text-emerald-500">Get Started</Link></li>
                <li><Link href="/services" className="hover:text-emerald-500">Services</Link></li>
                <li><Link href="/trust" className="hover:text-emerald-500">Trust & Safety</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Support</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/help" className="hover:text-emerald-500">Help Center</Link></li>
                <li><Link href="/dashboard" className="hover:text-emerald-500">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Legal</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link href="/privacy" className="hover:text-emerald-500">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-emerald-500">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-white/50">
            © 2026 PaySafer.me - All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
