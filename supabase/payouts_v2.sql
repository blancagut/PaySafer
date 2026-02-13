-- =====================================================
-- PAYOUTS V2 — Extended payout methods
-- Adds: Western Union, MoneyGram (cash pickup),
--        Card Express/Standard, International Bank (IBAN),
--        Full Crypto support (BTC, ETH, USDT, USDC, SOL)
-- Run AFTER payouts.sql
-- =====================================================

-- ─── 1. Extend payout_methods columns ───

-- Cash pickup fields (Western Union / MoneyGram)
ALTER TABLE public.payout_methods
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

-- Crypto fields
ALTER TABLE public.payout_methods
  ADD COLUMN IF NOT EXISTS crypto_address TEXT,
  ADD COLUMN IF NOT EXISTS crypto_network TEXT,
  ADD COLUMN IF NOT EXISTS crypto_currency TEXT;

-- International bank fields
ALTER TABLE public.payout_methods
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS swift_code TEXT;

-- Card payout reference
ALTER TABLE public.payout_methods
  ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES public.saved_payment_methods(id) ON DELETE SET NULL;

-- ─── 2. Update type CHECK constraint ───
-- Drop old constraint and add new one with all method types
ALTER TABLE public.payout_methods DROP CONSTRAINT IF EXISTS payout_methods_type_check;
ALTER TABLE public.payout_methods ADD CONSTRAINT payout_methods_type_check
  CHECK (type IN (
    'bank_transfer',
    'bank_transfer_international',
    'paypal',
    'stripe',
    'crypto',
    'western_union',
    'moneygram',
    'card_express',
    'card_standard'
  ));

-- ─── 3. Extend payout_requests ───

-- Pickup details for WU/MoneyGram (stores reference code, instructions, etc.)
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS pickup_details JSONB DEFAULT '{}'::jsonb;

-- Delivery speed for card payouts
ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS delivery_speed TEXT;

-- Update method_type CHECK to include new types
ALTER TABLE public.payout_requests DROP CONSTRAINT IF EXISTS payout_requests_method_type_check;
ALTER TABLE public.payout_requests ADD CONSTRAINT payout_requests_method_type_check
  CHECK (method_type IN (
    'bank_transfer',
    'bank_transfer_international',
    'paypal',
    'stripe',
    'crypto',
    'western_union',
    'moneygram',
    'card_express',
    'card_standard'
  ));

-- ─── 4. Additional indexes ───
CREATE INDEX IF NOT EXISTS idx_payout_methods_type ON public.payout_methods(type);
CREATE INDEX IF NOT EXISTS idx_payout_requests_method_type ON public.payout_requests(method_type);
