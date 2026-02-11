-- ============================================================================
-- DIRECT MESSAGES — P2P Chat with inline send/request money
-- Run AFTER wallet.sql. Requires: profiles, transfers, payment_requests
-- ============================================================================

-- ┌──────────────────────────────────────────────────────────────┐
-- │ conversations — one per unique user pair                     │
-- └──────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (participant_1, participant_2),
  CHECK (participant_1 < participant_2) -- canonical ordering to prevent duplicates
);

-- ┌──────────────────────────────────────────────────────────────┐
-- │ direct_messages — chat messages + payment actions            │
-- └──────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS direct_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message         TEXT NOT NULL DEFAULT '',
  message_type    TEXT NOT NULL DEFAULT 'text'
                  CHECK (message_type IN ('text', 'payment_sent', 'payment_request', 'payment_accepted', 'payment_declined', 'system')),
  -- For payment messages, store the related IDs
  transfer_id     UUID REFERENCES transfers(id),
  request_id      UUID REFERENCES payment_requests(id),
  amount          DECIMAL(12,2),
  currency        TEXT DEFAULT 'EUR',
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON conversations(participant_2);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id);

-- ┌──────────────────────────────────────────────────────────────┐
-- │ Function: get or create conversation between two users       │
-- └──────────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION get_or_create_conversation(p_user_1 UUID, p_user_2 UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_a UUID;
  v_b UUID;
  v_id UUID;
BEGIN
  -- Canonical order
  IF p_user_1 < p_user_2 THEN
    v_a := p_user_1; v_b := p_user_2;
  ELSE
    v_a := p_user_2; v_b := p_user_1;
  END IF;

  -- Try to find existing
  SELECT id INTO v_id FROM conversations
    WHERE participant_1 = v_a AND participant_2 = v_b;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Create new
  INSERT INTO conversations (participant_1, participant_2)
    VALUES (v_a, v_b)
    ON CONFLICT (participant_1, participant_2) DO NOTHING
    RETURNING id INTO v_id;

  -- Handle race condition
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM conversations
      WHERE participant_1 = v_a AND participant_2 = v_b;
  END IF;

  RETURN v_id;
END;
$$;

-- ┌──────────────────────────────────────────────────────────────┐
-- │ RLS Policies                                                  │
-- └──────────────────────────────────────────────────────────────┘
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: only participants can see
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can insert conversations they participate in"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Direct messages: only conversation participants can see/send
CREATE POLICY "Users can view messages in their conversations"
  ON direct_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = direct_messages.conversation_id
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON direct_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = direct_messages.conversation_id
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

-- Admin bypass
CREATE POLICY "Admins can view all conversations"
  ON conversations FOR ALL
  USING (is_admin());

CREATE POLICY "Admins can manage all direct messages"
  ON direct_messages FOR ALL
  USING (is_admin());

-- ┌──────────────────────────────────────────────────────────────┐
-- │ Realtime                                                      │
-- └──────────────────────────────────────────────────────────────┘
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
