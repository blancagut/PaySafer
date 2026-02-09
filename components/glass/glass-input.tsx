"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  suffix?: React.ReactNode
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  ({ icon, suffix, className, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-lg bg-white/[0.04] border border-white/[0.10] px-3 py-2.5 text-sm text-foreground",
            "placeholder:text-muted-foreground/60 backdrop-blur-sm",
            "focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none",
            "transition-all duration-200",
            icon && "pl-10",
            suffix && "pr-10",
            className
          )}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {suffix}
          </div>
        )}
      </div>
    )
  }
)
GlassInput.displayName = "GlassInput"

interface GlassTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const GlassTextarea = React.forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-lg bg-white/[0.04] border border-white/[0.10] px-3 py-2.5 text-sm text-foreground",
          "placeholder:text-muted-foreground/60 backdrop-blur-sm",
          "focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none",
          "transition-all duration-200 resize-none",
          className
        )}
        {...props}
      />
    )
  }
)
GlassTextarea.displayName = "GlassTextarea"

interface GlassSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: React.ReactNode
}

export const GlassSelect = React.forwardRef<HTMLSelectElement, GlassSelectProps>(
  ({ icon, className, children, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {icon}
          </div>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full rounded-lg bg-white/[0.04] border border-white/[0.10] px-3 py-2.5 text-sm text-foreground",
            "backdrop-blur-sm appearance-none",
            "focus:border-primary/50 focus:ring-1 focus:ring-primary/20 focus:outline-none",
            "transition-all duration-200",
            icon && "pl-10",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted-foreground">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    )
  }
)
GlassSelect.displayName = "GlassSelect"
