-- =============================================================================
-- Migration : Table `weather_vigilance_logs` — Alertes météo Vigilance
-- J8.1 — Phase 0 MVP — Session 24
-- =============================================================================

CREATE TABLE IF NOT EXISTS weather_vigilance_logs (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id       UUID          NOT NULL REFERENCES collectivities(id) ON DELETE CASCADE,

  -- Niveau d'alerte
  -- Valeurs : GREEN (0), YELLOW (1), ORANGE (2), RED (3)
  level                 TEXT          NOT NULL DEFAULT 'GREEN',

  -- Contenu
  description           TEXT,
  phenomena             TEXT,  -- phénomène météo (orage, neige, froid, etc.)
  source_url            TEXT,  -- lien vers Météo-France

  -- Géolocalisation (GeoJSON pour carte)
  geo_shape             JSONB,  -- Feature GeoJSON ou Polygon

  -- Dates
  valid_from            TIMESTAMPTZ,  -- quand l'alerte commence
  valid_to              TIMESTAMPTZ,  -- quand l'alerte finit

  -- Tracking
  synced_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Contrainte : si valid_to renseigné, doit être >= valid_from
  CONSTRAINT weather_vigilance_dates_check
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weather_vigilance_collectivity
  ON weather_vigilance_logs (collectivity_id);

CREATE INDEX IF NOT EXISTS idx_weather_vigilance_level
  ON weather_vigilance_logs (collectivity_id, level)
  WHERE level IN ('ORANGE', 'RED');

CREATE INDEX IF NOT EXISTS idx_weather_vigilance_synced
  ON weather_vigilance_logs (synced_at DESC);

-- RLS
ALTER TABLE weather_vigilance_logs ENABLE ROW LEVEL SECURITY;

-- Citoyens : peuvent lire les alertes de leur commune
CREATE POLICY "weather_vigilance_citizen_select" ON weather_vigilance_logs
  FOR SELECT
  USING (
    collectivity_id IN (
      SELECT collectivity_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Service role (Edge Functions) : accès complet
CREATE POLICY "weather_vigilance_service_all" ON weather_vigilance_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_weather_vigilance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER weather_vigilance_updated_at_trigger
  BEFORE UPDATE ON weather_vigilance_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_weather_vigilance_updated_at();
