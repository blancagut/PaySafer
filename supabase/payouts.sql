-- =====================================================
-- PAYOUTS SYSTEM
-- Tracks withdrawal requests and payout methods
-- Run AFTER wallet.sql
-- =====================================================

-- ─── 1. PAYOUT METHODS ───
-- User-saved bank accounts, PayPal, etc.
CREATE TABLE IF NOT EXISTS public.payout_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank_transfer', 'paypal', 'stripe', 'crypto')),
  label TEXT NOT NULL,           -- "Chase Checking ****4892"
  last4 TEXT,                    -- last 4 digits / identifier
  is_default BOOLEAN DEFAULT FALSE,
  bank_name TEXT,
  routing_number TEXT,            -- masked
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payout_methods ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payout_methods_user ON public.payout_methods(user_id);

CREATE POLICY "Users can view their own payout methods"
  ON public.payout_methods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payout methods"
  ON public.payout_methods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payout methods"
  ON public.payout_methods FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payout methods"
  ON public.payout_methods FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 2. PAYOUT REQUESTS ───
-- Tracks each withdrawal request
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT NOT NULL,
  payout_method_id UUID REFERENCES public.payout_methods(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 10),
  currency TEXT NOT NULL DEFAULT 'EUR',
  fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  method_type TEXT NOT NULL CHECK (method_type IN ('bank_transfer', 'paypal', 'stripe', 'crypto')),
  method_label TEXT NOT NULL,     -- snapshot of the method label at time of request
  reference TEXT,                 -- external ref (Stripe payout ID, etc.)
  note TEXT,
  failure_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payout_requests_user ON public.payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_created ON public.payout_requests(created_at DESC);

CREATE POLICY "Users can view their own payout requests"
  ON public.payout_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Only service_role (server actions) can INSERT/UPDATE payout requests
-- This prevents users from faking payouts from the client

CREATE POLICY "Admins can view all payout requests"
  ON public.payout_requests FOR SELECT
  USING (public.is_admin());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_payout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_payout_request_updated_at
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payout_updated_at();

CREATE TRIGGER set_payout_method_updated_at
  BEFORE UPDATE ON public.payout_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payout_updated_at();

-- ─── 3. Ensure only one default payout method per user ───
CREATE OR REPLACE FUNCTION public.ensure_single_default_payout_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.payout_methods
    SET is_default = FALSE
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_single_default_payout_method
  AFTER INSERT OR UPDATE ON public.payout_methods
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION public.ensure_single_default_payout_method();
