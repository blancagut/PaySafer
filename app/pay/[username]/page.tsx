"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Copy,
  Check,
  Loader2,
  User as UserIcon,
  Send,
  ArrowDownRight,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { Logo } from "@/components/logo"
import Link from "next/link"
import { use } from "react"

function getInitials(name: string | null | undefined) {
  if (!name) return "?"
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

interface RecipientProfile {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

export default function PayUserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const router = useRouter()
  const [profile, setProfile] = useState<RecipientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // Check current session
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUser(user.id)

      // Look up profile by username
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("username", username.toLowerCase())
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setProfile(data)
      }
      setLoading(false)
    }
    load()
  }, [username])

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center space-y-6">
          <Logo size="lg" />
          <GlassCard className="text-center">
            <UserIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground">User not found</h1>
            <p className="text-sm text-muted-foreground mt-2">
              No PaySafer user with the username <span className="font-semibold">${username}</span> exists.
            </p>
          </GlassCard>
          <Button asChild variant="outline" className="bg-white/[0.04] border-white/[0.10]">
            <Link href="/">Go to PaySafer</Link>
          </Button>
        </div>
      </div>
    )
  }

  const isSelf = currentUser === profile?.id

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full space-y-6 animate-fade-in-up">
        {/* Branding */}
        <div className="text-center">
          <Logo size="lg" />
        </div>

        {/* Profile Card */}
        <GlassCard className="text-center">
          <Avatar className="w-20 h-20 mx-auto mb-4 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold text-foreground">{profile?.full_name || "PaySafer User"}</h1>
          {profile?.username && (
            <p className="text-primary font-semibold text-lg mt-1">${profile.username}</p>
          )}
          <p className="text-sm text-muted-foreground mt-3">
            Send or request money from this user on PaySafer
          </p>
        </GlassCard>

        {/* Actions */}
        {currentUser && !isSelf && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => router.push(`/wallet/send?to=${profile?.username || profile?.id}`)}
              className="h-12 gap-2 text-base"
            >
              <Send className="w-4 h-4" />
              Send
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/wallet/request?from=${profile?.username || profile?.id}`)}
              className="h-12 gap-2 text-base bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08]"
            >
              <ArrowDownRight className="w-4 h-4" />
              Request
            </Button>
          </div>
        )}

        {/* Not logged in → CTA to register/login */}
        {!currentUser && (
          <div className="space-y-3">
            <Button
              asChild
              className="w-full h-12 text-base gap-2"
            >
              <Link href={`/register?redirect=/pay/${username}`}>
                Join PaySafer to Pay
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full h-11 bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08]"
            >
              <Link href={`/login?redirect=/pay/${username}`}>
                Already have an account? Sign in
              </Link>
            </Button>
          </div>
        )}

        {/* Self-view */}
        {isSelf && (
          <div className="space-y-3">
            <GlassCard padding="sm" className="text-center">
              <p className="text-sm text-muted-foreground">This is your payment link. Share it so others can pay you!</p>
            </GlassCard>
            <Button onClick={copyLink} variant="outline" className="w-full h-11 gap-2 bg-white/[0.04] border-white/[0.10]">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy your payment link"}
            </Button>
          </div>
        )}

        {/* Share Link */}
        {!isSelf && (
          <div className="text-center">
            <button onClick={copyLink} className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Link copied!" : "Copy payment link"}
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Powered by <span className="font-semibold text-foreground">PaySafer</span> — Secure P2P Payments
        </p>
      </div>
    </div>
  )
}
