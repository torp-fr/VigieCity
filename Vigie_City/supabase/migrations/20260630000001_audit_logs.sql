-- =============================================================================
-- Migration : Table `audit_logs` — User activity tracking
-- Session 49 — Platform Users Admin enhancements
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action          TEXT        NOT NULL, -- 'login', 'logout', 'report_create', 'report_update', etc.
  resource_type   TEXT, -- 'profile', 'report', 'message', etc.
  resource_id     UUID,
  details         JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action
  ON audit_logs (user_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "audit_logs_super_admin_all" ON audit_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Admin: read logs for their collectivity users
CREATE POLICY "audit_logs_admin_read" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur1
      WHERE ur1.user_id = auth.uid() AND ur1.role IN ('admin', 'moderator')
      AND ur1.collectivity_id IN (
        SELECT collectivity_id FROM profiles WHERE id = audit_logs.user_id
      )
    )
  );

-- Users: read their own logs
CREATE POLICY "audit_logs_user_own" ON audit_logs
  FOR SELECT
  USING (user_id = auth.uid());
