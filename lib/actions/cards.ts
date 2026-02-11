'use server'

/**
 * Saved Payment Cards — Server Actions
 * 
 * CRUD operations for user's saved payment methods (cards).
 * Uses Stripe SetupIntent for secure card saving.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/server'
import { ensureStripeCustomer } from '@/lib/stripe/customer'

// ─── Types ───

export interface SavedCard {
  id: string
  stripe_payment_method_id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
  cardholder_name: string | null
  is_default: boolean
  created_at: string
}

// ─── List Saved Cards ───

export async function listSavedCards(): Promise<{ data?: SavedCard[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('saved_payment_methods')
    .select('id, stripe_payment_method_id, brand, last4, exp_month, exp_year, cardholder_name, is_default, created_at')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: data as SavedCard[] }
}

// ─── Create SetupIntent ───

export async function createSetupIntent(): Promise<{ clientSecret?: string; error?: string }> {
  try {
    const customerResult = await ensureStripeCustomer()
    if (customerResult.error || !customerResult.customerId) {
      return { error: customerResult.error || 'Failed to create customer' }
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerResult.customerId,
      payment_method_types: ['card'],
      metadata: {
        source: 'paysafe_card_save',
      },
    })

    if (!setupIntent.client_secret) {
      return { error: 'Failed to create setup intent' }
    }

    return { clientSecret: setupIntent.client_secret }
  } catch (err) {
    console.error('[cards] Failed to create SetupIntent:', err)
    return { error: err instanceof Error ? err.message : 'Failed to create setup intent' }
  }
}

// ─── Save Card After Successful SetupIntent (called from webhook or client) ───

export async function saveCardFromSetupIntent(
  userId: string,
  paymentMethodId: string
): Promise<{ data?: SavedCard; error?: string }> {
  try {
    // If called from client, resolve the current user
    let resolvedUserId = userId
    if (userId === '__current__') {
      const supabase = await createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) return { error: 'Not authenticated' }
      resolvedUserId = user.id
    }

    // Retrieve full payment method details from Stripe
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId)

    if (!pm.card) {
      return { error: 'Payment method has no card details' }
    }

    const admin = createAdminClient()

    // Check if this card already exists
    const { data: existing } = await admin
      .from('saved_payment_methods')
      .select('id')
      .eq('stripe_payment_method_id', paymentMethodId)
      .single()

    if (existing) {
      return { error: 'Card already saved' }
    }

    // Check if user has any existing cards (for auto-default)
    const { count } = await admin
      .from('saved_payment_methods')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', resolvedUserId)

    const isFirst = (count ?? 0) === 0

    // Insert into saved_payment_methods
    const { data, error } = await admin
      .from('saved_payment_methods')
      .insert({
        user_id: resolvedUserId,
        stripe_payment_method_id: paymentMethodId,
        brand: pm.card.brand || 'unknown',
        last4: pm.card.last4 || '0000',
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
        cardholder_name: pm.billing_details?.name || null,
        is_default: isFirst,
      })
      .select()
      .single()

    if (error) {
      console.error('[cards] Failed to save card:', error.message)
      return { error: error.message }
    }

    // If first card, set as default on Stripe customer
    if (isFirst) {
      const { data: profile } = await admin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', resolvedUserId)
        .single()

      if (profile?.stripe_customer_id) {
        try {
          await stripe.customers.update(profile.stripe_customer_id, {
            invoice_settings: {
              default_payment_method: paymentMethodId,
            },
          })
        } catch (e) {
          console.error('[cards] Failed to set default PM on Stripe customer:', e)
        }
      }
    }

    return { data: data as SavedCard }
  } catch (err) {
    console.error('[cards] saveCardFromSetupIntent error:', err)
    return { error: err instanceof Error ? err.message : 'Failed to save card' }
  }
}

// ─── Remove Card ───

export async function removeCard(cardId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  // Fetch the card (RLS ensures ownership)
  const { data: card, error: fetchError } = await supabase
    .from('saved_payment_methods')
    .select('id, stripe_payment_method_id, is_default')
    .eq('id', cardId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !card) return { error: 'Card not found' }

  // Detach from Stripe
  try {
    await stripe.paymentMethods.detach(card.stripe_payment_method_id)
  } catch (err) {
    console.error('[cards] Failed to detach from Stripe (continuing anyway):', err)
  }

  // Delete from DB
  const { error: deleteError } = await supabase
    .from('saved_payment_methods')
    .delete()
    .eq('id', cardId)

  if (deleteError) return { error: deleteError.message }

  // If deleted card was default, promote the next most recent card
  if (card.is_default) {
    const admin = createAdminClient()
    const { data: nextCard } = await admin
      .from('saved_payment_methods')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (nextCard) {
      await admin
        .from('saved_payment_methods')
        .update({ is_default: true })
        .eq('id', nextCard.id)
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/wallet')
  return {}
}

// ─── Set Default Card ───

export async function setDefaultCard(cardId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  // Verify the card exists and belongs to the user
  const { data: card, error: fetchError } = await supabase
    .from('saved_payment_methods')
    .select('id, stripe_payment_method_id')
    .eq('id', cardId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !card) return { error: 'Card not found' }

  const admin = createAdminClient()

  // Unset all defaults for this user
  await admin
    .from('saved_payment_methods')
    .update({ is_default: false })
    .eq('user_id', user.id)

  // Set the target card as default
  const { error: updateError } = await admin
    .from('saved_payment_methods')
    .update({ is_default: true })
    .eq('id', cardId)

  if (updateError) return { error: updateError.message }

  // Update Stripe customer's default payment method
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (profile?.stripe_customer_id) {
    try {
      await stripe.customers.update(profile.stripe_customer_id, {
        invoice_settings: {
          default_payment_method: card.stripe_payment_method_id,
        },
      })
    } catch (err) {
      console.error('[cards] Failed to update default PM on Stripe:', err)
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/wallet')
  return {}
}
