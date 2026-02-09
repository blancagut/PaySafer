"use client"

import React, { useState } from "react"
import {
  Banknote,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowDownToLine,
  Plus,
  Trash2,
  AlertTriangle,
  Shield,
  DollarSign,
  Calendar,
  Loader2,
  ExternalLink,
  Info,
  CreditCard,
  Hash,
  RefreshCw,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react"
import { GlassCard, GlassContainer, GlassStat } from "@/components/glass"
import { GlassInput, GlassSelect } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

type PayoutStatus = "pending" | "processing" | "completed" | "failed" | "cancelled"
type PaymentMethodType = "bank_transfer" | "paypal" | "crypto" | "stripe"

interface PaymentMethod {
  id: string
  type: PaymentMethodType
  label: string
  last4: string
  isDefault: boolean
  bankName?: string
  routingNumber?: string
}

interface PayoutRequest {
  id: string
  amount: number
  currency: string
  status: PayoutStatus
  method: PaymentMethodType
  methodLabel: string
  createdAt: string
  completedAt?: string
  fee: number
  reference: string
}

// Demo data
const demoMethods: PaymentMethod[] = [
  { id: "pm_1", type: "bank_transfer", label: "Chase Checking ****4892", last4: "4892", isDefault: true, bankName: "JPMorgan Chase", routingNumber: "****1234" },
  { id: "pm_2", type: "paypal", label: "PayPal — user@email.com", last4: "mail", isDefault: false },
]

const demoPayouts: PayoutRequest[] = [
  { id: "PO-2401", amount: 2500, currency: "USD", status: "completed", method: "bank_transfer", methodLabel: "Chase ****4892", createdAt: "2025-01-15T10:30:00Z", completedAt: "2025-01-17T14:20:00Z", fee: 2.50, reference: "TXN-8824" },
  { id: "PO-2402", amount: 850, currency: "USD", status: "processing", method: "bank_transfer", methodLabel: "Chase ****4892", createdAt: "2025-01-18T09:15:00Z", fee: 1.00, reference: "TXN-9012" },
  { id: "PO-2403", amount: 150, currency: "USD", status: "pending", method: "paypal", methodLabel: "PayPal — user@email.com", createdAt: "2025-01-19T16:45:00Z", fee: 0.50, reference: "TXN-9105" },
  { id: "PO-2404", amount: 3200, currency: "USD", status: "completed", method: "bank_transfer", methodLabel: "Chase ****4892", createdAt: "2025-01-10T08:00:00Z", completedAt: "2025-01-12T11:30:00Z", fee: 3.00, reference: "TXN-8710" },
  { id: "PO-2405", amount: 500, currency: "USD", status: "failed", method: "paypal", methodLabel: "PayPal — user@email.com", createdAt: "2025-01-08T14:00:00Z", fee: 0, reference: "TXN-8650" },
  { id: "PO-2406", amount: 1200, currency: "USD", status: "completed", method: "bank_transfer", methodLabel: "Chase ****4892", createdAt: "2025-01-05T12:00:00Z", completedAt: "2025-01-07T09:45:00Z", fee: 1.50, reference: "TXN-8501" },
]

const statusConfig: Record<PayoutStatus, { label: string; variant: "emerald" | "blue" | "amber" | "red" | "muted"; icon: React.ElementType }> = {
  completed: { label: "Completed", variant: "emerald", icon: CheckCircle2 },
  processing: { label: "Processing", variant: "blue", icon: RefreshCw },
  pending: { label: "Pending", variant: "amber", icon: Clock },
  failed: { label: "Failed", variant: "red", icon: XCircle },
  cancelled: { label: "Cancelled", variant: "muted", icon: XCircle },
}

const methodIcon: Record<PaymentMethodType, React.ElementType> = {
  bank_transfer: Building2,
  paypal: DollarSign,
  crypto: Hash,
  stripe: CreditCard,
}

export default function PayoutsPage() {
  const [payouts] = useState<PayoutRequest[]>(demoPayouts)
  const [methods] = useState<PaymentMethod[]>(demoMethods)
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [showAddMethodDialog, setShowAddMethodDialog] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    method: methods.find((m) => m.isDefault)?.id || "",
    note: "",
  })

  const availableBalance = 4280.50
  const pendingPayouts = payouts.filter((p) => p.status === "pending" || p.status === "processing").reduce((sum, p) => sum + p.amount, 0)
  const totalPaidOut = payouts.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0)
  const totalFees = payouts.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.fee, 0)

  const filteredPayouts = payouts
    .filter((p) => filterStatus === "all" || p.status === filterStatus)
    .filter((p) => !searchQuery || p.id.toLowerCase().includes(searchQuery.toLowerCase()) || p.reference.toLowerCase().includes(searchQuery.toLowerCase()) || p.methodLabel.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(withdrawForm.amount)
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return }
    if (amount > availableBalance) { toast.error("Insufficient balance"); return }
    if (amount < 10) { toast.error("Minimum withdrawal is $10.00"); return }
    if (!withdrawForm.method) { toast.error("Select a payout method"); return }
    setWithdrawing(true)
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500))
    toast.success(`Withdrawal of $${amount.toFixed(2)} initiated`)
    setWithdrawing(false)
    setShowWithdrawDialog(false)
    setWithdrawForm({ amount: "", method: methods.find((m) => m.isDefault)?.id || "", note: "" })
  }

  const feeEstimate = (amount: number) => {
    if (amount <= 0) return 0
    return Math.max(0.50, amount * 0.001)  // 0.1% min $0.50
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Banknote className="w-6 h-6 text-primary" />
            Payouts
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage withdrawals and payout methods</p>
        </div>
        <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
              <ArrowDownToLine className="w-4 h-4 mr-2" />
              Withdraw Funds
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-white/[0.08]">
            <DialogHeader>
              <DialogTitle className="text-foreground">Withdraw Funds</DialogTitle>
              <DialogDescription>Transfer funds from your PaySafer balance to your bank or PayPal.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                <p className="text-xs text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold text-primary">${availableBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-foreground">Amount (USD)</Label>
                <GlassInput
                  type="number"
                  step="0.01"
                  min="10"
                  placeholder="0.00"
                  value={withdrawForm.amount}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                  icon={<DollarSign className="w-3.5 h-3.5" />}
                  required
                />
                {parseFloat(withdrawForm.amount) > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Fee: ${feeEstimate(parseFloat(withdrawForm.amount)).toFixed(2)} · You receive: ${(parseFloat(withdrawForm.amount) - feeEstimate(parseFloat(withdrawForm.amount))).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-foreground">Payout Method</Label>
                <Select value={withdrawForm.method} onValueChange={(v) => setWithdrawForm({ ...withdrawForm, method: v })}>
                  <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08]"><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    {methods.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-2">
                          {m.label}
                          {m.isDefault && <span className="text-[10px] text-primary font-medium">(Default)</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-foreground">Note (optional)</Label>
                <GlassInput placeholder="e.g. January freelance payout" value={withdrawForm.note} onChange={(e) => setWithdrawForm({ ...withdrawForm, note: e.target.value })} />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">Bank transfers take 1-3 business days. PayPal is typically instant.</p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowWithdrawDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={withdrawing} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {withdrawing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : "Confirm Withdrawal"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <GlassStat label="Available Balance" value={`$${availableBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} icon={<Banknote className="w-5 h-5" />} glowColor="blue" />
        <GlassStat label="Pending Payouts" value={`$${pendingPayouts.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} icon={<Clock className="w-5 h-5" />} glowColor="amber" />
        <GlassStat label="Total Paid Out" value={`$${totalPaidOut.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} icon={<CheckCircle2 className="w-5 h-5" />} glowColor="emerald" />
        <GlassStat label="Total Fees Paid" value={`$${totalFees.toFixed(2)}`} icon={<DollarSign className="w-5 h-5" />} glowColor="purple" />
      </div>

      {/* Payment Methods */}
      <GlassContainer
        header={{
          title: "Payout Methods",
          description: "Your saved payment destinations",
          action: (
            <Dialog open={showAddMethodDialog} onOpenChange={setShowAddMethodDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08]">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Method
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-white/[0.08]">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Add Payout Method</DialogTitle>
                  <DialogDescription>Connect a bank account, PayPal, or other payout destination.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  {[
                    { type: "bank_transfer", label: "Bank Account", desc: "ACH direct deposit (1-3 days)", icon: Building2 },
                    { type: "paypal", label: "PayPal", desc: "Instant transfer to PayPal", icon: DollarSign },
                    { type: "stripe", label: "Stripe Connect", desc: "Stripe-managed payouts", icon: CreditCard },
                    { type: "crypto", label: "Crypto Wallet", desc: "USDC / USDT payout", icon: Hash },
                  ].map((option) => (
                    <button
                      key={option.type}
                      onClick={() => { toast.info(`${option.label} integration coming soon`); setShowAddMethodDialog(false) }}
                      className="flex items-center gap-3 w-full p-4 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10] transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                        <option.icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{option.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{option.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          ),
        }}
      >
        <div className="space-y-3">
          {methods.map((m) => {
            const Ic = methodIcon[m.type]
            return (
              <div key={m.id} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                    <Ic className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{m.label}</p>
                      {m.isDefault && <GlassBadge variant="primary" size="sm">Default</GlassBadge>}
                    </div>
                    {m.bankName && <p className="text-xs text-muted-foreground mt-0.5">{m.bankName} · Routing {m.routingNumber}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!m.isDefault && (
                    <Button variant="outline" size="sm" className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] text-xs" onClick={() => toast.info("Set as default")}>
                      Set Default
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-300 text-xs" onClick={() => toast.info("Remove method")}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )
          })}

          {methods.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No payout methods added yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Add a bank account or PayPal to start withdrawing funds</p>
            </div>
          )}
        </div>
      </GlassContainer>

      {/* Payout History */}
      <GlassContainer
        header={{
          title: "Payout History",
          description: "Your withdrawal activity",
        }}
      >
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <GlassInput placeholder="Search by ID, reference, or method…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} icon={<Search className="w-3.5 h-3.5" />} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[160px] h-10 bg-white/[0.03] border-white/[0.08]">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs border-b border-white/[0.06]">
                <th className="text-left py-3 px-3 font-medium">ID</th>
                <th className="text-left py-3 px-3 font-medium">Date</th>
                <th className="text-left py-3 px-3 font-medium">Method</th>
                <th className="text-right py-3 px-3 font-medium">Amount</th>
                <th className="text-right py-3 px-3 font-medium">Fee</th>
                <th className="text-center py-3 px-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayouts.map((payout) => {
                const cfg = statusConfig[payout.status]
                const StatusIcon = cfg.icon
                const MIcon = methodIcon[payout.method]
                return (
                  <tr key={payout.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3">
                      <div>
                        <p className="font-mono text-xs text-foreground">{payout.id}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Ref: {payout.reference}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="text-xs text-foreground">{new Date(payout.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      {payout.completedAt && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Completed {new Date(payout.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <MIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-foreground">{payout.methodLabel}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-foreground text-sm">
                      ${payout.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right text-xs text-muted-foreground">
                      {payout.fee > 0 ? `-$${payout.fee.toFixed(2)}` : "—"}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <GlassBadge variant={cfg.variant} size="sm">
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {cfg.label}
                      </GlassBadge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredPayouts.length === 0 && (
            <div className="text-center py-12">
              <Banknote className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No payouts found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{searchQuery || filterStatus !== "all" ? "Try adjusting your filters" : "Your payout history will appear here"}</p>
            </div>
          )}
        </div>
      </GlassContainer>

      {/* Fee Schedule */}
      <GlassCard padding="sm">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Fee Schedule</p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-muted-foreground">Bank Transfer</p>
                <p className="text-foreground font-semibold mt-0.5">0.1% (min $0.50)</p>
                <p className="text-muted-foreground/60 mt-0.5">1-3 business days</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-muted-foreground">PayPal</p>
                <p className="text-foreground font-semibold mt-0.5">0.5% (min $1.00)</p>
                <p className="text-muted-foreground/60 mt-0.5">Instant</p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-muted-foreground">Crypto (USDC/USDT)</p>
                <p className="text-foreground font-semibold mt-0.5">Flat $2.00</p>
                <p className="text-muted-foreground/60 mt-0.5">~15 minutes</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
