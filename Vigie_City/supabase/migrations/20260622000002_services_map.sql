-- =============================================================================
-- Migration : Tables `services_map` — Carte des services publics
-- J8.2 — Phase 0 MVP — Session 24
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_categories (
  id                TEXT          PRIMARY KEY,
  name              TEXT          NOT NULL,
  emoji             TEXT,
  color             TEXT,
  description       TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Catégories de services
INSERT INTO service_categories (id, name, emoji, color, description) VALUES
  ('health',    'Santé',              '🏥', '#dc2626', 'Hôpitaux et cliniques'),
  ('pharmacy',  'Pharmacies',         '💊', '#2563eb', 'Pharmacies'),
  ('defibrillator', 'Défibrillateurs', '⚡', '#f97316', 'DAE - Défibrillateurs automatisés'),
  ('transport', 'Transports',         '🚌', '#16a34a', 'Bus, trains, transports collectifs')
ON CONFLICT (id) DO NOTHING;

-- Services géolocalisés
CREATE TABLE IF NOT EXISTS services_locations (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id   UUID          NOT NULL REFERENCES collectivities(id) ON DELETE CASCADE,
  category_id       TEXT          NOT NULL REFERENCES service_categories(id),

  -- Localisation
  name              TEXT          NOT NULL,
  address           TEXT,
  latitude          FLOAT8        NOT NULL,
  longitude         FLOAT8        NOT NULL,

  -- Contact
  phone             TEXT,
  website           TEXT,
  email             TEXT,

  -- Métadonnées
  external_id       TEXT,         -- ID depuis data.gouv (pour dédupe)
  last_synced       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_collectivity_category
  ON services_locations (collectivity_id, category_id);

CREATE INDEX IF NOT EXISTS idx_services_geo
  ON services_locations USING GIST (
    ST_GeomFromText('SRID=4326;POINT(' || longitude || ' ' || latitude || ')', 4326)
  );

CREATE INDEX IF NOT EXISTS idx_services_synced
  ON services_locations (last_synced DESC);

CREATE INDEX IF NOT EXISTS idx_services_external_id
  ON services_locations (external_id) WHERE external_id IS NOT NULL;

-- RLS
ALTER TABLE services_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- Citizens : read services of their commune
CREATE POLICY "services_citizen_select" ON services_locations
  FOR SELECT
  USING (
    collectivity_id IN (
      SELECT collectivity_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Service role (EF): write
CREATE POLICY "services_service_all" ON services_locations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Service categories: public read
CREATE POLICY "service_categories_public_select" ON service_categories
  FOR SELECT
  USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_services_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER services_locations_updated_at_trigger
  BEFORE UPDATE ON services_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_services_locations_updated_at();

-- Trigger to prevent duplicate external_id per collectivity + category
CREATE OR REPLACE FUNCTION prevent_duplicate_services()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM services_locations
    WHERE collectivity_id = NEW.collectivity_id
      AND category_id = NEW.category_id
      AND external_id = NEW.external_id
      AND id != NEW.id
  ) > 0 THEN
    RAISE EXCEPTION 'Service already exists for this collectivity and category';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_duplicate_services_trigger
  BEFORE INSERT OR UPDATE ON services_locations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_services();
