-- =====================================================
-- Add notify_messages column to user_settings
-- Gives users granular control over message notifications
-- separate from the general real-time toggle.
-- Run this in Supabase SQL Editor.
-- =====================================================

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS notify_messages BOOLEAN NOT NULL DEFAULT TRUE;
