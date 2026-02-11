-- =====================================================
-- WALLET & P2P TRANSFER SYSTEM
-- Phase 1: Internal ledger, P2P transfers, payment requests
-- 
-- Run this in your Supabase SQL Editor AFTER schema.sql
-- =====================================================

-- =====================================================
-- 1. PROFILES — Add username, phone, Stripe Connect
-- =====================================================

-- Add username (unique PaySafe ID — displayed as $username)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_started'
    CHECK (stripe_connect_status IN ('not_started', 'onboarding', 'active', 'restricted', 'disabled'));

-- Username format: 3-20 chars, lowercase alphanumeric + underscores, must start with letter
ALTER TABLE public.profiles
  ADD CONSTRAINT valid_username
  CHECK (username IS NULL OR username ~ '^[a-z][a-z0-9_]{2,19}$');

-- Index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Allow public username/avatar lookup for user discovery (search by $username)
CREATE POLICY "Anyone can look up users by username"
  ON public.profiles FOR SELECT
  USING (true);

-- Drop the old restrictive SELECT policy (profiles now need to be discoverable)
-- The old policy: "Users can view their own profile" — too restrictive for P2P
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- =====================================================
-- 2. WALLETS TABLE
-- One wallet per user. Balance enforced at DB level.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00
    CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  frozen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);

-- Policies: users can only read their own wallet. NO direct updates from client.
CREATE POLICY "Users can view their own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all wallets (support/audit)
CREATE POLICY "Admins can view all wallets"
  ON public.wallets FOR SELECT
  USING (public.is_admin());

-- Auto-update updated_at
CREATE TRIGGER set_wallet_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 3. WALLET TRANSACTIONS (Immutable Ledger)
-- Every balance change creates exactly one row.
-- No UPDATE or DELETE allowed — ever.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE RESTRICT NOT NULL,
  
  -- Transaction classification
  type TEXT NOT NULL CHECK (
    type IN (
      'top_up',          -- Stripe deposit into wallet
      'withdrawal',      -- Wallet to bank/external
      'p2p_send',        -- Sent money to another user
      'p2p_receive',     -- Received money from another user
      'escrow_lock',     -- Funds locked for escrow deal
      'escrow_release',  -- Funds released from escrow to seller
      'escrow_refund',   -- Funds returned from cancelled escrow
      'fee'              -- Platform fee deduction
    )
  ),
  
  -- Always positive. Direction determines sign.
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  
  -- Snapshot of balance AFTER this transaction
  balance_after DECIMAL(12, 2) NOT NULL,
  
  -- Links to the source record
  counterparty_wallet_id UUID REFERENCES public.wallets(id),
  reference_type TEXT CHECK (
    reference_type IN ('transfer', 'escrow', 'stripe', 'fee', 'request')
  ),
  reference_id UUID,
  
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_txn_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_created ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_ref ON public.wallet_transactions(reference_type, reference_id);

-- Policies: read-only for wallet owners
CREATE POLICY "Users can view their wallet transactions"
  ON public.wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wallets
      WHERE id = wallet_transactions.wallet_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all wallet transactions"
  ON public.wallet_transactions FOR SELECT
  USING (public.is_admin());

-- CRITICAL: No INSERT/UPDATE/DELETE policies for regular users
-- Only service_role (admin client) can write to this table

-- =====================================================
-- 4. TRANSFERS TABLE
-- P2P money transfers between users
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transfers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (
    status IN ('completed', 'pending', 'failed')
  ),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent self-transfers
  CONSTRAINT no_self_transfer CHECK (sender_id != recipient_id)
);

-- Enable RLS
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transfers_sender ON public.transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_transfers_recipient ON public.transfers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_transfers_created ON public.transfers(created_at DESC);

-- Policies: sender and recipient can read
CREATE POLICY "Users can view their transfers"
  ON public.transfers FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Admins can view all transfers"
  ON public.transfers FOR SELECT
  USING (public.is_admin());

-- =====================================================
-- 5. PAYMENT REQUESTS TABLE
-- "Request money" — creates a payable request
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')
  ),
  transfer_id UUID REFERENCES public.transfers(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT no_self_request CHECK (requester_id != payer_id)
);

-- Enable RLS
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_req_requester ON public.payment_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_payment_req_payer ON public.payment_requests(payer_id);
CREATE INDEX IF NOT EXISTS idx_payment_req_status ON public.payment_requests(status);

-- Policies
CREATE POLICY "Users can view their payment requests"
  ON public.payment_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = payer_id);

CREATE POLICY "Users can create payment requests"
  ON public.payment_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Admins can view all payment requests"
  ON public.payment_requests FOR SELECT
  USING (public.is_admin());

-- Auto-update updated_at
CREATE TRIGGER set_payment_request_updated_at
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 6. CONTACTS TABLE
-- Saved contacts / favorites for quick send
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nickname TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One contact entry per pair
  CONSTRAINT unique_contact UNIQUE (user_id, contact_id),
  CONSTRAINT no_self_contact CHECK (user_id != contact_id)
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.contacts(user_id);

-- Policies
CREATE POLICY "Users can view their own contacts"
  ON public.contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their contacts"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete contacts"
  ON public.contacts FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 7. EXECUTE TRANSFER — Atomic Postgres Function
