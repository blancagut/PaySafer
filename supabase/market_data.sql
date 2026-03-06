-- ============================================================================
-- MARKET DATA TABLES
-- Stores cached commodity prices, economic indicators, and market news
-- from Alpha Vantage API. Used by /markets, /news, /stocks pages.
-- ============================================================================

-- ─── Commodity Prices Cache ───
-- Gold, Oil, Natural Gas, Copper — refreshed 2x/day via cron
CREATE TABLE IF NOT EXISTS commodity_prices (
  symbol TEXT PRIMARY KEY,         -- e.g. 'GOLD', 'WTI', 'NATURAL_GAS', 'COPPER', 'SILVER'
  name TEXT NOT NULL,
  price DECIMAL(12,4) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'USD',
  change_pct DECIMAL(8,4) DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Commodity Historical Data ───
CREATE TABLE IF NOT EXISTS commodity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL REFERENCES commodity_prices(symbol) ON DELETE CASCADE,
  date DATE NOT NULL,
  value DECIMAL(12,4) NOT NULL,
  UNIQUE(symbol, date)
);
CREATE INDEX IF NOT EXISTS idx_commodity_history_symbol ON commodity_history(symbol, date DESC);

-- ─── Economic Indicators Cache ───
CREATE TABLE IF NOT EXISTS economic_indicators (
  indicator TEXT PRIMARY KEY,      -- e.g. 'REAL_GDP', 'INFLATION', 'UNEMPLOYMENT'
  name TEXT NOT NULL,
  latest_value DECIMAL(12,4),
  latest_date DATE,
  unit TEXT DEFAULT '',
  interval TEXT DEFAULT 'monthly', -- quarterly, annual, monthly
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Economic Indicator Historical Data ───
CREATE TABLE IF NOT EXISTS economic_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator TEXT NOT NULL REFERENCES economic_indicators(indicator) ON DELETE CASCADE,
  date DATE NOT NULL,
  value DECIMAL(12,4) NOT NULL,
  UNIQUE(indicator, date)
);
CREATE INDEX IF NOT EXISTS idx_economic_history_indicator ON economic_history(indicator, date DESC);

-- ─── Market News Cache ───
CREATE TABLE IF NOT EXISTS market_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source TEXT,
  source_domain TEXT,
  summary TEXT,
  banner_image TEXT,
  authors TEXT[] DEFAULT '{}',
  sentiment_score DECIMAL(5,4) DEFAULT 0,
  sentiment_label TEXT DEFAULT 'Neutral',
  time_published TIMESTAMPTZ,
  tickers TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_market_news_published ON market_news(time_published DESC);
CREATE INDEX IF NOT EXISTS idx_market_news_fetched ON market_news(fetched_at DESC);

-- ─── API Usage Tracker ───
-- Tracks Alpha Vantage API calls per day to stay within 25/day budget
CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'alpha_vantage',
  endpoint TEXT NOT NULL,
  called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage_log(provider, called_at DESC);

-- ─── Stock Watchlist (per user) ───
CREATE TABLE IF NOT EXISTS stock_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);
CREATE INDEX IF NOT EXISTS idx_stock_watchlist_user ON stock_watchlist(user_id);

-- ─── RLS Policies ───

ALTER TABLE commodity_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE commodity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_watchlist ENABLE ROW LEVEL SECURITY;

-- Public read for market data (no auth required for prices/news)
CREATE POLICY "Anyone can read commodity prices" ON commodity_prices FOR SELECT USING (true);
CREATE POLICY "Anyone can read commodity history" ON commodity_history FOR SELECT USING (true);
CREATE POLICY "Anyone can read economic indicators" ON economic_indicators FOR SELECT USING (true);
CREATE POLICY "Anyone can read economic history" ON economic_history FOR SELECT USING (true);
CREATE POLICY "Anyone can read market news" ON market_news FOR SELECT USING (true);

-- API usage: admin only (service role handles inserts)
CREATE POLICY "No public access to api_usage_log" ON api_usage_log FOR SELECT USING (false);

-- Stock watchlist: users can manage their own
CREATE POLICY "Users can read own watchlist" ON stock_watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own watchlist" ON stock_watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own watchlist" ON stock_watchlist FOR DELETE USING (auth.uid() = user_id);

-- ─── Seed some initial data ───

INSERT INTO commodity_prices (symbol, name, price, unit) VALUES
  ('GOLD', 'Gold (XAU)', 2350.00, 'USD/oz'),
  ('SILVER', 'Silver (XAG)', 28.50, 'USD/oz'),
  ('WTI', 'Crude Oil (WTI)', 78.00, 'USD/bbl'),
  ('NATURAL_GAS', 'Natural Gas', 2.30, 'USD/MMBtu'),
  ('COPPER', 'Copper', 4.50, 'USD/lb')
ON CONFLICT (symbol) DO NOTHING;

INSERT INTO economic_indicators (indicator, name, latest_value, latest_date, unit, interval) VALUES
  ('REAL_GDP', 'Real GDP', 22038.0, '2024-01-01', 'billions of dollars', 'quarterly'),
  ('INFLATION', 'Inflation Rate (CPI YoY)', 3.0, '2024-01-01', 'percent', 'annual'),
  ('UNEMPLOYMENT', 'Unemployment Rate', 4.0, '2024-06-01', 'percent', 'monthly'),
  ('FEDERAL_FUNDS_RATE', 'Federal Funds Rate', 5.33, '2024-06-01', 'percent', 'monthly'),
  ('CPI', 'Consumer Price Index', 314.0, '2024-06-01', 'index', 'monthly'),
  ('TREASURY_YIELD', 'Treasury Yield 10Y', 4.25, '2024-06-01', 'percent', 'monthly')
ON CONFLICT (indicator) DO NOTHING;
