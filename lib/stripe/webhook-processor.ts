/**
 * Stripe Webhook Event Processor
 * 
 * Processes verified webhook events and triggers state transitions.
 * Called from the webhook route AFTER signature verification.
 * Uses the admin (service_role) client to bypass RLS.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { insertSystemMessage } from '@/lib/actions/transaction-messages'
import { processWalletTopUp } from '@/lib/actions/wallet'

interface StripeEvent {
  id: string
  type: string
  data: {
    object: Record<string, unknown>
  }
}

/**
 * Route a verified Stripe event to the appropriate handler.
 */
export async function processStripeEvent(event: StripeEvent): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object)
      break
    case 'checkout.session.expired':
      await handleCheckoutExpired(event.data.object)
      break
    default:
      // Ignore unhandled event types
      break
  }
}

/**
 * checkout.session.completed
 * Routes to either escrow payment or wallet top-up handler.
 */
async function handleCheckoutCompleted(session: Record<string, unknown>) {
  const metadata = session.metadata as Record<string, string> | undefined

  // ─── Wallet Top-Up ───
  if (metadata?.type === 'wallet_top_up') {
    await handleWalletTopUp(session, metadata)
    return
  }

  // ─── Escrow Payment ───
  const transactionId = metadata?.transaction_id

  if (!transactionId) {
    console.error('[webhook] checkout.session.completed missing transaction_id in metadata')
    return
  }

  const admin = createAdminClient()

  // Fetch current transaction state for idempotency
  const { data: txn, error: fetchError } = await admin
    .from('transactions')
    .select('id, status')
    .eq('id', transactionId)
    .single()

  if (fetchError || !txn) {
    console.error('[webhook] Transaction not found:', transactionId)
    return
  }

  // Idempotency: only transition from awaiting_payment
  if (txn.status !== 'awaiting_payment') {
    console.log('[webhook] Transaction already past awaiting_payment, skipping:', txn.status)
    return
  }

  // Transition to in_escrow
  const { error: updateError } = await admin
    .from('transactions')
    .update({
      status: 'in_escrow',
      paid_at: new Date().toISOString(),
      metadata: {
        stripe_checkout_session_id: session.id,
        stripe_payment_intent: session.payment_intent,
      },
    })
    .eq('id', transactionId)
    .eq('status', 'awaiting_payment') // Optimistic lock

  if (updateError) {
    console.error('[webhook] Failed to transition to in_escrow:', updateError.message)
    return
  }

  // Insert system message
  await insertSystemMessage(
    transactionId,
    'Payment confirmed — funds are now securely held in escrow.',
    'payment_notice',
    {
      event: 'payment_confirmed',
      amount: session.amount_total,
      currency: session.currency,
    }
  )

  console.log('[webhook] Transaction moved to in_escrow:', transactionId)
}

/**
 * checkout.session.expired
 * No state transition — just notify in chat.
 */
async function handleCheckoutExpired(session: Record<string, unknown>) {
  const metadata = session.metadata as Record<string, string> | undefined
  const transactionId = metadata?.transaction_id

  if (!transactionId) return

  await insertSystemMessage(
    transactionId,
    'Payment session expired. The buyer can try again.',
    'payment_notice',
    { event: 'payment_expired' }
  )
}

/**
 * Wallet Top-Up via Stripe Checkout
 * Credits the user's wallet with the deposited amount.
 */
async function handleWalletTopUp(
  session: Record<string, unknown>,
  metadata: Record<string, string>
) {
  const userId = metadata.user_id
  const amount = parseFloat(metadata.amount)
  const currency = metadata.currency || 'EUR'

  if (!userId || isNaN(amount) || amount <= 0) {
    console.error('[webhook] Invalid wallet top-up metadata:', metadata)
    return
  }

  const result = await processWalletTopUp(userId, amount, currency, session.id as string)

  if (result.error) {
    console.error('[webhook] Wallet top-up failed:', result.error)
    return
  }

  console.log('[webhook] Wallet top-up completed for user:', userId, 'amount:', amount)
}
