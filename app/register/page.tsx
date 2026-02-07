"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Logo } from "@/components/logo"

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  })

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
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
          }
        }
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success("Account created! Please check your email to verify.")
      router.push("/login")
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const escrowBenefits = [
    "Buyer pays into secure escrow",
    "Seller delivers the goods or service",
    "Buyer confirms receipt",
    "Funds released to seller"
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Dark blue header (visible on mobile where left panel is hidden) */}
      <header className="lg:hidden border-b border-white/10 bg-[#0F1B2D]">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Logo size="sm" linkTo="/" />
        </div>
      </header>

      <div className="flex-1 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary p-12 flex-col justify-between">
        <Logo size="lg" />
        
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-primary-foreground leading-tight text-balance">
              How escrow protects your transaction
            </h1>
            <p className="text-primary-foreground/80 text-lg">
              A simple, secure process that builds trust between strangers.
            </p>
          </div>

          <div className="space-y-4">
            {escrowBenefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold text-sm">
                  {index + 1}
                </div>
                <span className="text-primary-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-primary-foreground/60 text-sm">
          <span>Powered by</span>
          <span className="font-semibold text-primary-foreground">Stripe</span>
        </div>
      </div>

      {/* Right side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-6">
            <div className="lg:hidden mb-4">
              <Logo size="md" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Create your account</CardTitle>
            <CardDescription className="text-muted-foreground">
              Start making secure transactions today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-11 bg-background border-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-11 bg-background border-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="h-11 pr-10 bg-background border-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="h-11 pr-10 bg-background border-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Creating account..." : "Create account"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
              </p>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-foreground font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Dark blue footer */}
      <footer className="border-t border-white/10 bg-[#0F1B2D] py-6">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-sm text-white/50">© 2026 PaySafer.me</p>
        </div>
      </footer>
    </div>
  )
}
