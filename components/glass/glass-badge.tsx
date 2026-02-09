"use client"

import React from "react"
import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "emerald" | "blue" | "amber" | "red" | "cyan" | "purple" | "muted"

interface GlassBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
  pulse?: boolean
  size?: "sm" | "md"
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-white/[0.08] text-foreground border-white/[0.12]",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  muted: "bg-white/[0.04] text-muted-foreground border-white/[0.08]",
}

const dotColorClasses: Record<BadgeVariant, string> = {
  default: "bg-foreground",
  emerald: "bg-emerald-400",
  blue: "bg-blue-400",
  amber: "bg-amber-400",
  red: "bg-red-400",
  cyan: "bg-cyan-400",
  purple: "bg-purple-400",
  muted: "bg-muted-foreground",
}

export function GlassBadge({
  variant = "default",
  dot = false,
  pulse = false,
  size = "sm",
  className,
  children,
  ...props
}: GlassBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border backdrop-blur-sm rounded-full font-medium",
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                dotColorClasses[variant]
              )}
            />
          )}
          <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", dotColorClasses[variant])} />
        </span>
      )}
      {children}
    </span>
  )
}

/** Map transaction statuses to GlassBadge variants */
export const statusBadgeMap: Record<string, { label: string; variant: BadgeVariant; dot?: boolean; pulse?: boolean }> = {
  draft: { label: "Draft", variant: "muted" },
  awaiting_payment: { label: "Awaiting Payment", variant: "amber", dot: true, pulse: true },
  in_escrow: { label: "In Escrow", variant: "blue", dot: true },
  delivered: { label: "Delivered", variant: "cyan", dot: true },
  released: { label: "Released", variant: "emerald" },
  cancelled: { label: "Cancelled", variant: "muted" },
  dispute: { label: "Dispute", variant: "red", dot: true, pulse: true },
}

export const offerStatusBadgeMap: Record<string, { label: string; variant: BadgeVariant; dot?: boolean; pulse?: boolean }> = {
  pending: { label: "Pending", variant: "amber", dot: true, pulse: true },
  accepted: { label: "Accepted", variant: "emerald" },
  expired: { label: "Expired", variant: "muted" },
  cancelled: { label: "Cancelled", variant: "muted" },
}
