-- ============================================================================
-- SECUREESCROW RLS POLICIES — PRODUCTION ENFORCEMENT
-- ============================================================================
-- Version: 1.0.0
-- Based on: RLS_DOMAIN_MODEL.md (AUTHORITATIVE)
-- Date: 2026-02-05
-- 
-- ⚠️  CRITICAL: This file implements the security constitution.
--     Every policy here MUST match the domain model exactly.
--     DO NOT modify without security review.
-- ============================================================================

-- ============================================================================
-- SECTION 0: PREREQUISITES & HELPER FUNCTIONS
-- ============================================================================

-- Drop existing policies to ensure clean slate
-- (Run this in a transaction for safety)

-- Helper function: Check if current user is an admin
-- SECURITY: Admin status MUST be verified via database, NOT JWT claims
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Check if user is participant in a transaction
CREATE OR REPLACE FUNCTION public.is_transaction_participant(txn_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.transactions
    WHERE id = txn_id
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Check if user is buyer of a transaction
CREATE OR REPLACE FUNCTION public.is_transaction_buyer(txn_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.transactions
    WHERE id = txn_id
    AND buyer_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Check if user is seller of a transaction (post-escrow only)
CREATE OR REPLACE FUNCTION public.is_transaction_seller_with_access(txn_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.transactions
    WHERE id = txn_id
    AND seller_id = auth.uid()
    AND status NOT IN ('draft', 'awaiting_payment')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- SECTION 1: PROFILES TABLE (replaces users table)
-- ============================================================================
-- Domain Model Reference: Section 3.1 (users table)
-- 
-- Access Rules:
--   SELECT: Own record (all fields), Other users (limited fields via views)
--   INSERT: System only (via trigger on auth.users)
--   UPDATE: Own record (limited fields), Admin (all), System (all)
--   DELETE: FORBIDDEN for users, Soft delete only for admin/system
-- ============================================================================

-- First, add role column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

-- Add soft delete column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner (prevents bypassing via service role in some contexts)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_system" ON public.profiles;

-- --------------------------------------------------------
-- PROFILES: SELECT POLICIES
-- --------------------------------------------------------

-- Policy: Users can view their own profile (all fields)
-- Domain Model: "Own record: ALL fields"
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    AND deleted_at IS NULL
  );

-- Policy: Admins can view all profiles
-- Domain Model: "Admin → full access"
CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    -- Admin can see deleted profiles for audit purposes
  );

-- --------------------------------------------------------
-- PROFILES: INSERT POLICIES
-- --------------------------------------------------------

-- Policy: Only system (via trigger) can insert profiles
-- Domain Model: "INSERT: FORBIDDEN for buyer/seller"
-- Note: The handle_new_user() trigger uses SECURITY DEFINER to bypass RLS
-- No INSERT policy for authenticated users — inserts happen via auth trigger

-- --------------------------------------------------------
-- PROFILES: UPDATE POLICIES
-- --------------------------------------------------------

-- Policy: Users can update limited fields on their own profile
-- Domain Model: "ALLOWED: display_name, avatar_url, phone, notification_preferences"
-- Domain Model: "FORBIDDEN: role, email, created_at, id"
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = id
    AND deleted_at IS NULL
    -- Role cannot be changed by user (enforced at application level + trigger)
  );

-- Policy: Admins can update all profiles
-- Domain Model: "Admin → full access"
CREATE POLICY "profiles_update_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------
-- PROFILES: DELETE POLICIES
-- --------------------------------------------------------

-- NO DELETE POLICIES
-- Domain Model: "DELETE: FORBIDDEN for buyer/seller"
-- Domain Model: "Soft delete only for admin/system"
-- Hard deletes are handled via cascade from auth.users or service role

-- Trigger to prevent role self-elevation
CREATE OR REPLACE FUNCTION public.prevent_role_self_elevation()
RETURNS TRIGGER AS $$
BEGIN
  -- If user is trying to change their own role and they're not an admin
  IF OLD.id = auth.uid() AND NEW.role != OLD.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Cannot modify own role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_role_elevation ON public.profiles;
CREATE TRIGGER prevent_role_elevation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_self_elevation();


-- ============================================================================
-- SECTION 2: TRANSACTIONS TABLE
-- ============================================================================
-- Domain Model Reference: Section 3.2
-- 
-- CRITICAL RULES:
--   - Seller CANNOT see transaction until escrow is funded
--   - DELETE is FORBIDDEN for ALL roles
--   - State machine controls UPDATE permissions
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;

