"use client"

import { useState } from "react"
import {
  Globe,
  Bell,
  CreditCard,
  MapPin,
  Sparkles,
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
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { DebitCardCarousel, type DebitCardData } from "@/components/debit-card-carousel"
import { toast } from "sonner"

// ─── FAQ Data ───

const faqs = [
  {
    question: "Who is eligible for the PaySafe Debit Card?",
    answer:
      "The PaySafe Mastercard Debit Card is currently available to verified residents of the United States and United Arab Emirates. We're actively working to expand to more countries — join the waitlist to be notified.",
  },
  {
    question: "What's the difference between Standard, Gold, and Platinum?",
    answer:
      "Standard is free and includes essentials like worldwide spending, Apple/Google Pay, and instant alerts. Gold ($4.99/mo) adds 1% cashback, free ATM withdrawals, and no FX fees. Platinum ($14.99/mo) unlocks 3% cashback, airport lounge access, priority support, and premium purchase protection.",
  },
  {
    question: "How do I fund my debit card?",
    answer:
      "Simply top up from your PaySafe wallet balance. Funds are transferred instantly to your card and ready to spend. You can also set up auto top-up to maintain a minimum balance.",
  },
  {
    question: "Are there any hidden fees?",
    answer:
      "No. The Standard card is completely free with no monthly fees. Gold and Platinum have transparent monthly subscriptions with no hidden charges. All domestic purchases are fee-free on every tier.",
  },
  {
    question: "What spending limits apply?",
    answer:
      "Standard: $5,000/day. Gold: $10,000/day. Platinum: $25,000/day. ATM withdrawal limits vary by tier. You can request higher limits through the app after full verification.",
  },
  {
    question: "Can I use the card for ATM withdrawals?",
    answer:
      "Yes! Standard includes 1 free ATM withdrawal/month, Gold includes 3, and Platinum includes unlimited free withdrawals. Works at any Mastercard-compatible ATM worldwide.",
  },
]

export default function DebitCardPage() {
  const [geoDialogOpen, setGeoDialogOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<DebitCardData | null>(null)

  const handleCardSelect = (card: DebitCardData) => {
    setSelectedCard(card)
    setGeoDialogOpen(true)
  }

  const handleNotifyMe = () => {
    toast.success("You're on the waitlist!", {
      description: "We'll notify you when PaySafe cards are available in your country.",
    })
    setGeoDialogOpen(false)
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* ─── Header ─── */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Debit Card</h2>
            <p className="text-sm text-muted-foreground">
              Choose the card that fits your lifestyle
            </p>
          </div>
        </div>
      </div>

      {/* ─── Geo-Restriction Banner ─── */}
      <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md" className="border-amber-500/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-semibold text-foreground">Limited Availability</span>
                <GlassBadge variant="amber" size="sm" pulse>
                  U.S. & UAE Only
                </GlassBadge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                PaySafe Debit Cards are currently available for{" "}
                <span className="text-foreground font-medium">United States</span> and{" "}
                <span className="text-foreground font-medium">United Arab Emirates</span> residents.
                More countries coming soon.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ─── Card Carousel with Perks ─── */}
      <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <DebitCardCarousel onCardSelect={handleCardSelect} />
      </div>

      {/* ─── Compare Cards Strip ─── */}
      <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <GlassCard padding="md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <div>
                <span className="text-sm font-semibold text-foreground">Not sure which card?</span>
                <p className="text-xs text-muted-foreground">Start free, upgrade anytime</p>
              </div>
            </div>
            <div className="flex gap-2">
              <GlassBadge variant="emerald" size="sm">Standard — Free</GlassBadge>
              <GlassBadge variant="blue" size="sm">Gold — $4.99</GlassBadge>
              <GlassBadge variant="purple" size="sm">Platinum — $14.99</GlassBadge>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ─── FAQ Section ─── */}
      <div className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
        <GlassContainer
          header={{
            title: "Frequently Asked Questions",
            description: "Everything you need to know about PaySafe cards",
          }}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="border-white/[0.06]"
              >
                <AccordionTrigger className="text-sm font-medium text-foreground hover:text-primary transition-colors py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </GlassContainer>
      </div>

      {/* ─── Geo-Restriction Dialog (on card tap) ─── */}
      <Dialog open={geoDialogOpen} onOpenChange={setGeoDialogOpen}>
        <DialogContent className="glass-card border-white/[0.10] max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Globe className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              Not Available in Your Region
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed pt-2">
              {selectedCard ? (
                <>
                  The <span className="text-foreground font-medium">PaySafe {selectedCard.name}</span> card
                  is currently only available for residents of the{" "}
                  <span className="text-foreground font-medium">United States</span> and{" "}
                  <span className="text-foreground font-medium">United Arab Emirates</span>.
                </>
              ) : (
                <>
                  PaySafe Debit Cards are currently only available for U.S. and UAE residents.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Country flags */}
          <div className="flex items-center justify-center gap-8 py-5">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-3xl shadow-inner">
                🇺🇸
              </div>
              <span className="text-xs text-muted-foreground font-medium">United States</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center text-3xl shadow-inner">
                🇦🇪
              </div>
              <span className="text-xs text-muted-foreground font-medium">UAE</span>
            </div>
          </div>

          <div className="glass-card rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">
              We&apos;re expanding to more countries soon. Join the waitlist and be the first to know when
              PaySafe cards launch in your region.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              onClick={handleNotifyMe}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full"
              size="lg"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notify Me When Available
            </Button>
            <Button
              variant="ghost"
              onClick={() => setGeoDialogOpen(false)}
              className="text-muted-foreground hover:text-foreground w-full"
              size="sm"
            >
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
