-- =============================================================================
-- AI USAGE LOGS — Token cost tracking per feature
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature       TEXT NOT NULL,               -- 'translation', 'support', 'risk', etc.
  model         TEXT NOT NULL,               -- 'gpt-4o', 'gpt-4o-mini'
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens  INTEGER NOT NULL DEFAULT 0,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Index for cost analysis queries
CREATE INDEX idx_ai_usage_feature ON ai_usage_logs(feature);
CREATE INDEX idx_ai_usage_created ON ai_usage_logs(created_at);
CREATE INDEX idx_ai_usage_user    ON ai_usage_logs(user_id);

-- RLS: Only admins can read usage logs. Insert via service role only.
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view AI usage logs"
  ON ai_usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- No INSERT/UPDATE/DELETE policies for regular users — service_role only
