"use client"

import React, { useState, useEffect } from "react"
import {
  TrendingUp,
  Shield,
  Award,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Star,
  Lock,
  CreditCard,
  Scale,
  Globe,
  Building2,
  ThumbsUp,
} from "lucide-react"
import { GlassCard, GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getTrustScore, getVouches, getAchievements } from "@/lib/actions/trust"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ─── Trust Score Ring ───
function TrustScoreRing({ score, size = 180 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444"

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={8} className="text-white/[0.06]" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          strokeLinecap="round" className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${color}40)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground">Trust Score</span>
      </div>
    </div>
  )
}

// ─── Score Breakdown Item ───
function ScoreItem({ label, score, maxScore, icon: Icon, description }: {
  label: string; score: number; maxScore: number; icon: React.ElementType; description: string
}) {
  const pct = (score / maxScore) * 100
  const color = pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400"
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium">{label}</p>
          <span className="text-xs text-muted-foreground">{score}/{maxScore}</span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  )
}

// ─── Achievement Badges ───
const defaultAchievements = [
  { badge: "first_transaction", title: "First Deal", icon: "🤝", description: "Completed your first transaction", unlocked: false },
  { badge: "trusted_50", title: "Trusted User", icon: "⭐", description: "Reached 50 trust score", unlocked: false },
  { badge: "fast_responder", title: "Fast Responder", icon: "⚡", description: "Avg response under 1 hour", unlocked: false },
  { badge: "ten_completed", title: "Deal Maker", icon: "💎", description: "Completed 10 transactions", unlocked: false },
  { badge: "zero_disputes", title: "Clean Record", icon: "🛡️", description: "Zero disputes after 5+ txns", unlocked: false },
  { badge: "verified", title: "Verified", icon: "✅", description: "Completed KYC verification", unlocked: false },
  { badge: "five_vouches", title: "Community Star", icon: "🌟", description: "Received 5 vouches", unlocked: false },
  { badge: "year_member", title: "OG Member", icon: "👑", description: "Member for over 1 year", unlocked: false },
]

const trustFeatures = [
  { icon: Lock, title: "Secure Escrow", description: "Funds are held securely until both parties fulfill their obligations." },
  { icon: Shield, title: "Buyer Protection", description: "Your money is protected. If you don't receive what was promised, open a dispute." },
  { icon: CheckCircle2, title: "Seller Assurance", description: "Sellers know payment is guaranteed once they deliver as promised." },
  { icon: Scale, title: "Fair Disputes", description: "Neutral dispute resolution ensures both parties are treated fairly." },
]

const complianceItems = [
  "We do not hold customer balances",
  "We do not offer lending or credit services",
  "We do not provide investment advice",
  "We do not operate as a money transmitter",
  "We are not FDIC insured",
  "All payments processed by Stripe",
]

