-- Migration: add categories column to market_news
-- Run in Supabase SQL Editor if the table already exists.
ALTER TABLE public.market_news
  ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';
