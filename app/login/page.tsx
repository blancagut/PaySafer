"use client"

import React, { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, ShieldAlert, Shield, Lock, Globe, Zap, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Logo } from "@/components/logo"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isBanned = searchParams.get("banned") === "1"
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { toast.error(error.message); return }
      toast.success("Logged in successfully!")
      router.push("/dashboard")
      router.refresh()
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: Shield, label: "Escrow protection on every deal" },
    { icon: Lock,   label: "Funds held until both parties agree" },
    { icon: Globe,  label: "Works across borders, any currency" },
    { icon: Zap,    label: "Instant payouts once confirmed" },
  ]

  return (
    <div className="min-h-screen bg-[hsl(222,47%,5%)] flex flex-col">
      {/* ─── Mobile Header ─── */}
      <header className="lg:hidden border-b border-white/[0.06] bg-[#0A1628]">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <Logo size="sm" linkTo="/" />
        </div>
      </header>

      <div className="flex-1 flex">
        {/* ─── Left Panel ─── */}
        <div className="hidden lg:flex lg:w-[45%] bg-[#0A1628] relative overflow-hidden">
          {/* Gradient blobs */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px]" />

          <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
            <Logo size="lg" />

            <div className="space-y-10">
              <div className="space-y-4">
                <h1 className="text-[2.5rem] font-bold tracking-tight text-white leading-[1.15]">
                  Safe transactions
                  <br />
                  between strangers
                </h1>
                <p className="text-white/50 text-[15px] leading-relaxed max-w-md">
                  Our escrow system protects both buyers and sellers.
                  Money is only released when both parties are satisfied.
                </p>
              </div>

              <div className="space-y-4">
                {features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-300">
                      <feat.icon className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors duration-300" />
                    </div>
                    <span className="text-[14px] text-white/70 font-medium">{feat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[12px] text-white/30">Powered by</span>
              <span className="text-[12px] font-semibold text-white/50">Stripe</span>
            </div>
          </div>
        </div>

        {/* ─── Right Panel — Form ─── */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 relative">
          {/* Banned Banner */}
          {isBanned && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-50 px-4">
              <div className="p-4 rounded-xl bg-red-950/80 border border-red-500/20 backdrop-blur-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-semibold text-red-300">Account Suspended</p>
                  <p className="text-[11px] text-red-400/70 mt-1 leading-relaxed">
                    Your account has been suspended by the platform administrator.
                    If you believe this is an error, contact support.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="w-full max-w-[420px]">
            {/* Mobile logo */}
            <div className="lg:hidden mb-8">
              <Logo size="md" />
            </div>

            <div className="space-y-2 mb-8">
              <h2 className="text-[26px] font-bold tracking-tight text-foreground">
                Welcome back
              </h2>
              <p className="text-[14px] text-muted-foreground">
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px] font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-white/[0.03] border-white/[0.08] focus:border-white/[0.18] rounded-xl text-[14px] placeholder:text-muted-foreground/40 transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[13px] font-medium text-foreground">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-[12px] text-muted-foreground/70 hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 pr-11 bg-white/[0.03] border-white/[0.08] focus:border-white/[0.18] rounded-xl text-[14px] placeholder:text-muted-foreground/40 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-[14px] font-semibold rounded-xl transition-all"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
              <p className="text-[13px] text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-foreground font-semibold hover:text-primary transition-colors">
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.06] bg-[#0A1628] py-5">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-[11px] text-white/30">© 2026 PaySafer.me — All rights reserved</p>
        </div>
      </footer>
    </div>
  )
}
