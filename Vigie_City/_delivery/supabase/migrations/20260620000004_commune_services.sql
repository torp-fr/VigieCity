-- =============================================================================
-- Migration : Services configurables pour la messagerie citoyen ↔ mairie
-- Session 5 — M5-bis
-- Note: "commune_services" était déjà prise (annuaire lieux M4) → mairie_services
-- =============================================================================

CREATE TABLE IF NOT EXISTS mairie_services (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id UUID        NOT NULL REFERENCES collectivities(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  sort_order      INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mairie_services_collectivity
  ON mairie_services (collectivity_id, sort_order);

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS mairie_service_id UUID REFERENCES mairie_services(id) ON DELETE SET NULL;

ALTER TABLE mairie_services ENABLE ROW LEVEL SECURITY;

-- Citoyens : voir les services actifs de leur collectivité (pour le picker)
CREATE POLICY "mairie_services_citizen_select" ON mairie_services
  FOR SELECT USING (
    is_active = true
    AND collectivity_id IN (
      SELECT collectivity_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admin : gérer tous les services de leur collectivité
CREATE POLICY "mairie_services_admin_all" ON mairie_services
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