-- Guarantees: atomicity, balance check, double-entry ledger
-- Called by server action via service_role (admin client)
-- =====================================================
CREATE OR REPLACE FUNCTION public.execute_transfer(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_amount DECIMAL(12, 2),
  p_currency TEXT DEFAULT 'EUR',
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_wallet   wallets%ROWTYPE;
  v_recipient_wallet wallets%ROWTYPE;
  v_transfer_id     UUID;
  v_sender_balance   DECIMAL(12, 2);
  v_recipient_balance DECIMAL(12, 2);
BEGIN
  -- Validate
  IF p_sender_id = p_recipient_id THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;
  
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Lock wallets in consistent order (prevent deadlocks)
  IF p_sender_id < p_recipient_id THEN
    SELECT * INTO v_sender_wallet FROM wallets WHERE user_id = p_sender_id FOR UPDATE;
    SELECT * INTO v_recipient_wallet FROM wallets WHERE user_id = p_recipient_id FOR UPDATE;
  ELSE
    SELECT * INTO v_recipient_wallet FROM wallets WHERE user_id = p_recipient_id FOR UPDATE;
    SELECT * INTO v_sender_wallet FROM wallets WHERE user_id = p_sender_id FOR UPDATE;
  END IF;

  -- Validate wallets exist
  IF v_sender_wallet.id IS NULL THEN
    RAISE EXCEPTION 'Sender wallet not found';
  END IF;
  
  IF v_recipient_wallet.id IS NULL THEN
    RAISE EXCEPTION 'Recipient wallet not found';
  END IF;

  -- Check frozen
  IF v_sender_wallet.frozen THEN
    RAISE EXCEPTION 'Sender wallet is frozen';
  END IF;
  
  IF v_recipient_wallet.frozen THEN
    RAISE EXCEPTION 'Recipient wallet is frozen';
  END IF;

  -- Check sufficient balance
  IF v_sender_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_sender_wallet.balance, p_amount;
  END IF;

  -- Create transfer record
  INSERT INTO transfers (sender_id, recipient_id, amount, currency, note, status)
  VALUES (p_sender_id, p_recipient_id, p_amount, p_currency, p_note, 'completed')
  RETURNING id INTO v_transfer_id;

  -- Debit sender
  UPDATE wallets SET balance = balance - p_amount WHERE id = v_sender_wallet.id;
  v_sender_balance := v_sender_wallet.balance - p_amount;

  -- Credit recipient
  UPDATE wallets SET balance = balance + p_amount WHERE id = v_recipient_wallet.id;
  v_recipient_balance := v_recipient_wallet.balance + p_amount;

  -- Ledger entry: sender debit
  INSERT INTO wallet_transactions (
    wallet_id, type, amount, direction, balance_after,
    counterparty_wallet_id, reference_type, reference_id, description
  ) VALUES (
    v_sender_wallet.id, 'p2p_send', p_amount, 'debit', v_sender_balance,
    v_recipient_wallet.id, 'transfer', v_transfer_id,
    COALESCE(p_note, 'Sent money')
  );

  -- Ledger entry: recipient credit
  INSERT INTO wallet_transactions (
    wallet_id, type, amount, direction, balance_after,
    counterparty_wallet_id, reference_type, reference_id, description
  ) VALUES (
    v_recipient_wallet.id, 'p2p_receive', p_amount, 'credit', v_recipient_balance,
    v_sender_wallet.id, 'transfer', v_transfer_id,
    COALESCE(p_note, 'Received money')
  );

  -- Return the transfer details
  RETURN jsonb_build_object(
    'transfer_id', v_transfer_id,
    'sender_id', p_sender_id,
    'recipient_id', p_recipient_id,
    'amount', p_amount,
    'currency', p_currency,
    'sender_balance_after', v_sender_balance,
    'recipient_balance_after', v_recipient_balance,
    'note', p_note
  );
END;
$$;

-- =====================================================
-- 8. CREDIT WALLET — For top-ups and escrow releases
-- =====================================================
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id UUID,
  p_amount DECIMAL(12, 2),
  p_type TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_new_balance DECIMAL(12, 2);
BEGIN
  -- Lock wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_wallet.id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  -- Credit
  UPDATE wallets SET balance = balance + p_amount WHERE id = v_wallet.id;
  v_new_balance := v_wallet.balance + p_amount;

  -- Ledger entry
  INSERT INTO wallet_transactions (
    wallet_id, type, amount, direction, balance_after,
    reference_type, reference_id, description, metadata
  ) VALUES (
    v_wallet.id, p_type, p_amount, 'credit', v_new_balance,
    p_reference_type, p_reference_id, p_description, p_metadata
  );

  RETURN jsonb_build_object(
    'wallet_id', v_wallet.id,
    'new_balance', v_new_balance,
    'amount_credited', p_amount
  );
END;
$$;

-- =====================================================
-- 9. DEBIT WALLET — For withdrawals and escrow locks
-- =====================================================
CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id UUID,
  p_amount DECIMAL(12, 2),
  p_type TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_new_balance DECIMAL(12, 2);
BEGIN
  -- Lock wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_wallet.id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  IF v_wallet.frozen THEN
    RAISE EXCEPTION 'Wallet is frozen';
  END IF;

  IF v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_wallet.balance, p_amount;
  END IF;

  -- Debit
  UPDATE wallets SET balance = balance - p_amount WHERE id = v_wallet.id;
  v_new_balance := v_wallet.balance - p_amount;

  -- Ledger entry
  INSERT INTO wallet_transactions (
    wallet_id, type, amount, direction, balance_after,
    reference_type, reference_id, description, metadata
  ) VALUES (
    v_wallet.id, p_type, p_amount, 'debit', v_new_balance,
    p_reference_type, p_reference_id, p_description, p_metadata
  );

  RETURN jsonb_build_object(
    'wallet_id', v_wallet.id,
    'new_balance', v_new_balance,
    'amount_debited', p_amount
  );
END;
$$;

-- =====================================================
-- 10. UPDATE handle_new_user() — Auto-create wallet
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Create wallet (EUR default)
  INSERT INTO public.wallets (user_id, currency)
  VALUES (NEW.id, 'EUR');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. REALTIME — Enable for new tables
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