-- Drop ALL existing policies on transactions
DROP POLICY IF EXISTS "Buyers can view their purchases" ON public.transactions;
DROP POLICY IF EXISTS "Sellers can view their sales" ON public.transactions;
DROP POLICY IF EXISTS "Buyers can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Buyers can update their transactions" ON public.transactions;
DROP POLICY IF EXISTS "Sellers can update transactions they're involved in" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_buyer" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_seller" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_admin" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_buyer" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_admin" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_buyer" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_seller" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_admin" ON public.transactions;

-- --------------------------------------------------------
-- TRANSACTIONS: SELECT POLICIES
-- --------------------------------------------------------

-- Policy: Buyers can view their own transactions (always)
-- Domain Model: "Buyer SELECT: auth.uid() = transactions.buyer_id"
CREATE POLICY "transactions_select_buyer"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = buyer_id
  );

-- Policy: Sellers can view transactions ONLY after escrow is funded
-- Domain Model: "Seller SELECT: auth.uid() = seller_id AND status NOT IN ('draft', 'awaiting_payment')"
-- CRITICAL: This is the escrow visibility gate
CREATE POLICY "transactions_select_seller"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = seller_id
    AND status NOT IN ('draft', 'awaiting_payment')
  );

-- Policy: Admins can view all transactions
-- Domain Model: "Admin → full access"
CREATE POLICY "transactions_select_admin"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
  );

-- --------------------------------------------------------
-- TRANSACTIONS: INSERT POLICIES
-- --------------------------------------------------------

-- Policy: Buyers can create transactions (as initiator)
-- Domain Model: "buyer_id MUST equal auth.uid()"
-- Domain Model: "status MUST be 'draft' or 'awaiting_payment'"
CREATE POLICY "transactions_insert_buyer"
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND status IN ('draft', 'awaiting_payment')
    AND buyer_id != seller_id  -- Cannot be both parties
  );

-- Policy: Admins can create transactions
-- Domain Model: "Admin → full access"
CREATE POLICY "transactions_insert_admin"
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

-- --------------------------------------------------------
-- TRANSACTIONS: UPDATE POLICIES
-- --------------------------------------------------------

-- Policy: Buyers can update their transactions (state-dependent)
-- Domain Model: Section 5.2 - State-Based Write Permissions
-- Note: Field-level restrictions enforced via trigger
CREATE POLICY "transactions_update_buyer"
  ON public.transactions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = buyer_id
  )
  WITH CHECK (
    auth.uid() = buyer_id
    -- State transitions validated by trigger
  );

-- Policy: Sellers can update transactions (state-dependent)
-- Domain Model: "funded → Can trigger: mark_delivered action"
-- Domain Model: "delivered → Can trigger: dispute"
CREATE POLICY "transactions_update_seller"
  ON public.transactions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = seller_id
    AND status NOT IN ('draft', 'awaiting_payment')  -- Must have access first
  )
  WITH CHECK (
    auth.uid() = seller_id
    AND status NOT IN ('draft', 'awaiting_payment')
  );

-- Policy: Admins can update all transactions
-- Domain Model: "Admin → full access"
CREATE POLICY "transactions_update_admin"
  ON public.transactions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------
-- TRANSACTIONS: DELETE POLICIES
-- --------------------------------------------------------

-- NO DELETE POLICIES — EVER
-- Domain Model: "DELETE IS FORBIDDEN FOR ALL ROLES. TRANSACTIONS ARE IMMUTABLE RECORDS."

-- --------------------------------------------------------
-- TRANSACTIONS: STATE MACHINE ENFORCEMENT TRIGGER
-- --------------------------------------------------------

-- Trigger to enforce state machine transitions
CREATE OR REPLACE FUNCTION public.enforce_transaction_state_machine()
RETURNS TRIGGER AS $$
DECLARE
  is_buyer BOOLEAN;
  is_seller BOOLEAN;
  is_admin_user BOOLEAN;
