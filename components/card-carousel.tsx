"use client"

import { useState, useEffect, useCallback } from "react"
import { CreditCard } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel"
import { PaymentCardVisual, AddCardPlaceholder } from "@/components/payment-card-visual"
import { AddCardDialog } from "@/components/add-card-dialog"
import { listSavedCards, removeCard, setDefaultCard, type SavedCard } from "@/lib/actions/cards"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function CardCarousel({ className }: { className?: string }) {
  const [cards, setCards] = useState<SavedCard[]>([])
  const [loading, setLoading] = useState(true)
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadCards = useCallback(async () => {
    const result = await listSavedCards()
    if (result.data) setCards(result.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  // Track carousel position for dot indicators
  useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  // Update count when cards change
  useEffect(() => {
    if (!api) return
    // Wait a tick for the carousel to re-render
    const timer = setTimeout(() => {
      setCount(api.scrollSnapList().length)
    }, 50)
    return () => clearTimeout(timer)
  }, [api, cards])

  const handleRemove = useCallback(async (cardId: string) => {
    setActionLoading(cardId)
    const result = await removeCard(cardId)
    setActionLoading(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Card removed")
      loadCards()
    }
  }, [loadCards])

  const handleSetDefault = useCallback(async (cardId: string) => {
    setActionLoading(cardId)
    const result = await setDefaultCard(cardId)
    setActionLoading(null)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Default card updated")
      loadCards()
    }
  }, [loadCards])

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">My Cards</span>
        </div>
        <div className="flex gap-4 overflow-hidden">
          <div className="w-[340px] aspect-[1.586/1] rounded-2xl bg-white/[0.04] animate-pulse shrink-0" />
        </div>
      </div>
    )
  }

  // Total slides = cards + 1 "Add Card" placeholder
  const totalSlides = cards.length + 1

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">My Cards</span>
          {cards.length > 0 && (
            <span className="text-xs text-muted-foreground">({cards.length})</span>
          )}
        </div>
        <AddCardDialog onCardSaved={loadCards} />
      </div>

      {/* Carousel */}
      <div className="px-10">
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {cards.map((card) => (
              <CarouselItem
                key={card.id}
                className="pl-3 basis-full sm:basis-[340px] md:basis-[340px]"
              >
                <div className={cn(
                  "transition-opacity",
                  actionLoading === card.id && "opacity-50 pointer-events-none"
                )}>
                  <PaymentCardVisual
                    brand={card.brand}
                    last4={card.last4}
                    expMonth={card.exp_month}
                    expYear={card.exp_year}
                    cardholderName={card.cardholder_name}
                    isDefault={card.is_default}
                    onRemove={() => handleRemove(card.id)}
                    onSetDefault={() => handleSetDefault(card.id)}
                  />
                </div>
              </CarouselItem>
            ))}

            {/* Add Card placeholder — always last */}
            <CarouselItem className="pl-3 basis-full sm:basis-[340px] md:basis-[340px]">
              <AddCardDialog
                onCardSaved={loadCards}
                trigger={<AddCardPlaceholder />}
              />
            </CarouselItem>
          </CarouselContent>

          {totalSlides > 1 && (
            <>
              <CarouselPrevious className="bg-white/[0.06] border-white/[0.10] hover:bg-white/[0.12] -left-10" />
              <CarouselNext className="bg-white/[0.06] border-white/[0.10] hover:bg-white/[0.12] -right-10" />
            </>
          )}
        </Carousel>
      </div>

      {/* Dot Indicators */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                i === current
                  ? "bg-primary w-4"
                  : "bg-white/[0.15] hover:bg-white/[0.30]"
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
