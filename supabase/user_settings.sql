-- =====================================================
-- USER SETTINGS TABLE
-- Persists all user preferences, notification, privacy,
-- and security settings server-side in Supabase.
-- Run this in your Supabase SQL Editor.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,

  -- Notification preferences
  notify_email BOOLEAN NOT NULL DEFAULT TRUE,
  notify_transactions BOOLEAN NOT NULL DEFAULT TRUE,
  notify_disputes BOOLEAN NOT NULL DEFAULT TRUE,
  notify_offers BOOLEAN NOT NULL DEFAULT TRUE,
  notify_marketing BOOLEAN NOT NULL DEFAULT FALSE,
  notify_realtime BOOLEAN NOT NULL DEFAULT TRUE,
  notify_sound BOOLEAN NOT NULL DEFAULT TRUE,
  notify_weekly_digest BOOLEAN NOT NULL DEFAULT FALSE,

  -- Display preferences
  currency TEXT NOT NULL DEFAULT 'USD',
  language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  date_format TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
  compact_mode BOOLEAN NOT NULL DEFAULT FALSE,
  animations BOOLEAN NOT NULL DEFAULT TRUE,

  -- Privacy
  profile_visible BOOLEAN NOT NULL DEFAULT TRUE,
  show_full_name BOOLEAN NOT NULL DEFAULT TRUE,
  show_stats BOOLEAN NOT NULL DEFAULT TRUE,
  show_activity BOOLEAN NOT NULL DEFAULT FALSE,
  allow_search_by_email BOOLEAN NOT NULL DEFAULT TRUE,

  -- Security
  login_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  require_password_actions BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-update updated_at
CREATE TRIGGER set_updated_at_user_settings
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- Auto-create user_settings row on signup
-- (extends the existing handle_new_user or adds a new trigger)
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (id, timezone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_settings();

-- =====================================================
-- Backfill: create settings rows for existing users
-- =====================================================
INSERT INTO public.user_settings (id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_settings)
ON CONFLICT (id) DO NOTHING;
