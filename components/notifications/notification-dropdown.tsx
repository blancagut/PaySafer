"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Bell, Check, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationItem, type NotificationData } from "./notification-item"
import { getUnreadNotifications, markAllAsRead } from "@/lib/actions/notifications"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NotificationDropdownProps {
  count: number
  onCountChange: (count: number) => void
  newNotification?: Record<string, unknown> | null
}

export function NotificationDropdown({ count, onCountChange, newNotification }: NotificationDropdownProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return

    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open])

  // Fetch notifications when dropdown opens
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getUnreadNotifications()
      if (result.data) {
        setNotifications(result.data as NotificationData[])
      }
    } catch {
      // Silently handle errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open, fetchNotifications])

  // When a new notification arrives via realtime, prepend it
  useEffect(() => {
    if (newNotification && open) {
      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === newNotification.id)
        if (exists) return prev
        return [newNotification as unknown as NotificationData, ...prev].slice(0, 20)
      })
    }
  }, [newNotification, open])

  const handleToggle = () => {
    setOpen((prev) => !prev)
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    onCountChange(0)
  }

  const handleItemRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    onCountChange(Math.max(0, count - 1))
  }

  const handleViewAll = () => {
    setOpen(false)
    router.push("/notifications")
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className={cn(
          "relative p-2 rounded-lg text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors",
          open && "bg-white/[0.06] text-foreground"
        )}
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1 animate-scale-in">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-32px)] rounded-xl bg-[hsl(222,47%,8%)] border border-white/[0.10] shadow-2xl overflow-hidden z-50 animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {count > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <ScrollArea className="max-h-[400px]">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground mt-2">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No new notifications</p>
                <p className="text-xs text-muted-foreground/70 mt-1">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={handleItemRead}
                    compact
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-white/[0.06]">
            <button
              onClick={handleViewAll}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs text-primary hover:bg-white/[0.04] transition-colors font-medium"
            >
              View all notifications
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
