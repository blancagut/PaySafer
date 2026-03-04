-- ─────────────────────────────────────────────
-- Split Bills
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS split_bills (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  category_id  TEXT NOT NULL DEFAULT 'other',
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  currency     TEXT NOT NULL DEFAULT 'USD',
  status       TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'settled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS split_participants (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id          UUID NOT NULL REFERENCES split_bills(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES auth.users(id),   -- nullable: can be non-user
  participant_name TEXT NOT NULL,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  is_paid          BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS split_bills_creator_id_idx
  ON split_bills (creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS split_participants_bill_id_idx
  ON split_participants (bill_id);

-- updated_at trigger on split_bills
CREATE OR REPLACE FUNCTION update_split_bills_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS split_bills_updated_at ON split_bills;
CREATE TRIGGER split_bills_updated_at
  BEFORE UPDATE ON split_bills
  FOR EACH ROW EXECUTE FUNCTION update_split_bills_updated_at();

-- ─── RLS ───
ALTER TABLE split_bills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_participants ENABLE ROW LEVEL SECURITY;

-- Creators can do everything with their own bills
CREATE POLICY "Creators manage own split bills"
  ON split_bills FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Users who are named participants can view the bill
CREATE POLICY "Participants can view their bills"
  ON split_bills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM split_participants
      WHERE bill_id = split_bills.id
        AND user_id = auth.uid()
    )
  );

-- Creators can manage all participants on their bills
CREATE POLICY "Creators manage participants"
  ON split_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM split_bills
      WHERE id = split_participants.bill_id
        AND creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM split_bills
      WHERE id = split_participants.bill_id
        AND creator_id = auth.uid()
    )
  );

-- Linked users can view their own participant rows
CREATE POLICY "Participants can view own rows"
  ON split_participants FOR SELECT
  USING (user_id = auth.uid());
