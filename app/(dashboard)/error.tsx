"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Dashboard Error Boundary]", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-1 max-w-md">
        An error occurred while loading this page. Please try again.
      </p>
      <p className="text-xs text-muted-foreground/60 mb-6 font-mono max-w-lg break-all">
        {error.message}
      </p>
      <Button onClick={reset} size="sm" className="gap-2">
        <RefreshCw className="w-4 h-4" />
        Try again
      </Button>
    </div>
  )
}
