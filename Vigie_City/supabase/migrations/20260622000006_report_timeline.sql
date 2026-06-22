-- =============================================================================
-- Migration : Tables `report_timeline` — Timeline signalements
-- J8.6 — Phase 0 MVP — Session 24
-- =============================================================================

-- Enhanced reports table if not exists (linking to reports from J8.4)
CREATE TABLE IF NOT EXISTS reports (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id       UUID          NOT NULL REFERENCES collectivities(id) ON DELETE CASCADE,

  -- Content
  title                 TEXT          NOT NULL,
  description           TEXT,
  category              TEXT,

  -- Location
  latitude              FLOAT8,
  longitude             FLOAT8,

  -- Status
  status                TEXT          NOT NULL DEFAULT 'new', -- new, acknowledged, in_progress, resolved, closed
  priority              TEXT          DEFAULT 'normal', -- low, normal, high, critical

  -- Media
  image_urls            TEXT[],

  -- Tracking
  author_id             UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Timeline events for reports
CREATE TABLE IF NOT EXISTS report_timeline_events (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id             UUID          NOT NULL REFERENCES reports(id) ON DELETE CASCADE,

  event_type            TEXT          NOT NULL, -- status_change, comment, photo_added, assigned, resolved
  title                 TEXT          NOT NULL,
  description           TEXT,

  -- Status transition
  from_status           TEXT,
  to_status             TEXT,

  -- Actor
  actor_id              UUID          REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Visibility
  is_public             BOOLEAN       NOT NULL DEFAULT true,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Report timeline comments
CREATE TABLE IF NOT EXISTS report_timeline_comments (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id             UUID          NOT NULL REFERENCES reports(id) ON DELETE CASCADE,

  text                  TEXT          NOT NULL,
  author_id             UUID          REFERENCES auth.users(id) ON DELETE SET NULL,

  is_internal           BOOLEAN       NOT NULL DEFAULT false, -- false = visible to citizen
  is_approved           BOOLEAN       NOT NULL DEFAULT false,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_collectivity_status
  ON reports (collectivity_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_timeline_events
  ON report_timeline_events (report_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_timeline_comments
  ON report_timeline_comments (report_id, created_at DESC);

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_timeline_comments ENABLE ROW LEVEL SECURITY;

-- Citizens: read reports from their commune
CREATE POLICY "reports_citizen_select" ON reports
  FOR SELECT
  USING (
    collectivity_id IN (
      SELECT collectivity_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Citizens: create reports
CREATE POLICY "reports_citizen_insert" ON reports
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND collectivity_id IN (
      SELECT collectivity_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Timeline events: citizens read public events
CREATE POLICY "report_timeline_events_citizen_select" ON report_timeline_events
  FOR SELECT
  USING (
    is_public = true
    AND report_id IN (
      SELECT id FROM reports
      WHERE collectivity_id IN (
        SELECT collectivity_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Timeline comments: citizens read approved
CREATE POLICY "report_timeline_comments_citizen_select" ON report_timeline_comments
  FOR SELECT
  USING (
    is_internal = false
    AND is_approved = true
    AND report_id IN (
      SELECT id FROM reports
      WHERE collectivity_id IN (
        SELECT collectivity_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Citizens: comment on reports
CREATE POLICY "report_timeline_comments_citizen_insert" ON report_timeline_comments
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND is_internal = false
    AND report_id IN (
      SELECT id FROM reports
      WHERE collectivity_id IN (
        SELECT collectivity_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Admins: full access
CREATE POLICY "reports_admin_all" ON reports
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

CREATE POLICY "report_timeline_events_admin_all" ON report_timeline_events
  FOR ALL
  USING (
    report_id IN (
      SELECT r.id FROM reports r
      WHERE r.collectivity_id IN (
        SELECT ur.collectivity_id FROM user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
      )
    )
  )
  WITH CHECK (
    report_id IN (
      SELECT r.id FROM reports r
      WHERE r.collectivity_id IN (
        SELECT ur.collectivity_id FROM user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
      )
    )
  );

-- Triggers
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_updated_at_trigger
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- Auto-create timeline event on status change
CREATE OR REPLACE FUNCTION create_report_timeline_event_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO report_timeline_events (
      report_id, event_type, title, from_status, to_status, actor_id
    ) VALUES (
      NEW.id,
      'status_change',
      'Statut changé : ' || COALESCE(OLD.status, 'nouveau') || ' → ' || NEW.status,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_timeline_status_change_trigger
  AFTER UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION create_report_timeline_event_on_status_change();
