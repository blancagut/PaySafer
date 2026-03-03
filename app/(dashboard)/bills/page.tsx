"use client"

import { useState } from "react"
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Loader2,
  Zap,
  Wifi,
  Phone,
  Tv,
  Droplets,
  Building2,
  CreditCard,
  Calendar,
  ArrowRight,
  Repeat,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Categories & Billers ───

const billerCategories = [
  { id: "electricity", label: "Electricity", icon: Zap, color: "text-yellow-400" },
  { id: "water", label: "Water", icon: Droplets, color: "text-blue-400" },
  { id: "internet", label: "Internet", icon: Wifi, color: "text-purple-400" },
  { id: "phone", label: "Phone", icon: Phone, color: "text-emerald-400" },
  { id: "tv", label: "TV / Streaming", icon: Tv, color: "text-pink-400" },
  { id: "insurance", label: "Insurance", icon: Building2, color: "text-amber-400" },
]

interface Bill {
  id: string
  billerName: string
  categoryId: string
  accountNumber: string
  amount: number
  dueDate: string
  status: "due" | "paid" | "overdue" | "upcoming"
  autopay: boolean
}

const mockBills: Bill[] = [
  { id: "bl1", billerName: "DEWA", categoryId: "electricity", accountNumber: "****4829", amount: 385.00, dueDate: "Mar 10, 2026", status: "due", autopay: true },
  { id: "bl2", billerName: "Etisalat", categoryId: "internet", accountNumber: "****7712", amount: 399.00, dueDate: "Mar 15, 2026", status: "upcoming", autopay: true },
  { id: "bl3", billerName: "du Mobile", categoryId: "phone", accountNumber: "****3301", amount: 149.00, dueDate: "Mar 5, 2026", status: "overdue", autopay: false },
  { id: "bl4", billerName: "Netflix", categoryId: "tv", accountNumber: "****8890", amount: 55.99, dueDate: "Mar 20, 2026", status: "upcoming", autopay: true },
  { id: "bl5", billerName: "AXA Insurance", categoryId: "insurance", accountNumber: "POL-2289", amount: 1200.00, dueDate: "Apr 1, 2026", status: "upcoming", autopay: false },
]

