-- ─────────────────────────────────────────────
-- Savings Goals
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS savings_goals (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  icon_id       TEXT NOT NULL DEFAULT 'vacation',
  target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (current_amount >= 0),
  currency      TEXT NOT NULL DEFAULT 'USD',
  deadline      DATE,
  auto_save_amount NUMERIC(12,2) CHECK (auto_save_amount > 0),
  is_paused     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS savings_goals_user_id_idx
  ON savings_goals (user_id);

-- Trigger: keep updated_at current
CREATE OR REPLACE FUNCTION update_savings_goals_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS savings_goals_updated_at ON savings_goals;
CREATE TRIGGER savings_goals_updated_at
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_savings_goals_updated_at();

-- Row-Level Security
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own savings goals"
  ON savings_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin read
CREATE POLICY "Admins can view all savings goals"
  ON savings_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
