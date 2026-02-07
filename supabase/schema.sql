-- SecureEscrow Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- Stores additional user metadata beyond auth.users
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- TRANSACTIONS TABLE
-- Core escrow transactions between buyers and sellers
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Transaction details
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Parties involved
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seller_email TEXT NOT NULL, -- Email used to invite seller
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft',              -- Created but not paid
      'awaiting_payment',   -- Waiting for buyer payment
      'in_escrow',          -- Funds held securely
      'delivered',          -- Seller marked as delivered
      'released',           -- Funds released to seller
      'cancelled',          -- Transaction cancelled
      'dispute'             -- Under dispute review
    )
  ),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT different_parties CHECK (buyer_id != seller_id)
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_transactions_buyer ON public.transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON public.transactions(seller_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);

-- Policies for transactions
CREATE POLICY "Buyers can view their purchases"
  ON public.transactions FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view their sales"
  ON public.transactions FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update their transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update transactions they're involved in"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- =====================================================
-- DISPUTES TABLE
-- Dispute cases for problematic transactions
-- =====================================================
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Reference to transaction
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  
  -- Dispute details
  opened_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'under_review' CHECK (
    status IN ('under_review', 'resolved', 'closed')
  ),
  
  -- Resolution
  resolution TEXT,
  resolved_by TEXT, -- 'buyer', 'seller', 'admin'
  resolved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_disputes_transaction ON public.disputes(transaction_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);

-- Policies for disputes
CREATE POLICY "Transaction parties can view disputes"
  ON public.disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = disputes.transaction_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

CREATE POLICY "Transaction parties can create disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (
    auth.uid() = opened_by
    AND EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = transaction_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

-- =====================================================
-- DISPUTE_MESSAGES TABLE
-- Messages and updates within a dispute
-- =====================================================
CREATE TABLE IF NOT EXISTS public.dispute_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dispute_id UUID REFERENCES public.disputes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_dispute_messages_dispute ON public.dispute_messages(dispute_id);
CREATE INDEX idx_dispute_messages_created ON public.dispute_messages(created_at);

-- Policies
CREATE POLICY "Dispute parties can view messages"
  ON public.dispute_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes d
      JOIN public.transactions t ON d.transaction_id = t.id
      WHERE d.id = dispute_messages.dispute_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

CREATE POLICY "Dispute parties can send messages"
  ON public.dispute_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.disputes d
      JOIN public.transactions t ON d.transaction_id = t.id
      WHERE d.id = dispute_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

-- =====================================================
-- FILES TABLE
-- Evidence and document uploads
-- =====================================================
CREATE TABLE IF NOT EXISTS public.files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Reference (can be transaction or dispute)
  reference_type TEXT NOT NULL CHECK (reference_type IN ('transaction', 'dispute')),
  reference_id UUID NOT NULL,
  
  -- File details
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- Uploader
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_files_reference ON public.files(reference_type, reference_id);
CREATE INDEX idx_files_uploaded_by ON public.files(uploaded_by);

-- Policies
CREATE POLICY "Users can view files for their transactions"
  ON public.files FOR SELECT
  USING (
    (reference_type = 'transaction' AND EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = reference_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    ))
    OR
    (reference_type = 'dispute' AND EXISTS (
      SELECT 1 FROM public.disputes d
      JOIN public.transactions t ON d.transaction_id = t.id
      WHERE d.id = reference_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    ))
  );

CREATE POLICY "Users can upload files to their transactions/disputes"
  ON public.files FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND (
      (reference_type = 'transaction' AND EXISTS (
        SELECT 1 FROM public.transactions
        WHERE id = reference_id
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
      ))
      OR
      (reference_type = 'dispute' AND EXISTS (
        SELECT 1 FROM public.disputes d
        JOIN public.transactions t ON d.transaction_id = t.id
        WHERE d.id = reference_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
      ))
    )
  );

-- =====================================================
-- NOTIFICATIONS TABLE (Optional - for settings page)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);

-- Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload evidence to their transactions/disputes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'evidence'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view evidence for their transactions/disputes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'evidence'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'evidence'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
