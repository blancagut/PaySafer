-- ============================================================================
-- Saved Payment Methods (Cards)
-- ============================================================================
-- Allows users to save payment cards via Stripe SetupIntent
-- and display them in a carousel on the dashboard/wallet pages.
-- ============================================================================

-- ─── Add stripe_customer_id to profiles ───
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- ─── Saved Payment Methods Table ───
CREATE TABLE IF NOT EXISTS public.saved_payment_methods (
  id                        UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id  TEXT NOT NULL UNIQUE,
  brand                     TEXT NOT NULL,        -- visa, mastercard, amex, discover, etc.
  last4                     TEXT NOT NULL,         -- last 4 digits
  exp_month                 INTEGER NOT NULL CHECK (exp_month BETWEEN 1 AND 12),
  exp_year                  INTEGER NOT NULL CHECK (exp_year >= 2024),
  cardholder_name           TEXT,
  is_default                BOOLEAN DEFAULT false,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_user_id
  ON public.saved_payment_methods(user_id);

-- ─── Updated-at Trigger ───
CREATE TRIGGER set_saved_payment_methods_updated_at
  BEFORE UPDATE ON public.saved_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ─── Row Level Security ───
ALTER TABLE public.saved_payment_methods ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved cards
CREATE POLICY "Users can view own payment methods"
  ON public.saved_payment_methods
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can delete their own saved cards
CREATE POLICY "Users can delete own payment methods"
  ON public.saved_payment_methods
  FOR DELETE
  USING (auth.uid() = user_id);

-- Users can update is_default on their own cards
CREATE POLICY "Users can update own payment methods"
  ON public.saved_payment_methods
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert restricted to service role (via webhook/server action with admin client)
-- No INSERT policy for regular users — cards are inserted by the server
-- after a successful SetupIntent via admin client (bypasses RLS).

-- Admins can view all payment methods (for support)
CREATE POLICY "Admins can view all payment methods"
  ON public.saved_payment_methods
  FOR SELECT
  USING (public.is_admin());
