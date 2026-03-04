-- ─────────────────────────────────────────────
-- Referrals
-- ─────────────────────────────────────────────

-- Add referral_code column to profiles (idempotent)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Backfill codes for existing profiles that don't have one
DO $$
DECLARE
  rec RECORD;
  new_code TEXT;
  attempts INT;
BEGIN
  FOR rec IN SELECT id FROM profiles WHERE referral_code IS NULL LOOP
    attempts := 0;
    LOOP
      -- 8-char uppercase alphanumeric code
      new_code := UPPER(SUBSTRING(
        REPLACE(gen_random_uuid()::TEXT, '-', ''),
        1, 8
      ));
      BEGIN
        UPDATE profiles SET referral_code = new_code WHERE id = rec.id;
        EXIT; -- success
      EXCEPTION WHEN unique_violation THEN
        attempts := attempts + 1;
        IF attempts > 10 THEN RAISE EXCEPTION 'Too many code collisions'; END IF;
      END;
    END LOOP;
  END LOOP;
END;
$$;

-- Trigger: auto-assign referral_code on new profiles
CREATE OR REPLACE FUNCTION assign_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  new_code TEXT;
  attempts INT := 0;
BEGIN
  IF NEW.referral_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  LOOP
    new_code := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8));
    BEGIN
      NEW.referral_code := new_code;
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique referral code'; END IF;
    END;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS profiles_assign_referral_code ON profiles;
CREATE TRIGGER profiles_assign_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION assign_referral_code();

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email  TEXT NOT NULL,
  referred_id    UUID REFERENCES auth.users(id),   -- set when referme signs up
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'signed_up', 'verified', 'rewarded')),
  reward_amount  NUMERIC(12,2) NOT NULL DEFAULT 10.00,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referrer_id, invited_email)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx
  ON referrals (referrer_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_referrals_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS referrals_updated_at ON referrals;
CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_referrals_updated_at();

-- ─── RLS ───
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can invite via referrals"
  ON referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Admins can manage all referrals"
  ON referrals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
