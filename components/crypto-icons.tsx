"use client"

import React from "react"
import { SiBitcoin, SiEthereum, SiTether, SiSolana } from "react-icons/si"
import { Coins } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CryptoOption {
  symbol: string
  name: string
  icon: React.ElementType
  color: string
  bgColor: string
  glowColor: string
  networks: { id: string; name: string; label: string }[]
}

export const CRYPTO_OPTIONS: CryptoOption[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: SiBitcoin,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
    glowColor: 'shadow-orange-500/20',
    networks: [
      { id: 'bitcoin', name: 'Bitcoin', label: 'Bitcoin Network' },
      { id: 'lightning', name: 'Lightning', label: 'Lightning Network' },
    ],
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    icon: SiEthereum,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    glowColor: 'shadow-blue-500/20',
    networks: [
      { id: 'ethereum', name: 'Ethereum', label: 'Ethereum (ERC-20)' },
      { id: 'arbitrum', name: 'Arbitrum', label: 'Arbitrum One' },
      { id: 'optimism', name: 'Optimism', label: 'Optimism' },
    ],
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    icon: SiTether,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    glowColor: 'shadow-emerald-500/20',
    networks: [
      { id: 'ethereum', name: 'Ethereum', label: 'Ethereum (ERC-20)' },
      { id: 'tron', name: 'Tron', label: 'Tron (TRC-20)' },
      { id: 'solana', name: 'Solana', label: 'Solana (SPL)' },
      { id: 'polygon', name: 'Polygon', label: 'Polygon' },
    ],
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    icon: Coins,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    glowColor: 'shadow-blue-500/20',
    networks: [
      { id: 'ethereum', name: 'Ethereum', label: 'Ethereum (ERC-20)' },
      { id: 'solana', name: 'Solana', label: 'Solana (SPL)' },
      { id: 'polygon', name: 'Polygon', label: 'Polygon' },
      { id: 'arbitrum', name: 'Arbitrum', label: 'Arbitrum One' },
    ],
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    icon: SiSolana,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    glowColor: 'shadow-purple-500/20',
    networks: [
      { id: 'solana', name: 'Solana', label: 'Solana Network' },
    ],
  },
]

interface CryptoCoinCardProps {
  option: CryptoOption
  selected?: boolean
  onClick: () => void
}

export function CryptoCoinCard({ option, selected, onClick }: CryptoCoinCardProps) {
  const Icon = option.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200",
        "hover:scale-[1.03] active:scale-[0.98]",
        selected
          ? cn(option.bgColor, "ring-1", option.color.replace('text-', 'ring-'))
          : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10]"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center border transition-all",
        selected ? option.bgColor : "bg-white/[0.04] border-white/[0.06]"
      )}>
        <Icon className={cn("w-6 h-6", option.color)} />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-foreground">{option.symbol}</p>
        <p className="text-[11px] text-muted-foreground">{option.name}</p>
      </div>
      {selected && (
        <div className={cn(
          "absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse",
          option.color.replace('text-', 'bg-')
        )} />
      )}
    </button>
  )
}

interface NetworkSelectCardProps {
  network: { id: string; name: string; label: string }
  selected?: boolean
  onClick: () => void
  cryptoColor: string
  cryptoBgColor: string
}

export function NetworkSelectCard({ network, selected, onClick, cryptoColor, cryptoBgColor }: NetworkSelectCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full p-3.5 rounded-xl border transition-all duration-200 text-left",
        "hover:scale-[1.01] active:scale-[0.99]",
        selected
          ? cn(cryptoBgColor, "ring-1", cryptoColor.replace('text-', 'ring-'))
          : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center border",
        selected ? cryptoBgColor : "bg-white/[0.04] border-white/[0.06]"
      )}>
        <div className={cn(
          "w-2.5 h-2.5 rounded-full",
          selected ? cryptoColor.replace('text-', 'bg-') : "bg-white/20"
        )} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{network.label}</p>
      </div>
      {selected && (
        <div className={cn("w-2 h-2 rounded-full animate-pulse", cryptoColor.replace('text-', 'bg-'))} />
      )}
    </button>
  )
}
