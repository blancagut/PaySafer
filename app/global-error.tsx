"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Global Error Boundary]", error)
  }, [error])

  return (
    <html>
      <body className="bg-[hsl(222,47%,6%)] text-white font-sans">
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-400 mb-1 max-w-md">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <p className="text-xs text-gray-500 mb-6 font-mono max-w-lg break-all">
            {error.message}
          </p>
          <Button
            onClick={reset}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </Button>
        </div>
      </body>
    </html>
  )
}
