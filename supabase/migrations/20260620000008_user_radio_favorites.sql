-- ── Favoris radio utilisateur ─────────────────────────────────────────────────
-- Applied via Supabase MCP. This file documents the migration for CLI sync.
-- After Copy-Item, run: supabase migration repair --status applied 20260620000007

CREATE TABLE IF NOT EXISTS user_radio_favorites (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_uuid  TEXT        NOT NULL,
  station_name  TEXT        NOT NULL,
  stream_url    TEXT        NOT NULL,
  logo_url      TEXT,
  source        TEXT        NOT NULL DEFAULT 'radio-browser',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, station_uuid)
);

CREATE INDEX IF NOT EXISTS idx_radio_favorites_user ON user_radio_favorites (user_id, created_at DESC);

ALTER TABLE user_radio_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "radio_favorites_own" ON user_radio_favorites;
CREATE POLICY "radio_favorites_own"
  ON user_radio_favorites FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
