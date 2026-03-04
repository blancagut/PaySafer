-- ─────────────────────────────────────────────
-- Budgets
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS budgets (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id   TEXT NOT NULL,
  limit_amount  NUMERIC(12,2) NOT NULL CHECK (limit_amount > 0),
  month         TEXT NOT NULL,   -- 'YYYY-MM', e.g. '2026-03'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id, month)
);

CREATE INDEX IF NOT EXISTS budgets_user_month_idx
  ON budgets (user_id, month DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_budgets_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS budgets_updated_at ON budgets;
CREATE TRIGGER budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_budgets_updated_at();

-- ─── RLS ───
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own budgets"
  ON budgets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all budgets"
  ON budgets FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── Usage notes ───
-- Actual spending is computed from wallet_transactions at query time:
--   SELECT SUM(amount) FROM wallet_transactions
--   WHERE wallet_id = $wallet_id
--     AND direction = 'debit'
--     AND metadata->>'budget_category' = $category_id
--     AND created_at >= date_trunc('month', now())
--     AND created_at <  date_trunc('month', now()) + INTERVAL '1 month'
--
-- To tag a wallet transaction with a budget category, include:
--   { "budget_category": "groceries" } in the metadata JSON
