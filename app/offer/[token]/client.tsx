"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, User, DollarSign, FileText, CheckCircle2, XCircle, Loader2, LogIn } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
  creator: { full_name: string | null; email: string }
}

export function OfferAcceptClient({ offer, token, isAuthenticated }: { offer: OfferData; token: string; isAuthenticated: boolean }) {
  const router = useRouter()
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [transactionId, setTransactionId] = useState<string | null>(null)

  const yourRole = offer.creator_role === "buyer" ? "Seller" : "Buyer"

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
      // Auto-redirect to Deal Room after short delay
      setTimeout(() => {
        router.push(`/transactions/${result.data!.transactionId}`)
      }, 1500)
    } catch {
      toast.error("Failed to accept offer")
    } finally {
      setAccepting(false)
    }
  }

  // Already accepted — show success and link to transaction
  if (accepted && transactionId) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transaction Created</h1>
          <p className="text-muted-foreground mt-2">
            The escrow transaction has been created. You can now proceed with the payment and delivery process.
          </p>
        </div>
        <Card className="border-border">
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Title</span>
              <span className="font-medium text-foreground">{offer.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium text-foreground">{offer.currency} {offer.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Role</span>
              <Badge variant="outline">{yourRole}</Badge>
            </div>
          </CardContent>
        </Card>
        <Button onClick={() => router.push(`/transactions/${transactionId}`)} className="w-full" size="lg">
          View Transaction
        </Button>
      </div>
    )
  }

  // Offer is not in pending state
  if (offer.status !== "pending") {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <XCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Offer Unavailable</h1>
        <p className="text-muted-foreground text-sm">
          This offer has been {offer.status === "accepted" ? "already accepted" : offer.status === "cancelled" ? "cancelled" : "expired"}.
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    )
  }

  // Creator viewing own offer
  if (offer.isCreator) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
          <User className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-foreground">This Is Your Offer</h1>
        <p className="text-muted-foreground text-sm">
          You created this offer. Share the link with the other party so they can accept it.
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  // Main accept view
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Escrow Offer</h1>
        <p className="text-muted-foreground text-sm">
          You&apos;ve been invited to an escrow transaction
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Title</p>
            <p className="font-semibold text-foreground text-lg">{offer.title}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Description</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{offer.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <DollarSign className="w-3.5 h-3.5" /> Amount
              </div>
              <p className="font-bold text-foreground text-lg">{offer.currency} {offer.amount.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <User className="w-3.5 h-3.5" /> Your Role
              </div>
              <p className="font-bold text-foreground text-lg">{yourRole}</p>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <FileText className="w-3.5 h-3.5" /> Created By
            </div>
            <p className="font-medium text-foreground">{offer.creator.full_name || offer.creator.email}</p>
          </div>

          {offer.expires_at && (
            <p className="text-xs text-muted-foreground text-center">
              Expires: {new Date(offer.expires_at).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

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
              Already have an account?{' '}
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
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accept Offer
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              By accepting, you agree to participate in this escrow transaction as the <strong>{yourRole.toLowerCase()}</strong>.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
