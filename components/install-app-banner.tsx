"use client"

/**
 * Install App Prompt — PWA Smart Banner
 * Shows a dismissible prompt to install PaySafer as a PWA
 */

import React, { useState, useEffect } from "react"
import { X, Download, Smartphone } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function InstallAppBanner() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Don't show if already dismissed or installed
    if (localStorage.getItem("pwa-dismissed") === "true") return
    if (window.matchMedia("(display-mode: standalone)").matches) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }

    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("appinstalled", () => setInstalled(true))

    // Fallback: show banner after 30s for iOS (no beforeinstallprompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    let timer: NodeJS.Timeout
    if (isIOS) {
      timer = setTimeout(() => {
        if (!localStorage.getItem("pwa-dismissed")) {
          setShow(true)
        }
      }, 30000)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
      if (timer) clearTimeout(timer)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === "accepted") {
        setInstalled(true)
      }
      setDeferredPrompt(null)
    }
    setShow(false)
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem("pwa-dismissed", "true")
  }

  if (installed) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-40"
        >
          <div className="bg-background/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-2xl shadow-black/40">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Install PaySafer</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add to your home screen for the best experience — instant access, push notifications, and offline mode.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleInstall}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Install
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-white/[0.06] transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
