-- ── Historique des changements de statut des signalements ─────────────────────
-- Applied via Supabase MCP (apply_migration).
-- After Copy-Item, run: supabase migration repair --status applied 20260620000008

CREATE TABLE IF NOT EXISTS report_status_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID        NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT        NOT NULL,
  changed_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  comment     TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rsh_report ON report_status_history (report_id, changed_at DESC);

ALTER TABLE report_status_history ENABLE ROW LEVEL SECURITY;

-- Citoyens : voir l'historique de leurs propres signalements
DROP POLICY IF EXISTS "rsh_view_own" ON report_status_history;
CREATE POLICY "rsh_view_own" ON report_status_history FOR SELECT
USING (
  report_id IN (
    SELECT id FROM reports WHERE user_id = auth.uid()
  )
);

-- Admins/Modérateurs : voir l'historique des signalements de leur collectivité
DROP POLICY IF EXISTS "rsh_view_admin" ON report_status_history;
CREATE POLICY "rsh_view_admin" ON report_status_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reports r
    INNER JOIN user_roles ur
      ON ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'moderator', 'super_admin')
    WHERE r.id = report_status_history.report_id
      AND (r.collectivity_id = ur.collectivity_id OR ur.collectivity_id IS NULL)
  )
);

-- Admins/Modérateurs : insérer des entrées d'historique
DROP POLICY IF EXISTS "rsh_insert_admin" ON report_status_history;
CREATE POLICY "rsh_insert_admin" ON report_status_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator', 'super_admin')
  )
);
