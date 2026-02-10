"use client"

import React, { useState, useMemo, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Check, Shield, ArrowRight, Lock, Zap, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Logo } from "@/components/logo"

/* ─── Password Strength ─── */

function getPasswordStrength(pw: string) {
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score // 0-5
}

const strengthLabels = ["", "Weak", "Fair", "Good", "Strong", "Excellent"]
const strengthColors = ["", "bg-red-500", "bg-amber-500", "bg-amber-400", "bg-emerald-400", "bg-emerald-500"]

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  )
}

function RegisterPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const strength = useMemo(() => getPasswordStrength(formData.password), [formData.password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.name } },
      })
      if (error) { toast.error(error.message); return }
      toast.success("Account created! Check your email to verify.")
      router.push(redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login")
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { label: "Buyer pays into secure escrow", icon: Lock },
    { label: "Seller delivers the goods or service", icon: Zap },
    { label: "Buyer confirms satisfaction", icon: Check },
    { label: "Funds released to seller", icon: ArrowRight },
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
                  How escrow protects
                  <br />
                  your transaction
                </h1>
                <p className="text-white/50 text-[15px] leading-relaxed max-w-md">
                  A simple, secure process that builds trust between strangers — anywhere in the world.
                </p>
              </div>

              <div className="space-y-5">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all duration-300">
                      <span className="text-[13px] font-bold tabular-nums">{i + 1}</span>
                    </div>
                    <span className="text-[14px] text-white/70 font-medium">{step.label}</span>
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
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-[420px]">
            {/* Mobile logo */}
            <div className="lg:hidden mb-8">
              <Logo size="md" />
            </div>

            <div className="space-y-2 mb-8">
              <h2 className="text-[26px] font-bold tracking-tight text-foreground">
                Create your account
              </h2>
              <p className="text-[14px] text-muted-foreground">
                Start making secure transactions today
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[13px] font-medium text-foreground">
                  Full name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-12 bg-white/[0.03] border-white/[0.08] focus:border-white/[0.18] rounded-xl text-[14px] placeholder:text-muted-foreground/40 transition-colors"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px] font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-12 bg-white/[0.03] border-white/[0.08] focus:border-white/[0.18] rounded-xl text-[14px] placeholder:text-muted-foreground/40 transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] font-medium text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                {/* Password strength meter */}
                {formData.password.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= strength ? strengthColors[strength] : "bg-white/[0.06]"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {strengthLabels[strength]}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-foreground">
                  Confirm password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="h-12 pr-11 bg-white/[0.03] border-white/[0.08] focus:border-white/[0.18] rounded-xl text-[14px] placeholder:text-muted-foreground/40 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
                {formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword && (
                  <p className="text-[11px] text-red-400">Passwords do not match</p>
                )}
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
                    Creating account...
                  </span>
                ) : (
                  "Create account"
                )}
              </Button>

              <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
                  Privacy Policy
                </Link>
              </p>
            </form>

            <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
              <p className="text-[13px] text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-foreground font-semibold hover:text-primary transition-colors">
                  Sign in
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