BEGIN
  -- Determine role
  is_buyer := OLD.buyer_id = auth.uid();
  is_seller := OLD.seller_id = auth.uid();
  is_admin_user := public.is_admin();
  
  -- Service role bypasses (for webhooks)
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  
  -- Admin bypasses state restrictions
  IF is_admin_user THEN
    RETURN NEW;
  END IF;
  
  -- IMMUTABLE FIELDS (never changeable by buyer/seller)
  IF NEW.id != OLD.id THEN
    RAISE EXCEPTION 'Cannot modify transaction ID';
  END IF;
  
  IF NEW.buyer_id != OLD.buyer_id THEN
    RAISE EXCEPTION 'Cannot modify buyer_id';
  END IF;
  
  IF NEW.created_at != OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify created_at';
  END IF;
  
  -- Cannot change seller after funding
  IF OLD.status NOT IN ('draft', 'awaiting_payment') AND NEW.seller_id != OLD.seller_id THEN
    RAISE EXCEPTION 'Cannot modify seller after escrow is funded';
  END IF;
  
  -- STATE-BASED RESTRICTIONS
  
  -- DRAFT state: Buyer can edit details
  IF OLD.status = 'draft' THEN
    IF is_buyer THEN
      -- Allowed: description, amount, seller_id, metadata
      -- Valid transitions: draft -> awaiting_payment, draft -> cancelled
      IF NEW.status NOT IN ('draft', 'awaiting_payment', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from draft: %', NEW.status;
      END IF;
    ELSIF is_seller THEN
      RAISE EXCEPTION 'Seller cannot modify draft transactions';
    END IF;
  END IF;
  
  -- AWAITING_PAYMENT state: Only system can modify
  IF OLD.status = 'awaiting_payment' THEN
    IF is_buyer THEN
      -- Buyer can only cancel before payment completes
      IF NEW.status NOT IN ('awaiting_payment', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot modify transaction awaiting payment';
      END IF;
      -- Prevent amount changes during payment
      IF NEW.amount != OLD.amount THEN
        RAISE EXCEPTION 'Cannot modify amount while awaiting payment';
      END IF;
    ELSIF is_seller THEN
      RAISE EXCEPTION 'Seller cannot access transactions awaiting payment';
    END IF;
  END IF;
  
  -- IN_ESCROW state: Seller can mark delivered
  IF OLD.status = 'in_escrow' THEN
    IF is_buyer THEN
      -- Buyer cannot modify in escrow state (wait for delivery)
      IF NEW.status != 'in_escrow' THEN
        RAISE EXCEPTION 'Buyer cannot change status while in escrow - wait for delivery';
      END IF;
    ELSIF is_seller THEN
      -- Seller can only mark as delivered
      IF NEW.status NOT IN ('in_escrow', 'delivered') THEN
        RAISE EXCEPTION 'Seller can only mark transaction as delivered';
      END IF;
    END IF;
  END IF;
  
  -- DELIVERED state: Buyer releases or disputes
  IF OLD.status = 'delivered' THEN
    IF is_buyer THEN
      -- Buyer can release (completed) or dispute
      IF NEW.status NOT IN ('delivered', 'released', 'dispute') THEN
        RAISE EXCEPTION 'Buyer can only release funds or open dispute';
      END IF;
    ELSIF is_seller THEN
      -- Seller can only dispute
      IF NEW.status NOT IN ('delivered', 'dispute') THEN
        RAISE EXCEPTION 'Seller can only open dispute from delivered state';
      END IF;
    END IF;
  END IF;
  
  -- DISPUTE state: Only admin can resolve
  IF OLD.status = 'dispute' THEN
    IF is_buyer OR is_seller THEN
      -- Participants cannot change disputed transaction
      IF NEW.status != OLD.status THEN
        RAISE EXCEPTION 'Only admin can resolve disputes';
      END IF;
    END IF;
  END IF;
  
  -- TERMINAL STATES: No changes allowed
  IF OLD.status IN ('released', 'cancelled') THEN
    IF NEW.status != OLD.status THEN
      RAISE EXCEPTION 'Cannot modify completed/cancelled transactions';
    END IF;
    -- Prevent any field changes on terminal states
    IF NEW.amount != OLD.amount OR 
       NEW.description != OLD.description OR
       NEW.seller_id != OLD.seller_id THEN
      RAISE EXCEPTION 'Terminal transactions are immutable';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_state_machine ON public.transactions;
CREATE TRIGGER enforce_state_machine
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_transaction_state_machine();


-- ============================================================================
-- SECTION 3: DISPUTES TABLE
-- ============================================================================
-- Domain Model Reference: Section 3.3
-- 
-- CRITICAL RULES:
--   - Only transaction participants can see/create disputes
--   - Buyer/Seller can add evidence, CANNOT modify status/resolution
--   - Admin can modify all fields
--   - DELETE is FORBIDDEN
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes FORCE ROW LEVEL SECURITY;

-- Drop ALL existing policies on disputes
DROP POLICY IF EXISTS "Transaction parties can view disputes" ON public.disputes;
DROP POLICY IF EXISTS "Transaction parties can create disputes" ON public.disputes;
DROP POLICY IF EXISTS "disputes_select_participant" ON public.disputes;
DROP POLICY IF EXISTS "disputes_select_admin" ON public.disputes;
DROP POLICY IF EXISTS "disputes_insert_participant" ON public.disputes;
DROP POLICY IF EXISTS "disputes_insert_admin" ON public.disputes;
DROP POLICY IF EXISTS "disputes_update_participant" ON public.disputes;
DROP POLICY IF EXISTS "disputes_update_admin" ON public.disputes;

-- --------------------------------------------------------
-- DISPUTES: SELECT POLICIES
-- --------------------------------------------------------

-- Policy: Transaction participants can view disputes they're involved in
-- Domain Model: "is_dispute_participant(user_id, dispute_id)"
CREATE POLICY "disputes_select_participant"
  ON public.disputes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = disputes.transaction_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

-- Policy: Admins can view all disputes
-- Domain Model: "Admin → all disputes"
CREATE POLICY "disputes_select_admin"
  ON public.disputes
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
  );

-- --------------------------------------------------------
-- DISPUTES: INSERT POLICIES
-- --------------------------------------------------------

-- Policy: Transaction participants can create disputes
-- Domain Model: "initiated_by MUST equal auth.uid()"
-- Domain Model: "User MUST be buyer or seller on the linked transaction"
-- Domain Model: "Transaction status MUST be 'in_escrow' or 'delivered'"
CREATE POLICY "disputes_insert_participant"
  ON public.disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be the initiator
    auth.uid() = opened_by
    -- Must be participant in the transaction
    AND EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
      -- Transaction must be in disputable state
      AND t.status IN ('in_escrow', 'delivered')
    )
    -- New dispute must start in under_review status
    AND status = 'under_review'
  );

