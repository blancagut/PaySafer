-- ─── KYC / Identity Verification ───
-- Stores per-user verification submissions and tracks approval status.
-- profiles.verification_level stores the current approved level.

-- 1) Add verification_level to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'basic';

-- 2) KYC Submissions table
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_level TEXT NOT NULL CHECK (target_level IN ('enhanced', 'full')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  documents JSONB DEFAULT '[]'::jsonb,
  reviewer_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user ON public.kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_status ON public.kyc_submissions(status);

-- RLS
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own kyc submissions"
  ON public.kyc_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own kyc submissions"
  ON public.kyc_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending submissions"
  ON public.kyc_submissions FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending', 'rejected'));

-- Storage bucket for KYC docs (create in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false)
-- ON CONFLICT DO NOTHING;
