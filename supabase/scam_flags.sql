-- =============================================================================
-- SCAM FLAGS — Moderate scam detection results
-- =============================================================================

CREATE TABLE IF NOT EXISTS scam_flags (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id        UUID,                       -- Can reference transaction_messages or direct_messages
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('transaction', 'direct')),
  conversation_id   UUID NOT NULL,              -- transaction_id or conversation_id
  flagged_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confidence        REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  pattern_type      TEXT NOT NULL,              -- off_platform_request, phishing_link, etc.
  explanation       TEXT NOT NULL,
  reviewed          BOOLEAN DEFAULT FALSE,
  reviewed_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  dismissed         BOOLEAN DEFAULT FALSE,      -- Admin marked as false positive
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scam_flags_conversation ON scam_flags(conversation_type, conversation_id);
CREATE INDEX idx_scam_flags_user         ON scam_flags(flagged_user_id);
CREATE INDEX idx_scam_flags_unreviewed   ON scam_flags(reviewed) WHERE reviewed = FALSE;
CREATE INDEX idx_scam_flags_created      ON scam_flags(created_at);

ALTER TABLE scam_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can view scam flags
CREATE POLICY "Admins can view scam flags"
  ON scam_flags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update (mark reviewed/dismissed)
CREATE POLICY "Admins can update scam flags"
  ON scam_flags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
