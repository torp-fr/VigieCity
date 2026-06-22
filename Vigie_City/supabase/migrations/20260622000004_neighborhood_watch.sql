-- =============================================================================
-- Migration : Tables `neighborhood_reports` — Voisins Vigilants
-- J8.4 — Phase 0 MVP — Session 24
-- =============================================================================

CREATE TABLE IF NOT EXISTS neighborhood_reports (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id       UUID          NOT NULL REFERENCES collectivities(id) ON DELETE CASCADE,

  -- Contenu
  title                 TEXT          NOT NULL,
  description           TEXT,
  report_type           TEXT          NOT NULL, -- noise, safety, parking, maintenance, other
  severity              TEXT          DEFAULT 'medium', -- low, medium, high, critical

  -- Localisation
  latitude              FLOAT8,
  longitude             FLOAT8,
  location_description  TEXT,

  -- Médias
  image_urls            TEXT[],       -- array de URLs (Supabase Storage)

  -- État
  status                TEXT          NOT NULL DEFAULT 'open', -- open, assigned, resolved, closed
  assigned_to           UUID          REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Modération
  is_approved           BOOLEAN       NOT NULL DEFAULT false,
  is_visible_to_public  BOOLEAN       NOT NULL DEFAULT false,
  moderation_notes      TEXT,

  -- Tracking
  author_id             UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  resolved_at           TIMESTAMPTZ
);

-- Commentaires sur signalements
CREATE TABLE IF NOT EXISTS neighborhood_comments (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id             UUID          NOT NULL REFERENCES neighborhood_reports(id) ON DELETE CASCADE,

  text                  TEXT          NOT NULL,
  author_id             UUID          REFERENCES auth.users(id) ON DELETE SET NULL,

  is_approved           BOOLEAN       NOT NULL DEFAULT false,
  is_visible            BOOLEAN       NOT NULL DEFAULT false,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Historique état signalements
CREATE TABLE IF NOT EXISTS neighborhood_status_history (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id             UUID          NOT NULL REFERENCES neighborhood_reports(id) ON DELETE CASCADE,

  from_status           TEXT,
  to_status             TEXT          NOT NULL,
  changed_by            UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  change_notes          TEXT,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_neighborhood_collectivity_status
  ON neighborhood_reports (collectivity_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_neighborhood_approved
  ON neighborhood_reports (collectivity_id, is_approved, created_at DESC)
  WHERE is_approved = true;

CREATE INDEX IF NOT EXISTS idx_neighborhood_severity
  ON neighborhood_reports (collectivity_id, severity)
  WHERE is_approved = true;

CREATE INDEX IF NOT EXISTS idx_neighborhood_geo
  ON neighborhood_reports USING GIST (
    ST_GeomFromText('SRID=4326;POINT(' || longitude || ' ' || latitude || ')', 4326)
  ) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_neighborhood_comments
  ON neighborhood_comments (report_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_neighborhood_status_history
  ON neighborhood_status_history (report_id, created_at DESC);

-- RLS
ALTER TABLE neighborhood_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhood_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhood_status_history ENABLE ROW LEVEL SECURITY;

-- Citizens: read approved reports of their commune
CREATE POLICY "neighborhood_reports_citizen_select" ON neighborhood_reports
  FOR SELECT
  USING (
    is_approved = true
    AND is_visible_to_public = true
    AND collectivity_id IN (
      SELECT collectivity_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Citizens: create reports
CREATE POLICY "neighborhood_reports_citizen_insert" ON neighborhood_reports
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND collectivity_id IN (
      SELECT collectivity_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Citizens: read/write their own reports
CREATE POLICY "neighborhood_reports_citizen_own" ON neighborhood_reports
  FOR SELECT
  USING (author_id = auth.uid());

-- Moderators: full access
CREATE POLICY "neighborhood_reports_admin_all" ON neighborhood_reports
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

-- Comments
CREATE POLICY "neighborhood_comments_citizen_select" ON neighborhood_comments
  FOR SELECT
  USING (
    is_visible = true
    AND report_id IN (
      SELECT id FROM neighborhood_reports
      WHERE collectivity_id IN (
        SELECT collectivity_id FROM profiles WHERE id = auth.uid()
      )
      AND is_approved = true
    )
  );

CREATE POLICY "neighborhood_comments_citizen_insert" ON neighborhood_comments
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND report_id IN (
      SELECT id FROM neighborhood_reports
      WHERE collectivity_id IN (
        SELECT collectivity_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Triggers
CREATE OR REPLACE FUNCTION update_neighborhood_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER neighborhood_reports_updated_at_trigger
  BEFORE UPDATE ON neighborhood_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_neighborhood_updated_at();

CREATE TRIGGER neighborhood_comments_updated_at_trigger
  BEFORE UPDATE ON neighborhood_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_neighborhood_updated_at();

-- Auto-log status changes
CREATE OR REPLACE FUNCTION log_neighborhood_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO neighborhood_status_history (report_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER neighborhood_status_change_trigger
  AFTER UPDATE ON neighborhood_reports
  FOR EACH ROW
  EXECUTE FUNCTION log_neighborhood_status_change();
