"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
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
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface DebitCardData {
  id: string
  image: string
  name: string
  tagline: string
  price: string
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
    image: "/card2.png",
    name: "Gold",
    tagline: "Earn more on every purchase",
    price: "$4.99/mo",
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
    price: "$14.99/mo",
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

const accentStyles: Record<string, { dot: string; glow: string; border: string; text: string; bg: string }> = {
  emerald: {
    dot: "bg-emerald-400",
    glow: "shadow-[0_20px_60px_rgba(16,185,129,0.25)]",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  blue: {
    dot: "bg-blue-400",
    glow: "shadow-[0_20px_60px_rgba(59,130,246,0.25)]",
    border: "border-blue-500/30",
    text: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  purple: {
    dot: "bg-purple-400",
    glow: "shadow-[0_20px_60px_rgba(139,92,246,0.25)]",
    border: "border-purple-500/30",
    text: "text-purple-400",
    bg: "bg-purple-500/10",
  },
}

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
      {/* Carousel */}
      <div className="px-10 sm:px-14">
        <Carousel
          setApi={setApi}
          opts={{ align: "center", loop: true }}
          className="w-full max-w-sm mx-auto"
        >
          <CarouselContent className="-ml-4">
            {debitCards.map((card, idx) => (
              <CarouselItem key={card.id} className="pl-4 basis-full">
                <div className="flex flex-col items-center">
                  {/* Card image — tappable */}
                  <button
                    onClick={() => onCardSelect?.(card)}
                    className={cn(
                      "relative rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer w-full",
                      "hover:-translate-y-2 active:scale-[0.98]",
                      idx === current && accentStyles[card.accentColor].glow
                    )}
                  >
                    <Image
                      src={card.image}
                      alt={`PaySafe ${card.name} Card`}
                      width={800}
                      height={504}
                      className="w-full h-auto"
                      priority={card.id === "standard"}
                    />
                    {/* Glossy shine */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.10] via-transparent to-transparent pointer-events-none" />
                  </button>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious className="bg-white/[0.06] border-white/[0.10] hover:bg-white/[0.14] -left-3 sm:-left-8 w-9 h-9" />
          <CarouselNext className="bg-white/[0.06] border-white/[0.10] hover:bg-white/[0.14] -right-3 sm:-right-8 w-9 h-9" />
        </Carousel>
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
                  ? cn("w-7 h-2.5", accentStyles[card.accentColor].dot)
                  : "bg-white/[0.12] hover:bg-white/[0.25] w-2.5 h-2.5"
              )}
              aria-label={`View ${card.name} card`}
            />
          ))}
        </div>
      )}

      {/* Card Info Panel — changes with each slide */}
      <div className="transition-all duration-500">
        <GlassCard
          padding="none"
          className={cn("overflow-hidden transition-all duration-500", accent.border)}
        >
          {/* Card name + price header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-bold text-foreground">
                  {activeCard?.name}
                </h3>
                <GlassBadge variant={activeCard?.badgeVariant} size="sm">
                  {activeCard?.badgeLabel}
                </GlassBadge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeCard?.tagline}
              </p>
            </div>
            <div className="text-right">
              <div className={cn("text-lg font-bold", accent.text)}>
                {activeCard?.price}
              </div>
              {activeCard?.price !== "Free" && (
                <div className="text-[10px] text-muted-foreground">per month</div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06] mx-5" />

          {/* Perks list */}
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

          {/* Get Card CTA */}
          <div className="px-5 pb-5 pt-1">
            <Button
              onClick={() => onCardSelect?.(activeCard)}
              className={cn(
                "w-full font-semibold text-sm h-11",
                activeCard?.accentColor === "emerald" && "bg-emerald-600 hover:bg-emerald-700 text-white",
                activeCard?.accentColor === "blue" && "bg-blue-600 hover:bg-blue-700 text-white",
                activeCard?.accentColor === "purple" && "bg-purple-600 hover:bg-purple-700 text-white",
              )}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Get {activeCard?.name} Card
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
