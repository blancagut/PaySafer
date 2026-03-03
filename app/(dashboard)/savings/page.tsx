"use client"

import { useState } from "react"
import {
  PiggyBank,
  Plus,
  Target,
  Pencil,
  Trash2,
  Pause,
  Play,
  ArrowUpRight,
  Loader2,
  Sparkles,
  Plane,
  Home,
  GraduationCap,
  Car,
  Gift,
  ShieldCheck,
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

// ─── Types & Mock Data ───

const goalIcons = [
  { id: "vacation", icon: Plane, label: "Vacation", color: "text-blue-400" },
  { id: "home", icon: Home, label: "Home", color: "text-amber-400" },
  { id: "education", icon: GraduationCap, label: "Education", color: "text-purple-400" },
  { id: "car", icon: Car, label: "Car", color: "text-emerald-400" },
  { id: "gift", icon: Gift, label: "Gift", color: "text-pink-400" },
  { id: "emergency", icon: ShieldCheck, label: "Emergency", color: "text-red-400" },
]

interface SavingsGoal {
  id: string
  name: string
  iconId: string
  targetAmount: number
  savedAmount: number
  currency: string
  deadline: string
  autoSave: number | null // monthly auto-save amount
  paused: boolean
  createdAt: string
}

const mockGoals: SavingsGoal[] = [
  {
    id: "g1", name: "Dubai Vacation", iconId: "vacation",
    targetAmount: 5000, savedAmount: 3250, currency: "USD",
    deadline: "2026-06-15", autoSave: 250, paused: false,
    createdAt: "2025-11-01",
  },
  {
    id: "g2", name: "Emergency Fund", iconId: "emergency",
    targetAmount: 10000, savedAmount: 7800, currency: "USD",
    deadline: "2026-12-31", autoSave: 500, paused: false,
    createdAt: "2025-08-01",
  },
  {
    id: "g3", name: "New Laptop", iconId: "gift",
    targetAmount: 2000, savedAmount: 2000, currency: "USD",
    deadline: "2026-03-01", autoSave: null, paused: false,
    createdAt: "2025-10-15",
  },
  {
    id: "g4", name: "Education Fund", iconId: "education",
    targetAmount: 15000, savedAmount: 4500, currency: "USD",
    deadline: "2027-09-01", autoSave: 300, paused: true,
    createdAt: "2025-06-01",
  },
]

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>(mockGoals)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAddFundsDialog, setShowAddFundsDialog] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [newGoal, setNewGoal] = useState({ name: "", iconId: "vacation", target: "", deadline: "", autoSave: "" })
  const [addAmount, setAddAmount] = useState("")
  const [loading, setLoading] = useState(false)

  const totalSaved = goals.reduce((sum, g) => sum + g.savedAmount, 0)
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0)

  const handleCreate = async () => {
    if (!newGoal.name || !newGoal.target) {
      toast.error("Name and target amount are required")
      return
    }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    const goal: SavingsGoal = {
      id: `g${Date.now()}`,
      name: newGoal.name,
      iconId: newGoal.iconId,
      targetAmount: parseFloat(newGoal.target),
      savedAmount: 0,
      currency: "USD",
      deadline: newGoal.deadline || "2027-01-01",
      autoSave: newGoal.autoSave ? parseFloat(newGoal.autoSave) : null,
      paused: false,
      createdAt: new Date().toISOString(),
    }
    setGoals([goal, ...goals])
    toast.success(`"${goal.name}" goal created!`)
    setShowCreateDialog(false)
    setNewGoal({ name: "", iconId: "vacation", target: "", deadline: "", autoSave: "" })
    setLoading(false)
  }

  const handleAddFunds = async (goalId: string) => {
    if (!addAmount || parseFloat(addAmount) <= 0) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setGoals(goals.map((g) =>
      g.id === goalId
        ? { ...g, savedAmount: Math.min(g.savedAmount + parseFloat(addAmount), g.targetAmount) }
        : g
    ))
    const goal = goals.find((g) => g.id === goalId)!
    toast.success(`$${parseFloat(addAmount).toLocaleString()} added to "${goal.name}"`)
    setShowAddFundsDialog(null)
    setAddAmount("")
    setLoading(false)
  }

  const handleTogglePause = (goalId: string) => {
    setGoals(goals.map((g) =>
      g.id === goalId ? { ...g, paused: !g.paused } : g
    ))
    const goal = goals.find((g) => g.id === goalId)!
    toast.success(goal.paused ? `"${goal.name}" auto-save resumed` : `"${goal.name}" auto-save paused`)
  }

  const handleDelete = async (goalId: string) => {
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    const goal = goals.find((g) => g.id === goalId)!
    setGoals(goals.filter((g) => g.id !== goalId))
    toast.success(`"${goal.name}" deleted. $${goal.savedAmount.toLocaleString()} returned to wallet.`)
    setShowDeleteDialog(null)
    setLoading(false)
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Savings Goals
              </h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Set aside money for what matters most
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            New Goal
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="animate-fade-in grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Total Saved</span>
          <span className="text-2xl font-semibold text-emerald-400 font-mono">${totalSaved.toLocaleString()}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Total Target</span>
          <span className="text-2xl font-semibold text-foreground font-mono">${totalTarget.toLocaleString()}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Active Goals</span>
          <span className="text-2xl font-semibold text-foreground">{goals.filter((g) => g.savedAmount < g.targetAmount).length}</span>
        </GlassCard>
      </div>

      {/* Goals Grid */}
      <div className="animate-fade-in-up grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animationDelay: "200ms" }}>
        {goals.map((goal) => {
          const pct = Math.round((goal.savedAmount / goal.targetAmount) * 100)
          const isComplete = pct >= 100
          const iconConfig = goalIcons.find((i) => i.id === goal.iconId) ?? goalIcons[0]
          const IconComponent = iconConfig.icon
          const daysLeft = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

          return (
            <GlassCard key={goal.id} padding="none" className={cn("overflow-hidden", goal.paused && "opacity-60")}>
              {/* Progress bar at top */}
              <div className="h-1 bg-white/[0.04]">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    isComplete ? "bg-emerald-400" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center")}>
                      <IconComponent className={cn("w-5 h-5", iconConfig.color)} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">{goal.name}</h3>
                      <span className="text-xs text-muted-foreground">
                        {isComplete ? (
                          <span className="text-emerald-400">Goal reached! 🎉</span>
                        ) : (
                          <>{daysLeft} days left</>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isComplete ? (
                      <GlassBadge variant="emerald" size="sm">Complete</GlassBadge>
                    ) : goal.paused ? (
                      <GlassBadge variant="amber" size="sm">Paused</GlassBadge>
                    ) : null}
                  </div>
                </div>

                {/* Amount */}
                <div className="mb-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-semibold text-foreground font-mono">
                      ${goal.savedAmount.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground font-mono">
                      of ${goal.targetAmount.toLocaleString()}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-white/[0.06] mt-2">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isComplete ? "bg-emerald-400" : pct >= 75 ? "bg-emerald-400" : pct >= 50 ? "bg-blue-400" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 block">{pct}% saved</span>
                </div>

                {/* Auto-save info */}
                {goal.autoSave && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <Sparkles className="w-3 h-3 text-primary" />
                    Auto-saving ${goal.autoSave}/month
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                  {!isComplete && (
                    <Button
                      size="sm"
                      onClick={() => setShowAddFundsDialog(goal.id)}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs flex-1"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                      Add Funds
                    </Button>
                  )}
                  {goal.autoSave && !isComplete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleTogglePause(goal.id)}
                      className="text-xs text-muted-foreground"
                    >
                      {goal.paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDeleteDialog(goal.id)}
                    className="text-xs text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          )
        })}
      </div>

      {/* Create Goal Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Savings Goal</DialogTitle>
            <DialogDescription>Set a target and start saving automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Goal Name</label>
              <input
                type="text"
                placeholder="e.g., Summer Trip"
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {goalIcons.map((gi) => (
                  <button
                    key={gi.id}
                    onClick={() => setNewGoal({ ...newGoal, iconId: gi.id })}
                    className={cn(
                      "w-full aspect-square rounded-lg border flex items-center justify-center transition-colors",
                      newGoal.iconId === gi.id
                        ? "border-primary bg-primary/10"
                        : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06]"
                    )}
                    title={gi.label}
                  >
                    <gi.icon className={cn("w-5 h-5", gi.color)} />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Target Amount ($)</label>
                <input
                  type="number"
                  placeholder="5,000"
                  value={newGoal.target}
                  onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Target Date</label>
                <input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                Monthly Auto-Save ($) <span className="text-muted-foreground/60">— optional</span>
              </label>
              <input
                type="number"
                placeholder="100"
                value={newGoal.autoSave}
                onChange={(e) => setNewGoal({ ...newGoal, autoSave: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Funds Dialog */}
      <Dialog open={!!showAddFundsDialog} onOpenChange={() => setShowAddFundsDialog(null)}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Funds</DialogTitle>
            <DialogDescription>Transfer from your wallet to this savings goal.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Amount ($)</label>
            <input
              type="number"
              placeholder="0.00"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFundsDialog(null)}>Cancel</Button>
            <Button
              onClick={() => showAddFundsDialog && handleAddFunds(showAddFundsDialog)}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Add Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Goal</DialogTitle>
            <DialogDescription>
              This will delete the savings goal and return all saved funds to your main wallet. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>Cancel</Button>
            <Button
              onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}
              disabled={loading}
              variant="destructive"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Delete & Return Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
