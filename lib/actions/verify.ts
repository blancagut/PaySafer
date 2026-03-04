'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ───

export type VerificationLevel = 'none' | 'basic' | 'enhanced' | 'full'
export type KycStatus = 'pending' | 'under_review' | 'approved' | 'rejected'

export interface KycDocument {
  document_type: string
  storage_path: string
  file_name: string
  file_size: number
  uploaded_at: string
}

export interface KycSubmission {
  id: string
  user_id: string
  target_level: string
  status: KycStatus
  documents: KycDocument[]
  reviewer_notes: string | null
  submitted_at: string
  reviewed_at: string | null
  created_at: string
}

// ─── Get current verification level + pending submission ───

export async function getVerificationStatus() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { level: 'basic' as VerificationLevel, submission: null, error: 'Not authenticated' }

  // Fetch current level from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('verification_level')
    .eq('id', user.id)
    .single()

  const level = (profile?.verification_level ?? 'basic') as VerificationLevel

  // Fetch latest non-rejected submission
  const { data: submissions } = await supabase
    .from('kyc_submissions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const latest = (submissions ?? []) as unknown as KycSubmission[]
  const pending = latest.find(s => s.status === 'pending' || s.status === 'under_review') ?? null

  return { level, submission: pending, history: latest, error: null }
}

// ─── Upload a KYC document ───

export async function uploadKycDocument(
  documentType: string,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  const MAX_SIZE = 10 * 1024 * 1024
  if (file.size > MAX_SIZE) return { error: 'File too large (max 10 MB)' }

  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/heic', 'image/heif']
  if (!ALLOWED.includes(file.type)) return { error: 'Invalid file type' }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const storagePath = `kyc/${user.id}/${documentType}/${Date.now()}.${ext}`

  const fileBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await supabase.storage
    .from('kyc-documents')
    .upload(storagePath, fileBuffer, { contentType: file.type, upsert: true })

  if (uploadErr) return { error: `Upload failed: ${uploadErr.message}` }

  return {
    data: {
      document_type: documentType,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      uploaded_at: new Date().toISOString(),
    } as KycDocument,
  }
}

// ─── Submit KYC verification request ───

export async function submitKycVerification(
  targetLevel: 'enhanced' | 'full',
  documents: KycDocument[]
) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: 'Not authenticated' }

  if (documents.length === 0) return { error: 'No documents provided' }

  // Check for existing pending submission
  const { data: existing } = await supabase
    .from('kyc_submissions')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', ['pending', 'under_review'])
    .limit(1)

  if (existing && existing.length > 0) {
    return { error: 'You already have a verification in progress' }
  }

  const { data, error } = await supabase
    .from('kyc_submissions')
    .insert({
      user_id: user.id,
      target_level: targetLevel,
      status: 'pending',
      documents,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/verify')
  return { data }
}
