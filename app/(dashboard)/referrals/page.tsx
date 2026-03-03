"use client"

import { useState } from "react"
import {
  UserPlus,
  Copy,
  Gift,
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  Share2,
  Mail,
  MessageCircle,
  Link2,
  Trophy,
  ArrowRight,
  Loader2,
  Star,
} from "lucide-react"
import { GlassCard, GlassContainer } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Mock Data ───

const referralCode = "PAYSAFER-SARAH42"
const referralLink = "https://paysafer.app/r/SARAH42"

interface Referral {
  id: string
  name: string
  email: string
  status: "pending" | "signed_up" | "verified" | "rewarded"
  reward: number
  date: string
}

const mockReferrals: Referral[] = [
  { id: "r1", name: "James Wilson", email: "j***@gmail.com", status: "rewarded", reward: 10, date: "Feb 15, 2026" },
  { id: "r2", name: "Maria Garcia", email: "m***@outlook.com", status: "verified", reward: 10, date: "Feb 22, 2026" },
  { id: "r3", name: "Ahmed Hassan", email: "a***@gmail.com", status: "signed_up", reward: 0, date: "Feb 28, 2026" },
  { id: "r4", name: "Lisa Chen", email: "l***@yahoo.com", status: "pending", reward: 0, date: "Mar 1, 2026" },
]

const statusConfig: Record<string, { label: string; badge: "emerald" | "blue" | "amber" | "purple" }> = {
  pending: { label: "Invited", badge: "amber" },
  signed_up: { label: "Signed Up", badge: "blue" },
  verified: { label: "Verified", badge: "purple" },
  rewarded: { label: "Rewarded", badge: "emerald" },
}

const milestones = [
  { count: 5, reward: "$25 bonus", reached: false },
  { count: 10, reward: "$75 bonus", reached: false },
  { count: 25, reward: "$200 bonus + Gold upgrade", reached: false },
  { count: 50, reward: "$500 bonus + Platinum upgrade", reached: false },
]

export default function ReferralsPage() {
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [sending, setSending] = useState(false)

  const totalReferred = mockReferrals.length
  const totalEarned = mockReferrals.filter((r) => r.status === "rewarded").reduce((s, r) => s + r.reward, 0)
  const pendingRewards = mockReferrals.filter((r) => r.status === "verified").length * 10

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode)
    toast.success("Referral code copied!")
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink)
    toast.success("Referral link copied!")
  }

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Enter a valid email address")
      return
    }
    setSending(true)
    await new Promise((r) => setTimeout(r, 1000))
    toast.success(`Invitation sent to ${inviteEmail}`)
    setInviteEmail("")
    setShowInviteDialog(false)
    setSending(false)
  }

  const handleShare = (method: string) => {
    toast.success(`Sharing via ${method}...`, {
      description: "Opening share dialog",
    })
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Refer & Earn
              </h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Invite friends, both of you get $10
              </p>
            </div>
          </div>
          <Button onClick={() => setShowInviteDialog(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm">
            <Mail className="w-4 h-4 mr-1.5" />
            Invite
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Friends Invited</span>
          <span className="text-xl font-semibold text-foreground">{totalReferred}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Total Earned</span>
          <span className="text-xl font-semibold text-emerald-400 font-mono">${totalEarned}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Pending</span>
          <span className="text-xl font-semibold text-amber-400 font-mono">${pendingRewards}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Next Milestone</span>
          <span className="text-xl font-semibold text-foreground">5 referrals</span>
        </GlassCard>
      </div>

      {/* Referral Code & Share */}
      <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        <GlassCard padding="lg" variant="glow">
          <div className="text-center mb-5">
            <Gift className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-foreground">Your Referral Code</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Share your code — when they sign up & verify, you both get $10
            </p>
          </div>

          {/* Code */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-6 py-3 font-mono text-lg tracking-wider text-foreground">
              {referralCode}
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyCode}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          {/* Link */}
          <div className="flex items-center gap-2 mb-5 px-4">
            <div className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-muted-foreground truncate font-mono">
              {referralLink}
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Link2 className="w-3.5 h-3.5 mr-1" />
              Copy
            </Button>
          </div>

          {/* Share buttons */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare("WhatsApp")}
              className="text-xs"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare("Email")}
              className="text-xs"
            >
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare("Share")}
              className="text-xs"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              Share
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* How It Works */}
      <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <GlassContainer header={{ title: "How It Works", description: "3 simple steps" }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Share Your Link", desc: "Send your unique code or link to friends", icon: Share2 },
              { step: "2", title: "Friend Signs Up", desc: "They create an account and verify identity", icon: UserPlus },
              { step: "3", title: "Both Get $10", desc: "Reward credited to both wallets instantly", icon: DollarSign },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground block">{s.title}</span>
                <span className="text-xs text-muted-foreground">{s.desc}</span>
              </div>
            ))}
          </div>
        </GlassContainer>
      </div>

      {/* Milestones */}
      <div className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
        <GlassContainer header={{ title: "Milestones", description: "Unlock bonus rewards" }}>
          <div className="space-y-3">
            {milestones.map((m) => {
              const current = totalReferred
              const pct = Math.min(Math.round((current / m.count) * 100), 100)
              const reached = current >= m.count
              return (
                <div
                  key={m.count}
                  className={cn(
                    "rounded-lg border p-3 flex items-center gap-3",
                    reached
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-white/[0.02] border-white/[0.06]"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    reached ? "bg-emerald-500/20" : "bg-white/[0.06]"
                  )}>
                    {reached ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Trophy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{m.count} Referrals</span>
                      <span className="text-xs text-emerald-400">{m.reward}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06]">
                      <div
                        className={cn("h-full rounded-full", reached ? "bg-emerald-400" : "bg-primary")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">{current}/{m.count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassContainer>
      </div>

      {/* Referral History */}
      <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <GlassContainer header={{ title: "Your Referrals", description: `${totalReferred} people invited` }}>
          <div className="divide-y divide-white/[0.06]">
            {mockReferrals.map((ref) => {
              const sc = statusConfig[ref.status]
              return (
                <div key={ref.id} className="flex items-center gap-3 py-3 px-1">
                  <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-foreground">
                      {ref.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{ref.name}</span>
                      <GlassBadge variant={sc.badge} size="sm">{sc.label}</GlassBadge>
                    </div>
                    <span className="text-xs text-muted-foreground">{ref.email} · {ref.date}</span>
                  </div>
                  {ref.reward > 0 && (
                    <span className="text-sm text-emerald-400 font-mono shrink-0">+${ref.reward}</span>
                  )}
                </div>
              )
            })}
          </div>
        </GlassContainer>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Invite a Friend</DialogTitle>
            <DialogDescription>Send an email invitation with your referral link.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Friend&apos;s Email</label>
            <input
              type="email"
              placeholder="friend@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
            <Button onClick={handleSendInvite} disabled={sending} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Mail className="w-4 h-4 mr-1.5" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
