"use client"

import { useState } from "react"
import {
  PieChart,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Gamepad2,
  Stethoscope,
  GraduationCap,
  Shirt,
  MoreHorizontal,
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

// ─── Categories ───

const categoryDefs = [
  { id: "groceries", label: "Groceries", icon: ShoppingCart, color: "text-emerald-400", bg: "bg-emerald-400" },
  { id: "dining", label: "Dining", icon: Utensils, color: "text-amber-400", bg: "bg-amber-400" },
  { id: "transport", label: "Transport", icon: Car, color: "text-blue-400", bg: "bg-blue-400" },
  { id: "housing", label: "Housing", icon: Home, color: "text-purple-400", bg: "bg-purple-400" },
  { id: "utilities", label: "Utilities", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-400" },
  { id: "entertainment", label: "Entertainment", icon: Gamepad2, color: "text-pink-400", bg: "bg-pink-400" },
  { id: "health", label: "Health", icon: Stethoscope, color: "text-red-400", bg: "bg-red-400" },
  { id: "education", label: "Education", icon: GraduationCap, color: "text-cyan-400", bg: "bg-cyan-400" },
  { id: "shopping", label: "Shopping", icon: Shirt, color: "text-orange-400", bg: "bg-orange-400" },
  { id: "other", label: "Other", icon: MoreHorizontal, color: "text-slate-400", bg: "bg-slate-400" },
]

interface Budget {
  id: string
  categoryId: string
  limit: number
  spent: number
  month: string // "2026-03"
}

const mockBudgets: Budget[] = [
  { id: "b1", categoryId: "groceries", limit: 600, spent: 423.50, month: "2026-03" },
  { id: "b2", categoryId: "dining", limit: 300, spent: 287.25, month: "2026-03" },
  { id: "b3", categoryId: "transport", limit: 200, spent: 145.00, month: "2026-03" },
  { id: "b4", categoryId: "housing", limit: 1500, spent: 1500.00, month: "2026-03" },
  { id: "b5", categoryId: "utilities", limit: 250, spent: 180.40, month: "2026-03" },
  { id: "b6", categoryId: "entertainment", limit: 150, spent: 178.90, month: "2026-03" },
  { id: "b7", categoryId: "health", limit: 200, spent: 65.00, month: "2026-03" },
  { id: "b8", categoryId: "shopping", limit: 400, spent: 312.75, month: "2026-03" },
]

// Recent transactions for categorization display
const recentSpend = [
  { id: "t1", name: "Carrefour", categoryId: "groceries", amount: 87.30, date: "Mar 2" },
  { id: "t2", name: "Uber", categoryId: "transport", amount: 24.50, date: "Mar 2" },
  { id: "t3", name: "Shake Shack", categoryId: "dining", amount: 42.00, date: "Mar 1" },
  { id: "t4", name: "Netflix", categoryId: "entertainment", amount: 15.99, date: "Mar 1" },
  { id: "t5", name: "DEWA", categoryId: "utilities", amount: 180.40, date: "Feb 28" },
]

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>(mockBudgets)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [newBudget, setNewBudget] = useState({ categoryId: "", limit: "" })
  const [editLimit, setEditLimit] = useState("")
  const [loading, setLoading] = useState(false)

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const overBudget = budgets.filter((b) => b.spent > b.limit).length
  const onTrack = budgets.filter((b) => b.spent <= b.limit * 0.85).length

  const usedCategories = budgets.map((b) => b.categoryId)
  const availableCategories = categoryDefs.filter((c) => !usedCategories.includes(c.id))

  const handleCreate = async () => {
    if (!newBudget.categoryId || !newBudget.limit) {
      toast.error("Select a category and set a limit")
      return
    }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    setBudgets([
      ...budgets,
      {
        id: `b${Date.now()}`,
        categoryId: newBudget.categoryId,
        limit: parseFloat(newBudget.limit),
        spent: 0,
        month: "2026-03",
      },
    ])
    toast.success("Budget created")
    setShowCreateDialog(false)
    setNewBudget({ categoryId: "", limit: "" })
    setLoading(false)
  }

  const handleEdit = async (budgetId: string) => {
    if (!editLimit) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 500))
    setBudgets(budgets.map((b) => b.id === budgetId ? { ...b, limit: parseFloat(editLimit) } : b))
    toast.success("Budget limit updated")
    setEditingBudget(null)
    setEditLimit("")
    setLoading(false)
  }

  const handleDelete = (budgetId: string) => {
    setBudgets(budgets.filter((b) => b.id !== budgetId))
    toast.success("Budget removed")
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Budgets
              </h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Track spending by category with monthly limits
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={availableCategories.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Budget
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Monthly Budget</span>
          <span className="text-xl font-semibold text-foreground font-mono">${totalLimit.toLocaleString()}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Total Spent</span>
          <span className={cn("text-xl font-semibold font-mono", totalSpent > totalLimit ? "text-red-400" : "text-emerald-400")}>
            ${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">On Track</span>
          <span className="text-xl font-semibold text-emerald-400">{onTrack}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Over Budget</span>
          <span className={cn("text-xl font-semibold", overBudget > 0 ? "text-red-400" : "text-foreground")}>{overBudget}</span>
        </GlassCard>
      </div>

      {/* Overall progress bar */}
      <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
        <GlassCard padding="md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">March 2026 Overall</span>
            <span className="text-sm font-mono text-foreground">
              ${totalSpent.toLocaleString()} / ${totalLimit.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/[0.06]">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                totalSpent / totalLimit > 1 ? "bg-red-400" : totalSpent / totalLimit > 0.85 ? "bg-amber-400" : "bg-emerald-400"
              )}
              style={{ width: `${Math.min((totalSpent / totalLimit) * 100, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground mt-1 block">
            {Math.round((totalSpent / totalLimit) * 100)}% used · ${Math.max(0, totalLimit - totalSpent).toLocaleString()} remaining
          </span>
        </GlassCard>
      </div>

      {/* Budget Categories */}
      <div className="animate-fade-in-up space-y-2" style={{ animationDelay: "200ms" }}>
        {budgets
          .sort((a, b) => (b.spent / b.limit) - (a.spent / a.limit))
          .map((budget) => {
            const cat = categoryDefs.find((c) => c.id === budget.categoryId)!
            const pct = Math.round((budget.spent / budget.limit) * 100)
            const isOver = budget.spent > budget.limit
            const isWarning = pct >= 85 && !isOver
            const CatIcon = cat.icon

            return (
              <GlassCard key={budget.id} padding="none" className="hover:bg-white/[0.06] transition-colors">
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <CatIcon className={cn("w-4.5 h-4.5", cat.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{cat.label}</span>
                        {isOver && <GlassBadge variant="red" size="sm">Over</GlassBadge>}
                        {isWarning && <GlassBadge variant="amber" size="sm">Warning</GlassBadge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingBudget(budget.id); setEditLimit(String(budget.limit)) }}
                        className="text-xs text-muted-foreground"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(budget.id)}
                        className="text-xs text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className={cn("font-mono", isOver ? "text-red-400" : "text-foreground")}>
                      ${budget.spent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      ${budget.limit.toLocaleString()} limit
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-white/[0.06]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isOver ? "bg-red-400" : isWarning ? "bg-amber-400" : "bg-emerald-400"
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-muted-foreground">{pct}%</span>
                    <span className="text-[11px] text-muted-foreground">
                      {isOver
                        ? `$${(budget.spent - budget.limit).toFixed(2)} over`
                        : `$${(budget.limit - budget.spent).toFixed(2)} left`
                      }
                    </span>
                  </div>
                </div>
              </GlassCard>
            )
          })}
      </div>

      {/* Recent Categorized Spending */}
      <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <GlassContainer
          header={{
            title: "Recent Spending",
            description: "Auto-categorized transactions",
          }}
        >
          <div className="divide-y divide-white/[0.06]">
            {recentSpend.map((tx) => {
              const cat = categoryDefs.find((c) => c.id === tx.categoryId)!
              const CatIcon = cat.icon
              return (
                <div key={tx.id} className="flex items-center gap-3 py-2.5 px-1">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                    <CatIcon className={cn("w-3.5 h-3.5", cat.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground block">{tx.name}</span>
                    <span className="text-xs text-muted-foreground">{cat.label} · {tx.date}</span>
                  </div>
                  <span className="text-sm text-red-400 font-mono shrink-0">
                    -${tx.amount.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </GlassContainer>
      </div>

      {/* Create Budget Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Budget Category</DialogTitle>
            <DialogDescription>Set a monthly spending limit for a category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-2 block">Category</label>
              <div className="grid grid-cols-5 gap-2">
                {availableCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setNewBudget({ ...newBudget, categoryId: cat.id })}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors",
                      newBudget.categoryId === cat.id
                        ? "border-primary bg-primary/10"
                        : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06]"
                    )}
                  >
                    <cat.icon className={cn("w-4 h-4", cat.color)} />
                    <span className="text-muted-foreground truncate w-full text-center">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Monthly Limit ($)</label>
              <input
                type="number"
                placeholder="500"
                value={newBudget.limit}
                onChange={(e) => setNewBudget({ ...newBudget, limit: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Create Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Budget Dialog */}
      <Dialog open={!!editingBudget} onOpenChange={() => setEditingBudget(null)}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Budget Limit</DialogTitle>
            <DialogDescription>Adjust the monthly spending limit for this category.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">New Limit ($)</label>
            <input
              type="number"
              value={editLimit}
              onChange={(e) => setEditLimit(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBudget(null)}>Cancel</Button>
            <Button
              onClick={() => editingBudget && handleEdit(editingBudget)}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
