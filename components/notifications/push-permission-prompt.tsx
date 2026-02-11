"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { savePushSubscription, removePushSubscription } from "@/lib/actions/push-subscriptions"
import { toast } from "sonner"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushPermissionPrompt() {
  const [showBanner, setShowBanner] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Only show if: push supported, VAPID key set, permission not yet decided
    if (
      !VAPID_PUBLIC_KEY ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return
    }

    // Don't show if user already granted or denied
    if (Notification.permission !== "default") return

    // Check localStorage dismissal (hide for 7 days)
    const dismissed = localStorage.getItem("push-prompt-dismissed")
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10)
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return
    }

    setShowBanner(true)
  }, [])

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) return
    setLoading(true)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        toast.info("Push notifications disabled. You can enable them later in Settings.")
        setShowBanner(false)
        return
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const json = subscription.toJSON()
      const { error } = await savePushSubscription({
        endpoint: json.endpoint!,
        keys: {
          p256dh: json.keys!.p256dh!,
          auth: json.keys!.auth!,
        },
      })

      if (error) {
        console.error("Failed to save push subscription:", error)
        toast.error("Could not enable push notifications. Try again later.")
      } else {
        toast.success("Push notifications enabled!")
      }

      setShowBanner(false)
    } catch (err) {
      console.error("Push subscription error:", err)
      toast.error("Could not enable push notifications.")
    } finally {
      setLoading(false)
    }
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem("push-prompt-dismissed", String(Date.now()))
    setShowBanner(false)
  }, [])

  if (!showBanner) return null

  return (
    <div className="mx-4 mt-2 mb-0 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <Bell className="h-5 w-5 text-primary shrink-0" />
      <p className="flex-1 text-muted-foreground">
        <span className="font-medium text-foreground">Enable push notifications</span>{" "}
        to get instant alerts for payments, messages, and important updates.
      </p>
      <Button
        size="sm"
        onClick={subscribe}
        disabled={loading}
        className="shrink-0"
      >
        {loading ? "Enabling…" : "Enable"}
      </Button>
      <button
        onClick={dismiss}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
