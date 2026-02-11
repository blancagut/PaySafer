"use client"

import { useState, useCallback } from "react"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { getStripe } from "@/lib/stripe/client"
import { createSetupIntent, saveCardFromSetupIntent } from "@/lib/actions/cards"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreditCard, Loader2 } from "lucide-react"
import { toast } from "sonner"

// ─── Card Element Styling ───

const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#e2e8f0",
      fontFamily: '"Inter", system-ui, sans-serif',
      "::placeholder": {
        color: "#64748b",
      },
      iconColor: "#94a3b8",
    },
    invalid: {
      color: "#f87171",
      iconColor: "#f87171",
    },
  },
}

// ─── Inner Form (needs Stripe context) ───

function AddCardForm({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void
  onClose: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [cardholderName, setCardholderName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    try {
      // 1. Create SetupIntent server-side
      const result = await createSetupIntent()
      if (result.error || !result.clientSecret) {
        setError(result.error || "Failed to start card setup")
        setLoading(false)
        return
      }

      // 2. Confirm the SetupIntent client-side with the card
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        setError("Card element not ready")
        setLoading(false)
        return
      }

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        result.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: cardholderName || undefined,
            },
          },
        }
      )

      if (stripeError) {
        setError(stripeError.message || "Card setup failed")
        setLoading(false)
        return
      }

      if (!setupIntent?.payment_method) {
        setError("No payment method returned")
        setLoading(false)
        return
      }

      // 3. Save the card to our database
      // The webhook may also do this, but we do it eagerly for instant UI feedback
      const pmId = typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method.id

      const saveResult = await saveCardFromSetupIntent("__current__", pmId)

      // Even if save fails here (e.g. "already saved" from webhook race),
      // the card is saved via webhook — so we just refresh
      if (saveResult.error && saveResult.error !== "Card already saved") {
        console.warn("[add-card] Eagerly save returned:", saveResult.error)
      }

      toast.success("Card saved successfully!")
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [stripe, elements, cardholderName, onSuccess, onClose])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cardholder-name" className="text-sm text-muted-foreground">
          Cardholder Name
        </Label>
        <Input
          id="cardholder-name"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="John Doe"
          className="bg-white/[0.04] border-white/[0.10]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Card Details</Label>
        <div className="p-3.5 rounded-lg bg-white/[0.04] border border-white/[0.10] transition-colors focus-within:border-primary/40">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="bg-white/[0.04] border-white/[0.10]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || loading}
          className="bg-primary hover:bg-primary/90 gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Save Card
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

// ─── Exported Dialog Component ───

export function AddCardDialog({
  onCardSaved,
  trigger,
}: {
  onCardSaved: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08] gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Add Card
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] bg-[hsl(222,47%,8%)] border-white/[0.10]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Add Payment Card
          </DialogTitle>
          <DialogDescription>
            Your card information is securely processed by Stripe. We never store your full card number.
          </DialogDescription>
        </DialogHeader>
        <Elements stripe={getStripe()}>
          <AddCardForm
            onSuccess={onCardSaved}
            onClose={() => setOpen(false)}
          />
        </Elements>
      </DialogContent>
    </Dialog>
  )
}
