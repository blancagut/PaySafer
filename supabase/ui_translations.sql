-- =============================================================================
-- UI TRANSLATIONS CACHE — AI-translated UI strings (GPT-4o-mini)
-- =============================================================================
-- This table caches UI text translations so OpenAI is called at most once
-- per unique (text + language) pair.  The key is a SHA-256 hash of the
-- original English string concatenated with the target language code.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ui_translations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash       TEXT NOT NULL,           -- SHA-256(original_text || target_lang)
  original_text   TEXT NOT NULL,           -- English source text
  translated_text TEXT NOT NULL,           -- AI-translated result
  target_lang     TEXT NOT NULL,           -- e.g. 'es', 'fr', 'de'
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(text_hash, target_lang)
);

-- Fast lookup index
CREATE INDEX IF NOT EXISTS idx_ui_translations_hash_lang
  ON ui_translations(text_hash, target_lang);

-- RLS: readable by all authenticated users, writable only by service_role
ALTER TABLE ui_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ui_translations"
  ON ui_translations FOR SELECT
  USING (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policies for regular users — only service_role writes
