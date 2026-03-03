"use client"

import { useState } from "react"
import {
  Users,
  Plus,
  Search,
  Star,
  Trash2,
  Edit3,
  Copy,
  Building2,
  Globe,
  User,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Mail,
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

// ─── Types ───

interface Recipient {
  id: string
  name: string
  email?: string
  phone?: string
  accountType: "internal" | "bank" | "iban" | "crypto"
  accountDetail: string
  country: string
  countryFlag: string
  currency: string
  isFavorite: boolean
  lastUsed: string | null
  avatar?: string
}

const mockRecipients: Recipient[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah@email.com",
    accountType: "internal",
    accountDetail: "@sarahj",
    country: "United States",
    countryFlag: "🇺🇸",
    currency: "USD",
    isFavorite: true,
    lastUsed: "2026-03-01",
  },
  {
    id: "2",
    name: "Ahmed Al-Rashid",
    email: "ahmed@business.ae",
    accountType: "iban",
    accountDetail: "AE07•••••7301",
    country: "UAE",
    countryFlag: "🇦🇪",
    currency: "AED",
    isFavorite: true,
    lastUsed: "2026-02-28",
  },
  {
    id: "3",
    name: "Tech Solutions LLC",
    accountType: "bank",
    accountDetail: "Chase ••••4829",
    country: "United States",
    countryFlag: "🇺🇸",
    currency: "USD",
    isFavorite: false,
    lastUsed: "2026-02-15",
  },
  {
    id: "4",
    name: "Elena García",
    email: "elena@gmail.com",
    accountType: "internal",
    accountDetail: "@elenag",
    country: "United States",
    countryFlag: "🇺🇸",
    currency: "USD",
    isFavorite: false,
    lastUsed: null,
  },
]

const accountTypeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  internal: { label: "PaySafer", icon: User, color: "emerald" },
  bank: { label: "Bank Account", icon: Building2, color: "blue" },
  iban: { label: "IBAN", icon: Globe, color: "amber" },
  crypto: { label: "Crypto Wallet", icon: CreditCard, color: "purple" },
}

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>(mockRecipients)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "favorite">("all")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)

  // Add form
  const [addName, setAddName] = useState("")
  const [addEmail, setAddEmail] = useState("")
  const [addType, setAddType] = useState<"internal" | "bank" | "iban" | "">("")
  const [addDetail, setAddDetail] = useState("")
  const [addSubmitting, setAddSubmitting] = useState(false)

  const filtered = recipients
    .filter((r) => {
      if (filter === "favorite" && !r.isFavorite) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          r.name.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.accountDetail.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      // Favorites first, then by lastUsed
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
      return (b.lastUsed || "").localeCompare(a.lastUsed || "")
    })

  const toggleFavorite = (id: string) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    )
  }

  const confirmRemove = (id: string) => {
    setPendingRemoveId(id)
    setRemoveDialogOpen(true)
  }

  const handleRemove = () => {
    if (!pendingRemoveId) return
    setRecipients((prev) => prev.filter((r) => r.id !== pendingRemoveId))
    toast.success("Recipient removed")
    setRemoveDialogOpen(false)
    setPendingRemoveId(null)
  }

  const handleAdd = async () => {
    if (!addName.trim() || !addType) return
    setAddSubmitting(true)
    await new Promise((r) => setTimeout(r, 1000))

    const newRecipient: Recipient = {
      id: String(Date.now()),
      name: addName,
      email: addEmail || undefined,
      accountType: addType,
      accountDetail: addDetail || "—",
      country: "United States",
      countryFlag: "🇺🇸",
      currency: "USD",
      isFavorite: false,
      lastUsed: null,
    }

    setRecipients((prev) => [newRecipient, ...prev])
    toast.success("Recipient added")
    setAddDialogOpen(false)
    setAddName("")
    setAddEmail("")
    setAddType("")
    setAddDetail("")
    setAddSubmitting(false)
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Recipients</h2>
              <p className="text-sm text-muted-foreground font-light tracking-wide">
                Manage saved beneficiaries for faster transfers
              </p>
            </div>
          </div>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium tracking-wide"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Recipient
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="animate-fade-in flex items-center gap-3" style={{ animationDelay: "100ms" }}>
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or account..."
            className="w-full h-10 rounded-lg bg-white/[0.04] border border-white/[0.10] pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "favorite"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                filter === f
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-white/[0.04]"
              )}
            >
              {f === "all" ? "All" : "⭐ Favorites"}
            </button>
          ))}
        </div>
      </div>

      {/* Recipients List */}
      <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        {filtered.length === 0 ? (
          <GlassCard padding="lg" className="text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              {search ? "No matching recipients" : "No recipients yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? "Try a different search term" : "Add your first recipient to send money faster"}
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const typeConfig = accountTypeConfig[r.accountType]
              return (
                <GlassCard key={r.id} padding="none" className="hover:bg-white/[0.06] transition-colors">
                  <div className="flex items-center gap-4 p-4">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 text-sm font-medium text-muted-foreground">
                      {r.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{r.name}</span>
                        <span className="text-[10px]">{r.countryFlag}</span>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full",
                            typeConfig.color === "emerald" && "bg-emerald-500/10 text-emerald-400",
                            typeConfig.color === "blue" && "bg-blue-500/10 text-blue-400",
                            typeConfig.color === "amber" && "bg-amber-500/10 text-amber-400",
                            typeConfig.color === "purple" && "bg-purple-500/10 text-purple-400"
                          )}
                        >
                          {typeConfig.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {r.accountDetail}
                        {r.email && <span className="ml-2 text-white/20">·</span>}
                        {r.email && <span className="ml-2">{r.email}</span>}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(r.id)}
                        className="text-xs"
                        title={r.isFavorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star
                          className={cn(
                            "w-3.5 h-3.5",
                            r.isFavorite ? "text-amber-400 fill-amber-400" : "text-muted-foreground"
                          )}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(r.accountDetail)
                          toast.success("Account detail copied")
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                        title="Copy account"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmRemove(r.id)}
                        className="text-xs text-muted-foreground hover:text-red-400"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Recipient Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="glass-card border-white/[0.10] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Add Recipient</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Save a new beneficiary for faster future transfers
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
                Full Name
              </label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Recipient's full name"
                className="w-full h-10 rounded-lg bg-white/[0.04] border border-white/[0.10] px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
                Email (optional)
              </label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full h-10 rounded-lg bg-white/[0.04] border border-white/[0.10] px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
                Account Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["internal", "bank", "iban"] as const).map((t) => {
                  const cfg = accountTypeConfig[t]
                  return (
                    <button
                      key={t}
                      onClick={() => setAddType(t)}
                      className={cn(
                        "p-2.5 rounded-lg border text-center transition-all",
                        addType === t
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                      )}
                    >
                      <cfg.icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {addType && (
              <div>
                <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
                  {addType === "internal" ? "PaySafer Username" : addType === "bank" ? "Account Number" : "IBAN"}
                </label>
                <input
                  type="text"
                  value={addDetail}
                  onChange={(e) => setAddDetail(e.target.value)}
                  placeholder={
                    addType === "internal" ? "@username" : addType === "bank" ? "Account number" : "AE07..."
                  }
                  className="w-full h-10 rounded-lg bg-white/[0.04] border border-white/[0.10] px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-emerald-500/50 transition-colors font-mono tracking-wider"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setAddDialogOpen(false)} className="text-muted-foreground">
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!addName.trim() || !addType || addSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium tracking-wide"
            >
              {addSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Add Recipient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="glass-card border-white/[0.10] max-w-sm">
          <DialogHeader>
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <DialogTitle className="text-center">Remove Recipient?</DialogTitle>
            <DialogDescription className="text-center text-sm">
              This will remove them from your saved recipients. You can always add them back later.
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
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
