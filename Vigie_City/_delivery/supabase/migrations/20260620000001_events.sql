-- =============================================================================
-- Migration : Table `events` — Agenda des événements communaux
-- Session 5 — M3
-- =============================================================================

CREATE TABLE IF NOT EXISTS events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id UUID        NOT NULL REFERENCES collectivities(id) ON DELETE CASCADE,

  -- Contenu
  title           TEXT        NOT NULL,
  description     TEXT,
  category        TEXT        NOT NULL DEFAULT 'general',
  -- Valeurs acceptées : general | sport | culture | education | reunion | travaux | sante | autre

  -- Dates (start_at obligatoire, end_at facultatif)
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ,

  -- Lieu
  location        TEXT,

  -- Médias (URL Supabase Storage ou URL externe)
  image_url       TEXT,
  image_path      TEXT,        -- chemin relatif dans Storage pour suppression

  -- État
  is_published    BOOLEAN     NOT NULL DEFAULT false,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Contrainte : si end_at renseigné, doit être >= start_at
  CONSTRAINT events_dates_check CHECK (end_at IS NULL OR end_at >= start_at)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_events_collectivity_start
  ON events (collectivity_id, start_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_published_upcoming
  ON events (collectivity_id, is_published, start_at)
  WHERE is_published = true;

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Citoyens : événements publiés de leur commune uniquement
CREATE POLICY "events_citizen_select" ON events
  FOR SELECT
  USING (
    is_published = true
    AND collectivity_id IN (
      SELECT collectivity_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admin / modérateur : accès complet sur leur commune
CREATE POLICY "events_admin_all" ON events
  FOR ALL
  USING (
    collectivity_id IN (
      SELECT ur.collectivity_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    collectivity_id IN (
      SELECT ur.collectivity_id FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
    )
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_updated_at();
