import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with the service_role key.
 * This bypasses ALL Row Level Security policies.
 *
 * ⚠️  ONLY use in server actions / API routes for operations that
 *     cannot be expressed through per-user RLS (e.g. creating a
 *     transaction where the current user is the seller, not the buyer).
 *
 * NEVER expose this client or its key to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
