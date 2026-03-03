export const TRANSACTION_STATUSES = [
  'draft',
  'awaiting_payment',
  'in_escrow',
  'delivered',
  'released',
  'cancelled',
  'dispute',
] as const

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number]

export const LEGACY_TRANSACTION_STATUS_ALIASES = {
  payment_confirmed: 'in_escrow',
  delivery_submitted: 'delivered',
  disputed: 'dispute',
  completed: 'released',
  refunded: 'cancelled',
} as const

export type LegacyTransactionStatus = keyof typeof LEGACY_TRANSACTION_STATUS_ALIASES
export type TransactionStatusInput = TransactionStatus | LegacyTransactionStatus

export const TERMINAL_TRANSACTION_STATUSES: readonly TransactionStatus[] = [
  'released',
  'cancelled',
]

export const ACTIVE_TRANSACTION_STATUSES: readonly TransactionStatus[] = [
  'awaiting_payment',
  'in_escrow',
  'delivered',
  'dispute',
]

export const ALLOWED_TRANSACTION_TRANSITIONS: Readonly<Record<TransactionStatus, readonly TransactionStatus[]>> = {
  draft: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['in_escrow', 'cancelled'],
  in_escrow: ['delivered', 'dispute', 'cancelled'],
  delivered: ['released', 'dispute'],
  released: [],
  cancelled: [],
  dispute: ['released', 'cancelled'],
}

export function normalizeTransactionStatus(input: string | null | undefined): TransactionStatus | null {
  if (!input) return null

  if ((TRANSACTION_STATUSES as readonly string[]).includes(input)) {
    return input as TransactionStatus
  }

  if (input in LEGACY_TRANSACTION_STATUS_ALIASES) {
    return LEGACY_TRANSACTION_STATUS_ALIASES[input as LegacyTransactionStatus]
  }

  return null
}

export function canTransitionTransactionStatus(from: string, to: string): boolean {
  const normalizedFrom = normalizeTransactionStatus(from)
  const normalizedTo = normalizeTransactionStatus(to)

  if (!normalizedFrom || !normalizedTo) return false
  return ALLOWED_TRANSACTION_TRANSITIONS[normalizedFrom].includes(normalizedTo)
}

export function isTerminalTransactionStatus(status: string): boolean {
  const normalized = normalizeTransactionStatus(status)
  if (!normalized) return false

  return TERMINAL_TRANSACTION_STATUSES.includes(normalized)
}
