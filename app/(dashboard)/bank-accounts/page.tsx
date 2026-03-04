"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getBankAccounts,
  addBankAccount,
  setDefaultAccount,
  removeBankAccount,
  type BankAccount,
} from "@/lib/actions/bank-accounts"
import {
  Building2,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Star,
  StarOff,
  CreditCard,
  Globe,
  Loader2,
  AlertTriangle,
  Shield,
  Eye,
  EyeOff,
  Copy,
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

const methodLabels: Record<string, { label: string; color: string }> = {
  plaid: { label: "Plaid", color: "emerald" },
  ach: { label: "ACH", color: "blue" },
  iban: { label: "IBAN", color: "amber" },
}

const statusStyles: Record<string, { badge: "emerald" | "blue" | "red"; label: string }> = {
  verified: { badge: "emerald", label: "Verified" },
  pending: { badge: "blue", label: "Pending" },
  failed: { badge: "red", label: "Failed" },
}

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [showNumbers, setShowNumbers] = useState(false)

  // Add dialog state
  const [addMethod, setAddMethod] = useState<"plaid" | "ach" | "iban" | "">("")
  const [addNickname, setAddNickname] = useState("")
  const [addRouting, setAddRouting] = useState("")
  const [addAccountNum, setAddAccountNum] = useState("")
  const [addIban, setAddIban] = useState("")
  const [addSubmitting, setAddSubmitting] = useState(false)

  const loadAccounts = useCallback(async () => {
    setPageLoading(true)
    const data = await getBankAccounts()
    setAccounts(data)
    setPageLoading(false)
  }, [])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  const handleSetDefault = async (id: string) => {
    const res = await setDefaultAccount(id)
    if (res.success) {
      setAccounts((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === id }))
      )
      toast.success("Default account updated")
    } else {
      toast.error("Failed to update default")
    }
  }

  const confirmRemove = (id: string) => {
    setPendingRemoveId(id)
    setRemoveDialogOpen(true)
  }

  const handleRemove = async () => {
    if (!pendingRemoveId) return
    const res = await removeBankAccount(pendingRemoveId)
    if (res.success) {
      setAccounts((prev) => prev.filter((a) => a.id !== pendingRemoveId))
      toast.success("Bank account removed")
    } else {
      toast.error("Failed to remove account")
    }
    setRemoveDialogOpen(false)
    setPendingRemoveId(null)
  }

  const handleAddAccount = async () => {
    setAddSubmitting(true)

    const last4 = addAccountNum.slice(-4) || addIban.slice(-4) || "0000"
    const routingOrIban =
      addMethod === "iban"
        ? addIban.slice(0, 4) + "•••" + addIban.slice(-4)
        : "•••••" + addRouting.slice(-4)

    const res = await addBankAccount({
      nickname: addNickname || "New Account",
      method: addMethod as "ach" | "iban" | "plaid",
      last4,
      routingOrIban,
      currency: addMethod === "iban" ? "AED" : "USD",
      bankName: addMethod === "iban" ? "International Bank" : "New Bank",
    })

    if (res.success && res.account) {
      setAccounts((prev) => [...prev, res.account!])
      toast.success(
        addMethod === "plaid"
          ? "Account connected via Plaid!"
          : "Account added — verification in 1-2 business days"
      )
    } else {
      toast.error("Failed to add account")
    }
    setAddDialogOpen(false)
    resetAddForm()
    setAddSubmitting(false)
  }

  const resetAddForm = () => {
    setAddMethod("")
    setAddNickname("")
    setAddRouting("")
    setAddAccountNum("")
    setAddIban("")
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Bank Accounts
              </h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Manage linked bank accounts for deposits and withdrawals
              </p>
            </div>
          </div>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium tracking-wide"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Security note */}
      <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md" className="border-emerald-500/20">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-sm text-muted-foreground">
              All bank details are encrypted with AES-256. We use Plaid for instant secure connections and
              never store full account numbers on our servers.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNumbers(!showNumbers)}
              className="shrink-0 text-xs"
            >
              {showNumbers ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
              {showNumbers ? "Hide" : "Show"}
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Accounts List */}
      <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        {accounts.length === 0 ? (
          <GlassCard padding="lg" className="text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No bank accounts linked</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add a bank account to enable deposits and withdrawals
            </p>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Link Your First Account
            </Button>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const method = methodLabels[account.method]
              const status = statusStyles[account.status]
              return (
                <GlassCard key={account.id} padding="none" className="hover:bg-white/[0.06] transition-colors">
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{account.nickname}</span>
                          {account.isDefault && (
                            <GlassBadge variant="emerald" size="sm">Default</GlassBadge>
                          )}
                          <GlassBadge variant={status.badge} size="sm">{status.label}</GlassBadge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {account.bankName} · {account.accountType === "checking" ? "Checking" : "Savings"} · ••••{account.last4}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-white/30 tracking-wide">
                            {showNumbers ? account.routingOrIban : "••••••••"}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                              method.color === "emerald" && "bg-emerald-500/10 text-emerald-400",
                              method.color === "blue" && "bg-blue-500/10 text-blue-400",
                              method.color === "amber" && "bg-amber-500/10 text-amber-400"
                            )}
                          >
                            {method.label}
                          </span>
                          <span className="text-[10px] text-white/30">{account.currency}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!account.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(account.id)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                            title="Set as default"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmRemove(account.id)}
                          className="text-xs text-muted-foreground hover:text-red-400"
                          title="Remove account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Account Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="glass-card border-white/[0.10] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Link Bank Account</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose how you&apos;d like to connect your bank
            </DialogDescription>
          </DialogHeader>

          {/* Method selection */}
          {!addMethod ? (
            <div className="space-y-3 py-2">
              {[
                { id: "plaid" as const, label: "Connect with Plaid", desc: "Instant — secure bank login", icon: Shield, color: "emerald" },
                { id: "ach" as const, label: "ACH / Routing Number", desc: "Manual — 1-2 days to verify", icon: CreditCard, color: "blue" },
                { id: "iban" as const, label: "IBAN / SWIFT", desc: "International & UAE accounts", icon: Globe, color: "amber" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setAddMethod(m.id)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all text-left"
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center",
                      m.color === "emerald" && "bg-emerald-500/10",
                      m.color === "blue" && "bg-blue-500/10",
                      m.color === "amber" && "bg-amber-500/10"
                    )}
                  >
                    <m.icon
                      className={cn(
                        "w-4 h-4",
                        m.color === "emerald" && "text-emerald-400",
                        m.color === "blue" && "text-blue-400",
                        m.color === "amber" && "text-amber-400"
                      )}
                    />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">{m.label}</span>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
                  Account Nickname
                </label>
                <input
                  type="text"
                  value={addNickname}
                  onChange={(e) => setAddNickname(e.target.value)}
                  placeholder="e.g. Main Checking"
                  className="w-full h-10 rounded-lg bg-white/[0.04] border border-white/[0.10] px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {addMethod === "ach" && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
                      Routing Number
                    </label>
                    <input
                      type="text"
                      value={addRouting}
                      onChange={(e) => setAddRouting(e.target.value.replace(/\D/g, "").slice(0, 9))}
                      placeholder="9 digit routing number"
                      className="w-full h-10 rounded-lg bg-white/[0.04] border border-white/[0.10] px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono tracking-wider"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={addAccountNum}
                      onChange={(e) => setAddAccountNum(e.target.value.replace(/\D/g, "").slice(0, 17))}
                      placeholder="Account number"
                      className="w-full h-10 rounded-lg bg-white/[0.04] border border-white/[0.10] px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono tracking-wider"
                    />
                  </div>
                </>
              )}

              {addMethod === "iban" && (
                <div>
                  <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
                    IBAN
                  </label>
                  <input
                    type="text"
                    value={addIban}
                    onChange={(e) => setAddIban(e.target.value.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 34))}
                    placeholder="AE07 0331 2345 6789 0123 456"
                    className="w-full h-10 rounded-lg bg-white/[0.04] border border-white/[0.10] px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono tracking-wider"
                  />
                </div>
              )}

              {addMethod === "plaid" && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center space-y-3">
                  <Shield className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll be redirected to Plaid to securely log in to your bank.
                    We never see your bank credentials.
                  </p>
                </div>
              )}
            </div>
          )}

          {addMethod && (
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setAddMethod("")} className="text-muted-foreground">
                Back
              </Button>
              <Button
                onClick={handleAddAccount}
                disabled={addSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium tracking-wide"
              >
                {addSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {addMethod === "plaid" ? "Connect with Plaid" : "Add Account"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="glass-card border-white/[0.10] max-w-sm">
          <DialogHeader>
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <DialogTitle className="text-center">Remove Bank Account?</DialogTitle>
            <DialogDescription className="text-center text-sm">
              This will unlink the account from PaySafer. Any pending transfers to this account may be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRemoveDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleRemove}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              Remove Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
