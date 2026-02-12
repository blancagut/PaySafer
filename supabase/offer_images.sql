-- ============================================================================
-- OFFER IMAGES — Storage bucket for offer attachments
-- ============================================================================
-- Allows offer creators to upload up to 3 images per offer.
-- Images are public (viewable by anyone with the link).
-- Only authenticated users can upload, and only into their own folder.
-- ============================================================================

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-images', 'offer-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Storage Policies
-- ============================================================================

-- Anyone can view offer images (offers are shared via public links)
CREATE POLICY "Anyone can view offer images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'offer-images');

-- Authenticated users can upload images into their own folder
CREATE POLICY "Users can upload offer images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'offer-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Users can update their own offer images
CREATE POLICY "Users can update own offer images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'offer-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Users can delete their own offer images
CREATE POLICY "Users can delete own offer images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'offer-images'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ============================================================================
-- ALTER OFFERS TABLE — Add new columns for enhanced offers
-- ============================================================================

-- Image URLs (up to 3 images stored as JSON array of strings)
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::JSONB;

-- Category tag
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;

-- Expected delivery timeline in days
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT NULL
  CHECK (delivery_days IS NULL OR delivery_days > 0);