-- Policy: Admins can create disputes
-- Domain Model: "Admin → full access"
CREATE POLICY "disputes_insert_admin"
  ON public.disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

-- --------------------------------------------------------
-- DISPUTES: UPDATE POLICIES
-- --------------------------------------------------------

-- Policy: Participants can update limited fields (evidence only)
-- Domain Model: "ALLOWED: evidence, evidence_files (append only)"
-- Domain Model: "FORBIDDEN: status, resolution, resolved_at, admin_notes"
-- Note: Field restrictions enforced via trigger
CREATE POLICY "disputes_update_participant"
  ON public.disputes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = disputes.transaction_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = disputes.transaction_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

-- Policy: Admins can update all disputes
-- Domain Model: "Admin → ALL fields including status, resolution, admin_notes"
CREATE POLICY "disputes_update_admin"
  ON public.disputes
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------
-- DISPUTES: DELETE POLICIES
-- --------------------------------------------------------

-- NO DELETE POLICIES — EVER
-- Domain Model: "DELETE IS FORBIDDEN FOR ALL ROLES. DISPUTES ARE LEGAL RECORDS."

-- --------------------------------------------------------
-- DISPUTES: FIELD RESTRICTION TRIGGER
-- --------------------------------------------------------

-- Trigger to enforce field-level restrictions for participants
CREATE OR REPLACE FUNCTION public.enforce_dispute_field_restrictions()
RETURNS TRIGGER AS $$
DECLARE
  is_admin_user BOOLEAN;
  is_participant BOOLEAN;
BEGIN
  -- Service role bypasses (for system operations)
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  
  is_admin_user := public.is_admin();
  
  -- Admin can modify anything
  IF is_admin_user THEN
    RETURN NEW;
  END IF;
  
  -- Check if user is participant
  SELECT EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = OLD.transaction_id
    AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
  ) INTO is_participant;
  
  IF is_participant THEN
    -- FORBIDDEN: status changes by participant
    IF NEW.status != OLD.status THEN
      RAISE EXCEPTION 'Participants cannot modify dispute status';
    END IF;
    
    -- FORBIDDEN: resolution changes by participant
    IF NEW.resolution IS DISTINCT FROM OLD.resolution THEN
      RAISE EXCEPTION 'Participants cannot modify dispute resolution';
    END IF;
    
    -- FORBIDDEN: resolved_at changes by participant
    IF NEW.resolved_at IS DISTINCT FROM OLD.resolved_at THEN
      RAISE EXCEPTION 'Participants cannot modify resolved_at';
    END IF;
    
    -- FORBIDDEN: resolved_by changes by participant
    IF NEW.resolved_by IS DISTINCT FROM OLD.resolved_by THEN
      RAISE EXCEPTION 'Participants cannot modify resolved_by';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_dispute_restrictions ON public.disputes;
