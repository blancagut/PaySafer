-- ================================================
-- PaySafer 2026: Milestone Escrow System
-- ================================================
-- Extends transactions with milestone-based fund release

-- Milestone status enum
DO $$ BEGIN
  CREATE TYPE milestone_status AS ENUM ('pending', 'funded', 'in_progress', 'completed', 'approved', 'disputed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Transaction Milestones Table ───
CREATE TABLE IF NOT EXISTS transaction_milestones (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency        TEXT NOT NULL DEFAULT 'EUR',
  position        INTEGER NOT NULL DEFAULT 0,
  status          milestone_status NOT NULL DEFAULT 'pending',
  due_date        TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  approved_by     UUID REFERENCES auth.users(id),
  evidence_note   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Ensure milestone amounts sum to transaction amount
CREATE OR REPLACE FUNCTION check_milestone_total()
RETURNS TRIGGER AS $$
DECLARE
  total NUMERIC;
  txn_amount NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total
  FROM transaction_milestones
  WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);

  SELECT amount INTO txn_amount
  FROM transactions
  WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);

  IF total > txn_amount THEN
    RAISE EXCEPTION 'Milestone total (%) exceeds transaction amount (%)', total, txn_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_milestone_total
  AFTER INSERT OR UPDATE ON transaction_milestones
  FOR EACH ROW EXECUTE FUNCTION check_milestone_total();

-- ─── Approve milestone and release partial funds ───
CREATE OR REPLACE FUNCTION approve_milestone(
  p_milestone_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_milestone RECORD;
  v_txn RECORD;
BEGIN
  SELECT * INTO v_milestone FROM transaction_milestones WHERE id = p_milestone_id FOR UPDATE;

  IF v_milestone IS NULL THEN
    RAISE EXCEPTION 'Milestone not found';
  END IF;

  IF v_milestone.status != 'completed' THEN
    RAISE EXCEPTION 'Milestone must be marked completed before approval';
  END IF;

  -- Get the transaction and verify user is the buyer
  SELECT * INTO v_txn FROM transactions WHERE id = v_milestone.transaction_id;

  IF v_txn.buyer_id != p_user_id THEN
    RAISE EXCEPTION 'Only the buyer can approve milestones';
  END IF;

  -- Mark milestone approved
  UPDATE transaction_milestones SET
    status = 'approved',
    approved_at = now(),
    approved_by = p_user_id,
    updated_at = now()
  WHERE id = p_milestone_id;

  -- Credit the seller's wallet with milestone amount
  PERFORM credit_wallet(v_txn.seller_id, v_milestone.amount, v_milestone.currency,
    'milestone_release', v_txn.id,
    format('Milestone "%s" released', v_milestone.title));

  -- Check if all milestones are approved
  IF NOT EXISTS (
    SELECT 1 FROM transaction_milestones
    WHERE transaction_id = v_txn.id AND status != 'approved'
  ) THEN
    -- All milestones done: mark transaction as released
    UPDATE transactions SET status = 'released', updated_at = now()
    WHERE id = v_txn.id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─── RLS Policies ───
ALTER TABLE transaction_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view milestones" ON transaction_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_milestones.transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

CREATE POLICY "Seller can update milestone to completed" ON transaction_milestones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_milestones.transaction_id
        AND t.seller_id = auth.uid()
    )
  ) WITH CHECK (
    status IN ('in_progress', 'completed')
  );

CREATE POLICY "Buyer can create milestones" ON transaction_milestones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_milestones.transaction_id
        AND t.buyer_id = auth.uid()
        AND t.status IN ('draft', 'awaiting_payment')
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE transaction_milestones;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_milestones_txn ON transaction_milestones(transaction_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON transaction_milestones(status);