// ─── Main Page ───
export default function TrustPage() {
  const [trustData, setTrustData] = useState<any>(null)
  const [achievements, setAchievements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [score, achList] = await Promise.all([
          getTrustScore().catch(() => null),
          getAchievements().catch(() => []),
        ])
        setTrustData(score || { total: 0, breakdown: { account_age: 0, transactions: 0, disputes: 0, response_time: 0, verification: 0, vouches: 0 }, completed_transactions: 0, dispute_count: 0, vouch_count: 0, account_age_months: 0 })
        setAchievements(achList)
      } catch { /* fallback */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const bd = trustData?.breakdown || {}

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Trust & Security</h1>
        <p className="text-muted-foreground mt-2 text-lg">Your reputation, our protection technology</p>
      </div>

      <Tabs defaultValue="score" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/[0.04] border border-white/[0.06]">
          <TabsTrigger value="score" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">My Trust Score</TabsTrigger>
          <TabsTrigger value="how" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">How It Works</TabsTrigger>
          <TabsTrigger value="compliance" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">Compliance</TabsTrigger>
        </TabsList>

        {/* ─── Trust Score Tab ─── */}
        <TabsContent value="score" className="mt-6 space-y-6">
          <GlassCard className="p-8 flex flex-col items-center gap-6">
            <TrustScoreRing score={trustData?.total || 0} />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">
                {(trustData?.total || 0) >= 70 ? "Highly Trusted" : (trustData?.total || 0) >= 40 ? "Building Trust" : "New Member"}
              </p>
              <p className="text-xs text-muted-foreground">Complete more transactions and get verified to increase your score</p>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Score Breakdown</h3>
            <div className="divide-y divide-white/[0.04]">
              <ScoreItem label="Account Age" score={bd.account_age || 0} maxScore={10} icon={Clock} description={`${trustData?.account_age_months || 0} months on PaySafer`} />
              <ScoreItem label="Transactions" score={bd.transactions || 0} maxScore={25} icon={CheckCircle2} description={`${trustData?.completed_transactions || 0} completed`} />
              <ScoreItem label="Dispute Record" score={bd.disputes || 0} maxScore={20} icon={AlertTriangle} description={`${trustData?.dispute_count || 0} disputes`} />
              <ScoreItem label="Response Time" score={bd.response_time || 0} maxScore={15} icon={Clock} description="Average response speed" />
              <ScoreItem label="Verification" score={bd.verification || 0} maxScore={15} icon={Shield} description={bd.verification > 0 ? "Identity verified" : "Complete KYC to earn points"} />
              <ScoreItem label="Community Vouches" score={bd.vouches || 0} maxScore={15} icon={Users} description={`${trustData?.vouch_count || 0} people vouch for you`} />
            </div>
          </GlassCard>

          {/* Achievements */}
          <GlassCard className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Achievements</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {defaultAchievements.map((a) => {
                const unlocked = a.unlocked || achievements.some((x: any) => x.badge === a.badge)
                return (
                  <div key={a.badge} className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${unlocked ? "bg-primary/5 border-primary/20" : "bg-white/[0.02] border-white/[0.06] opacity-50 grayscale"}`}>
                    <span className="text-2xl">{a.icon}</span>
                    <p className="text-xs font-medium text-center">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground text-center leading-tight">{a.description}</p>
                  </div>
                )
              })}
            </div>
          </GlassCard>

          {/* How to improve */}
          <GlassCard className="p-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> How to Improve</h3>
            <div className="space-y-2">
              {[
                { action: "Complete KYC verification", points: "+15 pts", done: bd.verification > 0 },
                { action: "Complete 5 more transactions", points: "+10 pts", done: false },
                { action: "Get vouched by other users", points: "+1 pt each", done: false },
                { action: "Maintain zero disputes", points: "Keep 20 pts", done: trustData?.dispute_count === 0 },
                { action: "Stay active for 12 months", points: "+10 pts", done: trustData?.account_age_months >= 12 },
              ].map((tip, i) => (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg ${tip.done ? "bg-primary/5" : "bg-white/[0.02]"}`}>
                  {tip.done ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <div className="w-4 h-4 rounded-full border border-white/[0.15] shrink-0" />}
                  <span className="text-sm flex-1">{tip.action}</span>
                  <span className="text-xs text-primary font-medium">{tip.points}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>

        {/* ─── How It Works Tab ─── */}
        <TabsContent value="how" className="mt-6 space-y-6">
          <Card className="border-border bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Powered by Stripe</h2>
                  <p className="text-muted-foreground">Industry-leading payment infrastructure trusted by millions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-6">
            {trustFeatures.map((f) => (
              <Card key={f.title} className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{f.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-xl">How Our Escrow Works</CardTitle>
              <CardDescription>A simple 5-step process that protects everyone</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { step: 1, title: "Agreement", desc: "Agree on terms" },
                  { step: 2, title: "Payment", desc: "Buyer pays to escrow" },
                  { step: 3, title: "Secure Hold", desc: "Funds held safely" },
                  { step: 4, title: "Delivery", desc: "Seller delivers" },
                  { step: 5, title: "Release", desc: "Buyer confirms" },
                ].map((item, i) => (
                  <div key={item.step} className="relative text-center">
                    <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto font-semibold">{item.step}</div>
                    <p className="font-medium mt-3 text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    {i < 4 && <div className="absolute top-5 left-full w-full h-0.5 bg-border -translate-x-1/2" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Compliance Tab ─── */}
        <TabsContent value="compliance" className="mt-6 space-y-6">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-400">We Are Not a Bank</h3>
                  <p className="text-muted-foreground mt-1 leading-relaxed">
                    PaySafer is an escrow facilitation platform, not a bank or financial institution. All payment processing is handled securely by Stripe.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Building2 className="w-5 h-5" /> Compliance & Transparency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {complianceItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-muted/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Globe className="w-6 h-6 text-primary" /></div>
                <div>
                  <h3 className="font-semibold">Global Transactions</h3>
                  <p className="text-muted-foreground">Securely transact with anyone, anywhere. We support multiple currencies via Stripe.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
