-- ============================================================================
-- TRANSACTION MESSAGES — Real-time chat between buyer & seller
-- ============================================================================
-- Messages are scoped to a transaction. Only buyer_id and seller_id of the
-- parent transaction may read or write messages. System messages are inserted
-- by the service_role (webhooks, state transitions).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transaction_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Parent transaction
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,

  -- Sender (NULL for system messages)
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Content
  message TEXT NOT NULL,

  -- Message type for rendering
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (
    message_type IN ('text', 'system', 'file', 'milestone', 'payment_notice')
  ),

  -- Flexible metadata (file URLs, amounts, status changes, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transaction_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_messages FORCE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_txn_messages_transaction ON public.transaction_messages(transaction_id, created_at);
CREATE INDEX idx_txn_messages_sender ON public.transaction_messages(sender_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Participants can read messages in their transactions
CREATE POLICY "Transaction participants can read messages"
  ON public.transaction_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

-- Participants can send messages in their transactions
CREATE POLICY "Transaction participants can send messages"
  ON public.transaction_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id
      AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

-- Service role can insert system messages (no sender_id required)
-- (service_role bypasses RLS automatically)

-- Admins can view all messages
CREATE POLICY "Admins can view all transaction messages"
  ON public.transaction_messages FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_messages;
