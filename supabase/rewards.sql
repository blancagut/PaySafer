-- ─── Rewards ───
-- User rewards/cashback tracking.

CREATE TABLE IF NOT EXISTS public.user_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_tier TEXT NOT NULL DEFAULT 'standard' CHECK (current_tier IN ('standard', 'gold', 'platinum')),
  total_earned NUMERIC(12,2) DEFAULT 0,
  this_month NUMERIC(12,2) DEFAULT 0,
  pending_cashback NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON public.user_rewards(user_id);

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rewards"
  ON public.user_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards"
  ON public.user_rewards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewards"
  ON public.user_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Cashback transaction history
CREATE TABLE IF NOT EXISTS public.cashback_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  merchant TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  cashback NUMERIC(12,2) NOT NULL DEFAULT 0,
  rate TEXT NOT NULL DEFAULT '1%',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('credited', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashback_tx_user ON public.cashback_transactions(user_id);

ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cashback"
  ON public.cashback_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cashback"
  ON public.cashback_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
