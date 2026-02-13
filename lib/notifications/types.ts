// ─── Notification Type System ───
// Canonical notification types for the PaySafe fintech platform.
// Every notification created MUST use one of these types.

export type NotificationType =
  // Transactions (escrow lifecycle)
  | 'transaction.awaiting_payment'
  | 'transaction.in_escrow'
  | 'transaction.delivered'
  | 'transaction.released'
  | 'transaction.cancelled'
  | 'transaction.dispute'
  // Disputes
  | 'dispute.opened'
  | 'dispute.message'
  | 'dispute.resolved'
  | 'dispute.closed'
  // Offers
  | 'offer.received'
  | 'offer.accepted'
  | 'offer.cancelled'
  // P2P Transfers / Wallet
  | 'p2p_received'
  | 'p2p_request'
  | 'p2p_request_accepted'
  | 'p2p_request_declined'
  | 'p2p_request_cancelled'
  | 'wallet.topup'
  // Payouts
  | 'payout.cash_ready'
  | 'payout.card_sent'
  | 'payout.crypto_sent'
  | 'payout.bank_sent'
  | 'payout.requested'
  | 'payout.completed'
  | 'payout.failed'
  // Messages
  | 'message.received'
  | 'message.transaction'
  // Scam / Security
  | 'scam.flagged'
  // System / Admin
  | 'admin.action'
  | 'system'

export type NotificationPriority = 'critical' | 'normal' | 'low'

export type NotificationReferenceType =
  | 'transaction'
  | 'dispute'
  | 'offer'
  | 'transfer'
  | 'request'
  | 'payment_request'
  | 'conversation'
  | 'wallet'
  | 'payout'
  | 'system'

export interface NotificationConfig {
  priority: NotificationPriority
  /** Whether this type should trigger an email when notify_email is true */
  sendEmail: boolean
  /** Whether this type should trigger a browser push notification */
  sendPush: boolean
  /** User preference key that controls this notification type */
  preferenceKey: 'notify_transactions' | 'notify_disputes' | 'notify_offers' | 'notify_messages' | 'notify_realtime' | null
  /** Icon name from lucide-react */
  icon: string
  /** Color class for the notification badge */
  color: string
}

/**
 * Configuration for each notification type.
 * Controls which channels are used and how the notification appears.
 */
