"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "hover" | "glow" | "gradient"
  glowColor?: "emerald" | "blue" | "amber" | "red" | "purple"
  padding?: "none" | "sm" | "md" | "lg"
}

const glowClasses = {
  emerald: "glow-emerald",
  blue: "glow-blue",
  amber: "glow-amber",
  red: "glow-red",
  purple: "shadow-[0_0_20px_rgba(139,92,246,0.15),0_0_60px_rgba(139,92,246,0.05)]",
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
}

export function GlassCard({
  variant = "default",
  glowColor,
  padding = "md",
  className,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-lg",
        variant === "hover" &&
          "transition-all duration-300 hover:bg-white/[0.07] hover:border-white/[0.14] hover:shadow-xl hover:-translate-y-0.5",
        variant === "glow" && glowColor && glowClasses[glowColor],
        variant === "gradient" && "gradient-border",
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface GlassStatProps {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: { value: number; label: string }
  glowColor?: "emerald" | "blue" | "amber" | "red" | "purple"
  sparkline?: React.ReactNode
  className?: string
}

export function GlassStat({
  label,
  value,
  icon,
  trend,
  glowColor = "emerald",
  sparkline,
  className,
}: GlassStatProps) {
  const iconBg = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    blue: "bg-blue-500/10 text-blue-400",
    amber: "bg-amber-500/10 text-amber-400",
    red: "bg-red-500/10 text-red-400",
    purple: "bg-purple-500/10 text-purple-400",
  }

  return (
    <GlassCard variant="hover" padding="none" className={cn("animate-fade-in-up", className)}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          </div>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconBg[glowColor])}>
            {icon}
          </div>
        </div>
        {(trend || sparkline) && (
          <div className="mt-3 flex items-center justify-between">
            {trend && (
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend.value >= 0 ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {trend.value >= 0 ? "+" : ""}
                  {trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </div>
            )}
            {sparkline && <div className="h-8 w-20">{sparkline}</div>}
          </div>
        )}
      </div>
    </GlassCard>
  )
}

interface GlassContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: {
    title: string
    description?: string
    action?: React.ReactNode
  }
}

export function GlassContainer({ header, className, children, ...props }: GlassContainerProps) {
  return (
    <GlassCard padding="none" className={className} {...props}>
      {header && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{header.title}</h3>
            {header.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{header.description}</p>
            )}
          </div>
          {header.action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </GlassCard>
  )
}
