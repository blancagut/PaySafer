"use client"

import { useState } from "react"
import {
  Globe,
  Zap,
  Bell,
  Shield,
  DollarSign,
  Smartphone,
  CreditCard,
  Info,
  MapPin,
  ChevronRight,
  Lock,
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
import { DebitCardCarousel } from "@/components/debit-card-carousel"
import { toast } from "sonner"

// ─── Features Grid Data ───

const features = [
  {
    icon: Globe,
    title: "Worldwide Payments",
    description: "Use anywhere Mastercard is accepted — online and in-store across 210+ countries.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: Zap,
    title: "Instant Top-Up",
    description: "Fund your card from your PaySafe wallet in seconds. No waiting.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Bell,
    title: "Real-Time Notifications",
    description: "Get instant push alerts for every transaction. Always stay in the loop.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: Shield,
    title: "Freeze & Unfreeze",
    description: "Lock your card instantly from the app. One tap for full security control.",
    color: "text-red-400",
    bg: "bg-red-500/10",
  },
  {
    icon: DollarSign,
    title: "Fee-Free Spending",
    description: "No hidden fees on purchases. Transparent pricing, always.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Smartphone,
    title: "Apple Pay & Google Pay",
    description: "Add to your digital wallet for contactless payments everywhere.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
]

// ─── FAQ Data ───

const faqs = [
  {
    question: "Who is eligible for the PaySafe Debit Card?",
    answer:
      "The PaySafe Mastercard Debit Card is currently available to verified residents of the United States and United Arab Emirates. We're actively working to expand to more countries — join the waitlist to be notified.",
  },
  {
    question: "How do I fund my debit card?",
    answer:
      "Simply top up from your PaySafe wallet balance. Funds are transferred instantly to your card and ready to spend. You can also set up auto top-up to maintain a minimum balance.",
  },
  {
    question: "Are there any fees?",
    answer:
      "The virtual card is completely free. Physical card shipping is free for Standard delivery (5–7 business days). There are no monthly maintenance fees and no fees on domestic purchases.",
  },
  {
    question: "How long does the physical card take to arrive?",
    answer:
      "Standard delivery takes 5–7 business days. Express delivery (2–3 business days) is available for a small fee. You can use your virtual card immediately while waiting.",
  },
  {
    question: "What spending limits apply?",
    answer:
      "Daily spending limit is $10,000 for verified accounts. ATM withdrawal limit is $1,000 per day. You can request higher limits through the app after verification.",
  },
  {
    question: "Can I use the card for ATM withdrawals?",
    answer:
      "Yes! You can withdraw cash from any Mastercard-compatible ATM worldwide. The first 3 ATM withdrawals per month are free, after which a small fee applies.",
  },
]

export default function DebitCardPage() {
  const [geoDialogOpen, setGeoDialogOpen] = useState(false)

  const handleOrderCard = () => {
    setGeoDialogOpen(true)
  }

  const handleNotifyMe = () => {
    toast.success("You'll be notified when we expand to your country!", {
      description: "We'll send you an email as soon as the card is available in your region.",
    })
    setGeoDialogOpen(false)
  }

  const handleEligible = () => {
    toast.info("Card ordering is coming soon!", {
      description: "We're putting the finishing touches on the ordering flow. Stay tuned!",
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
              Your PaySafe Mastercard — spend anywhere, anytime
            </p>
          </div>
        </div>
      </div>

      {/* ─── Geo-Restriction Banner ─── */}
      <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md" className="border-amber-500/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground">Limited Availability</span>
                <GlassBadge variant="amber" size="sm" pulse>
                  U.S. & UAE Only
                </GlassBadge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The PaySafe Debit Card is currently available for{" "}
                <span className="text-foreground font-medium">United States</span> and{" "}
                <span className="text-foreground font-medium">United Arab Emirates</span> residents
                only. We&apos;re working hard to expand to more countries soon.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ─── Card Carousel ─── */}
      <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <GlassCard padding="lg">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-1">Choose Your Card</h3>
            <p className="text-sm text-muted-foreground">
              Swipe to explore our card options
            </p>
          </div>
          <DebitCardCarousel />
        </GlassCard>
      </div>

      {/* ─── Features Grid ─── */}
      <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
            Card Features
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Everything you need in a modern debit card
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((feature) => (
            <GlassCard
              key={feature.title}
              variant="hover"
              padding="md"
              className="group"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110`}
                >
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-0.5">
                    {feature.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* ─── CTA Section ─── */}
      <div className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
        <GlassCard variant="glow" glowColor="emerald" padding="lg">
          <div className="text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Get Your PaySafe Card
            </h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Start spending worldwide with your free virtual card. 
              Order a physical card to unlock ATM withdrawals and premium features.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleOrderCard}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
                size="lg"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Order Card
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                onClick={handleOrderCard}
                className="border-white/[0.12] hover:bg-white/[0.06]"
                size="lg"
              >
                <Info className="w-4 h-4 mr-2" />
                Learn More
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ─── FAQ Section ─── */}
      <div className="animate-fade-in-up" style={{ animationDelay: "500ms" }}>
        <GlassContainer
          header={{
            title: "Frequently Asked Questions",
            description: "Everything you need to know about the PaySafe Debit Card",
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

      {/* ─── Geo-Restriction Dialog ─── */}
      <Dialog open={geoDialogOpen} onOpenChange={setGeoDialogOpen}>
        <DialogContent className="glass-card border-white/[0.10] max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Globe className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              Limited Availability
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed pt-2">
              PaySafe Debit Cards are currently available for residents of the{" "}
              <span className="text-foreground font-medium">United States</span> and{" "}
              <span className="text-foreground font-medium">United Arab Emirates</span> only.
            </DialogDescription>
          </DialogHeader>

          {/* Country flags */}
          <div className="flex items-center justify-center gap-6 py-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-2xl">
                🇺🇸
              </div>
              <span className="text-xs text-muted-foreground">United States</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-2xl">
                🇦🇪
              </div>
              <span className="text-xs text-muted-foreground">UAE</span>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground pb-2">
            More countries coming soon — join the waitlist to be first in line.
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <Button
              onClick={handleEligible}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full"
              size="lg"
            >
              <Lock className="w-4 h-4 mr-2" />
              I&apos;m eligible — continue
            </Button>
            <Button
              variant="outline"
              onClick={handleNotifyMe}
              className="border-white/[0.12] hover:bg-white/[0.06] w-full"
              size="lg"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notify me when available in my country
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