export const NOTIFICATION_CONFIG: Record<NotificationType, NotificationConfig> = {
  // ─── Transactions ───
  'transaction.awaiting_payment': {
    priority: 'normal',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'CreditCard',
    color: 'text-yellow-500',
  },
  'transaction.in_escrow': {
    priority: 'critical',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'Shield',
    color: 'text-blue-500',
  },
  'transaction.delivered': {
    priority: 'critical',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'PackageCheck',
    color: 'text-green-500',
  },
  'transaction.released': {
    priority: 'critical',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'CircleDollarSign',
    color: 'text-green-500',
  },
  'transaction.cancelled': {
    priority: 'normal',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'XCircle',
    color: 'text-red-500',
  },
  'transaction.dispute': {
    priority: 'critical',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_disputes',
    icon: 'AlertTriangle',
    color: 'text-orange-500',
  },

  // ─── Disputes ───
  'dispute.opened': {
    priority: 'critical',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_disputes',
    icon: 'AlertTriangle',
    color: 'text-orange-500',
  },
  'dispute.message': {
    priority: 'normal',
    sendEmail: false,
    sendPush: true,
    preferenceKey: 'notify_disputes',
    icon: 'MessageSquare',
    color: 'text-orange-400',
  },
  'dispute.resolved': {
    priority: 'critical',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_disputes',
    icon: 'CheckCircle',
    color: 'text-green-500',
  },
  'dispute.closed': {
    priority: 'normal',
    sendEmail: false,
    sendPush: true,
    preferenceKey: 'notify_disputes',
    icon: 'CheckCircle',
    color: 'text-muted-foreground',
  },

  // ─── Offers ───
  'offer.received': {
    priority: 'normal',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_offers',
    icon: 'FileText',
    color: 'text-blue-500',
  },
  'offer.accepted': {
    priority: 'critical',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_offers',
    icon: 'CheckCircle',
    color: 'text-green-500',
  },
  'offer.cancelled': {
    priority: 'low',
    sendEmail: false,
    sendPush: false,
    preferenceKey: 'notify_offers',
    icon: 'XCircle',
    color: 'text-muted-foreground',
  },

  // ─── P2P / Wallet ───
  'p2p_received': {
    priority: 'critical',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'ArrowDownLeft',
    color: 'text-green-500',
  },
  'p2p_request': {
    priority: 'normal',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'ArrowUpRight',
    color: 'text-blue-500',
  },
  'p2p_request_accepted': {
    priority: 'critical',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'CheckCircle',
    color: 'text-green-500',
  },
  'p2p_request_declined': {
    priority: 'normal',
    sendEmail: false,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'XCircle',
    color: 'text-red-400',
  },
  'p2p_request_cancelled': {
    priority: 'low',
    sendEmail: false,
    sendPush: false,
    preferenceKey: 'notify_transactions',
    icon: 'XCircle',
    color: 'text-muted-foreground',
  },
  'wallet.topup': {
    priority: 'normal',
    sendEmail: false,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'Wallet',
    color: 'text-green-500',
  },

  // ─── Payouts ───
  'payout.cash_ready': {
    priority: 'critical',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'Banknote',
    color: 'text-green-500',
  },
  'payout.card_sent': {
    priority: 'normal',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'CreditCard',
    color: 'text-blue-500',
  },
  'payout.crypto_sent': {
    priority: 'normal',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'Coins',
    color: 'text-orange-500',
  },
  'payout.bank_sent': {
    priority: 'normal',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'Building2',
    color: 'text-purple-500',
  },
  'payout.requested': {
    priority: 'normal',
    sendEmail: false,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'ArrowDownToLine',
    color: 'text-blue-500',
  },
  'payout.completed': {
    priority: 'critical',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'CheckCircle',
    color: 'text-green-500',
  },
  'payout.failed': {
    priority: 'critical',
    sendEmail: true,
    sendPush: true,
    preferenceKey: 'notify_transactions',
    icon: 'XCircle',
    color: 'text-red-500',
  },

  // ─── Messages ───
  'message.received': {
    priority: 'normal',
    sendEmail: false,
    sendPush: true,
    preferenceKey: 'notify_messages',
    icon: 'MessageCircle',
    color: 'text-blue-500',
  },
  'message.transaction': {
    priority: 'normal',
    sendEmail: false,
    sendPush: true,
    preferenceKey: 'notify_messages',
    icon: 'MessageSquare',
    color: 'text-blue-400',
  },

  // ─── Scam / Security ───
  'scam.flagged': {
    priority: 'critical',
    sendEmail: true,
    sendPush: true,
    preferenceKey: null, // Always notify — security cannot be disabled
    icon: 'ShieldAlert',
    color: 'text-red-500',
  },

  // ─── System / Admin ───
  'admin.action': {
    priority: 'normal',
    sendEmail: false,
    sendPush: true,
    preferenceKey: null, // Always notify
    icon: 'Shield',
    color: 'text-purple-500',
  },
  'system': {
    priority: 'low',
    sendEmail: false,
    sendPush: false,
    preferenceKey: null,
    icon: 'Info',
    color: 'text-muted-foreground',
  },
}

/**
 * Get the URL path for a notification based on its reference type and ID.
 */
export function getNotificationHref(referenceType?: string | null, referenceId?: string | null, type?: string): string {
  if (!referenceType || !referenceId) return '/notifications'

  switch (referenceType) {
    case 'transaction':
      return `/transactions/${referenceId}`
    case 'dispute':
      return `/disputes/${referenceId}`
    case 'offer':
      return `/offers`
    case 'transfer':
      return `/wallet`
    case 'request':
    case 'payment_request':
      return `/wallet`
    case 'conversation':
      return `/messages/${referenceId}`
    case 'wallet':
      return `/wallet`
    case 'payout':
      return `/payouts`
    default:
      return '/notifications'
  }
}
