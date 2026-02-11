-- =====================================================
-- ENABLE REALTIME FOR NOTIFICATIONS TABLE
-- Without this, the useNotificationSubscription hook
-- receives no events via Supabase Realtime.
-- Run this in your Supabase SQL Editor.
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =====================================================
-- PUSH SUBSCRIPTIONS TABLE
-- Stores browser push notification endpoints (Web Push API)
-- per user. Multiple devices per user are supported.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one subscription per endpoint per user
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE (user_id, endpoint);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- =====================================================
-- Add INSERT policy for notifications (service_role
-- bypasses RLS, but this allows the regular client
-- to insert notifications if needed in future)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Service can insert notifications'
  ) THEN
    -- No-op: service_role already bypasses RLS.
    -- The app uses admin client for insertions.
    NULL;
  END IF;
END $$;