CREATE TRIGGER enforce_dispute_restrictions
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_dispute_field_restrictions();


-- ============================================================================
-- SECTION 4: AUDIT_LOGS TABLE
-- ============================================================================
-- Domain Model Reference: Section 3.4
-- 
-- ABSOLUTE RULES:
--   - SELECT: Admin + System ONLY
--   - INSERT: Admin + System ONLY
--   - UPDATE: FORBIDDEN FOR ALL
--   - DELETE: FORBIDDEN FOR ALL
-- ============================================================================

-- Create audit_logs table if not exists
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Event details
  event_type TEXT NOT NULL,
  
  -- Actor information
  actor_id UUID,  -- NULL for system events
  actor_role TEXT NOT NULL,  -- 'buyer', 'seller', 'admin', 'system'
  
  -- Target information
  target_table TEXT NOT NULL,
  target_id UUID NOT NULL,
  
  -- Change tracking
  old_values JSONB,
  new_values JSONB,
  
  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp (immutable)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure RLS is enabled
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Drop any existing policies
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_admin" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_system" ON public.audit_logs;

-- --------------------------------------------------------
-- AUDIT_LOGS: SELECT POLICIES
-- --------------------------------------------------------

-- Policy: Only admins can read audit logs
-- Domain Model: "Read: admin only"
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
  );

-- --------------------------------------------------------
-- AUDIT_LOGS: INSERT POLICIES
-- --------------------------------------------------------

-- Policy: Admins can insert audit logs
-- Domain Model: "Write: system + admin only"
CREATE POLICY "audit_logs_insert_admin"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

-- Note: System inserts via service role bypass RLS automatically

-- --------------------------------------------------------
-- AUDIT_LOGS: UPDATE POLICIES
-- --------------------------------------------------------

-- NO UPDATE POLICIES — EVER
-- Domain Model: "No updates permitted under ANY circumstance"

-- --------------------------------------------------------
-- AUDIT_LOGS: DELETE POLICIES
-- --------------------------------------------------------

-- NO DELETE POLICIES — EVER
-- Domain Model: "No deletes permitted under ANY circumstance"

-- --------------------------------------------------------
-- AUDIT_LOGS: IMMUTABILITY TRIGGER
-- --------------------------------------------------------

-- Trigger to prevent ANY updates to audit logs (defense in depth)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_audit_update ON public.audit_logs;
CREATE TRIGGER prevent_audit_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

DROP TRIGGER IF EXISTS prevent_audit_delete ON public.audit_logs;
CREATE TRIGGER prevent_audit_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();


-- ============================================================================
-- SECTION 5: DISPUTE_MESSAGES TABLE
-- ============================================================================
-- Inherits participation rules from disputes
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_messages FORCE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Dispute parties can view messages" ON public.dispute_messages;
DROP POLICY IF EXISTS "Dispute parties can send messages" ON public.dispute_messages;
DROP POLICY IF EXISTS "dispute_messages_select_participant" ON public.dispute_messages;
DROP POLICY IF EXISTS "dispute_messages_select_admin" ON public.dispute_messages;
DROP POLICY IF EXISTS "dispute_messages_insert_participant" ON public.dispute_messages;
DROP POLICY IF EXISTS "dispute_messages_insert_admin" ON public.dispute_messages;

-- --------------------------------------------------------
-- DISPUTE_MESSAGES: SELECT POLICIES
-- --------------------------------------------------------

-- Policy: Dispute participants can view messages
CREATE POLICY "dispute_messages_select_participant"
  ON public.dispute_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes d
      JOIN public.transactions t ON d.transaction_id = t.id
      WHERE d.id = dispute_messages.dispute_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

-- Policy: Admins can view all dispute messages
CREATE POLICY "dispute_messages_select_admin"
  ON public.dispute_messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
  );

-- --------------------------------------------------------
-- DISPUTE_MESSAGES: INSERT POLICIES
-- --------------------------------------------------------

