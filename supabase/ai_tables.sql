-- =============================================================================
-- AI SUPPORT — Add is_ai_response flag to support_messages
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'support_messages' AND column_name = 'is_ai_response'
  ) THEN
    ALTER TABLE support_messages ADD COLUMN is_ai_response BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
