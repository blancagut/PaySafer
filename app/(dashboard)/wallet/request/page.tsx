"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Search,
  ArrowDownRight,
  Check,
  ChevronRight,
  Users,
  Star,
  Loader2,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { searchUsers, getContacts, getRecentRecipients, type UserSearchResult } from "@/lib/actions/contacts"
import { requestMoney } from "@/lib/actions/transfers"
import { toast } from "sonner"

const CURRENCIES = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "British Pound" },
] as const

type CurrencyCode = typeof CURRENCIES[number]["code"]

function getCurrencySymbol(code: string) {
  return CURRENCIES.find(c => c.code === code)?.symbol ?? "€"
}

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

function getInitials(name: string | null | undefined) {
  if (!name) return "?"
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

type Step = "recipient" | "amount" | "success"

export default function RequestMoneyPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("recipient")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [recentRecipients, setRecentRecipients] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState<CurrencyCode>("EUR")
  const [note, setNote] = useState("")
  const [sending, setSending] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function loadInitial() {
      const [contactsRes, recentRes] = await Promise.all([
        getContacts(),
        getRecentRecipients(8),
      ])
      if (contactsRes.data) setContacts(contactsRes.data)
      if (recentRes.data) setRecentRecipients(recentRes.data)
    }
    loadInitial()
  }, [])

  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setSearching(true)
    const res = await searchUsers(q.trim())
    if (res.data) setResults(res.data)
    setSearching(false)
  }, [])

  function onQueryChange(value: string) {
    setQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => handleSearch(value), 300)
  }

  function selectRecipient(user: UserSearchResult) {
    setSelectedUser(user)
    setStep("amount")
  }

  function handleAmountChange(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, "")
    const parts = cleaned.split(".")
    if (parts.length > 2) return
    if (parts[1] && parts[1].length > 2) return
    setAmount(cleaned)
  }

  async function handleRequest() {
    if (!selectedUser || !amount) return
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Enter a valid amount")
      return
    }

    setSending(true)
    const result = await requestMoney({
      payerIdentifier: selectedUser.username || selectedUser.email,
      amount: numAmount,
      currency,
      note: note || undefined,
    })
    setSending(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    setStep("success")
    toast.success("Payment request sent!")
  }

  const numAmount = parseFloat(amount) || 0

  return (
    <div className="max-w-lg mx-auto pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (step === "amount") setStep("recipient")
            else router.push("/wallet")
          }}
          className="h-9 w-9 p-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">Request Money</h2>
          <p className="text-xs text-muted-foreground">
            {step === "recipient" && "Choose who to request money from"}
            {step === "amount" && `From ${selectedUser?.username ? `$${selectedUser.username}` : selectedUser?.full_name || selectedUser?.email}`}
            {step === "success" && "Request sent!"}
          </p>
        </div>
      </div>

      {/* Step 1: Select Payer */}
      {step === "recipient" && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder="Search by $username, email, or name..."
              className="pl-10 bg-white/[0.04] border-white/[0.10] h-11"
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            )}
          </div>

          {results.length > 0 && (
            <GlassCard padding="none">
              <div className="divide-y divide-white/[0.06]">
                {results.map(user => (
                  <button
                    key={user.id}
                    onClick={() => selectRecipient(user)}
                    className="flex items-center gap-3 w-full p-3 hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <Avatar className="w-10 h-10 border border-white/[0.06]">
                      <AvatarFallback className="bg-white/[0.06] text-foreground text-sm">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.full_name || user.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.username ? `$${user.username}` : user.email}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </GlassCard>
          )}

          {query.length >= 2 && !searching && results.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No users found for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {!query && recentRecipients.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent</span>
              </div>
              <GlassCard padding="none">
                <div className="divide-y divide-white/[0.06]">
                  {recentRecipients.map((user: any) => (
                    <button
                      key={user.id}
                      onClick={() => selectRecipient(user)}
                      className="flex items-center gap-3 w-full p-3 hover:bg-white/[0.04] transition-colors text-left"
                    >
                      <Avatar className="w-10 h-10 border border-white/[0.06]">
                        <AvatarFallback className="bg-white/[0.06] text-foreground text-sm">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{user.full_name || user.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.username ? `$${user.username}` : user.email}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Enter Amount */}
      {step === "amount" && selectedUser && (
        <div className="space-y-6 animate-fade-in-up">
          <GlassCard padding="sm" className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border border-white/[0.06]">
              <AvatarFallback className="bg-white/[0.06] text-foreground">
                {getInitials(selectedUser.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{selectedUser.full_name || selectedUser.email}</p>
              <p className="text-xs text-muted-foreground">{selectedUser.username ? `$${selectedUser.username}` : selectedUser.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setStep("recipient"); setSelectedUser(null) }} className="text-xs text-muted-foreground">
              Change
            </Button>
          </GlassCard>

          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Request amount</p>
            {/* Currency selector */}
            <div className="flex justify-center gap-1 mb-4">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    currency === c.code
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] border border-white/[0.10]"
                  }`}
                >
                  {c.symbol} {c.code}
                </button>
              ))}
            </div>
            <div className="relative inline-flex items-baseline justify-center">
              <span className="text-3xl text-muted-foreground mr-1">{getCurrencySymbol(currency)}</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => handleAmountChange(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="text-6xl md:text-7xl font-bold text-foreground bg-transparent border-none outline-none text-center w-64 placeholder:text-white/10"
              />
            </div>
          </div>

          <div className="flex justify-center gap-2">
            {[5, 10, 20, 50, 100].map(preset => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => setAmount(preset.toString())}
                className={`bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] text-xs ${
                  amount === preset.toString() ? "border-primary/50 bg-primary/10" : ""
                }`}
              >
                {getCurrencySymbol(currency)}{preset}
              </Button>
            ))}
          </div>

          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="What's this for? (optional)"
            maxLength={100}
            className="bg-white/[0.04] border-white/[0.10] text-center"
          />

          <Button
            onClick={handleRequest}
            disabled={sending || !amount || numAmount <= 0}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-lg gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <ArrowDownRight className="w-5 h-5" />
                Request {numAmount > 0 ? formatCurrency(numAmount, currency) : ""}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Step 3: Success */}
      {step === "success" && (
        <div className="text-center space-y-6 animate-fade-in-up py-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">Request Sent!</p>
            <p className="text-lg text-primary font-semibold mt-1">{formatCurrency(numAmount, currency)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              from {selectedUser?.username ? `$${selectedUser.username}` : selectedUser?.full_name || selectedUser?.email}
            </p>
          </div>
          {note && <p className="text-sm text-muted-foreground italic">&ldquo;{note}&rdquo;</p>}
          <p className="text-xs text-muted-foreground">They&apos;ll get a notification and can pay with one tap.</p>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setStep("recipient"); setSelectedUser(null); setAmount(""); setNote(""); setCurrency("EUR")
              }}
              className="flex-1 bg-white/[0.04] border-white/[0.10]"
            >
              Request More
            </Button>
            <Button onClick={() => router.push("/wallet")} className="flex-1">
              Back to Wallet
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
