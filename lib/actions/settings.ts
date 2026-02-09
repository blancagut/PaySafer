'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ───

export interface UserSettings {
  id: string
  // Notifications
  notify_email: boolean
  notify_transactions: boolean
  notify_disputes: boolean
  notify_offers: boolean
  notify_marketing: boolean
  notify_realtime: boolean
  notify_sound: boolean
  notify_weekly_digest: boolean
  // Preferences
  currency: string
  language: string
  timezone: string
  date_format: string
  compact_mode: boolean
  animations: boolean
  // Privacy
  profile_visible: boolean
  show_full_name: boolean
  show_stats: boolean
  show_activity: boolean
  allow_search_by_email: boolean
  // Security
  login_alerts: boolean
  require_password_actions: boolean
  // Meta
  created_at: string
  updated_at: string
}

const DEFAULTS: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'> = {
  notify_email: true,
  notify_transactions: true,
  notify_disputes: true,
  notify_offers: true,
  notify_marketing: false,
  notify_realtime: true,
  notify_sound: true,
  notify_weekly_digest: false,
  currency: 'USD',
  language: 'en',
  timezone: 'UTC',
  date_format: 'MM/DD/YYYY',
  compact_mode: false,
  animations: true,
  profile_visible: true,
  show_full_name: true,
  show_stats: true,
  show_activity: false,
  allow_search_by_email: true,
  login_alerts: true,
  require_password_actions: true,
}

// ─── Get Settings (upserts if missing) ───

export async function getUserSettings(): Promise<{ data: UserSettings | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { data: null, error: 'Not authenticated' }

  // Try to fetch
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('id', user.id)
    .single()

  if (data) return { data }

  // Row doesn't exist – create with defaults
  if (error?.code === 'PGRST116') {
    const { data: inserted, error: insertErr } = await supabase
      .from('user_settings')
      .insert({ id: user.id, ...DEFAULTS })
      .select()
      .single()

    if (insertErr) return { data: null, error: insertErr.message }
    return { data: inserted }
  }

  return { data: null, error: error?.message }
}

// ─── Update Settings (partial) ───

export async function updateUserSettings(
  patch: Partial<Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ data: UserSettings | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { data: null, error: 'Not authenticated' }

  // Whitelist allowed keys
  const allowed = new Set(Object.keys(DEFAULTS))
  const safePatch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (allowed.has(k)) safePatch[k] = v
  }

  if (Object.keys(safePatch).length === 0) {
    return { data: null, error: 'No valid fields to update' }
  }

  const { data, error } = await supabase
    .from('user_settings')
    .update(safePatch)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    // If row doesn't exist, upsert
    if (error.code === 'PGRST116' || error.message.includes('0 rows')) {
      const { data: upserted, error: upsertErr } = await supabase
        .from('user_settings')
        .upsert({ id: user.id, ...DEFAULTS, ...safePatch })
        .select()
        .single()
      if (upsertErr) return { data: null, error: upsertErr.message }
      return { data: upserted }
    }
    return { data: null, error: error.message }
  }

  revalidatePath('/settings')
  return { data }
}

// ─── Export Transactions CSV ───

export async function exportTransactionsCSV(): Promise<{ csv?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('transactions')
    .select('id, description, amount, currency, status, seller_email, created_at, paid_at, delivered_at, released_at')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'No transactions to export' }

  const headers = ['ID', 'Description', 'Amount', 'Currency', 'Status', 'Counterparty Email', 'Created', 'Paid', 'Delivered', 'Released']
  const rows = data.map(t => [
    t.id,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    t.amount,
    t.currency,
    t.status,
    t.seller_email,
    t.created_at,
    t.paid_at || '',
    t.delivered_at || '',
    t.released_at || '',
  ].join(','))

  return { csv: [headers.join(','), ...rows].join('\n') }
}

// ─── Export Offers CSV ───

export async function exportOffersCSV(): Promise<{ csv?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('offers')
    .select('id, title, description, amount, currency, creator_role, status, token, expires_at, created_at')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: 'No offers to export' }

  const headers = ['ID', 'Title', 'Description', 'Amount', 'Currency', 'Role', 'Status', 'Token', 'Expires', 'Created']
  const rows = data.map(o => [
    o.id,
    `"${(o.title || '').replace(/"/g, '""')}"`,
    `"${(o.description || '').replace(/"/g, '""')}"`,
    o.amount,
    o.currency,
    o.creator_role,
    o.status,
    o.token,
    o.expires_at || '',
    o.created_at,
  ].join(','))

  return { csv: [headers.join(','), ...rows].join('\n') }
}

// ─── Export Full Account Data (GDPR) ───

export async function exportAccountData(): Promise<{ json?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const [profileRes, settingsRes, txRes, offersRes, notifRes, disputeRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('user_settings').select('*').eq('id', user.id).single(),
    supabase.from('transactions').select('*').or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`).order('created_at', { ascending: false }),
    supabase.from('offers').select('*').eq('creator_id', user.id).order('created_at', { ascending: false }),
    supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
    supabase.from('disputes').select('*').eq('opened_by', user.id).order('created_at', { ascending: false }),
  ])

  const accountData = {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile: profileRes.data,
    settings: settingsRes.data,
    transactions: txRes.data || [],
    offers: offersRes.data || [],
    notifications: notifRes.data || [],
    disputes: disputeRes.data || [],
  }

  return { json: JSON.stringify(accountData, null, 2) }
}

// ─── Delete Account ───

export async function deleteAccount(): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  // Check for active transactions
  const { data: activeTx } = await supabase
    .from('transactions')
    .select('id')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .in('status', ['awaiting_payment', 'in_escrow', 'delivered', 'dispute'])
    .limit(1)

  if (activeTx && activeTx.length > 0) {
    return { error: 'You have active transactions. Please resolve or cancel all transactions before deleting your account.' }
  }

  // Delete user_settings, profile is cascade from auth.users
  await supabase.from('user_settings').delete().eq('id', user.id)
  await supabase.from('notifications').delete().eq('user_id', user.id)

  // Sign out (the actual user deletion should be handled by a Supabase edge function
  // or admin API in production; for now we sign out and mark for deletion)
  // In production, use supabase.auth.admin.deleteUser(user.id) from a secure backend
  const { error: signOutError } = await supabase.auth.signOut()
  if (signOutError) return { error: signOutError.message }

  return { success: true }
}

// ─── Sign Out All Sessions ───

export async function signOutAllSessions(): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase.auth.signOut({ scope: 'others' })
  if (error) return { error: error.message }

  return { success: true }
}
