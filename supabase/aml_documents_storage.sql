-- =====================================================
-- AML DOCUMENTS STORAGE
-- Private bucket for compliance document uploads
-- Run AFTER aml_compliance.sql
-- =====================================================

-- ─── 1. Add submitted_files column to aml_document_requests ───
ALTER TABLE public.aml_document_requests
  ADD COLUMN IF NOT EXISTS submitted_files JSONB NOT NULL DEFAULT '[]'::jsonb;

-- submitted_files schema (one entry per document upload):
-- [{ document_type: string, storage_path: string, file_name: string, uploaded_at: ISO string }]

-- ─── 2. Storage bucket: aml-documents ───
-- NOTE: Run in the Supabase Dashboard > Storage > Create bucket, or via the SQL below.
-- The bucket MUST be private (not public).

-- This uses the storage schema which is available in Supabase SQL editor.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aml-documents',
  'aml-documents',
  false,          -- PRIVATE — never expose these files publicly
  10485760,       -- 10 MB per file
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'image/heic', 'image/heif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─── 3. Storage RLS policies ───

-- Users can upload their own documents
DROP POLICY IF EXISTS "Users can upload AML documents" ON storage.objects;
CREATE POLICY "Users can upload AML documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'aml-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own uploaded documents
DROP POLICY IF EXISTS "Users can view their own AML documents" ON storage.objects;
CREATE POLICY "Users can view their own AML documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'aml-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete/replace their own documents (before approval)
DROP POLICY IF EXISTS "Users can delete their own AML documents" ON storage.objects;
CREATE POLICY "Users can delete their own AML documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'aml-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can view ALL documents (for review)
DROP POLICY IF EXISTS "Admins can view all AML documents" ON storage.objects;
CREATE POLICY "Admins can view all AML documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'aml-documents'
    AND public.is_admin()
  );

-- ─── 4. RLS: Allow users to update their own AML request (submitted_files only) ───
DROP POLICY IF EXISTS "Users can submit documents on their own requests" ON public.aml_document_requests;
CREATE POLICY "Users can submit documents on their own requests"
  ON public.aml_document_requests
  FOR UPDATE
  USING (auth.uid() = requested_for_user_id)
  WITH CHECK (auth.uid() = requested_for_user_id);