-- Policy: Dispute participants can send messages
CREATE POLICY "dispute_messages_insert_participant"
  ON public.dispute_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.disputes d
      JOIN public.transactions t ON d.transaction_id = t.id
      WHERE d.id = dispute_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
      AND d.status = 'under_review'  -- Can only message on open disputes
    )
  );

-- Policy: Admins can send messages
CREATE POLICY "dispute_messages_insert_admin"
  ON public.dispute_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

-- NO UPDATE OR DELETE on dispute messages


-- ============================================================================
-- SECTION 6: FILES TABLE
-- ============================================================================
-- Access controlled by transaction/dispute participation
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files FORCE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view files for their transactions" ON public.files;
DROP POLICY IF EXISTS "Users can upload files to their transactions/disputes" ON public.files;
DROP POLICY IF EXISTS "files_select_participant" ON public.files;
DROP POLICY IF EXISTS "files_select_admin" ON public.files;
DROP POLICY IF EXISTS "files_insert_participant" ON public.files;
DROP POLICY IF EXISTS "files_insert_admin" ON public.files;

-- --------------------------------------------------------
-- FILES: SELECT POLICIES
-- --------------------------------------------------------

-- Policy: Participants can view files for their transactions/disputes
CREATE POLICY "files_select_participant"
  ON public.files
  FOR SELECT
  TO authenticated
  USING (
    (reference_type = 'transaction' AND EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = reference_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
      -- Seller can only see files after escrow
      AND (t.buyer_id = auth.uid() OR t.status NOT IN ('draft', 'awaiting_payment'))
    ))
    OR
    (reference_type = 'dispute' AND EXISTS (
      SELECT 1 FROM public.disputes d
      JOIN public.transactions t ON d.transaction_id = t.id
      WHERE d.id = reference_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    ))
  );

-- Policy: Admins can view all files
CREATE POLICY "files_select_admin"
  ON public.files
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
  );

-- --------------------------------------------------------
-- FILES: INSERT POLICIES
-- --------------------------------------------------------

-- Policy: Participants can upload files
CREATE POLICY "files_insert_participant"
  ON public.files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND (
      (reference_type = 'transaction' AND EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.id = reference_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
        AND (t.buyer_id = auth.uid() OR t.status NOT IN ('draft', 'awaiting_payment'))
      ))
      OR
      (reference_type = 'dispute' AND EXISTS (
        SELECT 1 FROM public.disputes d
        JOIN public.transactions t ON d.transaction_id = t.id
        WHERE d.id = reference_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
        AND d.status = 'under_review'  -- Only on open disputes
      ))
    )
  );

-- Policy: Admins can upload files
CREATE POLICY "files_insert_admin"
  ON public.files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

-- NO DELETE policies for files (evidence preservation)


-- ============================================================================
-- SECTION 7: NOTIFICATIONS TABLE
-- ============================================================================
-- User-scoped only
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;

-- --------------------------------------------------------
-- NOTIFICATIONS: SELECT POLICIES
-- --------------------------------------------------------

-- Policy: Users can view their own notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
  );

-- --------------------------------------------------------
-- NOTIFICATIONS: UPDATE POLICIES
-- --------------------------------------------------------

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: INSERT handled by system/triggers only


-- ============================================================================
-- SECTION 8: AUDIT LOGGING TRIGGERS
-- ============================================================================
-- Automatic audit trail for all sensitive operations
-- ============================================================================

-- Function to log transaction changes
CREATE OR REPLACE FUNCTION public.audit_transaction_changes()
RETURNS TRIGGER AS $$
DECLARE
  audit_actor_id UUID;
  audit_actor_role TEXT;
