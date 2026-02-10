-- ============================================================================
-- OFFERS TABLE — Single-use shareable escrow offers
-- ============================================================================
-- An offer is created by a user (the "creator") with deal terms.
-- A unique link is generated. When another user opens the link and accepts,
-- a transaction is created with proper buyer/seller assignment.
-- The creator cannot accept their own offer.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.offers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Creator
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Offer details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Role assignment: what role does the CREATOR play?
  -- 'buyer' means creator pays, acceptor delivers
  -- 'seller' means creator delivers, acceptor pays
  creator_role TEXT NOT NULL CHECK (creator_role IN ('buyer', 'seller')),

  -- Single-use token for shareable link
  token TEXT UNIQUE NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'expired', 'cancelled')
  ),

  -- When accepted, who accepted and what transaction was created
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,

  -- Expiry (optional)
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_offers_creator ON public.offers(creator_id);
CREATE INDEX idx_offers_token ON public.offers(token);
CREATE INDEX idx_offers_status ON public.offers(status);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Creators can view their own offers
CREATE POLICY "Creators can view own offers"
  ON public.offers FOR SELECT
  USING (auth.uid() = creator_id);

-- Authenticated users can view pending offers (needed for the accept page)
-- Security: the 64-char cryptographic token acts as the access secret
CREATE POLICY "Authenticated users can view pending offers"
  ON public.offers FOR SELECT
  USING (status = 'pending' AND auth.role() = 'authenticated');

-- Users can view offers they accepted
CREATE POLICY "Acceptors can view their accepted offers"
  ON public.offers FOR SELECT
  USING (auth.uid() = accepted_by);

-- Creators can create offers
CREATE POLICY "Users can create offers"
  ON public.offers FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Creators can cancel their own pending offers
CREATE POLICY "Creators can update own offers"
  ON public.offers FOR UPDATE
  USING (auth.uid() = creator_id);

-- Authenticated users can accept pending offers they didn't create
CREATE POLICY "Authenticated users can accept pending offers"
  ON public.offers FOR UPDATE
  USING (status = 'pending' AND auth.uid() != creator_id);

-- Admin can view all offers
CREATE POLICY "Admins can view all offers"
  ON public.offers FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all offers"
  ON public.offers FOR UPDATE
  USING (public.is_admin());

-- ============================================================================
-- TRIGGER: updated_at
-- ============================================================================
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
