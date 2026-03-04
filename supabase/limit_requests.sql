-- =====================================================
-- LIMIT REQUESTS TABLE
-- Users can request higher spending/transfer limits.
-- Admins review and approve/reject via the admin panel.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.limit_requests (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  limit_type TEXT NOT NULL,          -- e.g. "daily_spend", "monthly_transfer"
  reason     TEXT,
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One pending request per user per limit type (prevent spam)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_limit_requests_user_type_pending
  ON public.limit_requests(user_id, limit_type)
  WHERE status = 'pending';

-- RLS
ALTER TABLE public.limit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own limit requests"
  ON public.limit_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own limit requests"
  ON public.limit_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all limit requests"
  ON public.limit_requests FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update limit requests"
  ON public.limit_requests FOR UPDATE
  USING (public.is_admin());

-- Auto-update updated_at
CREATE TRIGGER set_limit_requests_updated_at
  BEFORE UPDATE ON public.limit_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_limit_requests_user ON public.limit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_limit_requests_status ON public.limit_requests(status);
