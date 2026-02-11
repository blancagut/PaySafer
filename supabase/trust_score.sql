-- ================================================
-- PaySafer 2026: Trust Score + Reputation System
-- ================================================

-- ─── Vouches table ───
CREATE TABLE IF NOT EXISTS vouches (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id  UUID NOT NULL REFERENCES auth.users(id),
  vouched_id  UUID NOT NULL REFERENCES auth.users(id),
  message     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(voucher_id, vouched_id),
  CONSTRAINT no_self_vouch CHECK (voucher_id != vouched_id)
);

-- ─── Achievements table ───
CREATE TABLE IF NOT EXISTS achievements (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  badge       TEXT NOT NULL, -- e.g. 'first_transaction', 'trusted_100', 'fast_responder', etc.
  title       TEXT NOT NULL,
  description TEXT,
  icon        TEXT, -- emoji or icon name
  awarded_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge)
);

-- ─── Activity Feed ───
CREATE TABLE IF NOT EXISTS activity_feed (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  event_type  TEXT NOT NULL, -- 'milestone', 'achievement', 'trust_score', 'vouch', 'streak'
  title       TEXT NOT NULL,
  description TEXT,
  metadata    JSONB DEFAULT '{}',
  public      BOOLEAN DEFAULT false, -- whether visible to others
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── Compute Trust Score ───
-- Score components (0-100):
--   - Account age: up to 10 points (1pt per month, max 10)
--   - Completed transactions: up to 25 points
--   - Dispute rate: up to 20 points (lower is better)
--   - Average response time: up to 15 points (faster is better)
--   - KYC level: up to 15 points
--   - Vouches: up to 15 points (1pt each, max 15)

CREATE OR REPLACE FUNCTION compute_trust_score(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_account_age_months INTEGER;
  v_completed_txns INTEGER;
  v_total_txns INTEGER;
  v_dispute_count INTEGER;
  v_vouch_count INTEGER;
  v_score_age INTEGER;
  v_score_txns INTEGER;
  v_score_disputes INTEGER;
  v_score_response INTEGER;
  v_score_kyc INTEGER;
  v_score_vouches INTEGER;
  v_total INTEGER;
  v_profile RECORD;
BEGIN
  -- Get profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  -- Account age
  v_account_age_months := EXTRACT(MONTH FROM age(now(), v_profile.created_at))
    + EXTRACT(YEAR FROM age(now(), v_profile.created_at)) * 12;
  v_score_age := LEAST(v_account_age_months, 10);

  -- Completed transactions
  SELECT COUNT(*) INTO v_completed_txns FROM transactions
  WHERE (buyer_id = p_user_id OR seller_id = p_user_id) AND status = 'released';

  SELECT COUNT(*) INTO v_total_txns FROM transactions
  WHERE (buyer_id = p_user_id OR seller_id = p_user_id) AND status != 'draft';

  v_score_txns := LEAST(v_completed_txns * 2, 25);

  -- Dispute rate
  SELECT COUNT(*) INTO v_dispute_count FROM disputes
  WHERE opened_by = p_user_id;

  IF v_total_txns > 0 THEN
    v_score_disputes := GREATEST(0, 20 - (v_dispute_count::NUMERIC / v_total_txns * 100)::INTEGER);
  ELSE
    v_score_disputes := 10; -- neutral
  END IF;

  -- Response time (simplified: use 10 as default)
  v_score_response := 10;

  -- KYC level
  v_score_kyc := CASE
    WHEN v_profile.kyc_level = 'full' THEN 15
    WHEN v_profile.kyc_level = 'basic' THEN 8
    ELSE 0
  END;

  -- Vouches
  SELECT COUNT(*) INTO v_vouch_count FROM vouches WHERE vouched_id = p_user_id;
  v_score_vouches := LEAST(v_vouch_count, 15);

  v_total := v_score_age + v_score_txns + v_score_disputes + v_score_response + v_score_kyc + v_score_vouches;

  RETURN jsonb_build_object(
    'total', LEAST(v_total, 100),
    'breakdown', jsonb_build_object(
      'account_age', v_score_age,
      'transactions', v_score_txns,
      'disputes', v_score_disputes,
      'response_time', v_score_response,
      'verification', v_score_kyc,
      'vouches', v_score_vouches
    ),
    'completed_transactions', v_completed_txns,
    'dispute_count', v_dispute_count,
    'vouch_count', v_vouch_count,
    'account_age_months', v_account_age_months
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── RLS ───
ALTER TABLE vouches ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vouches" ON vouches FOR SELECT USING (true);
CREATE POLICY "Auth users can create vouches" ON vouches FOR INSERT WITH CHECK (auth.uid() = voucher_id);
CREATE POLICY "Voucher can delete own vouch" ON vouches FOR DELETE USING (auth.uid() = voucher_id);

CREATE POLICY "Users can view own achievements" ON achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System inserts achievements" ON achievements FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own activity" ON activity_feed FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public activity is visible" ON activity_feed FOR SELECT USING (public = true);
CREATE POLICY "System inserts activity" ON activity_feed FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vouches_vouched ON vouches(vouched_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_feed(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_public ON activity_feed(created_at DESC) WHERE public = true;
