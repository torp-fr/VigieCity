-- =============================================================================
-- Migration : Enrichments `events` table — Agenda enrichi
-- J8.5 — Phase 0 MVP — Session 24
-- =============================================================================

-- Add new columns to existing events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_capacity INT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS current_registrations INT DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ical_uid TEXT UNIQUE;

-- Event registrations
CREATE TABLE IF NOT EXISTS event_registrations (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID          NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id               UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  status                TEXT          NOT NULL DEFAULT 'registered', -- registered, attended, cancelled
  registered_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  attended_at           TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_registrations_event
  ON event_registrations (event_id, status);

CREATE INDEX IF NOT EXISTS idx_event_registrations_user
  ON event_registrations (user_id, registered_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_registrations_unique
  ON event_registrations (event_id, user_id);

-- RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Citizens: read registrations for their commune's events
CREATE POLICY "event_registrations_citizen_select" ON event_registrations
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE collectivity_id IN (
        SELECT collectivity_id FROM profiles WHERE id = auth.uid()
      )
      AND is_published = true
    )
  );

-- Citizens: register/unregister for events
CREATE POLICY "event_registrations_citizen_manage" ON event_registrations
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND event_id IN (
      SELECT id FROM events
      WHERE collectivity_id IN (
        SELECT collectivity_id FROM profiles WHERE id = auth.uid()
      )
      AND is_published = true
      AND (max_capacity IS NULL OR current_registrations < max_capacity)
      AND (registration_deadline IS NULL OR registration_deadline > now())
    )
  );

-- Admin: manage registrations
CREATE POLICY "event_registrations_admin_all" ON event_registrations
  FOR ALL
  USING (
    event_id IN (
      SELECT e.id FROM events e
      WHERE e.collectivity_id IN (
        SELECT ur.collectivity_id FROM user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
      )
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM events e
      WHERE e.collectivity_id IN (
        SELECT ur.collectivity_id FROM user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
      )
    )
  );

-- Service role
CREATE POLICY "event_registrations_service_all" ON event_registrations
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-update registration count on insert/delete
CREATE OR REPLACE FUNCTION update_event_registration_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events SET current_registrations = current_registrations + 1
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events SET current_registrations = current_registrations - 1
    WHERE id = OLD.event_id AND current_registrations > 0;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_registrations_count_trigger
  AFTER INSERT OR DELETE ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_event_registration_count();

-- Generate iCal UID on event creation
CREATE OR REPLACE FUNCTION generate_event_ical_uid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ical_uid IS NULL THEN
    NEW.ical_uid := NEW.id || '@vigiecity.fr';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_ical_uid_trigger
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION generate_event_ical_uid();
