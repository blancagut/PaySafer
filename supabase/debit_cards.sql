-- ─── Debit Cards ───
-- Stores user debit card data and settings.

CREATE TABLE IF NOT EXISTS public.debit_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'gold', 'platinum')),
  last4 TEXT NOT NULL,
  expiry TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'inactive', 'expired')),
  card_type TEXT NOT NULL DEFAULT 'physical' CHECK (card_type IN ('virtual', 'physical')),
  daily_limit INTEGER DEFAULT 15000,
  monthly_limit INTEGER DEFAULT 50000,
  atm_limit INTEGER DEFAULT 2000,
  contactless BOOLEAN DEFAULT true,
  online_purchases BOOLEAN DEFAULT true,
  international_payments BOOLEAN DEFAULT true,
  mag_stripe BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_debit_cards_user ON public.debit_cards(user_id);

-- RLS
ALTER TABLE public.debit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cards"
  ON public.debit_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own cards"
  ON public.debit_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards"
  ON public.debit_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);