const statusConfig: Record<string, { label: string; badge: "emerald" | "amber" | "red" | "blue" }> = {
  paid: { label: "Paid", badge: "emerald" },
  due: { label: "Due Soon", badge: "amber" },
  overdue: { label: "Overdue", badge: "red" },
  upcoming: { label: "Upcoming", badge: "blue" },
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>(mockBills)
  const [showAddBiller, setShowAddBiller] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [newBiller, setNewBiller] = useState({ name: "", categoryId: "", account: "" })
  const [searchQuery, setSearchQuery] = useState("")

  const totalDue = bills.filter((b) => b.status === "due" || b.status === "overdue").reduce((s, b) => s + b.amount, 0)
  const overdue = bills.filter((b) => b.status === "overdue").length
  const autopayCount = bills.filter((b) => b.autopay).length

  const filtered = bills.filter((b) =>
    b.billerName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handlePayBill = async (billId: string) => {
    setPaying(true)
    await new Promise((r) => setTimeout(r, 1500))
    setBills(bills.map((b) => b.id === billId ? { ...b, status: "paid" as const } : b))
    const bill = bills.find((b) => b.id === billId)!
    toast.success(`${bill.billerName} paid!`, {
      description: `$${bill.amount.toFixed(2)} debited from your wallet`,
    })
    setShowPayDialog(null)
    setPaying(false)
  }

  const handlePayAll = async () => {
    setPaying(true)
    await new Promise((r) => setTimeout(r, 2000))
    setBills(bills.map((b) =>
      b.status === "due" || b.status === "overdue" ? { ...b, status: "paid" as const } : b
    ))
    toast.success(`All due bills paid!`, {
      description: `$${totalDue.toFixed(2)} total debited`,
    })
    setPaying(false)
  }

  const handleToggleAutopay = (billId: string) => {
    setBills(bills.map((b) => b.id === billId ? { ...b, autopay: !b.autopay } : b))
    const bill = bills.find((b) => b.id === billId)!
    toast.success(bill.autopay ? `Autopay disabled for ${bill.billerName}` : `Autopay enabled for ${bill.billerName}`)
  }

  const handleAddBiller = async () => {
    if (!newBiller.name || !newBiller.categoryId || !newBiller.account) {
      toast.error("Fill in all fields")
      return
    }
    setPaying(true)
    await new Promise((r) => setTimeout(r, 800))
    setBills([
      {
        id: `bl${Date.now()}`,
        billerName: newBiller.name,
        categoryId: newBiller.categoryId,
        accountNumber: `****${newBiller.account.slice(-4)}`,
        amount: 0,
        dueDate: "—",
        status: "upcoming",
        autopay: false,
      },
      ...bills,
    ])
    toast.success(`${newBiller.name} added`)
    setShowAddBiller(false)
    setNewBiller({ name: "", categoryId: "", account: "" })
    setPaying(false)
  }

  const handleRemoveBiller = (billId: string) => {
    const bill = bills.find((b) => b.id === billId)!
    setBills(bills.filter((b) => b.id !== billId))
    toast.success(`${bill.billerName} removed`)
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Bill Pay
              </h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Pay bills, subscriptions & utilities
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAddBiller(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Biller
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Total Due</span>
          <span className={cn("text-xl font-semibold font-mono", totalDue > 0 ? "text-amber-400" : "text-emerald-400")}>
            ${totalDue.toFixed(2)}
          </span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Overdue</span>
          <span className={cn("text-xl font-semibold", overdue > 0 ? "text-red-400" : "text-foreground")}>{overdue}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Billers</span>
          <span className="text-xl font-semibold text-foreground">{bills.length}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Auto-Pay</span>
          <span className="text-xl font-semibold text-emerald-400">{autopayCount} active</span>
        </GlassCard>
      </div>

      {/* Pay All CTA */}
      {totalDue > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
          <GlassCard padding="md" variant="glow">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-foreground">
                  {overdue > 0 ? `${overdue} overdue bill${overdue > 1 ? "s" : ""}` : "Bills due soon"}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total: ${totalDue.toFixed(2)}
                </p>
              </div>
              <Button
                onClick={handlePayAll}
                disabled={paying}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm"
              >
                {paying ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
                Pay All Due
              </Button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Search */}
      <div className="animate-fade-in" style={{ animationDelay: "180ms" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search billers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Bills List */}
      <div className="animate-fade-in-up space-y-2" style={{ animationDelay: "200ms" }}>
        {filtered.map((bill) => {
          const cat = billerCategories.find((c) => c.id === bill.categoryId)
          const sc = statusConfig[bill.status]
          const CatIcon = cat?.icon ?? Receipt

          return (
            <GlassCard key={bill.id} padding="none" className="hover:bg-white/[0.06] transition-colors">
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                  <CatIcon className={cn("w-5 h-5", cat?.color ?? "text-muted-foreground")} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{bill.billerName}</span>
                    <GlassBadge variant={sc.badge} size="sm">{sc.label}</GlassBadge>
                    {bill.autopay && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                        <Repeat className="w-2.5 h-2.5" /> Auto
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {bill.accountNumber} · Due {bill.dueDate}
                  </span>
                </div>

                <div className="text-right shrink-0 mr-2">
                  {bill.amount > 0 && (
                    <span className={cn(
                      "text-sm font-mono",
                      bill.status === "paid" ? "text-muted-foreground line-through" : "text-foreground"
                    )}>
                      ${bill.amount.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {bill.status !== "paid" && bill.amount > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setShowPayDialog(bill.id)}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs"
                    >
                      Pay
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAutopay(bill.id)}
                    className={cn("text-xs", bill.autopay ? "text-emerald-400" : "text-muted-foreground")}
                    title={bill.autopay ? "Disable autopay" : "Enable autopay"}
                  >
                    <Repeat className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBiller(bill.id)}
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

      {/* Pay Bill Dialog */}
      <Dialog open={!!showPayDialog} onOpenChange={() => setShowPayDialog(null)}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirm Payment</DialogTitle>
            <DialogDescription>
              {showPayDialog && (() => {
                const bill = bills.find((b) => b.id === showPayDialog)
                return bill ? `Pay $${bill.amount.toFixed(2)} to ${bill.billerName} from your wallet.` : ""
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(null)}>Cancel</Button>
            <Button
              onClick={() => showPayDialog && handlePayBill(showPayDialog)}
              disabled={paying}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {paying ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
              Pay Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Biller Dialog */}
      <Dialog open={showAddBiller} onOpenChange={setShowAddBiller}>
        <DialogContent className="bg-[#0F1B2D] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Biller</DialogTitle>
            <DialogDescription>Set up a new biller for quick bill payments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Biller Name</label>
              <input
                type="text"
                placeholder="e.g., DEWA, Etisalat"
                value={newBiller.name}
                onChange={(e) => setNewBiller({ ...newBiller, name: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Category</label>
              <Select value={newBiller.categoryId} onValueChange={(v) => setNewBiller({ ...newBiller, categoryId: v })}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.10]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {billerCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Account / Reference Number</label>
              <input
                type="text"
                placeholder="Enter your account number"
                value={newBiller.account}
                onChange={(e) => setNewBiller({ ...newBiller, account: e.target.value })}
                className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBiller(false)}>Cancel</Button>
            <Button onClick={handleAddBiller} disabled={paying} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {paying && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Add Biller
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
