-- ─── Bills ───
-- User billers and bill payment records.

CREATE TABLE IF NOT EXISTS public.user_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  biller_name TEXT NOT NULL,
  category_id TEXT NOT NULL,
  account_number TEXT NOT NULL,
  amount NUMERIC(12,2) DEFAULT 0,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('due', 'paid', 'overdue', 'upcoming')),
  autopay BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_bills_user ON public.user_bills(user_id);

ALTER TABLE public.user_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bills"
  ON public.user_bills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bills"
  ON public.user_bills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bills"
  ON public.user_bills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bills"
  ON public.user_bills FOR DELETE
  USING (auth.uid() = user_id);
