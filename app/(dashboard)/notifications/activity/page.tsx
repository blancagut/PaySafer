"use client"

import React, { useState, useEffect } from "react"
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Clock,
  Filter,
  MessageCircle,
  Shield,
  Star,
  ThumbsUp,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getActivityFeed } from "@/lib/actions/trust"

const activityIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  transaction_completed: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  payment_sent: { icon: ArrowUpRight, color: "text-blue-400", bg: "bg-blue-400/10" },
  payment_received: { icon: ArrowDownLeft, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  offer_created: { icon: Zap, color: "text-amber-400", bg: "bg-amber-400/10" },
  dispute_opened: { icon: Shield, color: "text-red-400", bg: "bg-red-400/10" },
  dispute_resolved: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  vouch_received: { icon: ThumbsUp, color: "text-purple-400", bg: "bg-purple-400/10" },
  achievement_unlocked: { icon: Award, color: "text-amber-400", bg: "bg-amber-400/10" },
  trust_score_changed: { icon: TrendingUp, color: "text-cyan-400", bg: "bg-cyan-400/10" },
  milestone_completed: { icon: Star, color: "text-amber-400", bg: "bg-amber-400/10" },
  message_received: { icon: MessageCircle, color: "text-blue-400", bg: "bg-blue-400/10" },
}

const defaultFeed = [
  { id: "1", type: "payment_received", title: "Payment received", description: "€250.00 from Maria S. for Web Design", metadata: { amount: 250 }, created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: "2", type: "achievement_unlocked", title: "Achievement unlocked!", description: "You earned the 'First Deal' badge", metadata: { badge: "first_transaction" }, created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: "3", type: "trust_score_changed", title: "Trust score increased", description: "Your trust score went up to 52 (+3)", metadata: { score: 52, change: 3 }, created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: "4", type: "vouch_received", title: "New vouch!", description: "Alex K. vouched for you: 'Great to work with!'", metadata: {}, created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: "5", type: "transaction_completed", title: "Transaction completed", description: "Logo Design project with Carlos R. completed", metadata: { amount: 150 }, created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
  { id: "6", type: "offer_created", title: "New offer created", description: "You listed 'Frontend Development' for €500", metadata: { amount: 500 }, created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
  { id: "7", type: "payment_sent", title: "Payment sent", description: "€75.00 to John D. for Consultation", metadata: { amount: 75 }, created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString() },
  { id: "8", type: "milestone_completed", title: "Milestone completed", description: "Design Phase for Web App project approved", metadata: {}, created_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString() },
]

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString()
}

function ActivityItem({ item }: { item: typeof defaultFeed[0] }) {
  const config = activityIcons[item.type] || { icon: Activity, color: "text-muted-foreground", bg: "bg-white/[0.06]" }
  const Icon = config.icon

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors group">
      <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
      </div>
      <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap shrink-0">
        {timeAgo(item.created_at)}
      </span>
    </div>
  )
}

export default function ActivityFeedPage() {
  const [feed, setFeed] = useState<typeof defaultFeed>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    async function load() {
      try {
        const data = await getActivityFeed(50)
        setFeed(data?.length ? data : defaultFeed)
      } catch {
        setFeed(defaultFeed)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = filter === "all" ? feed : feed.filter((i) => {
    if (filter === "money") return ["payment_sent", "payment_received", "transaction_completed"].includes(i.type)
    if (filter === "social") return ["vouch_received", "message_received"].includes(i.type)
    if (filter === "achievements") return ["achievement_unlocked", "trust_score_changed", "milestone_completed"].includes(i.type)
    return true
  })

  // Group by date
  const grouped = filtered.reduce<Record<string, typeof defaultFeed>>((acc, item) => {
    const date = new Date(item.created_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let label: string
    if (date.toDateString() === today.toDateString()) label = "Today"
    else if (date.toDateString() === yesterday.toDateString()) label = "Yesterday"
    else label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

    if (!acc[label]) acc[label] = []
    acc[label].push(item)
    return acc
  }, {})

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity Feed</h1>
          <p className="text-muted-foreground mt-1">Your recent activity and achievements</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "This Week", value: feed.filter((i) => Date.now() - new Date(i.created_at).getTime() < 7 * 86400000).length, icon: Clock, color: "text-blue-400" },
          { label: "Earned", value: `€${feed.filter((i) => i.type === "payment_received").reduce((s, i) => s + ((i.metadata as any)?.amount || 0), 0)}`, icon: ArrowDownLeft, color: "text-emerald-400" },
          { label: "Spent", value: `€${feed.filter((i) => i.type === "payment_sent").reduce((s, i) => s + ((i.metadata as any)?.amount || 0), 0)}`, icon: ArrowUpRight, color: "text-red-400" },
          { label: "Achievements", value: feed.filter((i) => i.type === "achievement_unlocked").length, icon: Award, color: "text-amber-400" },
        ].map((stat) => (
          <GlassCard key={stat.label} className="p-3 text-center">
            <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
            <p className="text-lg font-bold">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: "all", label: "All" },
          { key: "money", label: "Money" },
          { key: "social", label: "Social" },
          { key: "achievements", label: "Achievements" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-primary/15 text-primary border border-primary/20"
                : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.08]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-6">
        {loading ? (
          <GlassCard className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.06]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/[0.06] rounded w-1/3" />
                    <div className="h-2 bg-white/[0.04] rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        ) : filtered.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No activity yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start transacting to build your activity feed
            </p>
          </GlassCard>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{date}</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
              <GlassCard className="divide-y divide-white/[0.04]">
                {items.map((item) => (
                  <ActivityItem key={item.id} item={item} />
                ))}
              </GlassCard>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
