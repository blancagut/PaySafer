"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Logo } from "@/components/logo"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      setSubmitted(true)
      toast.success("Password reset email sent!")
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0F1B2D]">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Logo size="sm" linkTo="/" />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="space-y-1 pb-6">
          <div className="mb-4">
            <Logo size="md" />
          </div>
          
          {!submitted ? (
            <>
              <CardTitle className="text-2xl font-bold text-foreground">Reset your password</CardTitle>
              <CardDescription className="text-muted-foreground">
                {"Enter your email address and we'll send you a link to reset your password."}
              </CardDescription>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground text-center">Check your email</CardTitle>
              <CardDescription className="text-muted-foreground text-center">
                {"We've sent a password reset link to"} <strong className="text-foreground">{email}</strong>
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 h-11 bg-background border-input"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {"Didn't receive the email? Check your spam folder or"}
              </p>
              <Button
                variant="outline"
                className="w-full h-11 bg-transparent"
                onClick={() => setSubmitted(false)}
              >
                Try another email
              </Button>
            </div>
          )}

          <div className="mt-6">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0F1B2D] py-6">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-sm text-white/50">© 2026 PaySafer.me</p>
        </div>
      </footer>
    </div>
  )
}
