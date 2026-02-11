-- =============================================================================
-- TRANSLATIONS CACHE — Avoid re-translating the same string
-- =============================================================================

CREATE TABLE IF NOT EXISTS translations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_hash     TEXT NOT NULL,        -- SHA-256 of the source text
  source_text     TEXT NOT NULL,        -- Original text (for debugging/revalidation)
  locale          TEXT NOT NULL,        -- Target locale: 'es', 'fr', 'de', 'pt', etc.
  translated_text TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one translation per hash+locale combination
CREATE UNIQUE INDEX idx_translations_hash_locale ON translations(source_hash, locale);

-- Fast lookup index
CREATE INDEX idx_translations_locale ON translations(locale);

-- RLS: Translations are readable by all authenticated users, writable only by service role
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read translations"
  ON translations FOR SELECT
  USING (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE for regular users — service_role inserts
