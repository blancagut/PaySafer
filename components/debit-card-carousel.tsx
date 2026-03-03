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
import { cn } from "@/lib/utils"

const debitCards = [
  {
    id: "virtual",
    image: "/card1.png",
    label: "Virtual Card",
    sublabel: "Free · Instant",
    badgeVariant: "emerald" as const,
  },
  {
    id: "standard",
    image: "/card2.png",
    label: "Standard Card",
    sublabel: "Free · Ships in 5 days",
    badgeVariant: "blue" as const,
  },
  {
    id: "metal",
    image: "/cardmetal3.png",
    label: "Metal Card",
    sublabel: "Premium · Coming Soon",
    badgeVariant: "purple" as const,
  },
]

export function DebitCardCarousel({ className }: { className?: string }) {
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

  return (
    <div className={cn("space-y-5", className)}>
      {/* Carousel */}
      <div className="px-12">
        <Carousel
          setApi={setApi}
          opts={{ align: "center", loop: true }}
          className="w-full max-w-md mx-auto"
        >
          <CarouselContent className="-ml-4">
            {debitCards.map((card) => (
              <CarouselItem key={card.id} className="pl-4 basis-full">
                <div className="flex flex-col items-center gap-3">
                  {/* Card image with glass frame */}
                  <div className="relative group">
                    <div
                      className={cn(
                        "relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-500",
                        "hover:shadow-[0_20px_60px_rgba(16,185,129,0.2)] hover:-translate-y-1",
                        card.id === "metal" && "ring-1 ring-white/[0.1]"
                      )}
                    >
                      <Image
                        src={card.image}
                        alt={`PaySafe ${card.label}`}
                        width={800}
                        height={504}
                        className="w-full h-auto"
                        priority={card.id === "virtual"}
                      />

                      {/* Metal card "Coming Soon" overlay */}
                      {card.id === "metal" && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/60 mb-1">
                              Coming Soon
                            </div>
                            <div className="text-sm font-semibold text-white/90">
                              Premium Metal
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Glossy shine overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
                    </div>
                  </div>

                  {/* Badge below card */}
                  <GlassBadge variant={card.badgeVariant} size="sm">
                    {card.sublabel}
                  </GlassBadge>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious className="bg-white/[0.06] border-white/[0.10] hover:bg-white/[0.12] -left-4 sm:-left-6" />
          <CarouselNext className="bg-white/[0.06] border-white/[0.10] hover:bg-white/[0.12] -right-4 sm:-right-6" />
        </Carousel>
      </div>

      {/* Dot Indicators */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "rounded-full transition-all duration-300",
                i === current
                  ? "bg-primary w-6 h-2"
                  : "bg-white/[0.15] hover:bg-white/[0.30] w-2 h-2"
              )}
              aria-label={`Go to card ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
