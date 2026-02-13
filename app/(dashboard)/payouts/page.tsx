"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Banknote,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Shield,
  DollarSign,
  Loader2,
  Info,
  CreditCard,
  RefreshCw,
  ChevronRight,
  Filter,
  Search,
  ArrowLeft,
  Zap,
  Globe,
  MapPin,
  User,
  Coins,
  Wallet,
  Copy,
  ExternalLink,
  ChevronDown,
  Eye,
} from "lucide-react"
import { SiWesternunion, SiMoneygram, SiBitcoin, SiEthereum, SiTether, SiSolana } from "react-icons/si"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard, GlassContainer, GlassStat } from "@/components/glass"
import { GlassInput } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
import {
  GetCashIcon,
  CardPayoutIcon,
  BankPayoutIcon,
  CryptoPayoutIcon,
  PayoutMethodIcon,
} from "@/components/payout-method-icon"
import { CryptoCoinCard, NetworkSelectCard, CRYPTO_OPTIONS } from "@/components/crypto-icons"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  getPayoutMethods,
  getPayoutHistory,
  getPayoutStats,
  addPayoutMethod,
  removePayoutMethod,
  setDefaultPayoutMethod,
  requestWithdrawal,
  cancelPayout,
} from "@/lib/actions/payouts"
import {
  calculatePayoutFeeSync,
  type PayoutMethod,
  type PayoutRequest,
  type PayoutMethodType,
} from "@/lib/payout-utils"

// ─── Status config ───
type PayoutStatus = "pending" | "processing" | "completed" | "failed" | "cancelled"

const statusConfig: Record<PayoutStatus, { label: string; variant: "emerald" | "blue" | "amber" | "red" | "muted"; icon: React.ElementType }> = {
  completed: { label: "Completed", variant: "emerald", icon: CheckCircle2 },
  processing: { label: "Processing", variant: "blue", icon: RefreshCw },
  pending: { label: "Pending", variant: "amber", icon: Clock },
  failed: { label: "Failed", variant: "red", icon: XCircle },
  cancelled: { label: "Cancelled", variant: "muted", icon: XCircle },
}

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
}

// ─── Country list for cash pickup ───
const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bangladesh","Belarus","Belgium","Bolivia","Bosnia","Brazil","Bulgaria","Cambodia",
  "Cameroon","Canada","Chile","China","Colombia","Congo","Costa Rica","Croatia","Cuba",
  "Czech Republic","Denmark","Dominican Republic","Ecuador","Egypt","El Salvador","Estonia",
  "Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece","Guatemala","Haiti",
  "Honduras","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Latvia","Lebanon","Lithuania",
  "Malaysia","Mexico","Moldova","Morocco","Mozambique","Nepal","Netherlands","New Zealand",
  "Nicaragua","Nigeria","Norway","Pakistan","Panama","Paraguay","Peru","Philippines","Poland",
  "Portugal","Romania","Russia","Saudi Arabia","Senegal","Serbia","Singapore","Slovakia",
  "Slovenia","Somalia","South Africa","South Korea","Spain","Sri Lanka","Sudan","Sweden",
  "Switzerland","Syria","Taiwan","Tanzania","Thailand","Tunisia","Turkey","Uganda","Ukraine",
  "United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam"
]

// ─── Active wizard type ───
type WizardType = 'cash' | 'card' | 'bank' | 'crypto' | null

