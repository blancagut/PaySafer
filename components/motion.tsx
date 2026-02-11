"use client"

/**
 * Animated Number Counter — PaySafer 2026
 * Slot-machine style number animation for balance displays
 */

import React, { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"

interface AnimatedNumberProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

export function AnimatedNumber({
  value,
  duration = 1200,
  prefix = "",
  suffix = "",
  decimals = 2,
  className,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValue = useRef(0)
  const frameRef = useRef<number>()

  useEffect(() => {
    const startValue = prevValue.current
    const diff = value - startValue
    const startTime = performance.now()

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValue + diff * eased

      setDisplayValue(current)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        prevValue.current = value
      }
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [value, duration])

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {displayValue.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  )
}

/**
 * Stagger animation wrapper — Children appear one by one
 */
interface StaggerProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function Stagger({ children, delay = 80, className }: StaggerProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, i) => (
        <div
          className="animate-fade-in-up"
          style={{ animationDelay: `${i * delay}ms`, animationFillMode: "both" }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

/**
 * Page transition wrapper with fade-in-up
 */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("animate-fade-in-up", className)}>
      {children}
    </div>
  )
}

/**
 * Shimmer highlight effect for loading states
 */
export function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-white/[0.04]", className)}>
      <div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
          animation: "shimmer 2s infinite",
        }}
      />
    </div>
  )
}

/**
 * Pulse dot indicator
 */
export function PulseDot({
  color = "emerald",
  size = "sm",
}: {
  color?: "emerald" | "amber" | "red" | "blue"
  size?: "sm" | "md"
}) {
  const colorMap = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    red: "bg-red-400",
    blue: "bg-blue-400",
  }
  const sizeMap = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
  }

  return (
    <span className="relative inline-flex">
      <span className={cn("rounded-full", colorMap[color], sizeMap[size])} />
      <span
        className={cn(
          "absolute inset-0 rounded-full animate-ping opacity-75",
          colorMap[color],
          sizeMap[size]
        )}
      />
    </span>
  )
}
