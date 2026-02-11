'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── Types ───

export interface Contact {
  id: string
  user_id: string
  contact_id: string
  nickname: string | null
  is_favorite: boolean
  created_at: string
  // Joined profile data
  profile?: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    username: string | null
  }
}

export interface UserSearchResult {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  username: string | null
}

// ─── Search Users ───

export async function searchUsers(query: string): Promise<{ data?: UserSearchResult[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  if (!query || query.trim().length < 2) return { data: [] }

  const cleaned = query.trim().toLowerCase().replace(/^\$/, '')
  const admin = createAdminClient()

  // Search by username OR email OR full_name (case-insensitive)
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, full_name, avatar_url, username')
    .or(`username.ilike.%${cleaned}%,email.ilike.%${cleaned}%,full_name.ilike.%${cleaned}%`)
    .neq('id', user.id)
    .limit(10)

  if (error) return { error: error.message }

  // Filter out banned/deleted users
  const filtered = (data || []).filter((p: any) => p.role !== 'banned' && !p.deleted_at)

  return { data: filtered as UserSearchResult[] }
}

// ─── Get Contacts ───

export async function getContacts(options?: { favoritesOnly?: boolean }) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  let query = supabase
    .from('contacts')
    .select('id, user_id, contact_id, nickname, is_favorite, created_at')
    .eq('user_id', user.id)
    .order('is_favorite', { ascending: false })
    .order('created_at', { ascending: false })

  if (options?.favoritesOnly) {
    query = query.eq('is_favorite', true)
  }

  const { data: contacts, error } = await query

  if (error) return { error: error.message }

  if (!contacts || contacts.length === 0) return { data: [] }

  // Fetch profiles for all contact_ids
  const contactIds = contacts.map(c => c.contact_id)
  const admin = createAdminClient()
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name, avatar_url, username')
    .in('id', contactIds)

  // Join profiles to contacts
  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  const enriched = contacts.map(c => ({
    ...c,
    profile: profileMap.get(c.contact_id) || null,
  }))

  return { data: enriched as Contact[] }
}

// ─── Add Contact ───

export async function addContact(contactId: string, nickname?: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }
  if (contactId === user.id) return { error: 'Cannot add yourself' }

  const { data, error } = await supabase
    .from('contacts')
    .upsert(
      { user_id: user.id, contact_id: contactId, nickname: nickname || null },
      { onConflict: 'user_id,contact_id' }
    )
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/wallet')
  return { data }
}

// ─── Remove Contact ───

export async function removeContact(contactId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('user_id', user.id)
    .eq('contact_id', contactId)

  if (error) return { error: error.message }

  revalidatePath('/wallet')
  return { data: { removed: true } }
}

// ─── Toggle Favorite ───

export async function toggleFavoriteContact(contactId: string) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  // Get current state
  const { data: contact } = await supabase
    .from('contacts')
    .select('id, is_favorite')
    .eq('user_id', user.id)
    .eq('contact_id', contactId)
    .single()

  if (!contact) return { error: 'Contact not found' }

  const { data, error } = await supabase
    .from('contacts')
    .update({ is_favorite: !contact.is_favorite })
    .eq('id', contact.id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/wallet')
  return { data }
}

// ─── Get Recent Recipients ───
// Returns the most recent unique users this person has sent money to

export async function getRecentRecipients(limit: number = 6) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return { error: 'Not authenticated' }

  // Get recent transfers where I'm the sender
  const { data: transfers, error } = await supabase
    .from('transfers')
    .select('recipient_id, created_at')
    .eq('sender_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return { error: error.message }
  if (!transfers || transfers.length === 0) return { data: [] }

  // Deduplicate by recipient_id, keep most recent
  const seen = new Set<string>()
  const uniqueRecipientIds: string[] = []
  for (const t of transfers) {
    if (!seen.has(t.recipient_id)) {
      seen.add(t.recipient_id)
      uniqueRecipientIds.push(t.recipient_id)
      if (uniqueRecipientIds.length >= limit) break
    }
  }

  // Fetch profiles
  const admin = createAdminClient()
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, full_name, avatar_url, username')
    .in('id', uniqueRecipientIds)

  // Maintain order
  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  const ordered = uniqueRecipientIds
    .map(id => profileMap.get(id))
    .filter(Boolean) as UserSearchResult[]

  return { data: ordered }
}
