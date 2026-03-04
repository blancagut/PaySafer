-- ─────────────────────────────────────────────
-- Exchange Rates + Currency Wallets
-- ─────────────────────────────────────────────

-- Static rate table (admin updates periodically)
CREATE TABLE IF NOT EXISTS exchange_rates (
  from_currency TEXT NOT NULL,
  to_currency   TEXT NOT NULL,
  rate          NUMERIC(16,6) NOT NULL CHECK (rate > 0),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (from_currency, to_currency)
);

-- Per-user multi-currency balances for the exchange feature
CREATE TABLE IF NOT EXISTS currency_wallets (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  currency   TEXT NOT NULL,
  balance    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, currency)
);

-- Log of currency conversions
CREATE TABLE IF NOT EXISTS currency_exchanges (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL,
  to_currency   TEXT NOT NULL,
  from_amount   NUMERIC(12,2) NOT NULL,
  to_amount     NUMERIC(12,2) NOT NULL,
  rate          NUMERIC(16,6) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS currency_exchanges_user_id_idx
  ON currency_exchanges (user_id, created_at DESC);

-- ─── Seed base rates (USD, AED, EUR, GBP) ───
INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
  ('USD', 'AED', 3.6725),
  ('USD', 'EUR', 0.9215),
  ('USD', 'GBP', 0.7890),
  ('AED', 'USD', 0.2723),
  ('AED', 'EUR', 0.2510),
  ('AED', 'GBP', 0.2149),
  ('EUR', 'USD', 1.0852),
  ('EUR', 'AED', 3.9862),
  ('EUR', 'GBP', 0.8562),
  ('GBP', 'USD', 1.2674),
  ('GBP', 'AED', 4.6551),
  ('GBP', 'EUR', 1.1680)
ON CONFLICT (from_currency, to_currency)
  DO UPDATE SET rate = EXCLUDED.rate, updated_at = NOW();

-- ─── RLS ───
ALTER TABLE exchange_rates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_wallets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_exchanges ENABLE ROW LEVEL SECURITY;

-- Exchange rates are public-read
CREATE POLICY "Rates are readable by all authenticated users"
  ON exchange_rates FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can update rates
CREATE POLICY "Admins can manage rates"
  ON exchange_rates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users manage own currency wallets
CREATE POLICY "Users can manage own currency wallets"
  ON currency_wallets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users manage own exchange history
CREATE POLICY "Users can manage own exchange history"
  ON currency_exchanges FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
