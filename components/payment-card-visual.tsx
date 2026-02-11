"use client"

import { cn } from "@/lib/utils"
import { Star, MoreVertical, Trash2, CheckCircle2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ─── Types ───

export interface PaymentCardProps {
  brand: string
  last4: string
  expMonth: number
  expYear: number
  cardholderName?: string | null
  isDefault?: boolean
  onRemove?: () => void
  onSetDefault?: () => void
  className?: string
}

// ─── Brand Color Gradients ───

const brandGradients: Record<string, { bg: string; accent: string; logo: string }> = {
  visa: {
    bg: "from-[#1a1f71] via-[#1a3a8a] to-[#00baf2]",
    accent: "text-white/90",
    logo: "VISA",
  },
  mastercard: {
    bg: "from-[#1a1a2e] via-[#c2185b] to-[#f79e1b]",
    accent: "text-white/90",
    logo: "MASTERCARD",
  },
  amex: {
    bg: "from-[#006fcf] via-[#0080d5] to-[#00a4e4]",
    accent: "text-white/90",
    logo: "AMEX",
  },
  discover: {
    bg: "from-[#1a1a2e] via-[#e87e04] to-[#ff6600]",
    accent: "text-white/90",
    logo: "DISCOVER",
  },
  diners: {
    bg: "from-[#0c2e5a] via-[#1a4a7a] to-[#2a6a9a]",
    accent: "text-white/90",
    logo: "DINERS",
  },
  unionpay: {
    bg: "from-[#1a1a2e] via-[#c62828] to-[#1565c0]",
    accent: "text-white/90",
    logo: "UNIONPAY",
  },
  jcb: {
    bg: "from-[#003087] via-[#0060a9] to-[#009688]",
    accent: "text-white/90",
    logo: "JCB",
  },
  unknown: {
    bg: "from-[#1a1a2e] via-[#2d2d44] to-[#3a3a5c]",
    accent: "text-white/70",
    logo: "CARD",
  },
}

// ─── Brand Logo SVG ───

function BrandLogo({ brand }: { brand: string }) {
  const b = brand.toLowerCase()

  if (b === "visa") {
    return (
      <svg viewBox="0 0 780 500" className="h-8 w-auto" fill="none">
        <path
          d="M293.2 348.7l33.4-195.8h53.3l-33.4 195.8h-53.3zm246.8-191.2c-10.5-4-27.1-8.3-47.7-8.3-52.6 0-89.6 26.5-89.9 64.5-.3 28.1 26.5 43.7 46.7 53.1 20.8 9.6 27.8 15.7 27.7 24.3-.1 13.1-16.6 19.1-32 19.1-21.4 0-32.7-3-50.3-10.2l-6.9-3.1-7.5 43.8c12.5 5.5 35.5 10.2 59.4 10.5 55.9 0 92.2-26.2 92.6-66.8.2-22.3-14-39.2-44.7-53.2-18.6-9.1-30-15.1-29.9-24.3 0-8.1 9.6-16.8 30.4-16.8 17.4-.3 29.9 3.5 39.7 7.5l4.8 2.2 7.2-42.3zm137 0h-41.2c-12.8 0-22.3 3.5-27.9 16.2l-79.2 179.6h55.9s9.1-24.1 11.2-29.4h68.4c1.6 6.9 6.5 29.4 6.5 29.4h49.4l-43.1-195.8zm-65.9 126.3c4.4-11.3 21.3-54.7 21.3-54.7-.3.5 4.4-11.3 7.1-18.7l3.6 16.9s10.2 47 12.4 56.5h-44.4z"
          fill="white"
        />
        <path
          d="M247 152.9l-52.1 133.6-5.5-27.1c-9.6-31-39.6-64.6-73.1-81.4l47.7 171h56.3l83.8-196.1H247z"
          fill="white"
        />
      </svg>
    )
  }

  if (b === "mastercard") {
    return (
      <div className="flex items-center gap-[-4px]">
        <div className="w-7 h-7 rounded-full bg-[#eb001b] opacity-90" />
        <div className="w-7 h-7 rounded-full bg-[#f79e1b] opacity-90 -ml-3" />
      </div>
    )
  }

  if (b === "amex") {
    return (
      <span className="text-white font-bold text-lg tracking-widest">AMEX</span>
    )
  }

  // Fallback for other brands
  const config = brandGradients[b] || brandGradients.unknown
  return (
    <span className="text-white/80 font-bold text-sm tracking-widest uppercase">
      {config.logo}
    </span>
  )
}

// ─── Chip SVG ───

function CardChip() {
  return (
    <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300/80 via-yellow-400/60 to-yellow-600/50 border border-yellow-500/30 flex items-center justify-center">
      <div className="w-6 h-4 rounded-sm border border-yellow-600/40 bg-gradient-to-br from-yellow-200/40 to-yellow-500/30">
        <div className="w-full h-1/2 border-b border-yellow-600/20" />
        <div className="flex h-1/2">
          <div className="w-1/2 border-r border-yellow-600/20" />
          <div className="w-1/2" />
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───

export function PaymentCardVisual({
  brand,
  last4,
  expMonth,
  expYear,
  cardholderName,
  isDefault,
  onRemove,
  onSetDefault,
  className,
}: PaymentCardProps) {
  const b = brand.toLowerCase()
  const config = brandGradients[b] || brandGradients.unknown
  const expYearShort = expYear.toString().slice(-2)
  const expMonthStr = expMonth.toString().padStart(2, "0")

  return (
    <div
      className={cn(
        "relative w-full aspect-[1.586/1] max-w-[340px] rounded-2xl overflow-hidden select-none",
        "shadow-xl shadow-black/30",
        "transition-transform duration-300 hover:scale-[1.02]",
        className,
      )}
    >
      {/* Background gradient */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", config.bg)} />

      {/* Glossy shine overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.15] via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-tl from-black/[0.15] via-transparent to-transparent" />

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-full p-5">
        {/* Top row: Brand logo + menu */}
        <div className="flex items-start justify-between">
          <BrandLogo brand={brand} />
          <div className="flex items-center gap-1.5">
            {isDefault && (
              <div className="flex items-center gap-1 bg-white/[0.15] backdrop-blur-sm rounded-full px-2 py-0.5">
                <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                <span className="text-[10px] font-medium text-white/90">Default</span>
              </div>
            )}
            {(onRemove || onSetDefault) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-7 h-7 rounded-full bg-white/[0.10] hover:bg-white/[0.20] flex items-center justify-center transition-colors">
                    <MoreVertical className="w-3.5 h-3.5 text-white/80" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px]">
                  {onSetDefault && !isDefault && (
                    <DropdownMenuItem onClick={onSetDefault}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Set as default
                    </DropdownMenuItem>
                  )}
                  {onRemove && (
                    <DropdownMenuItem
                      onClick={onRemove}
                      className="text-red-400 focus:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove card
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Middle: Chip + Card number */}
        <div className="space-y-3">
          <CardChip />
          <p className="text-white text-lg md:text-xl font-mono tracking-[0.2em]">
            •••• •••• •••• {last4}
          </p>
        </div>

        {/* Bottom: Name + Expiry */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">
              Card Holder
            </p>
            <p className="text-sm text-white/90 font-medium tracking-wide truncate max-w-[180px]">
              {cardholderName || "CARDHOLDER"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">
              Expires
            </p>
            <p className="text-sm text-white/90 font-mono font-medium">
              {expMonthStr}/{expYearShort}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Add Card Placeholder ───

export function AddCardPlaceholder({
  onClick,
  className,
}: {
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full aspect-[1.586/1] max-w-[340px] rounded-2xl overflow-hidden",
        "border-2 border-dashed border-white/[0.12] hover:border-white/[0.25]",
        "bg-white/[0.02] hover:bg-white/[0.04]",
        "transition-all duration-300 hover:scale-[1.02]",
        "flex flex-col items-center justify-center gap-3",
        "group cursor-pointer",
        className,
      )}
    >
      <div className="w-12 h-12 rounded-full bg-white/[0.06] group-hover:bg-white/[0.10] flex items-center justify-center transition-colors">
        <svg
          className="w-6 h-6 text-white/40 group-hover:text-white/70 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </div>
      <span className="text-sm text-white/40 group-hover:text-white/70 font-medium transition-colors">
        Add New Card
      </span>
    </button>
  )
}
