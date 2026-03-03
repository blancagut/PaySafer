-- =====================================================
-- CRYPTO TRADING SYSTEM
-- Custodial buy/sell via Binance API
--
-- Tables: crypto_holdings, crypto_trades, crypto_prices
-- Functions: execute_crypto_buy, execute_crypto_sell
--
-- Run AFTER wallet.sql (depends on wallets, wallet_transactions)
-- =====================================================

-- =====================================================
-- 1. CRYPTO HOLDINGS — Per-user custodial balances
-- One row per (user, coin). Updated atomically via functions.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crypto_holdings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,                              -- BTC, ETH, SOL, etc.
  amount DECIMAL(18, 8) NOT NULL DEFAULT 0
    CHECK (amount >= 0),
  avg_buy_price DECIMAL(18, 2) NOT NULL DEFAULT 0,  -- weighted avg cost basis (USD)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One row per user per coin
  CONSTRAINT unique_user_crypto UNIQUE (user_id, symbol)
);

ALTER TABLE public.crypto_holdings ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crypto_holdings_user ON public.crypto_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_holdings_symbol ON public.crypto_holdings(symbol);

-- Users can read their own holdings only
CREATE POLICY "Users can view their own crypto holdings"
  ON public.crypto_holdings FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all crypto holdings"
  ON public.crypto_holdings FOR SELECT
  USING (public.is_admin());

-- NO client INSERT/UPDATE/DELETE — service_role only (same as wallets)

-- Auto-update updated_at
CREATE TRIGGER set_crypto_holdings_updated_at
  BEFORE UPDATE ON public.crypto_holdings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- =====================================================
-- 2. CRYPTO TRADES — Immutable trade ledger
-- Every buy/sell creates exactly one row. No edits ever.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crypto_trades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),

  -- Amounts
  crypto_amount DECIMAL(18, 8) NOT NULL CHECK (crypto_amount > 0),
  price_per_coin DECIMAL(18, 2) NOT NULL,
  quote_amount DECIMAL(12, 2) NOT NULL,           -- total USD value
  fee_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,   -- PaySafe fee
  fee_currency TEXT NOT NULL DEFAULT 'USD',

  -- Binance reference
  binance_order_id TEXT,
  binance_status TEXT,

  -- Internal status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'completed', 'failed', 'cancelled')
  ),

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.crypto_trades ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crypto_trades_user ON public.crypto_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_trades_symbol ON public.crypto_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_crypto_trades_created ON public.crypto_trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crypto_trades_status ON public.crypto_trades(status);

-- Users can read their own trades only
CREATE POLICY "Users can view their own crypto trades"
  ON public.crypto_trades FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all crypto trades"
  ON public.crypto_trades FOR SELECT
  USING (public.is_admin());

-- NO client writes — immutable ledger


