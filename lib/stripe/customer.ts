'use server'

/**
 * Stripe Customer Management
 * 
 * Ensures every user has a Stripe Customer record.
 * The stripe_customer_id is stored on public.profiles.
 */

import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Get or create a Stripe Customer for the authenticated user.
 * Returns { customerId } or { error }.
 */
export async function ensureStripeCustomer(): Promise<{ customerId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  // Check if profile already has a stripe_customer_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_customer_id, full_name, email')
    .eq('id', user.id)
    .single()

  if (profileError) return { error: 'Failed to load profile' }

  if (profile.stripe_customer_id) {
    return { customerId: profile.stripe_customer_id }
  }

  // Create a new Stripe Customer
  try {
    const customer = await stripe.customers.create({
      email: user.email || profile.email,
      name: profile.full_name || undefined,
      metadata: {
        supabase_uid: user.id,
      },
    })

    // Store the customer ID on the profile (use admin client to bypass RLS on profiles)
    const admin = createAdminClient()
    const { error: updateError } = await admin
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', user.id)

    if (updateError) {
      console.error('[stripe/customer] Failed to save stripe_customer_id:', updateError.message)
      return { error: 'Failed to save customer record' }
    }

    return { customerId: customer.id }
  } catch (err) {
    console.error('[stripe/customer] Failed to create Stripe Customer:', err)
    return { error: err instanceof Error ? err.message : 'Failed to create customer' }
  }
}
