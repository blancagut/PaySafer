"use client"

import { cn } from "@/lib/utils"
import { getNotificationHref, NOTIFICATION_CONFIG, type NotificationType } from "@/lib/notifications/types"
import {
  CreditCard,
  Shield,
  PackageCheck,
  CircleDollarSign,
  XCircle,
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  MessageCircle,
  ShieldAlert,
  Info,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { markAsRead } from "@/lib/actions/notifications"

// ─── Icon mapping ───
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CreditCard,
  Shield,
  PackageCheck,
  CircleDollarSign,
  XCircle,
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  MessageCircle,
  ShieldAlert,
  Info,
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export interface NotificationData {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  reference_type: string | null
  reference_id: string | null
  read: boolean
  created_at: string
}

interface NotificationItemProps {
  notification: NotificationData
  onRead?: (id: string) => void
  compact?: boolean
}

export function NotificationItem({ notification, onRead, compact = false }: NotificationItemProps) {
  const router = useRouter()

  const config = NOTIFICATION_CONFIG[notification.type as NotificationType] || {
    icon: "Info",
    color: "text-muted-foreground",
  }

  const IconComponent = iconMap[config.icon] || Info

  const handleClick = async () => {
    // Mark as read
    if (!notification.read) {
      onRead?.(notification.id)
      markAsRead(notification.id).catch(() => {})
    }

    // Navigate to relevant page
    const href = getNotificationHref(notification.reference_type, notification.reference_id, notification.type)
    router.push(href)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-3 text-left transition-colors",
        compact ? "px-3 py-2.5" : "px-4 py-3",
        notification.read
          ? "bg-transparent hover:bg-white/[0.04]"
          : "bg-primary/[0.04] hover:bg-primary/[0.08]"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "shrink-0 mt-0.5 rounded-full flex items-center justify-center",
          compact ? "w-8 h-8" : "w-9 h-9",
          notification.read ? "bg-white/[0.06]" : "bg-white/[0.08]"
        )}
      >
        <IconComponent className={cn("w-4 h-4", config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p
            className={cn(
              "text-sm truncate",
              notification.read ? "text-muted-foreground font-normal" : "text-foreground font-medium"
            )}
          >
            {notification.title}
          </p>
          <span className="text-[10px] text-muted-foreground/70 shrink-0">
            {getRelativeTime(notification.created_at)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="shrink-0 mt-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
        </div>
      )}
    </button>
  )
}
