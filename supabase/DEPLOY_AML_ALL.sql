-- =====================================================
-- PAYSAFER — AML COMPLIANCE (DEPLOY ALL)
-- =====================================================
-- Copia y pega TODO este archivo en Supabase SQL Editor → Run
-- Es seguro correrlo múltiples veces (idempotente)
-- =====================================================


-- ─────────────────────────────────────────────────────
-- PART 1: aml_document_requests table
-- ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.aml_document_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  requested_for_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'submitted', 'under_review', 'approved', 'rejected')),
  submitted_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.aml_document_requests ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_aml_doc_req_transaction ON public.aml_document_requests(transaction_id);
CREATE INDEX IF NOT EXISTS idx_aml_doc_req_user ON public.aml_document_requests(requested_for_user_id);
CREATE INDEX IF NOT EXISTS idx_aml_doc_req_status ON public.aml_document_requests(status);

-- Policies (drop first for idempotency)
DROP POLICY IF EXISTS "Users can view their own AML requests" ON public.aml_document_requests;
CREATE POLICY "Users can view their own AML requests"
  ON public.aml_document_requests FOR SELECT
  USING (auth.uid() = requested_for_user_id);

DROP POLICY IF EXISTS "Admins can manage all AML requests" ON public.aml_document_requests;
CREATE POLICY "Admins can manage all AML requests"
  ON public.aml_document_requests FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can submit documents on their own requests" ON public.aml_document_requests;
CREATE POLICY "Users can submit documents on their own requests"
  ON public.aml_document_requests
  FOR UPDATE
  USING (auth.uid() = requested_for_user_id)
  WITH CHECK (auth.uid() = requested_for_user_id);

-- Trigger: auto-update updated_at
DROP TRIGGER IF EXISTS set_aml_doc_req_updated_at ON public.aml_document_requests;
CREATE TRIGGER set_aml_doc_req_updated_at
  BEFORE UPDATE ON public.aml_document_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Realtime (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_publication p ON p.oid = pr.prpubid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'aml_document_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.aml_document_requests;
  END IF;
END $$;


-- ─────────────────────────────────────────────────────
-- PART 2: aml-documents storage bucket
-- ─────────────────────────────────────────────────────

-- Private bucket for compliance document uploads (10 MB, restricted types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aml-documents',
  'aml-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (drop first for idempotency)
DROP POLICY IF EXISTS "Users can upload AML documents" ON storage.objects;
CREATE POLICY "Users can upload AML documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'aml-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view their own AML documents" ON storage.objects;
CREATE POLICY "Users can view their own AML documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'aml-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own AML documents" ON storage.objects;
CREATE POLICY "Users can delete their own AML documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'aml-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Admins can view all AML documents" ON storage.objects;
CREATE POLICY "Admins can view all AML documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'aml-documents'
    AND public.is_admin()
  );


-- ─────────────────────────────────────────────────────
-- DONE ✅
-- ─────────────────────────────────────────────────────
-- Lo que esto crea:
--   1. Tabla aml_document_requests (solicitudes de documentos AML)
--   2. Bucket privado aml-documents (para subir archivos de compliance)
--   3. Políticas RLS para que users vean sus propias solicitudes
--   4. Políticas de storage para que users suban sus propios docs
--   5. Admins pueden ver y gestionar todo
-- ─────────────────────────────────────────────────────
