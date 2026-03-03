-- =====================================================
-- AML COMPLIANCE: DOCUMENT REQUEST TRACKING
-- Run this after schema.sql and wallet.sql
-- =====================================================

CREATE TABLE IF NOT EXISTS public.aml_document_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  requested_for_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'submitted', 'under_review', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.aml_document_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_aml_doc_req_txn ON public.aml_document_requests(transaction_id);
CREATE INDEX IF NOT EXISTS idx_aml_doc_req_user ON public.aml_document_requests(requested_for_user_id);
CREATE INDEX IF NOT EXISTS idx_aml_doc_req_status ON public.aml_document_requests(status);
CREATE INDEX IF NOT EXISTS idx_aml_doc_req_created ON public.aml_document_requests(created_at DESC);

DROP POLICY IF EXISTS "Users can view their own AML document requests" ON public.aml_document_requests;
CREATE POLICY "Users can view their own AML document requests"
  ON public.aml_document_requests
  FOR SELECT
  USING (auth.uid() = requested_for_user_id);

DROP POLICY IF EXISTS "Admins can manage AML document requests" ON public.aml_document_requests;
CREATE POLICY "Admins can manage AML document requests"
  ON public.aml_document_requests
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS set_aml_doc_req_updated_at ON public.aml_document_requests;
CREATE TRIGGER set_aml_doc_req_updated_at
  BEFORE UPDATE ON public.aml_document_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
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
