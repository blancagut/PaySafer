'use server'

import { stripe } from './server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Creates a Stripe Checkout Session for a transaction payment.
 * Only the buyer in `awaiting_payment` status can call this.
 * Returns the Checkout URL to redirect to.
 */
export async function createCheckoutSession(transactionId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // Fetch transaction — must be buyer and awaiting_payment
  const { data: transaction, error: txnError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (txnError || !transaction) {
    return { error: 'Transaction not found' }
  }

  if (transaction.buyer_id !== user.id) {
    return { error: 'Only the buyer can make a payment' }
  }

  if (transaction.status !== 'awaiting_payment') {
    return { error: 'Transaction is not awaiting payment' }
  }

  // Build success/cancel URLs
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.paysafer.site'
  const successUrl = `${baseUrl}/transactions/${transactionId}?payment=success`
  const cancelUrl = `${baseUrl}/transactions/${transactionId}?payment=cancelled`

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: transaction.currency.toLowerCase(),
            product_data: {
              name: transaction.description || 'Escrow Payment',
              description: `Secure escrow payment — funds held until delivery is confirmed`,
            },
            unit_amount: Math.round(transaction.amount * 100), // cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        transaction_id: transactionId,
        buyer_id: user.id,
        seller_id: transaction.seller_id,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    // Insert system message about payment initiation
    const admin = createAdminClient()
    await admin.from('transaction_messages').insert({
      transaction_id: transactionId,
      sender_id: null,
      message: 'Payment session started — redirecting to secure checkout.',
      message_type: 'payment_notice',
      metadata: { checkout_session_id: session.id },
    })

    return { url: session.url }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session'
    return { error: message }
  }
}
