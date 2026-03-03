"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { GlassBadge } from "@/components/glass"
import { GlassCard } from "@/components/glass"
import { Button } from "@/components/ui/button"
import {
  Gift,
  Shield,
  Globe,
  Percent,
  Zap,
  Crown,
  Gem,
  Star,
  CreditCard,
  ChevronRight,
  Banknote,
  Smartphone,
  TrendingUp,
  Wifi,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Gold Card Visual (rendered in code) ───

function GoldCardVisual({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative w-full aspect-[1.586/1] rounded-2xl overflow-hidden select-none",
        className
      )}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600" />

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Metallic shine */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent" />
      <div className="absolute top-0 right-0 w-2/3 h-2/3 bg-gradient-to-bl from-white/15 via-transparent to-transparent rounded-bl-full" />

      {/* Chip */}
      <div className="absolute top-[22%] left-[8%]">
        <svg width="46" height="36" viewBox="0 0 46 36" fill="none">
          <rect x="0.5" y="0.5" width="45" height="35" rx="5" fill="url(#chipGold)" stroke="#b8860b" strokeWidth="0.5" />
          <line x1="0" y1="18" x2="46" y2="18" stroke="#b8860b" strokeWidth="0.5" opacity="0.6" />
          <line x1="23" y1="0" x2="23" y2="36" stroke="#b8860b" strokeWidth="0.5" opacity="0.6" />
          <line x1="12" y1="8" x2="12" y2="28" stroke="#b8860b" strokeWidth="0.5" opacity="0.4" />
          <line x1="34" y1="8" x2="34" y2="28" stroke="#b8860b" strokeWidth="0.5" opacity="0.4" />
          <defs>
            <linearGradient id="chipGold" x1="0" y1="0" x2="46" y2="36">
              <stop offset="0%" stopColor="#e6c84d" />
              <stop offset="40%" stopColor="#f0d860" />
              <stop offset="100%" stopColor="#c9a83a" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Contactless icon */}
      <div className="absolute top-[22%] left-[22%]">
        <Wifi className="w-5 h-5 text-amber-900/50 rotate-90" />
      </div>

      {/* Card number */}
      <div className="absolute bottom-[32%] left-[8%] right-[8%]">
        <div className="flex justify-between text-white/90 font-mono text-sm tracking-[0.15em] drop-shadow-sm">
          <span>••••</span>
          <span>••••</span>
          <span>••••</span>
          <span>••••</span>
        </div>
      </div>

      {/* Cardholder + Expiry */}
      <div className="absolute bottom-[12%] left-[8%] right-[8%] flex justify-between items-end">
        <div>
          <div className="text-[9px] text-white/50 uppercase tracking-wider mb-0.5">Card Holder</div>
          <div className="text-xs text-white/90 font-medium tracking-wide">CARDHOLDER NAME</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-white/50 uppercase tracking-wider mb-0.5">Expires</div>
          <div className="text-xs text-white/90 font-medium">MM/YY</div>
        </div>
      </div>

      {/* Mastercard logo */}
      <div className="absolute top-[8%] right-[6%] flex items-center">
        <div className="w-8 h-8 rounded-full bg-red-500 opacity-90" />
        <div className="w-8 h-8 rounded-full bg-amber-400 opacity-90 -ml-3" />
      </div>

      {/* DEBIT label */}
      <div className="absolute bottom-[8%] right-[6%]">
        <span className="text-[10px] text-white/60 font-semibold tracking-[0.2em] uppercase">Debit</span>
      </div>

      {/* Final glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.12] via-transparent to-black/[0.08] pointer-events-none" />
    </div>
  )
}

// ─── Card Data ───

export interface DebitCardData {
  id: string
  image?: string
  component?: React.ComponentType<{ className?: string }>
  name: string
  tagline: string
  price: string
  priceNote?: string
  badgeVariant: "emerald" | "blue" | "purple"
  badgeLabel: string
  accentColor: string
  perks: { icon: React.ComponentType<{ className?: string }>; text: string }[]
}

const debitCards: DebitCardData[] = [
  {
    id: "standard",
    image: "/card1.png",
    name: "Standard",
    tagline: "The essentials, for free",
    price: "Free",
    badgeVariant: "emerald",
    badgeLabel: "Most Popular",
    accentColor: "emerald",
    perks: [
      { icon: Globe, text: "Spend worldwide — 210+ countries" },
      { icon: Smartphone, text: "Apple Pay & Google Pay ready" },
      { icon: Shield, text: "Instant freeze & unfreeze" },
      { icon: Zap, text: "Real-time transaction alerts" },
    ],
  },
  {
    id: "gold",
    component: GoldCardVisual,
    name: "Gold",
    tagline: "Earn more on every swipe",
    price: "$9.99",
    priceNote: "one-time card fee",
    badgeVariant: "blue",
    badgeLabel: "Best Value",
    accentColor: "blue",
    perks: [
      { icon: Star, text: "1% cashback on all purchases" },
      { icon: Banknote, text: "3 free ATM withdrawals/month" },
      { icon: Percent, text: "No foreign exchange fees" },
      { icon: Gift, text: "Exclusive partner discounts" },
    ],
  },
  {
    id: "platinum",
    image: "/cardmetal3.png",
    name: "Platinum",
    tagline: "Premium metal. Unlimited rewards.",
    price: "$49.99",
    priceNote: "one-time card fee",
    badgeVariant: "purple",
    badgeLabel: "Premium",
    accentColor: "purple",
    perks: [
      { icon: Gem, text: "3% cashback on everything" },
      { icon: Crown, text: "Airport lounge access" },
      { icon: TrendingUp, text: "Priority support & higher limits" },
      { icon: Shield, text: "Premium purchase protection" },
    ],
  },
]

const accentStyles: Record<string, { dot: string; glow: string; border: string; text: string; bg: string; btn: string }> = {
  emerald: {
    dot: "bg-emerald-400",
    glow: "shadow-[0_20px_60px_rgba(16,185,129,0.3)]",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  blue: {
    dot: "bg-yellow-400",
    glow: "shadow-[0_20px_60px_rgba(234,179,8,0.25)]",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    bg: "bg-yellow-500/10",
    btn: "bg-yellow-600 hover:bg-yellow-700 text-white",
  },
  purple: {
    dot: "bg-purple-400",
    glow: "shadow-[0_20px_60px_rgba(139,92,246,0.25)]",
    border: "border-purple-500/30",
    text: "text-purple-400",
    bg: "bg-purple-500/10",
    btn: "bg-purple-600 hover:bg-purple-700 text-white",
  },
}

// ─── Carousel Component ───

interface DebitCardCarouselProps {
  className?: string
  onCardSelect?: (card: DebitCardData) => void
}

export function DebitCardCarousel({ className, onCardSelect }: DebitCardCarouselProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!api) return
    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  const activeCard = debitCards[current]
  const accent = accentStyles[activeCard?.accentColor ?? "emerald"]

  return (
    <div className={cn("space-y-6", className)}>
      {/* Card Carousel — no arrows, swipe/drag only, cards peek from sides */}
      <div>
        <Carousel
          setApi={setApi}
          opts={{ align: "center", loop: true, dragFree: false }}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {debitCards.map((card, idx) => (
              <CarouselItem
                key={card.id}
                className="pl-3 basis-[82%] sm:basis-[70%] md:basis-[60%]"
              >
                <button
                  onClick={() => onCardSelect?.(card)}
                  className={cn(
                    "relative w-full rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer block",
                    idx === current
                      ? cn("scale-100 opacity-100", accentStyles[card.accentColor].glow)
                      : "scale-[0.92] opacity-50"
                  )}
                >
                  {card.component ? (
                    <card.component className="w-full" />
                  ) : (
                    <Image
                      src={card.image!}
                      alt={`PaySafe ${card.name} Card`}
                      width={800}
                      height={504}
                      className="w-full h-auto"
                      priority={idx === 0}
                    />
                  )}
                  {/* Glossy shine */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent pointer-events-none rounded-2xl" />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Card name label + dots */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-center">
          <span className="text-base font-semibold text-foreground">{activeCard?.name}</span>
          <span className="text-muted-foreground mx-2">·</span>
          <span className={cn("text-sm font-medium", accent.text)}>
            {activeCard?.price === "Free" ? "Free" : activeCard?.price}
          </span>
        </div>

        {/* Dot Indicators */}
        {count > 1 && (
          <div className="flex items-center justify-center gap-2">
            {debitCards.map((card, i) => (
              <button
                key={card.id}
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === current
                    ? cn("w-7 h-2", accentStyles[card.accentColor].dot)
                    : "bg-white/[0.12] hover:bg-white/[0.25] w-2 h-2"
                )}
                aria-label={`View ${card.name} card`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card Info Panel — perks + CTA */}
      <GlassCard
        padding="none"
        className={cn("overflow-hidden transition-all duration-300", accent.border)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-foreground">{activeCard?.name}</h3>
              <GlassBadge variant={activeCard?.badgeVariant} size="sm">
                {activeCard?.badgeLabel}
              </GlassBadge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{activeCard?.tagline}</p>
          </div>
          <div className="text-right shrink-0">
            <div className={cn("text-lg font-bold", accent.text)}>{activeCard?.price}</div>
            {activeCard?.priceNote && (
              <div className="text-[10px] text-muted-foreground">{activeCard.priceNote}</div>
            )}
          </div>
        </div>

        <div className="h-px bg-white/[0.06] mx-5" />

        {/* Perks */}
        <div className="px-5 py-4 space-y-3">
          {activeCard?.perks.map((perk, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", accent.bg)}>
                <perk.icon className={cn("w-4 h-4", accent.text)} />
              </div>
              <span className="text-sm text-foreground/90">{perk.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-5 pb-5 pt-1">
          <Button
            onClick={() => onCardSelect?.(activeCard)}
            className={cn("w-full font-semibold text-sm h-11", accent.btn)}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Get {activeCard?.name} Card
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}
