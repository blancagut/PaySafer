"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  User,
  Mail,
  CheckCircle2,
  Calendar,
  Shield,
  ArrowUpRight,
  Activity,
  Settings,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react"
import { GlassCard, GlassStat, GlassContainer } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getProfile } from "@/lib/actions/profile"
import { getTransactionStats } from "@/lib/actions/transactions"
import { toast } from "sonner"

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [copiedId, setCopiedId] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, statsRes] = await Promise.all([
        getProfile(),
        getTransactionStats(),
      ])
      if (profileRes.data) setProfile(profileRes.data)
      if (statsRes.data) setStats(statsRes.data)

      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { user: u } } = await supabase.auth.getUser()
      if (u) setUser(u)
    } catch {
      toast.error("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
        <div className="h-40 glass-card animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 glass-card animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const fullName = profile?.full_name || user?.email?.split("@")[0] || "User"
  const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
  const memberSince = user?.created_at ? new Date(user.created_at) : new Date()
  const totalTxn = stats?.total ?? 0
  const completedTxn = stats?.completed ?? 0
  const successRate = totalTxn > 0 ? Math.round((completedTxn / totalTxn) * 100) : 0

  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id)
      setCopiedId(true)
      toast.success("User ID copied")
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Your account information</p>
      </div>

      {/* ─── Profile Card ─── */}
      <GlassCard variant="gradient" padding="none" className="animate-fade-in-up overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <Avatar className="w-20 h-20 border-4 border-[hsl(222,47%,8%)] shadow-xl">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-foreground">{fullName}</h3>
                <GlassBadge variant="emerald" dot>Verified</GlassBadge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Member since {memberSince.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] w-fit">
              <Link href="/settings">
                <Settings className="w-3.5 h-3.5 mr-1.5" />
                Edit Settings
              </Link>
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-3 gap-4">
        <GlassStat
          label="Total Transactions"
          value={totalTxn}
          icon={<Activity className="w-5 h-5" />}
          glowColor="blue"
        />
        <GlassStat
          label="Completed"
          value={completedTxn}
          icon={<CheckCircle2 className="w-5 h-5" />}
          glowColor="emerald"
        />
        <GlassStat
          label="Success Rate"
          value={`${successRate}%`}
          icon={<ArrowUpRight className="w-5 h-5" />}
          glowColor="emerald"
        />
      </div>

      {/* ─── Account Details ─── */}
      <GlassContainer header={{ title: "Account Details", description: "Your personal information" }}>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Full Name</p>
              <p className="text-sm font-semibold text-foreground">{fullName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
              <Mail className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Email</p>
              <p className="text-sm font-semibold text-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-emerald-400">Verified Account</span>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Member Since</p>
              <p className="text-sm font-semibold text-foreground">
                {memberSince.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>

          {user?.id && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">User ID</p>
                <p className="text-xs font-mono text-muted-foreground truncate">{user.id}</p>
              </div>
              <button
                onClick={copyUserId}
                className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </GlassContainer>

      {/* ─── Security ─── */}
      <GlassContainer header={{ title: "Account Security", description: "Manage your password and security settings" }}>
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Password</p>
              <p className="text-xs text-muted-foreground">Change your password in settings</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08]">
            <Link href="/settings">Change Password</Link>
          </Button>
        </div>
      </GlassContainer>
    </div>
  )
}
