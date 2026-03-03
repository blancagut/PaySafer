'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type AmlRequestStatus =
  | 'requested'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'

export interface AmlDocumentFile {
  document_type: string
  storage_path: string
  file_name: string
  file_size: number
  uploaded_at: string
}

export interface AmlRequest {
  id: string
  transaction_id: string
  requested_for_user_id: string
  requested_documents: string[]
  reason: string
  status: AmlRequestStatus
  submitted_files: AmlDocumentFile[]
  submitted_at: string | null
  reviewed_at: string | null
  created_at: string
  metadata: Record<string, unknown>
  transactions: {
    id: string
    amount: number
    currency: string
    status: string
  } | null
}

// =============================================================================
// USER: Get their own open AML document requests
// =============================================================================

export async function getUserAmlRequests() {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: 'Not authenticated', data: null }

  const { data, error } = await supabase
    .from('aml_document_requests')
    .select(`
      id, transaction_id, requested_for_user_id, requested_documents, reason, status,
      submitted_files, submitted_at, reviewed_at, created_at, metadata,
      transactions:transaction_id ( id, amount, currency, status )
    `)
    .eq('requested_for_user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, data: null }
  return { data: (data ?? []) as unknown as AmlRequest[], error: null }
}

// =============================================================================
// USER: Upload a compliance document
// =============================================================================

export async function submitAmlDocument(
  requestId: string,
  documentType: string,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
  if (file.size > MAX_SIZE) return { error: 'File too large. Maximum 10 MB.' }

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/heic', 'image/heif']
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Invalid file type. Allowed: JPG, PNG, WebP, PDF, HEIC.' }
  }

  // Verify the request belongs to this user and is still open
  const { data: req, error: fetchErr } = await supabase
    .from('aml_document_requests')
    .select('id, status, requested_documents, submitted_files, submitted_at, transaction_id, requested_for_user_id')
    .eq('id', requestId)
    .eq('requested_for_user_id', user.id)
    .single()

  if (fetchErr || !req) return { error: 'AML request not found' }
  if (req.status === 'approved') return { error: 'This request is already approved' }
  if (req.status === 'rejected') return { error: 'This request was rejected. Contact support.' }

  if (!req.requested_documents.includes(documentType)) {
    return { error: 'This document type was not requested' }
  }

  // Build storage path: {userId}/{requestId}/{documentType}/{timestamp}.{ext}
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const storagePath = `${user.id}/${requestId}/${documentType}/${Date.now()}.${ext}`

  const fileBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await supabase.storage
    .from('aml-documents')
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadErr) return { error: `Upload failed: ${uploadErr.message}` }

  // Merge into submitted_files — replace existing entry for same document_type
  const existingFiles: AmlDocumentFile[] = Array.isArray(req.submitted_files) ? req.submitted_files : []
  const merged: AmlDocumentFile[] = [
    ...existingFiles.filter((f) => f.document_type !== documentType),
    {
      document_type: documentType,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      uploaded_at: new Date().toISOString(),
    },
  ]

  // Determine if all requested docs are now uploaded
  const uploadedTypes = new Set(merged.map((f) => f.document_type))
  const allUploaded = (req.requested_documents as string[]).every((d) => uploadedTypes.has(d))

  const { error: updateErr } = await supabase
    .from('aml_document_requests')
    .update({
      submitted_files: merged,
      status: allUploaded ? 'submitted' : req.status === 'requested' ? 'requested' : req.status,
      submitted_at: allUploaded ? new Date().toISOString() : req.submitted_at ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (updateErr) return { error: updateErr.message }

  revalidatePath('/compliance')
  return { data: { success: true, allUploaded, storagePath } }
}

// =============================================================================
// ADMIN: Get a signed URL to view an uploaded document
// =============================================================================

export async function getAmlDocumentSignedUrl(storagePath: string) {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { error: 'Not authenticated', url: null }

  // Admins only — verify via profile role
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Admin access required', url: null }
  }

  const { data, error } = await admin.storage
    .from('aml-documents')
    .createSignedUrl(storagePath, 60 * 10) // 10 minute expiry

  if (error) return { error: error.message, url: null }
  return { url: data.signedUrl, error: null }
}
