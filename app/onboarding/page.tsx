"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  User,
  CreditCard,
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Camera,
  Shield,
  Fingerprint,
  Loader2,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Step Config ───

const steps = [
  { id: "welcome", label: "Welcome", icon: Sparkles },
  { id: "identity", label: "Identity", icon: Fingerprint },
  { id: "bank", label: "Bank", icon: Building2 },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "done", label: "Done", icon: CheckCircle2 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(false)

  // Form state
  const [fullName, setFullName] = useState("")
  const [country, setCountry] = useState("")
  const [idType, setIdType] = useState("")
  const [idFile, setIdFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [bankMethod, setBankMethod] = useState("")
  const [cardTier, setCardTier] = useState("")

  const canNext = () => {
    switch (current) {
      case 0: return true // welcome
      case 1: return fullName.trim().length > 0 && country !== "" // identity basics
      case 2: return true // bank (optional for now)
      case 3: return true // card (optional for now)
      default: return true
    }
  }

  const handleNext = () => {
    if (current < steps.length - 1) {
      setCurrent((c) => c + 1)
    }
  }

  const handleBack = () => {
    if (current > 0) setCurrent((c) => c - 1)
  }

  const handleFinish = () => {
    toast.success("Welcome to PaySafer! 🎉", {
      description: "Your account is set up. Let's get started.",
    })
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-[#0A0F1A] flex flex-col">
      {/* Top bar */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06]">
        <Logo size="sm" linkTo="/" />
        <span className="text-xs text-white/40 tracking-wide">
          Step {current + 1} of {steps.length}
        </span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* Progress bar */}
        <div className="w-full max-w-md mb-10">
          <div className="flex items-center justify-between mb-3">
            {steps.map((step, i) => (
              <div key={step.id} className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    i < current
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : i === current
                        ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                        : "border-white/10 text-white/20 bg-white/[0.02]"
                  )}
                >
                  {i < current ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] tracking-wide",
                    i <= current ? "text-white/60" : "text-white/20"
                  )}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          {/* Progress line */}
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(current / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-8 shadow-xl">
          {/* ─── Step 0: Welcome ─── */}
          {current === 0 && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  Welcome to PaySafer
                </h2>
                <p className="text-sm text-white/50 mt-2 leading-relaxed">
                  Let&apos;s set up your account in under 2 minutes. We&apos;ll verify your identity,
                  connect your bank, and pick your debit card.
                </p>
              </div>
              <div className="space-y-3 text-left">
                {[
                  { icon: Fingerprint, text: "Verify your identity (KYC)" },
                  { icon: Building2, text: "Link a bank account" },
                  { icon: CreditCard, text: "Choose your debit card" },
                ].map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                  >
                    <item.icon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-sm text-white/70">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 1: Identity ─── */}
          {current === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  Verify Your Identity
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  Required by US & UAE financial regulations
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 tracking-wide uppercase mb-1.5 block">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="As it appears on your ID"
                    className="w-full h-11 rounded-lg bg-white/[0.04] border border-white/[0.10] px-4 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/50 tracking-wide uppercase mb-1.5 block">
                    Country of Residence
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full h-11 rounded-lg bg-white/[0.04] border border-white/[0.10] px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                  >
                    <option value="" className="bg-[#0A0F1A]">Select country</option>
                    <option value="US" className="bg-[#0A0F1A]">🇺🇸 United States</option>
                    <option value="AE" className="bg-[#0A0F1A]">🇦🇪 United Arab Emirates</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-white/50 tracking-wide uppercase mb-1.5 block">
                    ID Document Type
                  </label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full h-11 rounded-lg bg-white/[0.04] border border-white/[0.10] px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                  >
                    <option value="" className="bg-[#0A0F1A]">Select document</option>
                    <option value="passport" className="bg-[#0A0F1A]">Passport</option>
                    <option value="drivers_license" className="bg-[#0A0F1A]">Driver&apos;s License</option>
                    <option value="national_id" className="bg-[#0A0F1A]">National ID / Emirates ID</option>
                  </select>
                </div>
              </div>

              {/* Upload areas */}
              <div className="grid grid-cols-2 gap-3">
                <label className="cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                  />
                  <div
                    className={cn(
                      "h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors",
                      idFile
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-white/10 bg-white/[0.02] group-hover:border-white/20"
                    )}
                  >
                    {idFile ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Upload className="w-5 h-5 text-white/30" />
                    )}
                    <span className="text-[11px] text-white/40">
                      {idFile ? idFile.name.slice(0, 18) : "Upload ID"}
                    </span>
                  </div>
                </label>

                <label className="cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                  />
                  <div
                    className={cn(
                      "h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors",
                      selfieFile
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-white/10 bg-white/[0.02] group-hover:border-white/20"
                    )}
                  >
                    {selfieFile ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Camera className="w-5 h-5 text-white/30" />
                    )}
                    <span className="text-[11px] text-white/40">
                      {selfieFile ? selfieFile.name.slice(0, 18) : "Take Selfie"}
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] text-white/40">
                  Your data is encrypted and securely stored. We never share it with third parties.
                </span>
              </div>
            </div>
          )}

          {/* ─── Step 2: Bank Account ─── */}
          {current === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  Link a Bank Account
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  For deposits and withdrawals
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: "plaid",
                    label: "Connect with Plaid",
                    desc: "Instant — link your US bank account securely",
                    icon: Building2,
                    color: "emerald",
                  },
                  {
                    id: "ach",
                    label: "ACH / Routing Number",
                    desc: "Manual entry — takes 1-2 business days to verify",
                    icon: CreditCard,
                    color: "blue",
                  },
                  {
                    id: "iban",
                    label: "IBAN / SWIFT",
                    desc: "For UAE and international bank accounts",
                    icon: Building2,
                    color: "amber",
                  },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setBankMethod(method.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                      bankMethod === method.id
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        method.color === "emerald" && "bg-emerald-500/10",
                        method.color === "blue" && "bg-blue-500/10",
                        method.color === "amber" && "bg-amber-500/10"
                      )}
                    >
                      <method.icon
                        className={cn(
                          "w-5 h-5",
                          method.color === "emerald" && "text-emerald-400",
                          method.color === "blue" && "text-blue-400",
                          method.color === "amber" && "text-amber-400"
                        )}
                      />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white">{method.label}</span>
                      <p className="text-xs text-white/35 mt-0.5">{method.desc}</p>
                    </div>
                    {bankMethod === method.id && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={handleNext}
                className="text-xs text-white/30 hover:text-white/50 transition-colors mx-auto block"
              >
                Skip for now — I&apos;ll do this later
              </button>
            </div>
          )}

          {/* ─── Step 3: Card Selection ─── */}
          {current === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  Choose Your Card
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  Pick the debit card that fits your lifestyle
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: "standard",
                    label: "Standard",
                    price: "Free",
                    perks: "Worldwide spending, Apple/Google Pay",
                    color: "emerald",
                  },
                  {
                    id: "gold",
                    label: "Gold",
                    price: "$9.99",
                    perks: "1% cashback, no FX fees, free ATM",
                    color: "amber",
                  },
                  {
                    id: "platinum",
                    label: "Platinum",
                    price: "$49.99",
                    perks: "3% cashback, lounges, priority support",
                    color: "purple",
                  },
                ].map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setCardTier(card.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                      cardTier === card.id
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        card.color === "emerald" && "bg-emerald-500/10",
                        card.color === "amber" && "bg-amber-500/10",
                        card.color === "purple" && "bg-purple-500/10"
                      )}
                    >
                      <CreditCard
                        className={cn(
                          "w-5 h-5",
                          card.color === "emerald" && "text-emerald-400",
                          card.color === "amber" && "text-amber-400",
                          card.color === "purple" && "text-purple-400"
                        )}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{card.label}</span>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            card.color === "emerald" && "bg-emerald-500/10 text-emerald-400",
                            card.color === "amber" && "bg-amber-500/10 text-amber-400",
                            card.color === "purple" && "bg-purple-500/10 text-purple-400"
                          )}
                        >
                          {card.price}
                        </span>
                      </div>
                      <p className="text-xs text-white/35 mt-0.5">{card.perks}</p>
                    </div>
                    {cardTier === card.id && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={handleNext}
                className="text-xs text-white/30 hover:text-white/50 transition-colors mx-auto block"
              >
                Skip — I&apos;ll choose later
              </button>
            </div>
          )}

          {/* ─── Step 4: Done ─── */}
          {current === 4 && (
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  You&apos;re All Set!
                </h2>
                <p className="text-sm text-white/50 mt-2 leading-relaxed">
                  Your account is ready. You can start transacting securely with PaySafer right away.
                </p>
              </div>
              <div className="space-y-3 text-left">
                {[
                  { done: !!fullName, text: "Identity information submitted" },
                  { done: !!bankMethod, text: "Bank account linked" },
                  { done: !!cardTier, text: "Debit card selected" },
                ].map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                  >
                    <CheckCircle2
                      className={cn(
                        "w-4 h-4 shrink-0",
                        item.done ? "text-emerald-400" : "text-white/15"
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm",
                        item.done ? "text-white/70" : "text-white/30 line-through"
                      )}
                    >
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="w-full max-w-md flex items-center justify-between mt-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={current === 0}
            className="text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {current < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canNext()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium tracking-wide"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium tracking-wide"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