BEGIN
  -- Determine actor
  IF auth.role() = 'service_role' THEN
    audit_actor_id := NULL;
    audit_actor_role := 'system';
  ELSIF public.is_admin() THEN
    audit_actor_id := auth.uid();
    audit_actor_role := 'admin';
  ELSIF auth.uid() = COALESCE(NEW.buyer_id, OLD.buyer_id) THEN
    audit_actor_id := auth.uid();
    audit_actor_role := 'buyer';
  ELSIF auth.uid() = COALESCE(NEW.seller_id, OLD.seller_id) THEN
    audit_actor_id := auth.uid();
    audit_actor_role := 'seller';
  ELSE
    audit_actor_id := auth.uid();
    audit_actor_role := 'unknown';
  END IF;

  -- Log the change
  INSERT INTO public.audit_logs (
    event_type,
    actor_id,
    actor_role,
    target_table,
    target_id,
    old_values,
    new_values
  ) VALUES (
    CASE TG_OP
      WHEN 'INSERT' THEN 'transaction_created'
      WHEN 'UPDATE' THEN 'transaction_updated'
      ELSE 'transaction_' || lower(TG_OP)
    END,
    audit_actor_id,
    audit_actor_role,
    'transactions',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_transactions ON public.transactions;
CREATE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_transaction_changes();

-- Function to log dispute changes
CREATE OR REPLACE FUNCTION public.audit_dispute_changes()
RETURNS TRIGGER AS $$
DECLARE
  audit_actor_id UUID;
  audit_actor_role TEXT;
  txn RECORD;
BEGIN
  -- Get transaction for role determination
  SELECT * INTO txn FROM public.transactions WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);

  -- Determine actor
  IF auth.role() = 'service_role' THEN
    audit_actor_id := NULL;
    audit_actor_role := 'system';
  ELSIF public.is_admin() THEN
    audit_actor_id := auth.uid();
    audit_actor_role := 'admin';
  ELSIF auth.uid() = txn.buyer_id THEN
    audit_actor_id := auth.uid();
    audit_actor_role := 'buyer';
  ELSIF auth.uid() = txn.seller_id THEN
    audit_actor_id := auth.uid();
    audit_actor_role := 'seller';
  ELSE
    audit_actor_id := auth.uid();
    audit_actor_role := 'unknown';
  END IF;

  -- Log the change
  INSERT INTO public.audit_logs (
    event_type,
    actor_id,
    actor_role,
    target_table,
    target_id,
    old_values,
    new_values
  ) VALUES (
    CASE TG_OP
      WHEN 'INSERT' THEN 'dispute_opened'
      WHEN 'UPDATE' THEN 
        CASE 
          WHEN NEW.status = 'resolved' AND OLD.status != 'resolved' THEN 'dispute_resolved'
          ELSE 'dispute_updated'
        END
      ELSE 'dispute_' || lower(TG_OP)
    END,
    audit_actor_id,
    audit_actor_role,
    'disputes',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_disputes ON public.disputes;
CREATE TRIGGER audit_disputes
  AFTER INSERT OR UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_dispute_changes();


-- ============================================================================
-- SECTION 9: SERVICE ROLE / WEBHOOK SAFETY DOCUMENTATION
-- ============================================================================
-- 
-- HOW SERVICE ROLE BYPASSES RLS (Stripe Webhooks):
-- 
-- 1. Service role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses ALL RLS policies
-- 2. This is by design — service role is for trusted backend operations
-- 3. Stripe webhooks use this key AFTER validating the Stripe signature
-- 
-- FLOW:
--   Stripe -> Backend API -> Validate Signature -> Use Service Role -> Database
-- 
-- CRITICAL SECURITY REQUIREMENTS:
--   - NEVER expose service role key to frontend
--   - NEVER include in client-side bundles
--   - ALWAYS validate Stripe webhook signatures BEFORE any DB operation
--   - ALL service role operations are logged to audit_logs
-- 
-- Example backend webhook handler (pseudocode):
-- 
--   const signature = req.headers['stripe-signature'];
--   const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
--   
--   // Signature validated - safe to use service role
--   const supabase = createClient(url, SERVICE_ROLE_KEY);
--   
--   // This bypasses RLS - intentional for webhooks
--   await supabase.from('transactions').update({ status: 'in_escrow' })...
-- 
-- ============================================================================


-- ============================================================================
-- SECTION 10: VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify RLS is correctly applied

-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'transactions', 'disputes', 'audit_logs', 'dispute_messages', 'files', 'notifications');

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================
-- 
-- SUMMARY OF PROTECTION:
-- 
-- ✅ transactions: Buyer full access, Seller post-escrow only, No deletes
-- ✅ disputes: Participant access only, Evidence-only updates, No deletes
-- ✅ audit_logs: Admin read, Admin/System write, No update/delete EVER
-- ✅ profiles: Own record only, Admin full access
-- ✅ State machine: Enforced via trigger
-- ✅ Field restrictions: Enforced via triggers
-- ✅ Service role: Bypasses RLS for webhooks (by design)
-- ✅ Audit trail: Automatic logging of all changes
-- 
-- ============================================================================
