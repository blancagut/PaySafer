"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, Check, Trash2, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationItem, type NotificationData } from "@/components/notifications/notification-item"
import { getNotifications, markAllAsRead, deleteNotification } from "@/lib/actions/notifications"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "transactions", label: "Transactions" },
  { key: "messages", label: "Messages" },
  { key: "disputes", label: "Disputes" },
] as const

type FilterKey = (typeof FILTERS)[number]["key"]

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterKey>("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const PAGE_SIZE = 20

  const fetchNotifications = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true)
      try {
        const result = await getNotifications({
          page: pageNum,
          pageSize: PAGE_SIZE,
          unreadOnly: filter === "unread",
          filter: filter !== "unread" ? filter : "all",
        })

        if (result.data) {
          if (append) {
            setNotifications((prev) => [...prev, ...(result.data as NotificationData[])])
          } else {
            setNotifications(result.data as NotificationData[])
          }
          setTotal(result.total)
          setHasMore((result.data?.length ?? 0) >= PAGE_SIZE)
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false)
      }
    },
    [filter]
  )

  useEffect(() => {
    setPage(1)
    fetchNotifications(1)
  }, [filter, fetchNotifications])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchNotifications(nextPage, true)
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const handleItemRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const handleDelete = async (id: string) => {
    await deleteNotification(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setTotal((prev) => Math.max(0, prev - 1))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total === 0
              ? "No notifications"
              : `${total} notification${total !== 1 ? "s" : ""}${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="gap-1.5 border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] text-sm"
          >
            <Check className="w-3.5 h-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-white/[0.04] rounded-lg border border-white/[0.06] w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              filter === f.key
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {filter === "unread"
                ? "You're all caught up!"
                : "When something happens, you'll see it here."}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-white/[0.04]">
              {notifications.map((notification) => (
                <div key={notification.id} className="group relative">
                  <NotificationItem
                    notification={notification}
                    onRead={handleItemRead}
                  />
                  {/* Delete on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(notification.id)
                    }}
                    className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white/[0.06] hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="border-t border-white/[0.06] p-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  {loading ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
