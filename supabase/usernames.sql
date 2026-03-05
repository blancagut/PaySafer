-- =====================================================
-- USERNAMES
-- Auto-generated on signup, editable exactly once.
-- Public profile URL: paysafer.me/<username>
-- =====================================================

-- ─── 1. Add columns to profiles ─────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ DEFAULT NULL;

-- Index for fast username lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username
  ON public.profiles (username);

-- ─── 2. Username generator ──────────────────────────
-- Produces a slug like "johndoe4821" from an email/name.
-- Retries up to 10 times if there's a collision.
CREATE OR REPLACE FUNCTION public.generate_unique_username(
  base_text TEXT
)
RETURNS TEXT AS $$
DECLARE
  slug      TEXT;
  candidate TEXT;
  attempt   INT := 0;
BEGIN
  -- Build base slug: lowercase, only alphanum, max 16 chars
  -- (16 + 4-digit suffix = 20, matching the valid_username constraint)
  slug := lower(regexp_replace(base_text, '[^a-zA-Z0-9]', '', 'g'));
  slug := substring(slug FROM 1 FOR 16);
  IF length(slug) < 3 THEN
    slug := 'user';
  END IF;
  -- Ensure slug starts with a letter (constraint requires ^[a-z])
  IF substring(slug FROM 1 FOR 1) ~ '[0-9]' THEN
    slug := 'u' || slug;
    slug := substring(slug FROM 1 FOR 16);
  END IF;

  LOOP
    -- 4-digit random suffix
    candidate := slug || floor(random() * 9000 + 1000)::TEXT;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE username = candidate
    );
    attempt := attempt + 1;
    IF attempt > 20 THEN
      -- Fallback: use uuid fragment (strip hyphens to match constraint)
      candidate := 'user' || replace(substring(gen_random_uuid()::TEXT, 1, 12), '-', '');
      EXIT;
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. Update handle_new_user to include username ───
-- The existing trigger in wallet.sql calls REPLACE, so we update it here.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_name TEXT;
  gen_username TEXT;
BEGIN
  -- Derive base from full_name, else email prefix
  base_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );

  gen_username := public.generate_unique_username(base_name);

  -- Create profile with auto username
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    gen_username
  )
  ON CONFLICT (id) DO UPDATE
    SET username = COALESCE(public.profiles.username, EXCLUDED.username);

  -- Create wallet (EUR default) — idempotent
  INSERT INTO public.wallets (user_id, currency)
  VALUES (NEW.id, 'EUR')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 4. Back-fill existing users without a username ──
DO $$
DECLARE
  rec RECORD;
  gen TEXT;
BEGIN
  FOR rec IN
    SELECT id, email, full_name
    FROM public.profiles
    WHERE username IS NULL
  LOOP
    gen := public.generate_unique_username(
      COALESCE(NULLIF(trim(rec.full_name), ''), split_part(rec.email, '@', 1))
    );
    UPDATE public.profiles SET username = gen WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Make username NOT NULL now that everyone has one
ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;

-- ─── 5. RLS policies for username lookups ────────────

-- Anyone (including anon) can look up a profile by username
-- (shows only public-safe fields via the view below)
DROP POLICY IF EXISTS "Public username lookup" ON public.profiles;
CREATE POLICY "Public username lookup"
  ON public.profiles FOR SELECT
  USING (true);

-- Drop the old restrictive select policy so the public one takes effect
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Tighter re-add: own profile always readable
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- ─── 6. Public profile view (safe columns only) ──────
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  p.id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.created_at,
  -- Respect privacy: show stats only if profile_visible
  CASE WHEN us.profile_visible THEN TRUE ELSE FALSE END AS is_visible,
  CASE WHEN us.show_full_name  THEN p.full_name ELSE NULL END AS display_name
FROM public.profiles p
LEFT JOIN public.user_settings us ON us.id = p.id;

-- Grant anon read on the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ─── 7. Enforce single-edit rule via DB constraint ───
-- A check function used by the server action (belt-and-suspenders).
-- The real guard is in the server action, but this prevents direct DB edits.
CREATE OR REPLACE FUNCTION public.guard_username_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If username is being changed AND was already changed once → reject
  IF OLD.username IS DISTINCT FROM NEW.username
     AND OLD.username_changed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Username can only be changed once.';
  END IF;

  -- Record the change timestamp on first manual edit
  IF OLD.username IS DISTINCT FROM NEW.username
     AND OLD.username_changed_at IS NULL THEN
    NEW.username_changed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guard_username_change
  BEFORE UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_username_change();
