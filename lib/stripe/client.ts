/**
 * Stripe Client-Side Configuration
 * 
 * This file provides the Stripe.js instance for client-side use.
 * Use this in components that need to interact with Stripe directly
 * (e.g., payment forms, card elements).
 */

import { loadStripe, Stripe } from '@stripe/stripe-js'

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable. ' +
    'Add it to .env.local (development) or Vercel env vars (production).'
  )
}

/**
 * Singleton Stripe.js instance
 * loadStripe is cached automatically by Stripe, but we cache the promise
 * to avoid redundant calls.
 */
let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}
