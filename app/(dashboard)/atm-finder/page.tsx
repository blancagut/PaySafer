"use client"

import { useState } from "react"
import {
  MapPin,
  Navigation,
  Search,
  Star,
  Clock,
  DollarSign,
  Filter,
  CheckCircle2,
  XCircle,
  Banknote,
  Building2,
  Info,
  ExternalLink,
  Locate,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── ATM Data ───

interface ATM {
  id: string
  name: string
  network: string
  address: string
  distance: string
  distanceMeters: number
  lat: number
  lng: number
  freeWithdrawal: boolean
  fee: number
  currency: string
  hours: string
  features: string[]
  rating: number
}

const mockATMs: ATM[] = [
  {
    id: "atm1", name: "ENBD ATM", network: "Emirates NBD", address: "Dubai Mall, Financial Center Road, Downtown Dubai",
    distance: "0.3 km", distanceMeters: 300, lat: 25.1972, lng: 55.2744, freeWithdrawal: true, fee: 0,
    currency: "AED", hours: "24/7", features: ["Cardless", "Deposit", "Multi-currency"], rating: 4.8,
  },
  {
    id: "atm2", name: "ADCB ATM", network: "ADCB", address: "Souk Al Bahar, Old Town Island, Downtown Dubai",
    distance: "0.5 km", distanceMeters: 500, lat: 25.1960, lng: 55.2755, freeWithdrawal: true, fee: 0,
    currency: "AED", hours: "24/7", features: ["Cardless", "Deposit"], rating: 4.5,
  },
  {
    id: "atm3", name: "Mashreq ATM", network: "Mashreq", address: "Boulevard Plaza, Sheikh Mohammed bin Rashid Blvd",
    distance: "0.8 km", distanceMeters: 800, lat: 25.1925, lng: 55.2721, freeWithdrawal: true, fee: 0,
    currency: "AED", hours: "24/7", features: ["Multi-currency"], rating: 4.3,
  },
  {
    id: "atm4", name: "FAB ATM", network: "First Abu Dhabi Bank", address: "Burj Vista Tower 1, Sheikh Zayed Road",
    distance: "1.2 km", distanceMeters: 1200, lat: 25.1935, lng: 55.2640, freeWithdrawal: false, fee: 5,
    currency: "AED", hours: "24/7", features: ["Deposit"], rating: 4.1,
  },
  {
    id: "atm5", name: "RAK Bank ATM", network: "RAK Bank", address: "City Walk, Phase 2, Al Wasl",
    distance: "1.8 km", distanceMeters: 1800, lat: 25.2070, lng: 55.2607, freeWithdrawal: false, fee: 10,
    currency: "AED", hours: "6 AM - 12 AM", features: [], rating: 3.9,
  },
  {
    id: "atm6", name: "DIB ATM", network: "Dubai Islamic Bank", address: "Business Bay Metro Station",
    distance: "2.1 km", distanceMeters: 2100, lat: 25.1860, lng: 55.2680, freeWithdrawal: true, fee: 0,
    currency: "AED", hours: "24/7", features: ["Cardless", "Multi-currency"], rating: 4.4,
  },
  {
    id: "atm7", name: "CBD Exchange ATM", network: "CBD", address: "Al Fahidi Metro Station, Bur Dubai",
    distance: "3.5 km", distanceMeters: 3500, lat: 25.2545, lng: 55.2960, freeWithdrawal: true, fee: 0,
    currency: "AED/USD", hours: "24/7", features: ["Multi-currency", "Deposit"], rating: 4.6,
  },
  {
    id: "atm8", name: "HSBC ATM", network: "HSBC", address: "DIFC Gate Village, Building 3",
    distance: "1.0 km", distanceMeters: 1000, lat: 25.2140, lng: 55.2800, freeWithdrawal: false, fee: 15,
    currency: "AED/USD/EUR", hours: "24/7", features: ["Multi-currency"], rating: 4.2,
  },
]

type FilterType = "all" | "free" | "deposit" | "cardless"

export default function ATMFinderPage() {
  const [atms] = useState<ATM[]>(mockATMs)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [selectedATM, setSelectedATM] = useState<string | null>(null)

  const filtered = atms
    .filter((atm) => {
      const matchesSearch = atm.name.toLowerCase().includes(search.toLowerCase()) ||
        atm.address.toLowerCase().includes(search.toLowerCase()) ||
        atm.network.toLowerCase().includes(search.toLowerCase())

      if (filter === "free") return matchesSearch && atm.freeWithdrawal
      if (filter === "deposit") return matchesSearch && atm.features.includes("Deposit")
      if (filter === "cardless") return matchesSearch && atm.features.includes("Cardless")
      return matchesSearch
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)

  const freeCount = atms.filter((a) => a.freeWithdrawal).length

  const handleDirections = (atm: ATM) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${atm.lat},${atm.lng}`
    window.open(url, "_blank")
    toast.success("Opening directions", { description: atm.name })
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All ATMs" },
    { key: "free", label: "Fee-Free" },
    { key: "deposit", label: "Deposit" },
    { key: "cardless", label: "Cardless" },
  ]

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              ATM Finder
            </h2>
            <p className="text-sm text-muted-foreground font-light tracking-wide">
              Find fee-free ATMs near you
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="animate-fade-in grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ animationDelay: "100ms" }}>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Nearby</span>
          <span className="text-xl font-semibold text-foreground">{atms.length} ATMs</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Fee-Free</span>
          <span className="text-xl font-semibold text-emerald-400">{freeCount}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Nearest</span>
          <span className="text-xl font-semibold text-foreground">{atms[0]?.distance}</span>
        </GlassCard>
        <GlassCard padding="md">
          <span className="text-xs text-muted-foreground tracking-wide uppercase block mb-1">Location</span>
          <span className="text-sm font-medium text-foreground flex items-center gap-1">
            <Locate className="w-3.5 h-3.5 text-primary" /> Downtown Dubai
          </span>
        </GlassCard>
      </div>

      {/* Map Placeholder */}
      <div className="animate-fade-in" style={{ animationDelay: "130ms" }}>
        <GlassCard padding="none" className="overflow-hidden">
          <div className="h-48 sm:h-64 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] rounded-xl flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 opacity-10">
              {/* Grid pattern to simulate map */}
              <div className="w-full h-full" style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                backgroundSize: "40px 40px"
              }} />
            </div>
            {/* ATM dots */}
            {filtered.slice(0, 6).map((atm, i) => (
              <div
                key={atm.id}
                className={cn(
                  "absolute w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-transparent cursor-pointer transition-transform hover:scale-150",
                  atm.freeWithdrawal ? "bg-emerald-400 ring-emerald-400/30" : "bg-amber-400 ring-amber-400/30"
                )}
                style={{
                  top: `${20 + (i * 12) % 60}%`,
                  left: `${15 + (i * 17) % 70}%`,
                }}
                onClick={() => setSelectedATM(atm.id)}
                title={atm.name}
              />
            ))}
            <div className="relative z-10 text-center">
              <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Interactive map</p>
              <p className="text-[10px] text-muted-foreground/50">Connect Google Maps API for live map</p>
            </div>
            <div className="absolute bottom-3 right-3 z-10 flex gap-2 text-[10px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Free
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Fee
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Search + Filters */}
      <div className="animate-fade-in space-y-3" style={{ animationDelay: "160ms" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by bank, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-1 p-0.5 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                filter === f.key ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ATM List */}
      <div className="animate-fade-in-up space-y-2" style={{ animationDelay: "200ms" }}>
        {filtered.map((atm) => (
          <GlassCard
            key={atm.id}
            padding="none"
            className={cn(
              "hover:bg-white/[0.06] transition-colors",
              selectedATM === atm.id && "ring-1 ring-primary/30"
            )}
            onClick={() => setSelectedATM(atm.id === selectedATM ? null : atm.id)}
          >
            <div className="flex items-start gap-4 p-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                atm.freeWithdrawal
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-white/[0.04] border-white/[0.08]"
              )}>
                <Banknote className={cn("w-5 h-5", atm.freeWithdrawal ? "text-emerald-400" : "text-muted-foreground")} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{atm.name}</span>
                  {atm.freeWithdrawal ? (
                    <GlassBadge variant="emerald" size="sm">Free</GlassBadge>
                  ) : (
                    <GlassBadge variant="amber" size="sm">AED {atm.fee} fee</GlassBadge>
                  )}
                  {atm.features.includes("Cardless") && (
                    <GlassBadge variant="blue" size="sm">Cardless</GlassBadge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{atm.address}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Navigation className="w-2.5 h-2.5" /> {atm.distance}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {atm.hours}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 text-yellow-400" /> {atm.rating}
                  </span>
                  {atm.features.length > 0 && (
                    <span className="text-muted-foreground/60">· {atm.features.join(", ")}</span>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleDirections(atm) }}
                className="bg-primary/10 hover:bg-primary/20 text-primary text-xs shrink-0"
              >
                <Navigation className="w-3.5 h-3.5 mr-1" />
                Go
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Info */}
      <div className="animate-fade-in flex items-start gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]" style={{ animationDelay: "260ms" }}>
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground/70">
          ATM fees may vary. PaySafer reimburses up to 3 out-of-network ATM fees per month for Gold
          and Platinum members. Cardless withdrawal requires the PaySafer app.
        </p>
      </div>
    </div>
  )
}
