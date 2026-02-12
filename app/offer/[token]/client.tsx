"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  User,
  DollarSign,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  LogIn,
  Clock,
  Tag,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { acceptOffer } from "@/lib/actions/offers"
import { toast } from "sonner"

interface OfferData {
  id: string
  title: string
  description: string
  amount: number
  currency: string
  creator_role: "buyer" | "seller"
  status: string
  expires_at: string | null
  created_at: string
  canAccept: boolean
  isCreator: boolean
  isAuthenticated: boolean
  image_urls: string[]
  category: string | null
  delivery_days: number | null
  creator: { full_name: string | null; email: string; avatar_url: string | null }
}

const currencySymbols: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", CAD: "C$", AUD: "A$",
}

const categoryLabels: Record<string, { label: string; emoji: string }> = {
  "web-development": { label: "Web Development", emoji: "💻" },
  "design": { label: "Design & Creative", emoji: "🎨" },
  "writing": { label: "Writing & Content", emoji: "✍️" },
  "marketing": { label: "Marketing", emoji: "📢" },
  "consulting": { label: "Consulting", emoji: "💼" },
  "video": { label: "Video & Animation", emoji: "🎬" },
  "music": { label: "Music & Audio", emoji: "🎵" },
  "physical-goods": { label: "Physical Goods", emoji: "📦" },
  "digital-goods": { label: "Digital Goods", emoji: "🗂️" },
  "tutoring": { label: "Tutoring & Education", emoji: "📚" },
  "other": { label: "Other", emoji: "✨" },
}

export function OfferAcceptClient({ offer, token, isAuthenticated }: { offer: OfferData; token: string; isAuthenticated: boolean }) {
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [activeImage, setActiveImage] = useState(0)

  const yourRole = offer.creator_role === "buyer" ? "Seller" : "Buyer"
  const symbol = currencySymbols[offer.currency] || offer.currency
  const images = offer.image_urls || []
  const cat = offer.category ? categoryLabels[offer.category] : null
  const creatorName = offer.creator.full_name || offer.creator.email
  const creatorInitial = (offer.creator.full_name || offer.creator.email || "?")[0].toUpperCase()

  const handleAccept = async () => {
    setAccepting(true)
    try {
      const result = await acceptOffer(token)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setAccepted(true)
      setTransactionId(result.data!.transactionId)
      toast.success("Offer accepted! Opening Deal Room...")
      setTimeout(() => {
        router.push(`/transactions/${result.data!.transactionId}`)
      }, 1500)
    } catch {
      toast.error("Failed to accept offer")
    } finally {
      setAccepting(false)
    }
  }

  // ═══════════ ACCEPTED ═══════════
  if (accepted && transactionId) {
    return (
      <div className="text-center space-y-6 animate-fade-in-up">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping-slow" />
          <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-400" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Deal Created!</h1>
          <p className="text-muted-foreground mt-2">
            The escrow transaction is set up. Proceed to the Deal Room to manage payment and delivery.
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-3 text-sm text-left">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Title</span>
            <span className="font-medium">{offer.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-bold text-emerald-400">{symbol}{offer.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Your Role</span>
            <Badge variant="outline">{yourRole}</Badge>
          </div>
        </div>
        <Button onClick={() => router.push(`/transactions/${transactionId}`)} className="w-full" size="lg">
          Open Deal Room
        </Button>
      </div>
    )
  }

  // ═══════════ UNAVAILABLE ═══════════
  if (offer.status !== "pending") {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto">
          <XCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">Offer Unavailable</h1>
        <p className="text-muted-foreground text-sm">
          This offer has been {offer.status === "accepted" ? "already accepted" : offer.status === "cancelled" ? "cancelled" : "expired"}.
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    )
  }

  // ═══════════ CREATOR VIEW ═══════════
  if (offer.isCreator) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
          <User className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold">This Is Your Offer</h1>
        <p className="text-muted-foreground text-sm">
          Share the link with the other party so they can accept it.
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  // ═══════════ MAIN ACCEPT VIEW ═══════════
  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* ── Creator Avatar Header ── */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
        {/* Image gallery or gradient header */}
        {images.length > 0 ? (
          <div className="relative h-52 bg-black/30">
            <img
              src={images[activeImage]}
              alt={`Offer image ${activeImage + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Image navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage(i => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => setActiveImage(i => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === activeImage ? "bg-white" : "bg-white/40"}`}
                    />
                  ))}
                </div>
              </>
            )}
            {/* Escrow badge overlay */}
            <div className="absolute top-3 left-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-medium text-white">
                <Shield className="w-3 h-3 text-emerald-400" /> Escrow Protected
              </div>
            </div>
          </div>
        ) : (
          <div className="h-20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent relative">
            <div className="absolute top-3 left-4">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] text-xs font-medium text-muted-foreground">
                <Shield className="w-3 h-3 text-emerald-400" /> Escrow Protected
              </div>
            </div>
          </div>
        )}

        {/* Creator card with avatar */}
        <div className={`px-5 pb-5 ${images.length > 0 ? "-mt-8 relative z-10" : "pt-4"}`}>
          <div className="flex items-end gap-3 mb-4">
            {/* Avatar */}
            <div className={`shrink-0 ${images.length > 0 ? "w-14 h-14" : "w-11 h-11"} rounded-full border-2 border-background overflow-hidden bg-white/[0.08]`}>
              {offer.creator.avatar_url ? (
                <img src={offer.creator.avatar_url} alt={creatorName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary">
                  {creatorInitial}
                </div>
              )}
            </div>
            <div className="min-w-0 pb-0.5">
              <p className="font-semibold text-sm truncate">{creatorName}</p>
              <p className="text-xs text-muted-foreground">invites you to a deal</p>
            </div>
          </div>

          {/* Title & badges */}
          <h1 className="text-xl font-bold mb-2">{offer.title}</h1>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {cat && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] text-xs text-muted-foreground">
                <span>{cat.emoji}</span> {cat.label}
              </span>
            )}
            {offer.delivery_days && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] text-xs text-muted-foreground">
                <Clock className="w-3 h-3" /> {offer.delivery_days} day{offer.delivery_days !== 1 ? "s" : ""} delivery
              </span>
            )}
            {offer.expires_at && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" /> Expires {new Date(offer.expires_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{offer.description}</p>
          </div>

          {/* Amount + Role pills */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
              <p className="text-2xl font-bold text-emerald-400">{symbol}{offer.amount.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Escrow Amount</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
              <p className="text-2xl font-bold">{yourRole}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Your Role</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust indicators */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs text-emerald-400">
        <Lock className="w-3.5 h-3.5 shrink-0" />
        <span>Funds are held in escrow and only released when both parties agree the deal is complete.</span>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {!isAuthenticated ? (
          <>
            <Button asChild className="w-full" size="lg">
              <a href={`/register?redirect=/offer/${token}`}>
                <LogIn className="w-4 h-4 mr-2" />
                Create Account to Accept
              </a>
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Already have an account?{" "}
              <a href={`/login?redirect=/offer/${token}`} className="text-primary hover:underline">
                Sign in
              </a>
            </p>
          </>
        ) : (
          <>
            <Button onClick={handleAccept} disabled={accepting || !offer.canAccept} className="w-full" size="lg">
              {accepting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Deal...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accept Offer
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              By accepting, you agree to participate as the <strong>{yourRole.toLowerCase()}</strong> in this escrow transaction.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