-- =====================================================
-- 3. CRYPTO PRICES — Server-populated cache
-- Updated every ~10s by the price API route.
-- Public readable (no auth needed for prices).
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crypto_prices (
  symbol TEXT PRIMARY KEY,
  price DECIMAL(18, 2) NOT NULL,
  change_24h DECIMAL(8, 2) NOT NULL DEFAULT 0,
  high_24h DECIMAL(18, 2),
  low_24h DECIMAL(18, 2),
  volume_24h DECIMAL(18, 2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.crypto_prices ENABLE ROW LEVEL SECURITY;

-- Anyone can read cached prices (public data)
CREATE POLICY "Anyone can read cached crypto prices"
  ON public.crypto_prices FOR SELECT
  USING (true);

-- Writes: service_role only


-- =====================================================
-- 4. EXTEND wallet_transactions type CHECK
-- Add crypto_buy and crypto_sell as valid types
-- =====================================================

-- Drop old constraint and add expanded one
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check CHECK (
    type IN (
      'top_up',
      'withdrawal',
      'p2p_send',
      'p2p_receive',
      'escrow_lock',
      'escrow_release',
      'escrow_refund',
      'fee',
      'crypto_buy',
      'crypto_sell'
    )
  );

-- Add 'crypto' as valid reference_type
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_reference_type_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_reference_type_check CHECK (
    reference_type IS NULL OR reference_type IN (
      'transfer', 'escrow', 'stripe', 'fee', 'request', 'crypto'
    )
  );


-- =====================================================
-- 5. EXECUTE CRYPTO BUY — Atomic function
-- Debit wallet → upsert holding → record trade
-- Called by service_role via admin client only
-- =====================================================
CREATE OR REPLACE FUNCTION public.execute_crypto_buy(
  p_user_id UUID,
  p_symbol TEXT,
  p_crypto_amount DECIMAL(18, 8),
  p_price_per_coin DECIMAL(18, 2),
  p_quote_amount DECIMAL(12, 2),
  p_fee DECIMAL(12, 2),
  p_binance_order_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_total_cost DECIMAL(12, 2);
  v_new_balance DECIMAL(12, 2);
  v_trade_id UUID;
BEGIN
  v_total_cost := p_quote_amount + p_fee;

  -- Lock wallet row
  SELECT * INTO v_wallet
    FROM wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

  IF v_wallet.id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  IF v_wallet.frozen THEN
    RAISE EXCEPTION 'Wallet is frozen';
  END IF;

  IF v_wallet.balance < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %',
      v_wallet.balance, v_total_cost;
  END IF;

  -- Debit wallet
  UPDATE wallets
    SET balance = balance - v_total_cost
    WHERE id = v_wallet.id;
  v_new_balance := v_wallet.balance - v_total_cost;

  -- Wallet ledger entry
  INSERT INTO wallet_transactions (
    wallet_id, type, amount, direction, balance_after,
    reference_type, description, metadata
  ) VALUES (
    v_wallet.id,
    'crypto_buy',
    v_total_cost,
    'debit',
    v_new_balance,
    'crypto',
    'Bought ' || p_crypto_amount || ' ' || p_symbol || ' @ $' || p_price_per_coin,
    jsonb_build_object(
      'symbol', p_symbol,
      'crypto_amount', p_crypto_amount,
      'price_per_coin', p_price_per_coin,
      'fee', p_fee,
      'binance_order_id', p_binance_order_id
    )
  );

  -- Upsert crypto holding (weighted average cost basis)
  INSERT INTO crypto_holdings (user_id, symbol, amount, avg_buy_price)
  VALUES (p_user_id, p_symbol, p_crypto_amount, p_price_per_coin)
  ON CONFLICT (user_id, symbol) DO UPDATE SET
    amount = crypto_holdings.amount + p_crypto_amount,
    avg_buy_price = CASE
      WHEN (crypto_holdings.amount + p_crypto_amount) > 0 THEN
        (crypto_holdings.amount * crypto_holdings.avg_buy_price + p_crypto_amount * p_price_per_coin)
        / (crypto_holdings.amount + p_crypto_amount)
      ELSE 0
    END,
    updated_at = NOW();

  -- Record trade
  INSERT INTO crypto_trades (
    user_id, symbol, side, crypto_amount, price_per_coin,
    quote_amount, fee_amount, binance_order_id, binance_status, status
  ) VALUES (
    p_user_id, p_symbol, 'buy', p_crypto_amount, p_price_per_coin,
    p_quote_amount, p_fee, p_binance_order_id, 'FILLED', 'completed'
  )
  RETURNING id INTO v_trade_id;

  RETURN jsonb_build_object(
    'trade_id', v_trade_id,
    'new_balance', v_new_balance,
    'crypto_amount', p_crypto_amount,
    'total_cost', v_total_cost,
    'fee', p_fee
  );
END;
$$;


-- =====================================================
-- 6. EXECUTE CRYPTO SELL — Atomic function
-- Debit holding → credit wallet → record trade
-- =====================================================
CREATE OR REPLACE FUNCTION public.execute_crypto_sell(
  p_user_id UUID,
  p_symbol TEXT,
  p_crypto_amount DECIMAL(18, 8),
  p_price_per_coin DECIMAL(18, 2),
  p_quote_amount DECIMAL(12, 2),
  p_fee DECIMAL(12, 2),
  p_binance_order_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_holding crypto_holdings%ROWTYPE;
  v_net_credit DECIMAL(12, 2);
  v_new_balance DECIMAL(12, 2);
  v_trade_id UUID;
BEGIN
  v_net_credit := p_quote_amount - p_fee;

  -- Lock holding row
  SELECT * INTO v_holding
    FROM crypto_holdings
    WHERE user_id = p_user_id AND symbol = p_symbol
    FOR UPDATE;

  IF v_holding.id IS NULL THEN
    RAISE EXCEPTION 'No % holding found for user', p_symbol;
  END IF;

  IF v_holding.amount < p_crypto_amount THEN
    RAISE EXCEPTION 'Insufficient % balance. Available: %, Required: %',
      p_symbol, v_holding.amount, p_crypto_amount;
  END IF;

  -- Debit holding
  UPDATE crypto_holdings
    SET amount = amount - p_crypto_amount,
        updated_at = NOW()
    WHERE id = v_holding.id;

  -- Lock wallet row
  SELECT * INTO v_wallet
    FROM wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

  IF v_wallet.id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  -- Credit wallet
  UPDATE wallets
    SET balance = balance + v_net_credit
    WHERE id = v_wallet.id;
  v_new_balance := v_wallet.balance + v_net_credit;

  -- Wallet ledger entry
  INSERT INTO wallet_transactions (
    wallet_id, type, amount, direction, balance_after,
    reference_type, description, metadata
  ) VALUES (
    v_wallet.id,
    'crypto_sell',
    v_net_credit,
    'credit',
    v_new_balance,
    'crypto',
    'Sold ' || p_crypto_amount || ' ' || p_symbol || ' @ $' || p_price_per_coin,
    jsonb_build_object(
      'symbol', p_symbol,
      'crypto_amount', p_crypto_amount,
      'price_per_coin', p_price_per_coin,
      'fee', p_fee,
      'binance_order_id', p_binance_order_id
    )
  );

  -- Record trade
  INSERT INTO crypto_trades (
    user_id, symbol, side, crypto_amount, price_per_coin,
    quote_amount, fee_amount, binance_order_id, binance_status, status
  ) VALUES (
    p_user_id, p_symbol, 'sell', p_crypto_amount, p_price_per_coin,
    p_quote_amount, p_fee, p_binance_order_id, 'FILLED', 'completed'
  )
  RETURNING id INTO v_trade_id;

  RETURN jsonb_build_object(
    'trade_id', v_trade_id,
    'new_balance', v_new_balance,
    'crypto_amount', p_crypto_amount,
    'net_credit', v_net_credit,
    'fee', p_fee
  );
END;
$$;


-- =====================================================
-- 7. REALTIME — Enable for crypto tables
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_holdings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_prices;
