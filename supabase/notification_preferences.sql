-- ─── Notification Preferences ───
-- Adds a JSONB column to user_settings for per-category × per-channel notification matrix
-- plus quiet-hours configuration.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN user_settings.notification_preferences IS
  'Per-category notification matrix: { "transactions": { "push": true, "email": true, "sound": true }, ... , "quietHours": { "enabled": false, "from": "22:00", "to": "07:00" } }';
