"use client"

import { useState, useEffect, useCallback } from "react"
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
  Locate,
  Loader2,
} from "lucide-react"
import { GlassCard } from "@/components/glass"
import { GlassBadge } from "@/components/glass"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import { getATMs, getATMSuggestions, type ATMLocation, type ATMSuggestion } from "@/lib/actions/atms"

// Dynamically import map to avoid SSR issues
const ATMMap = dynamic(() => import("@/components/atm-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-white/[0.03] rounded-xl">
      <p className="text-sm text-muted-foreground">Loading map...</p>
    </div>
  ),
})

// ─── ATM interface used by the map component ───

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

const FALLBACK_ATMS: ATM[] = [
  {
    id: "fallback-enbd-dubai-mall",
    name: "ENBD ATM",
    network: "Emirates NBD",
    address: "Dubai Mall, Downtown Dubai",
    distance: "0.9 km",
    distanceMeters: 900,
    lat: 25.1972,
    lng: 55.2744,
    freeWithdrawal: true,
    fee: 0,
    currency: "AED",
    hours: "24/7",
    features: ["Cardless", "Deposit", "Multi-currency"],
    rating: 4.8,
  },
  {
    id: "fallback-adcb-souk",
    name: "ADCB ATM",
    network: "ADCB",
    address: "Souk Al Bahar, Downtown Dubai",
    distance: "1.1 km",
    distanceMeters: 1100,
    lat: 25.196,
    lng: 55.2755,
    freeWithdrawal: true,
    fee: 0,
    currency: "AED",
    hours: "24/7",
    features: ["Cardless", "Deposit"],
    rating: 4.5,
  },
  {
    id: "fallback-fab-szr",
    name: "FAB ATM",
    network: "First Abu Dhabi Bank",
    address: "Sheikh Zayed Road, Dubai",
    distance: "2.0 km",
    distanceMeters: 2000,
    lat: 25.1935,
    lng: 55.264,
    freeWithdrawal: false,
    fee: 5,
    currency: "AED",
    hours: "24/7",
    features: ["Deposit"],
    rating: 4.1,
  },
]