export default function PayoutsPage() {
  const isMobile = useIsMobile()
  const [payouts, setPayouts] = useState<PayoutRequest[]>([])
  const [methods, setMethods] = useState<PayoutMethod[]>([])
  const [stats, setStats] = useState<{
    availableBalance: number
    currency: string
    pendingPayouts: number
    totalPaidOut: number
    totalFees: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Wizard state
  const [activeWizard, setActiveWizard] = useState<WizardType>(null)
  const [wizardStep, setWizardStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Cash wizard state
  const [cashProvider, setCashProvider] = useState<'western_union' | 'moneygram' | null>(null)
  const [cashForm, setCashForm] = useState({ recipientName: '', city: '', country: '', amount: '', note: '' })

  // Card wizard state
  const [cardSpeed, setCardSpeed] = useState<'express' | 'standard' | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [cardAmount, setCardAmount] = useState('')

  // Bank wizard state
  const [bankType, setBankType] = useState<'domestic' | 'international' | null>(null)
  const [bankForm, setBankForm] = useState({
    bankName: '', accountNumber: '', routingNumber: '',
    iban: '', swiftCode: '', country: '', amount: '', note: '',
  })

  // Crypto wizard state
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [cryptoForm, setCryptoForm] = useState({ address: '', amount: '', note: '' })

  // Detail view
  const [viewingPayout, setViewingPayout] = useState<PayoutRequest | null>(null)

  const [showSavedMethods, setShowSavedMethods] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [methodsRes, historyRes, statsRes] = await Promise.all([
        getPayoutMethods(),
        getPayoutHistory({ status: filterStatus === "all" ? undefined : filterStatus }),
        getPayoutStats(),
      ])
      if (methodsRes.data) setMethods(methodsRes.data)
      if (historyRes.data) setPayouts(historyRes.data)
      if (statsRes.data) setStats(statsRes.data)
    } catch {
      toast.error("Failed to load payout data")
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => { loadData() }, [loadData])

  const availableBalance = stats?.availableBalance ?? 0
  const currency = stats?.currency ?? "EUR"

  const filteredPayouts = payouts.filter(
    (p) =>
      !searchQuery ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.reference || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.method_label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ─── Wizard Helpers ───
  const resetWizard = () => {
    setActiveWizard(null)
    setWizardStep(1)
    setCashProvider(null)
    setCashForm({ recipientName: '', city: '', country: '', amount: '', note: '' })
    setCardSpeed(null)
    setSelectedCardId(null)
    setCardAmount('')
    setBankType(null)
    setBankForm({ bankName: '', accountNumber: '', routingNumber: '', iban: '', swiftCode: '', country: '', amount: '', note: '' })
    setSelectedCrypto(null)
    setSelectedNetwork(null)
    setCryptoForm({ address: '', amount: '', note: '' })
  }

  const handleRemoveMethod = async (id: string) => {
    const result = await removePayoutMethod(id)
    if (result.error) toast.error(result.error)
    else { toast.success("Payout method removed"); loadData() }
  }

  const handleSetDefault = async (id: string) => {
    const result = await setDefaultPayoutMethod(id)
    if (result.error) toast.error(result.error)
    else { toast.success("Default method updated"); loadData() }
  }

  const handleCancelPayout = async (id: string) => {
    const result = await cancelPayout(id)
    if (result.error) toast.error(result.error)
    else { toast.success("Payout cancelled, funds returned to wallet"); loadData() }
  }

  // ─── Cash Submit ───
  const handleCashSubmit = async () => {
    if (!cashProvider) return
    const amount = parseFloat(cashForm.amount)
    if (!amount || amount < 10) { toast.error("Minimum withdrawal is €10.00"); return }
    if (amount > availableBalance) { toast.error("Insufficient balance"); return }
    if (!cashForm.recipientName.trim()) { toast.error("Enter the recipient's full name"); return }
    if (!cashForm.city.trim()) { toast.error("Enter the pickup city"); return }
    if (!cashForm.country) { toast.error("Select the country"); return }

    setSubmitting(true)
    const result = await requestWithdrawal({
      amount,
      methodType: cashProvider,
      methodLabel: `${cashProvider === 'western_union' ? 'Western Union' : 'MoneyGram'} — ${cashForm.recipientName}`,
      recipientName: cashForm.recipientName.trim(),
      city: cashForm.city.trim(),
      country: cashForm.country,
      note: cashForm.note || undefined,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Cash pickup request submitted! Check your email and notifications for the pickup credentials.")
      resetWizard()
      loadData()
    }
    setSubmitting(false)
  }

  // ─── Card Submit ───
  const handleCardSubmit = async () => {
    if (!cardSpeed) return
    const amount = parseFloat(cardAmount)
    if (!amount || amount < 10) { toast.error("Minimum withdrawal is €10.00"); return }
    if (amount > availableBalance) { toast.error("Insufficient balance"); return }

    setSubmitting(true)
    const methodType: PayoutMethodType = cardSpeed === 'express' ? 'card_express' : 'card_standard'
    const result = await requestWithdrawal({
      amount,
      methodType,
      methodLabel: cardSpeed === 'express' ? 'Express Card Transfer' : 'Standard Card Transfer',
      cardId: selectedCardId || undefined,
      deliverySpeed: cardSpeed,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(cardSpeed === 'express' ? "Express transfer initiated! Funds arriving in minutes." : "Standard transfer initiated! Funds arriving in 1-2 business days.")
      resetWizard()
      loadData()
    }
    setSubmitting(false)
  }

  // ─── Bank Submit ───
  const handleBankSubmit = async () => {
    if (!bankType) return
    const amount = parseFloat(bankForm.amount)
    if (!amount || amount < 10) { toast.error("Minimum withdrawal is €10.00"); return }
    if (amount > availableBalance) { toast.error("Insufficient balance"); return }
    if (!bankForm.bankName.trim()) { toast.error("Enter bank name"); return }

    if (bankType === 'domestic' && !bankForm.accountNumber.trim()) {
      toast.error("Enter account number"); return
    }
    if (bankType === 'international' && !bankForm.iban.trim()) {
      toast.error("Enter IBAN"); return
    }
    if (bankType === 'international' && !bankForm.swiftCode.trim()) {
      toast.error("Enter SWIFT/BIC code"); return
    }

    setSubmitting(true)
    const methodType: PayoutMethodType = bankType === 'international' ? 'bank_transfer_international' : 'bank_transfer'
    const last4 = bankType === 'international' ? bankForm.iban.slice(-4) : bankForm.accountNumber.slice(-4)
    const result = await requestWithdrawal({
      amount,
      methodType,
      methodLabel: `${bankForm.bankName} ****${last4}`,
      bankName: bankForm.bankName.trim(),
      iban: bankType === 'international' ? bankForm.iban.trim() : undefined,
      swiftCode: bankType === 'international' ? bankForm.swiftCode.trim() : undefined,
      routingNumber: bankType === 'domestic' ? bankForm.routingNumber.trim() : undefined,
      accountNumber: bankType === 'domestic' ? bankForm.accountNumber.trim() : undefined,
      note: bankForm.note || undefined,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(bankType === 'international' ? "International transfer initiated! 2-5 business days." : "Bank transfer initiated! 1-3 business days.")
      resetWizard()
      loadData()
    }
    setSubmitting(false)
  }

  // ─── Crypto Submit ───
  const handleCryptoSubmit = async () => {
    if (!selectedCrypto || !selectedNetwork) return
    const amount = parseFloat(cryptoForm.amount)
    if (!amount || amount < 10) { toast.error("Minimum withdrawal is €10.00"); return }
    if (amount > availableBalance) { toast.error("Insufficient balance"); return }
    if (!cryptoForm.address.trim()) { toast.error("Enter wallet address"); return }

    setSubmitting(true)
    const crypto = CRYPTO_OPTIONS.find(c => c.symbol === selectedCrypto)
    const network = crypto?.networks.find(n => n.id === selectedNetwork)
    const result = await requestWithdrawal({
      amount,
      methodType: 'crypto',
      methodLabel: `${selectedCrypto} (${network?.name || selectedNetwork})`,
      cryptoAddress: cryptoForm.address.trim(),
      cryptoNetwork: selectedNetwork,
      cryptoCurrency: selectedCrypto,
      note: cryptoForm.note || undefined,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${selectedCrypto} withdrawal initiated! Estimated ~15 minutes.`)
      resetWizard()
      loadData()
    }
    setSubmitting(false)
  }

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-white/[0.03] rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 glass-card animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 glass-card animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // ─── WIZARD DIALOGS ───
  const renderWizardDialog = () => {
    if (!activeWizard) return null

    const wizardTitles: Record<WizardType & string, string> = {
      cash: 'Get Cash',
      card: 'Transfer to Card',
      bank: 'Bank Account',
      crypto: 'Crypto Withdrawal',
    }

    return (
      <Dialog open={!!activeWizard} onOpenChange={(open) => { if (!open) resetWizard() }}>
        <DialogContent className={`bg-card/95 backdrop-blur-xl border-white/[0.08] ${isMobile ? 'max-w-[95vw]' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              {wizardStep > 1 && (
                <button
                  onClick={() => setWizardStep(s => s - 1)}
                  className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <div className="flex-1">
                <DialogTitle className="text-foreground">{wizardTitles[activeWizard!]}</DialogTitle>
                <DialogDescription>Step {wizardStep} of 3</DialogDescription>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1.5 w-8 rounded-full transition-all ${s <= wizardStep ? 'bg-primary' : 'bg-white/[0.08]'}`} />
                ))}
              </div>
            </div>
          </DialogHeader>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeWizard}-${wizardStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeWizard === 'cash' && renderCashWizard()}
              {activeWizard === 'card' && renderCardWizard()}
              {activeWizard === 'bank' && renderBankWizard()}
              {activeWizard === 'crypto' && renderCryptoWizard()}
            </motion.div>
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    )
  }

  // ═══════════════════════════════════════════
  //  GET CASH WIZARD
  // ═══════════════════════════════════════════
  const renderCashWizard = () => {
    if (wizardStep === 1) {
      return (
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Choose your cash pickup provider</p>
          <div className="grid grid-cols-1 gap-3">
            {/* Western Union */}
            <button
              onClick={() => { setCashProvider('western_union'); setWizardStep(2) }}
              className={`relative flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                cashProvider === 'western_union'
                  ? 'bg-yellow-500/10 border-yellow-500/30 ring-1 ring-yellow-500/20'
                  : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10]'
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-black border border-yellow-500/30 flex items-center justify-center">
                <SiWesternunion className="w-7 h-7 text-yellow-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-bold text-foreground">Western Union</p>
                <p className="text-xs text-muted-foreground mt-0.5">500,000+ agent locations worldwide</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Same day pickup</span>
                  <span className="text-[11px] text-muted-foreground">Fee: 1.8%</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* MoneyGram */}
            <button
              onClick={() => { setCashProvider('moneygram'); setWizardStep(2) }}
              className={`relative flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                cashProvider === 'moneygram'
                  ? 'bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20'
                  : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10]'
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-[#0F1B4C] border border-blue-500/30 flex items-center justify-center">
                <SiMoneygram className="w-7 h-7 text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-bold text-foreground">MoneyGram</p>
                <p className="text-xs text-muted-foreground mt-0.5">350,000+ locations in 200+ countries</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">Same day pickup</span>
                  <span className="text-[11px] text-muted-foreground">Fee: 1.5%</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )
    }

    if (wizardStep === 2) {
      const providerName = cashProvider === 'western_union' ? 'Western Union' : 'MoneyGram'
      return (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Available: </span>
            <span className="text-sm font-bold text-primary">{formatCurrency(availableBalance, currency)}</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                Recipient Full Name <span className="text-red-400">*</span>
              </Label>
              <GlassInput
                placeholder="Name as shown on government ID"
                value={cashForm.recipientName}
                onChange={(e) => setCashForm({ ...cashForm, recipientName: e.target.value })}
                required
              />
              <p className="text-[11px] text-amber-400/80">Must match the ID used at pickup exactly</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                Pickup City <span className="text-red-400">*</span>
              </Label>
              <GlassInput
                placeholder="e.g. Madrid, London, New York"
                value={cashForm.city}
                onChange={(e) => setCashForm({ ...cashForm, city: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-foreground flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                Country <span className="text-red-400">*</span>
              </Label>
              <Select value={cashForm.country} onValueChange={(v) => setCashForm({ ...cashForm, country: v })}>
                <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08]">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {COUNTRIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-foreground">Amount ({currency})</Label>
              <GlassInput
                type="number"
                step="0.01"
                min="10"
                placeholder="0.00"
                value={cashForm.amount}
                onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
                icon={<DollarSign className="w-3.5 h-3.5" />}
                required
              />
              {parseFloat(cashForm.amount) > 0 && (
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  <p>Fee: {formatCurrency(calculatePayoutFeeSync(parseFloat(cashForm.amount), cashProvider!), currency)}</p>
                  <p>You receive: <span className="text-emerald-400 font-semibold">{formatCurrency(parseFloat(cashForm.amount) - calculatePayoutFeeSync(parseFloat(cashForm.amount), cashProvider!), currency)}</span></p>
                </div>
              )}
            </div>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11"
            onClick={() => {
              if (!cashForm.recipientName.trim()) { toast.error("Enter recipient name"); return }
              if (!cashForm.city.trim()) { toast.error("Enter pickup city"); return }
              if (!cashForm.country) { toast.error("Select country"); return }
              if (!cashForm.amount || parseFloat(cashForm.amount) < 10) { toast.error("Minimum €10.00"); return }
              setWizardStep(3)
            }}
          >
            Review & Confirm
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )
    }

    if (wizardStep === 3) {
      const amount = parseFloat(cashForm.amount) || 0
      const fee = calculatePayoutFeeSync(amount, cashProvider!)
      const net = amount - fee
      const providerName = cashProvider === 'western_union' ? 'Western Union' : 'MoneyGram'
      const ProviderIcon = cashProvider === 'western_union' ? SiWesternunion : SiMoneygram
      const providerColor = cashProvider === 'western_union' ? 'text-yellow-400' : 'text-blue-400'

      return (
        <div className="space-y-4 pt-2">
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cashProvider === 'western_union' ? 'bg-black border border-yellow-500/30' : 'bg-[#0F1B4C] border border-blue-500/30'}`}>
                <ProviderIcon className={`w-5 h-5 ${providerColor}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{providerName}</p>
                <p className="text-xs text-muted-foreground">Cash Pickup</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient</span>
                <span className="text-foreground font-semibold">{cashForm.recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pickup Location</span>
                <span className="text-foreground">{cashForm.city}, {cashForm.country}</span>
              </div>
              <div className="flex justify-between border-t border-white/[0.06] pt-3">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-foreground font-semibold">{formatCurrency(amount, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee ({cashProvider === 'western_union' ? '1.8%' : '1.5%'})</span>
                <span className="text-red-400">-{formatCurrency(fee, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-white/[0.06] pt-3">
                <span className="text-foreground font-bold">Cash to Collect</span>
                <span className="text-xl font-bold text-emerald-400">{formatCurrency(net, currency)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              After confirming, you will receive an email and in-app message with your pickup reference code and instructions.
              Bring a government-issued photo ID matching the recipient name.
            </p>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setWizardStep(2)} className="flex-1">Back</Button>
            <Button
              onClick={handleCashSubmit}
              disabled={submitting}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : `Confirm ${providerName} Pickup`}
            </Button>
          </DialogFooter>
        </div>
      )
    }
    return null
  }

  // ═══════════════════════════════════════════
  //  TRANSFER TO CARD WIZARD
  // ═══════════════════════════════════════════
  const renderCardWizard = () => {
    if (wizardStep === 1) {
      return (
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Choose your transfer speed</p>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => { setCardSpeed('express'); setWizardStep(2) }}
              className="relative flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] bg-white/[0.03] border-white/[0.06] hover:bg-amber-500/5 hover:border-amber-500/20"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/25 flex items-center justify-center">
                <Zap className="w-7 h-7 text-amber-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-bold text-foreground">Express</p>
                <p className="text-sm text-amber-400 font-medium">Get your money in minutes</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Instant</span>
                  <span className="text-[11px] text-muted-foreground">Fee: 1.5%</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => { setCardSpeed('standard'); setWizardStep(2) }}
              className="relative flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] bg-white/[0.03] border-white/[0.06] hover:bg-sky-500/5 hover:border-sky-500/20"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/10 border border-sky-500/25 flex items-center justify-center">
                <Clock className="w-7 h-7 text-sky-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-bold text-foreground">Standard</p>
                <p className="text-sm text-sky-400 font-medium">Lower fees, 1-2 business days</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">1-2 days</span>
                  <span className="text-[11px] text-muted-foreground">Fee: 0.5%</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )
    }

    if (wizardStep === 2) {
      const speedType = cardSpeed === 'express' ? 'card_express' : 'card_standard'
      return (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Available: </span>
            <span className="text-sm font-bold text-primary">{formatCurrency(availableBalance, currency)}</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Amount ({currency})</Label>
              <GlassInput
                type="number"
                step="0.01"
                min="10"
                placeholder="0.00"
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
                icon={<DollarSign className="w-3.5 h-3.5" />}
                required
              />
              {parseFloat(cardAmount) > 0 && (
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  <p>Fee: {formatCurrency(calculatePayoutFeeSync(parseFloat(cardAmount), speedType), currency)}</p>
                  <p>You receive: <span className="text-emerald-400 font-semibold">{formatCurrency(parseFloat(cardAmount) - calculatePayoutFeeSync(parseFloat(cardAmount), speedType), currency)}</span></p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <CreditCard className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {cardSpeed === 'express'
                ? 'Express transfers arrive in minutes to your card. A 1.5% fee applies.'
                : 'Standard transfers arrive in 1-2 business days. A 0.5% fee applies.'}
            </p>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11"
            onClick={() => {
              if (!cardAmount || parseFloat(cardAmount) < 10) { toast.error("Minimum €10.00"); return }
              setWizardStep(3)
            }}
          >
            Review & Confirm
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )
    }

    if (wizardStep === 3) {
      const amount = parseFloat(cardAmount) || 0
      const speedType = cardSpeed === 'express' ? 'card_express' : 'card_standard'
      const fee = calculatePayoutFeeSync(amount, speedType)
      const net = amount - fee

      return (
        <div className="space-y-4 pt-2">
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cardSpeed === 'express' ? 'bg-amber-500/10 border border-amber-500/25' : 'bg-sky-500/10 border border-sky-500/25'}`}>
                {cardSpeed === 'express' ? <Zap className="w-5 h-5 text-amber-400" /> : <Clock className="w-5 h-5 text-sky-400" />}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{cardSpeed === 'express' ? 'Express' : 'Standard'} Card Transfer</p>
                <p className="text-xs text-muted-foreground">{cardSpeed === 'express' ? 'Arrives in minutes' : '1-2 business days'}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-foreground font-semibold">{formatCurrency(amount, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee ({cardSpeed === 'express' ? '1.5%' : '0.5%'})</span>
                <span className="text-red-400">-{formatCurrency(fee, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-white/[0.06] pt-3">
                <span className="text-foreground font-bold">You Receive</span>
                <span className="text-xl font-bold text-emerald-400">{formatCurrency(net, currency)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setWizardStep(2)} className="flex-1">Back</Button>
            <Button
              onClick={handleCardSubmit}
              disabled={submitting}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : 'Confirm Transfer'}
            </Button>
          </DialogFooter>
        </div>
      )
    }
    return null
  }

  // ═══════════════════════════════════════════
  //  BANK ACCOUNT WIZARD
  // ═══════════════════════════════════════════
  const renderBankWizard = () => {
    if (wizardStep === 1) {
      return (
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Choose your transfer type</p>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => { setBankType('domestic'); setWizardStep(2) }}
              className="relative flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] bg-white/[0.03] border-white/[0.06] hover:bg-purple-500/5 hover:border-purple-500/20"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/10 border border-purple-500/25 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-purple-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-bold text-foreground">Domestic</p>
                <p className="text-xs text-muted-foreground mt-0.5">Account number & routing number</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">1-3 days</span>
                  <span className="text-[11px] text-muted-foreground">Fee: 0.1%</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => { setBankType('international'); setWizardStep(2) }}
              className="relative flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] bg-white/[0.03] border-white/[0.06] hover:bg-indigo-500/5 hover:border-indigo-500/20"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/10 border border-indigo-500/25 flex items-center justify-center">
                <Globe className="w-7 h-7 text-indigo-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-bold text-foreground">International</p>
                <p className="text-xs text-muted-foreground mt-0.5">IBAN & SWIFT/BIC code</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">2-5 days</span>
                  <span className="text-[11px] text-muted-foreground">Fee: 0.3%</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )
    }

    if (wizardStep === 2) {
      const methodType = bankType === 'international' ? 'bank_transfer_international' : 'bank_transfer'
      return (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Available: </span>
            <span className="text-sm font-bold text-primary">{formatCurrency(availableBalance, currency)}</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Bank Name <span className="text-red-400">*</span></Label>
              <GlassInput
                placeholder="e.g. Deutsche Bank, BBVA, HSBC"
                value={bankForm.bankName}
                onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                required
              />
            </div>

            {bankType === 'domestic' ? (
              <>
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Account Number <span className="text-red-400">*</span></Label>
                  <GlassInput
                    placeholder="Enter account number"
                    type="password"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Routing Number</Label>
                  <GlassInput
                    placeholder="Enter routing number"
                    value={bankForm.routingNumber}
                    onChange={(e) => setBankForm({ ...bankForm, routingNumber: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">IBAN <span className="text-red-400">*</span></Label>
                  <GlassInput
                    placeholder="e.g. DE89 3704 0044 0532 0130 00"
                    value={bankForm.iban}
                    onChange={(e) => setBankForm({ ...bankForm, iban: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">SWIFT/BIC Code <span className="text-red-400">*</span></Label>
                  <GlassInput
                    placeholder="e.g. COBADEFFXXX"
                    value={bankForm.swiftCode}
                    onChange={(e) => setBankForm({ ...bankForm, swiftCode: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Country</Label>
                  <Select value={bankForm.country} onValueChange={(v) => setBankForm({ ...bankForm, country: v })}>
                    <SelectTrigger className="h-11 bg-white/[0.03] border-white/[0.08]">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {COUNTRIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label className="text-sm text-foreground">Amount ({currency})</Label>
              <GlassInput
                type="number"
                step="0.01"
                min="10"
                placeholder="0.00"
                value={bankForm.amount}
                onChange={(e) => setBankForm({ ...bankForm, amount: e.target.value })}
                icon={<DollarSign className="w-3.5 h-3.5" />}
                required
              />
              {parseFloat(bankForm.amount) > 0 && (
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  <p>Fee: {formatCurrency(calculatePayoutFeeSync(parseFloat(bankForm.amount), methodType), currency)}</p>
                  <p>You receive: <span className="text-emerald-400 font-semibold">{formatCurrency(parseFloat(bankForm.amount) - calculatePayoutFeeSync(parseFloat(bankForm.amount), methodType), currency)}</span></p>
                </div>
              )}
            </div>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11"
            onClick={() => {
              if (!bankForm.bankName.trim()) { toast.error("Enter bank name"); return }
              if (bankType === 'domestic' && !bankForm.accountNumber.trim()) { toast.error("Enter account number"); return }
              if (bankType === 'international' && !bankForm.iban.trim()) { toast.error("Enter IBAN"); return }
              if (bankType === 'international' && !bankForm.swiftCode.trim()) { toast.error("Enter SWIFT/BIC code"); return }
              if (!bankForm.amount || parseFloat(bankForm.amount) < 10) { toast.error("Minimum €10.00"); return }
              setWizardStep(3)
            }}
          >
            Review & Confirm
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )
    }

    if (wizardStep === 3) {
      const amount = parseFloat(bankForm.amount) || 0
      const methodType = bankType === 'international' ? 'bank_transfer_international' : 'bank_transfer'
      const fee = calculatePayoutFeeSync(amount, methodType)
      const net = amount - fee

      return (
        <div className="space-y-4 pt-2">
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bankType === 'international' ? 'bg-indigo-500/10 border border-indigo-500/25' : 'bg-purple-500/10 border border-purple-500/25'}`}>
                {bankType === 'international' ? <Globe className="w-5 h-5 text-indigo-400" /> : <Building2 className="w-5 h-5 text-purple-400" />}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{bankType === 'international' ? 'International' : 'Domestic'} Bank Transfer</p>
                <p className="text-xs text-muted-foreground">{bankForm.bankName}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              {bankType === 'international' ? (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">IBAN</span><span className="text-foreground font-mono text-xs">****{bankForm.iban.slice(-4)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">SWIFT/BIC</span><span className="text-foreground">{bankForm.swiftCode}</span></div>
                </>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span className="text-foreground font-mono text-xs">****{bankForm.accountNumber.slice(-4)}</span></div>
                  {bankForm.routingNumber && <div className="flex justify-between"><span className="text-muted-foreground">Routing</span><span className="text-foreground font-mono text-xs">****{bankForm.routingNumber.slice(-4)}</span></div>}
                </>
              )}
              <div className="flex justify-between border-t border-white/[0.06] pt-3">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-foreground font-semibold">{formatCurrency(amount, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee ({bankType === 'international' ? '0.3%' : '0.1%'})</span>
                <span className="text-red-400">-{formatCurrency(fee, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-white/[0.06] pt-3">
                <span className="text-foreground font-bold">You Receive</span>
                <span className="text-xl font-bold text-emerald-400">{formatCurrency(net, currency)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">Your bank details are transmitted securely and encrypted. Only the last 4 digits are stored.</p>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setWizardStep(2)} className="flex-1">Back</Button>
            <Button
              onClick={handleBankSubmit}
              disabled={submitting}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : 'Confirm Transfer'}
            </Button>
          </DialogFooter>
        </div>
      )
    }
    return null
  }

  // ═══════════════════════════════════════════
  //  CRYPTO WIZARD
  // ═══════════════════════════════════════════
  const renderCryptoWizard = () => {
    if (wizardStep === 1) {
      return (
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Select cryptocurrency</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {CRYPTO_OPTIONS.map(option => (
              <CryptoCoinCard
                key={option.symbol}
                option={option}
                selected={selectedCrypto === option.symbol}
                onClick={() => {
                  setSelectedCrypto(option.symbol)
                  setSelectedNetwork(null)
                  // Auto-advance if single network
                  if (option.networks.length === 1) {
                    setSelectedNetwork(option.networks[0].id)
                    setWizardStep(2)
                  } else {
                    setWizardStep(2)
                  }
                }}
              />
            ))}
          </div>
          <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
            <p className="text-xs text-muted-foreground">
              <span className="text-orange-400 font-semibold">Flat €2.00 fee</span> on all crypto withdrawals, regardless of amount. Typically arrives in ~15 minutes.
            </p>
          </div>
        </div>
      )
    }

    if (wizardStep === 2) {
      const crypto = CRYPTO_OPTIONS.find(c => c.symbol === selectedCrypto)
      if (!crypto) return null

      // If needs network selection
      if (!selectedNetwork && crypto.networks.length > 1) {
        return (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Select network for {crypto.name} ({crypto.symbol})</p>
            <div className="space-y-2">
              {crypto.networks.map(network => (
                <NetworkSelectCard
                  key={network.id}
                  network={network}
                  selected={selectedNetwork === network.id}
                  onClick={() => setSelectedNetwork(network.id)}
                  cryptoColor={crypto.color}
                  cryptoBgColor={crypto.bgColor}
                />
              ))}
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11"
              disabled={!selectedNetwork}
              onClick={() => { if (selectedNetwork) setWizardStep(2) }}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )
      }

      const network = crypto.networks.find(n => n.id === selectedNetwork) || crypto.networks[0]
      if (!selectedNetwork) setSelectedNetwork(network.id)
      const CryptoIcon = crypto.icon

      return (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${crypto.bgColor}`}>
              <CryptoIcon className={`w-4 h-4 ${crypto.color}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{crypto.symbol} — {network.label}</p>
              <p className="text-xs text-muted-foreground">Flat €2.00 fee · ~15 min</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Available: </span>
            <span className="text-sm font-bold text-primary">{formatCurrency(availableBalance, currency)}</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Wallet Address <span className="text-red-400">*</span></Label>
              <GlassInput
                placeholder={`Enter your ${crypto.symbol} ${network.name} address`}
                value={cryptoForm.address}
                onChange={(e) => setCryptoForm({ ...cryptoForm, address: e.target.value })}
                className="font-mono text-xs"
                required
              />
              <p className="text-[11px] text-amber-400/80">Double-check the address. Crypto transfers are irreversible.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-foreground">Amount ({currency})</Label>
              <GlassInput
                type="number"
                step="0.01"
                min="10"
                placeholder="0.00"
                value={cryptoForm.amount}
                onChange={(e) => setCryptoForm({ ...cryptoForm, amount: e.target.value })}
                icon={<DollarSign className="w-3.5 h-3.5" />}
                required
              />
              {parseFloat(cryptoForm.amount) > 0 && (
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  <p>Fee: {formatCurrency(2.00, currency)}</p>
                  <p>You receive: <span className="text-emerald-400 font-semibold">{formatCurrency(parseFloat(cryptoForm.amount) - 2, currency)}</span> worth of {crypto.symbol}</p>
                </div>
              )}
            </div>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11"
            onClick={() => {
              if (!cryptoForm.address.trim()) { toast.error("Enter wallet address"); return }
              if (!cryptoForm.amount || parseFloat(cryptoForm.amount) < 10) { toast.error("Minimum €10.00"); return }
              setWizardStep(3)
            }}
          >
            Review & Confirm
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )
    }

    if (wizardStep === 3) {
      const crypto = CRYPTO_OPTIONS.find(c => c.symbol === selectedCrypto)
      if (!crypto) return null
      const network = crypto.networks.find(n => n.id === selectedNetwork) || crypto.networks[0]
      const amount = parseFloat(cryptoForm.amount) || 0
      const fee = 2.00
      const net = amount - fee
      const CryptoIcon = crypto.icon

      return (
        <div className="space-y-4 pt-2">
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${crypto.bgColor}`}>
                <CryptoIcon className={`w-5 h-5 ${crypto.color}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{crypto.symbol} Withdrawal</p>
                <p className="text-xs text-muted-foreground">{network.label}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Wallet</span>
                <span className="text-foreground font-mono text-[11px] text-right max-w-[200px] break-all">{cryptoForm.address}</span>
              </div>
              <div className="flex justify-between border-t border-white/[0.06] pt-3">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-foreground font-semibold">{formatCurrency(amount, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network Fee</span>
                <span className="text-red-400">-{formatCurrency(fee, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-white/[0.06] pt-3">
                <span className="text-foreground font-bold">You Receive</span>
                <span className="text-xl font-bold text-emerald-400">{formatCurrency(net, currency)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
            <Shield className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="text-red-400 font-semibold">Warning:</span> Crypto transfers are irreversible. Verify the wallet address and network are correct before confirming.
            </p>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setWizardStep(2)} className="flex-1">Back</Button>
            <Button
              onClick={handleCryptoSubmit}
              disabled={submitting}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : `Send ${selectedCrypto}`}
            </Button>
          </DialogFooter>
        </div>
      )
    }
    return null
  }

  // ─── View Payout Details Dialog ───
  const renderPayoutDetails = () => {
    if (!viewingPayout) return null
    const pd = viewingPayout.pickup_details as Record<string, string> | null

    return (
      <Dialog open={!!viewingPayout} onOpenChange={(open) => { if (!open) setViewingPayout(null) }}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Payout Details</DialogTitle>
            <DialogDescription>Reference: {viewingPayout.id.slice(0, 8)}…</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <PayoutMethodIcon type={viewingPayout.method_type} size="md" />
              <div>
                <p className="text-sm font-semibold text-foreground">{viewingPayout.method_label}</p>
                <p className="text-xs text-muted-foreground">{new Date(viewingPayout.created_at).toLocaleString()}</p>
              </div>
            </div>

            {/* Cash pickup reference */}
            {pd?.reference && (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Pickup Reference</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold text-emerald-400 font-mono tracking-widest">{pd.reference}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(pd.reference || ''); toast.success('Copied!') }}
                    className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.10] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                {pd.recipient_name && <p className="text-xs text-muted-foreground mt-2">Recipient: <span className="text-foreground font-medium">{pd.recipient_name}</span></p>}
                {pd.city && <p className="text-xs text-muted-foreground">Location: <span className="text-foreground">{pd.city}, {pd.country}</span></p>}
              </div>
            )}

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-foreground font-semibold">{formatCurrency(Number(viewingPayout.amount), viewingPayout.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee</span>
                <span className="text-red-400">-{formatCurrency(Number(viewingPayout.fee), viewingPayout.currency)}</span>
              </div>
              <div className="flex justify-between border-t border-white/[0.06] pt-2">
                <span className="text-foreground font-bold">Net Amount</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(Number(viewingPayout.net_amount), viewingPayout.currency)}</span>
              </div>
            </div>

            {viewingPayout.status === 'pending' && (
              <Button
                variant="outline"
                className="w-full text-red-400 border-red-500/20 hover:bg-red-500/10"
                onClick={() => { handleCancelPayout(viewingPayout.id); setViewingPayout(null) }}
              >
                Cancel Payout
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ═══════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Banknote className="w-6 h-6 text-primary" />
            Payouts
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Withdraw your funds — cash, card, bank, or crypto</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] text-muted-foreground self-start"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <GlassStat label="Available Balance" value={formatCurrency(availableBalance, currency)} icon={<Wallet className="w-5 h-5" />} glowColor="blue" />
        <GlassStat label="Pending Payouts" value={formatCurrency(stats?.pendingPayouts ?? 0, currency)} icon={<Clock className="w-5 h-5" />} glowColor="amber" />
        <GlassStat label="Total Paid Out" value={formatCurrency(stats?.totalPaidOut ?? 0, currency)} icon={<CheckCircle2 className="w-5 h-5" />} glowColor="emerald" />
        <GlassStat label="Total Fees Paid" value={formatCurrency(stats?.totalFees ?? 0, currency)} icon={<DollarSign className="w-5 h-5" />} glowColor="purple" />
      </div>

      {/* ═══ HERO: 4 Payout Method Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
        {/* 1. GET CASH */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveWizard('cash')}
          className="relative group text-left p-6 rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.08] to-green-500/[0.03] hover:border-emerald-500/30 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.04] rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <GetCashIcon />
            <h3 className="text-lg font-bold text-foreground mt-4">Get Cash</h3>
            <p className="text-sm text-muted-foreground mt-1">Pick up cash at thousands of locations worldwide</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-[11px] bg-yellow-500/10 text-yellow-400 px-2.5 py-1 rounded-full border border-yellow-500/15 font-medium">Western Union</span>
              <span className="text-[11px] bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/15 font-medium">MoneyGram</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-2">From 1.5% fee · Same day pickup</p>
          </div>
        </motion.button>

        {/* 2. TRANSFER TO CARD */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveWizard('card')}
          className="relative group text-left p-6 rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-500/[0.08] to-cyan-500/[0.03] hover:border-blue-500/30 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.04] rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <CardPayoutIcon />
            <h3 className="text-lg font-bold text-foreground mt-4">Transfer to Card</h3>
            <p className="text-sm text-muted-foreground mt-1">Send funds directly to your debit or credit card</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-[11px] bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/15 font-medium flex items-center gap-1"><Zap className="w-3 h-3" /> Express</span>
              <span className="text-[11px] bg-sky-500/10 text-sky-400 px-2.5 py-1 rounded-full border border-sky-500/15 font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Standard</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-2">From 0.5% fee · Instant to 2 days</p>
          </div>
        </motion.button>

        {/* 3. BANK ACCOUNT */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveWizard('bank')}
          className="relative group text-left p-6 rounded-2xl border border-purple-500/15 bg-gradient-to-br from-purple-500/[0.08] to-indigo-500/[0.03] hover:border-purple-500/30 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/[0.04] rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <BankPayoutIcon />
            <h3 className="text-lg font-bold text-foreground mt-4">Bank Account</h3>
            <p className="text-sm text-muted-foreground mt-1">Direct deposit to any bank account worldwide</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-[11px] bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-full border border-purple-500/15 font-medium">Domestic</span>
              <span className="text-[11px] bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/15 font-medium flex items-center gap-1"><Globe className="w-3 h-3" /> International</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-2">From 0.1% fee · 1-5 business days</p>
          </div>
        </motion.button>

        {/* 4. CRYPTO */}
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveWizard('crypto')}
          className="relative group text-left p-6 rounded-2xl border border-orange-500/15 bg-gradient-to-br from-orange-500/[0.08] to-amber-500/[0.03] hover:border-orange-500/30 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/[0.04] rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform" />
          <div className="relative z-10">
            <CryptoPayoutIcon />
            <h3 className="text-lg font-bold text-foreground mt-4">Crypto</h3>
            <p className="text-sm text-muted-foreground mt-1">Withdraw to any crypto wallet</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-[11px] bg-orange-500/10 text-orange-400 px-2 py-1 rounded-full border border-orange-500/15 font-medium flex items-center gap-1"><SiBitcoin className="w-3 h-3" /> BTC</span>
              <span className="text-[11px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full border border-blue-500/15 font-medium flex items-center gap-1"><SiEthereum className="w-3 h-3" /> ETH</span>
              <span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/15 font-medium flex items-center gap-1"><SiTether className="w-3 h-3" /> USDT</span>
              <span className="text-[11px] bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full border border-blue-500/15 font-medium">USDC</span>
              <span className="text-[11px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full border border-purple-500/15 font-medium flex items-center gap-1"><SiSolana className="w-3 h-3" /> SOL</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-2">Flat €2.00 fee · ~15 minutes</p>
          </div>
        </motion.button>
      </div>

      {/* Saved Payout Methods (collapsible) */}
      {methods.length > 0 && (
        <GlassContainer
          header={{
            title: "Saved Payout Methods",
            description: `${methods.length} saved method${methods.length > 1 ? "s" : ""}`,
            action: (
              <button
                onClick={() => setShowSavedMethods(!showSavedMethods)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                {showSavedMethods ? 'Hide' : 'Show'}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSavedMethods ? 'rotate-180' : ''}`} />
              </button>
            ),
          }}
        >
          <AnimatePresence>
            {showSavedMethods && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2">
                  {methods.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                      <div className="flex items-center gap-3">
                        <PayoutMethodIcon type={m.type} size="sm" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{m.label}</p>
                            {m.is_default && <GlassBadge variant="primary" size="sm">Default</GlassBadge>}
                          </div>
                          {m.bank_name && <p className="text-xs text-muted-foreground mt-0.5">{m.bank_name}</p>}
                          {m.recipient_name && <p className="text-xs text-muted-foreground mt-0.5">{m.city}, {m.country}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!m.is_default && (
                          <Button variant="outline" size="sm" className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] text-xs" onClick={() => handleSetDefault(m.id)}>
                            Set Default
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-300 text-xs" onClick={() => handleRemoveMethod(m.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassContainer>
      )}

      {/* Payout History */}
      <GlassContainer
        header={{
          title: "Payout History",
          description: "Your withdrawal activity",
        }}
      >
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs border-b border-white/[0.06]">
                <th className="text-left py-3 px-3 font-medium">Date</th>
                <th className="text-left py-3 px-3 font-medium">Method</th>
                <th className="text-right py-3 px-3 font-medium">Amount</th>
                <th className="text-right py-3 px-3 font-medium">Fee</th>
                <th className="text-center py-3 px-3 font-medium">Status</th>
                <th className="text-center py-3 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayouts.map((payout) => {
                const cfg = statusConfig[payout.status as PayoutStatus] || statusConfig.pending
                const StatusIcon = cfg.icon
                return (
                  <tr key={payout.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3">
                      <p className="text-xs text-foreground">{new Date(payout.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      {payout.reference && <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">Ref: {payout.reference}</p>}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <PayoutMethodIcon type={payout.method_type} size="sm" />
                        <span className="text-xs text-foreground">{payout.method_label}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-foreground text-sm">
                      {formatCurrency(Number(payout.amount), payout.currency)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-xs text-muted-foreground">
                      {Number(payout.fee) > 0 ? `-${formatCurrency(Number(payout.fee), payout.currency)}` : "—"}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <GlassBadge variant={cfg.variant} size="sm">
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {cfg.label}
                      </GlassBadge>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingPayout(payout)}
                          className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        {payout.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-400 border-red-500/20 hover:bg-red-500/10 text-xs h-7 px-2"
                            onClick={() => handleCancelPayout(payout.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
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
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Fee Schedule</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {[
                { label: 'Western Union', fee: '1.8% (min €3.00)', speed: 'Same day', color: 'text-yellow-400', bg: 'bg-yellow-500/5 border-yellow-500/10' },
                { label: 'MoneyGram', fee: '1.5% (min €2.50)', speed: 'Same day', color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/10' },
                { label: 'Express Card', fee: '1.5% (min €1.50)', speed: 'Instant', color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/10' },
                { label: 'Standard Card', fee: '0.5% (min €0.75)', speed: '1-2 days', color: 'text-sky-400', bg: 'bg-sky-500/5 border-sky-500/10' },
                { label: 'Bank (Domestic)', fee: '0.1% (min €0.50)', speed: '1-3 days', color: 'text-purple-400', bg: 'bg-purple-500/5 border-purple-500/10' },
                { label: 'Bank (Intl/IBAN)', fee: '0.3% (min €2.00)', speed: '2-5 days', color: 'text-indigo-400', bg: 'bg-indigo-500/5 border-indigo-500/10' },
                { label: 'Crypto', fee: 'Flat €2.00', speed: '~15 min', color: 'text-orange-400', bg: 'bg-orange-500/5 border-orange-500/10' },
                { label: 'PayPal', fee: '0.5% (min €1.00)', speed: 'Instant', color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/10' },
              ].map(item => (
                <div key={item.label} className={`p-2.5 rounded-lg border ${item.bg}`}>
                  <p className={`${item.color} font-semibold`}>{item.label}</p>
                  <p className="text-foreground font-semibold mt-0.5">{item.fee}</p>
                  <p className="text-muted-foreground/60 mt-0.5">{item.speed}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Wizard Dialogs */}
      {renderWizardDialog()}
      {renderPayoutDetails()}
    </div>
  )
}
