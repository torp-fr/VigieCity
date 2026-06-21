-- =============================================================================
-- Migration : Table `service_places` — Lieux de services locaux EPCI
-- Session 5 — M4
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_places (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id UUID        NOT NULL REFERENCES collectivities(id) ON DELETE CASCADE,

  name            TEXT        NOT NULL,
  category        TEXT        NOT NULL DEFAULT 'autre',
  -- mairie | sante | education | transport | sport | culture | commerce | urgence | autre

  address         TEXT,
  lat             FLOAT8,
  lng             FLOAT8,

  phone           TEXT,
  email           TEXT,
  website         TEXT,

  -- Horaires JSON flexible ex: {"lun":"8h-18h","mar":"Fermé",...}
  hours           JSONB,

  image_url       TEXT,

  is_published    BOOLEAN     NOT NULL DEFAULT false,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_places_collectivity_cat
  ON service_places (collectivity_id, category);

CREATE INDEX IF NOT EXISTS idx_service_places_published
  ON service_places (collectivity_id, is_published)
  WHERE is_published = true;

ALTER TABLE service_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_places_citizen_select" ON service_places
  FOR SELECT
  USING (
    is_published = true
    AND collectivity_id IN (
      SELECT collectivity_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "service_places_admin_all" ON service_places
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

CREATE OR REPLACE FUNCTION update_service_places_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_places_updated_at
  BEFORE UPDATE ON service_places
  FOR EACH ROW
  EXECUTE FUNCTION update_service_places_updated_at();