// Helper: compute distance text from a reference point
function computeDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`
}

type FilterType = "all" | "free" | "deposit" | "cardless"

export default function ATMFinderPage() {
  const [atms, setAtms] = useState<ATM[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [suggestions, setSuggestions] = useState<ATMSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [filter, setFilter] = useState<FilterType>("all")
  const [selectedATM, setSelectedATM] = useState<string | null>(null)
  const [sourceHint, setSourceHint] = useState<string>("Live map data")
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadATMs = useCallback(async (query?: string, preferredId?: string) => {
    const activeQuery = query?.trim() || ""
    if (!loading) setSearchLoading(true)

    try {
      const { data, error } = await getATMs({ query: activeQuery })

      if (error) {
        setLoadError(error)
        setSourceHint("Fallback directory data")
        toast.error(error)
      } else {
        setLoadError(null)
        setSourceHint(activeQuery ? "Live search results" : "Live map data")
      }

      const refLat = 25.2048
      const refLng = 55.2708

      const mapped: ATM[] = data.map((a: ATMLocation) => {
        const dist = computeDistance(refLat, refLng, a.lat, a.lng)
        return {
          id: a.id,
          name: a.name,
          network: a.network,
          address: a.address,
          lat: a.lat,
          lng: a.lng,
          freeWithdrawal: a.free_withdrawal,
          fee: Number(a.fee),
          currency: a.currency,
          hours: a.hours,
          features: a.features ?? [],
          rating: Number(a.rating),
          distanceMeters: Math.round(dist),
          distance: formatDistance(dist),
        }
      }).sort((a, b) => a.distanceMeters - b.distanceMeters)

      const safeData = mapped.length > 0 ? mapped : FALLBACK_ATMS
      if (mapped.length === 0 && !activeQuery) {
        setSourceHint("Local fallback directory")
      }

      setAtms(safeData)
      if (preferredId) {
        const preferred = safeData.find((atm) => atm.id === preferredId)
        if (preferred) setSelectedATM(preferred.id)
      }
    } catch {
      setLoadError("Failed to load ATM data")
      setSourceHint("Local fallback directory")
      setAtms(FALLBACK_ATMS)
      toast.error("Failed to load ATM data")
    } finally {
      setLoading(false)
      setSearchLoading(false)
    }
  }, [loading])

  useEffect(() => { loadATMs() }, [loadATMs])

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadATMs(search)
    }, 450)

    return () => clearTimeout(timeout)
  }, [search, loadATMs])

  useEffect(() => {
    const query = search.trim()
    if (query.length < 2) {
      setSuggestions([])
      setSuggestionLoading(false)
      return
    }

    setSuggestionLoading(true)
    const timeout = setTimeout(async () => {
      try {
        const { data } = await getATMSuggestions({ query })
        setSuggestions(data)
      } catch {
        setSuggestions([])
      }
      setSuggestionLoading(false)
    }, 250)

    return () => clearTimeout(timeout)
  }, [search])

  const handleSuggestionSelect = async (item: ATMSuggestion) => {
    setSearch(item.text)
    setShowSuggestions(false)
    await loadATMs(item.text, item.placeId)
  }

  const filtered = atms
    .filter((atm) => {
      if (filter === "free") return atm.freeWithdrawal
      if (filter === "deposit") return atm.features.includes("Deposit")
      if (filter === "cardless") return atm.features.includes("Cardless")
      return true
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)

  const freeCount = atms.filter((a) => a.freeWithdrawal).length

  const handleDirections = (atm: ATM) => {
    setSelectedATM(atm.id)
    toast.success("Centered on ATM", { description: atm.name })
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All ATMs" },
    { key: "free", label: "Fee-Free" },
    { key: "deposit", label: "Deposit" },
    { key: "cardless", label: "Cardless" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
            <Locate className="w-3.5 h-3.5 text-primary" /> {sourceHint}
          </span>
        </GlassCard>
      </div>

      {loadError && (
        <GlassCard padding="md" className="border border-amber-500/20 bg-amber-500/5">
          <p className="text-xs text-amber-300">
            Live provider is temporarily unavailable. Showing fallback ATM directory.
          </p>
        </GlassCard>
      )}

      {/* Interactive Map */}
      <div className="animate-fade-in" style={{ animationDelay: "130ms" }}>
        <GlassCard padding="none" className="overflow-hidden">
          <div className="h-48 sm:h-64 md:h-80">
            <ATMMap atms={filtered} selectedId={selectedATM} onSelectATM={setSelectedATM} />
          </div>
        </GlassCard>
      </div>

      {/* Search + Filters */}
      <div className="animate-fade-in space-y-3" style={{ animationDelay: "160ms" }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by bank, location, district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 140)}
            className="w-full bg-white/[0.04] border border-white/[0.10] rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {(searchLoading || suggestionLoading) && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/[0.08] bg-black/70 backdrop-blur-xl shadow-2xl overflow-hidden">
              {suggestions.map((item) => (
                <button
                  key={item.placeId}
                  type="button"
                  onMouseDown={() => void handleSuggestionSelect(item)}
                  className="w-full text-left px-3 py-2.5 hover:bg-white/[0.06] transition-colors"
                >
                  <p className="text-sm text-foreground line-clamp-1">{item.text}</p>
                  {item.secondaryText && (
                    <p className="text-xs text-muted-foreground/70 line-clamp-1">{item.secondaryText}</p>
                  )}
                </button>
              ))}
            </div>
          )}
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
        {filtered.length === 0 && (
          <GlassCard padding="md">
            <p className="text-sm text-muted-foreground">No ATMs found for this search. Try a broader query.</p>
          </GlassCard>
        )}

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
