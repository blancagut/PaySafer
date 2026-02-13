// Shared payout types & client-side fee calculator
// (NOT a "use server" file — safe to import from client components)

export type PayoutMethodType =
  | 'bank_transfer'
  | 'bank_transfer_international'
  | 'paypal'
  | 'stripe'
  | 'crypto'
  | 'western_union'
  | 'moneygram'
  | 'card_express'
  | 'card_standard'

export interface PayoutMethod {
  id: string
  user_id: string
  type: PayoutMethodType
  label: string
  last4: string | null
  is_default: boolean
  bank_name: string | null
  routing_number: string | null
  recipient_name: string | null
  city: string | null
  country: string | null
  crypto_address: string | null
  crypto_network: string | null
  crypto_currency: string | null
  iban: string | null
  swift_code: string | null
  card_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface PayoutRequest {
  id: string
  user_id: string
  payout_method_id: string | null
  amount: number
  currency: string
  fee: number
  net_amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  method_type: string
  method_label: string
  reference: string | null
  note: string | null
  failure_reason: string | null
  pickup_details: Record<string, unknown> | null
  delivery_speed: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

/** Client-side fee calculator for live UI estimates (NO server action) */
export function calculatePayoutFeeSync(amount: number, methodType: string): number {
  if (amount <= 0) return 0
  switch (methodType) {
    case 'bank_transfer':               return Math.max(0.50, amount * 0.001)
    case 'bank_transfer_international': return Math.max(2.00, amount * 0.003)
    case 'paypal':                      return Math.max(1.00, amount * 0.005)
    case 'card_express':                return Math.max(1.50, amount * 0.015)
    case 'card_standard':               return Math.max(0.75, amount * 0.005)
    case 'western_union':               return Math.max(3.00, amount * 0.018)
    case 'moneygram':                   return Math.max(2.50, amount * 0.015)
    case 'crypto':                      return 2.00
    case 'stripe':                      return Math.max(0.50, amount * 0.001)
    default:                            return Math.max(0.50, amount * 0.001)
  }
}
