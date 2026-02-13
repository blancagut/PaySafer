"use client"

import React from "react"
import {
  Building2,
  Banknote,
  CreditCard,
  Zap,
  Globe,
  Coins,
} from "lucide-react"
import { SiWesternunion, SiMoneygram, SiPaypal, SiBitcoin, SiEthereum, SiTether, SiSolana } from "react-icons/si"
import { cn } from "@/lib/utils"

export type PayoutMethodType =
  | 'bank_transfer'
  | 'bank_transfer_international'
  | 'paypal'
  | 'stripe'
  | 'crypto'
  | 'western_union'
  | 'moneygram'
  | 'card_express'
  | 'card_standard'

interface PayoutMethodIconProps {
  type: PayoutMethodType | string
  cryptoCurrency?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showBackground?: boolean
  className?: string
}

const sizeMap = {
  sm: { icon: 'w-4 h-4', bg: 'w-8 h-8' },
  md: { icon: 'w-5 h-5', bg: 'w-10 h-10' },
  lg: { icon: 'w-6 h-6', bg: 'w-12 h-12' },
  xl: { icon: 'w-8 h-8', bg: 'w-14 h-14' },
}

const methodConfig: Record<string, {
  icon: React.ElementType
  color: string
  bgColor: string
  label: string
}> = {
  western_union: {
    icon: SiWesternunion,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
    label: 'Western Union',
  },
  moneygram: {
    icon: SiMoneygram,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    label: 'MoneyGram',
  },
  bank_transfer: {
    icon: Building2,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    label: 'Bank Transfer',
  },
  bank_transfer_international: {
    icon: Globe,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10 border-indigo-500/20',
    label: 'International Transfer',
  },
  paypal: {
    icon: SiPaypal,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    label: 'PayPal',
  },
  stripe: {
    icon: CreditCard,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10 border-violet-500/20',
    label: 'Card',
  },
  card_express: {
    icon: Zap,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    label: 'Express Card',
  },
  card_standard: {
    icon: CreditCard,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10 border-sky-500/20',
    label: 'Standard Card',
  },
  crypto: {
    icon: Coins,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
    label: 'Crypto',
  },
}

const cryptoConfig: Record<string, {
  icon: React.ElementType
  color: string
  bgColor: string
}> = {
  BTC: { icon: SiBitcoin, color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20' },
  ETH: { icon: SiEthereum, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  USDT: { icon: SiTether, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
  USDC: { icon: Coins, color: 'text-blue-500', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  SOL: { icon: SiSolana, color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
}

export function PayoutMethodIcon({
  type,
  cryptoCurrency,
  size = 'md',
  showBackground = true,
  className,
}: PayoutMethodIconProps) {
  const s = sizeMap[size]

  // For crypto, use specific coin icon if provided
  if (type === 'crypto' && cryptoCurrency && cryptoConfig[cryptoCurrency]) {
    const cc = cryptoConfig[cryptoCurrency]
    const Icon = cc.icon
    if (showBackground) {
      return (
        <div className={cn(s.bg, 'rounded-xl flex items-center justify-center border', cc.bgColor, className)}>
          <Icon className={cn(s.icon, cc.color)} />
        </div>
      )
    }
    return <Icon className={cn(s.icon, cc.color, className)} />
  }

  const config = methodConfig[type] || methodConfig.bank_transfer
  const Icon = config.icon

  if (showBackground) {
    return (
      <div className={cn(s.bg, 'rounded-xl flex items-center justify-center border', config.bgColor, className)}>
        <Icon className={cn(s.icon, config.color)} />
      </div>
    )
  }

  return <Icon className={cn(s.icon, config.color, className)} />
}

export function PayoutMethodLabel({ type }: { type: string }) {
  return <span>{methodConfig[type]?.label || type}</span>
}

// Get Cash hero icon — composite of WU + MoneyGram with cash
export function GetCashIcon({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/20 flex items-center justify-center">
        <Banknote className="w-7 h-7 text-emerald-400" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
        <SiWesternunion className="w-3 h-3 text-yellow-400" />
      </div>
      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
        <SiMoneygram className="w-3 h-3 text-blue-400" />
      </div>
    </div>
  )
}

// Card payout hero icon — credit card + lightning
export function CardPayoutIcon({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center">
        <CreditCard className="w-7 h-7 text-blue-400" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
        <Zap className="w-3.5 h-3.5 text-amber-400" />
      </div>
    </div>
  )
}

// Bank hero icon — building + globe
export function BankPayoutIcon({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/10 border border-purple-500/20 flex items-center justify-center">
        <Building2 className="w-7 h-7 text-purple-400" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
        <Globe className="w-3 h-3 text-indigo-400" />
      </div>
    </div>
  )
}

// Crypto hero icon — composite of coin logos
export function CryptoPayoutIcon({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20 flex items-center justify-center">
        <SiBitcoin className="w-7 h-7 text-orange-400" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
        <SiEthereum className="w-3 h-3 text-blue-400" />
      </div>
      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
        <SiTether className="w-3 h-3 text-emerald-400" />
      </div>
    </div>
  )
}

export { methodConfig, cryptoConfig }
