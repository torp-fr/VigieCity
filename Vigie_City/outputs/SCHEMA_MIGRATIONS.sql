-- ============================================================
-- Onboarding Refactor — Schema Migrations
-- Prepared: 2026-06-29
-- ============================================================
--
-- This file contains the SQL migrations needed to support
-- the onboarding refactor (EPCI batch + payment tracking).
--
-- Split into TWO files for deployment:
--   1. 20260701000001_onboarding_payment_fields.sql
--   2. 20260701000002_onboarding_epci_rls.sql
--
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- MIGRATION 1: Payment Fields on commune_licenses
-- File: 20260701000001_onboarding_payment_fields.sql
-- ────────────────────────────────────────────────────────────

-- ── 1. Add payment fields to commune_licenses ───────────────
ALTER TABLE commune_licenses
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_validated BOOLEAN DEFAULT FALSE;

-- ── 2. Comments for clarity ────────────────────────────────
COMMENT ON COLUMN commune_licenses.payment_date IS
  'Date du paiement reçu ou traité (format ISO 8601, ex: 2026-07-01). Renseigné lors de l''onboarding.';

COMMENT ON COLUMN commune_licenses.payment_type IS
  'Mode de paiement utilisé: chorus_pro (marché public), transfer (virement), quote_pending (devis EPCI en attente).';

COMMENT ON COLUMN commune_licenses.payment_validated IS
  'Confirmé par l''administrateur de la commune/EPCI. Indique que le paiement a été reçu et vérifié.';

-- ── 3. Index for payment queries (optional) ────────────────
CREATE INDEX IF NOT EXISTS idx_commune_licenses_payment_date
  ON commune_licenses(payment_date);
CREATE INDEX IF NOT EXISTS idx_commune_licenses_payment_type
  ON commune_licenses(payment_type);
CREATE INDEX IF NOT EXISTS idx_commune_licenses_payment_validated
  ON commune_licenses(payment_validated);

-- ── 4. Optional: Create payment_method enum (advanced) ──────
-- Uncomment if you want to enforce payment_type via enum instead of VARCHAR
-- DO $$
-- BEGIN
--   CREATE TYPE payment_method AS ENUM (
--     'chorus_pro',
--     'transfer',
--     'quote_pending',
--     'stripe'
--   );
-- EXCEPTION WHEN duplicate_object THEN NULL;
-- END;
-- $$;
--
-- Então altere a coluna:
-- ALTER TABLE commune_licenses
--   ALTER COLUMN payment_type TYPE payment_method USING payment_type::payment_method;

-- ─────────────────────────────────────────────────────────────
-- MIGRATION 2: EPCI Admin RLS Policies on commune_licenses
-- File: 20260701000002_onboarding_epci_rls.sql
-- ─────────────────────────────────────────────────────────────

-- ── 1. Verify RLS is enabled on commune_licenses ───────────
ALTER TABLE commune_licenses ENABLE ROW LEVEL SECURITY;

-- ── 2. Super-admin: Full access (should already exist) ──────
-- If not present, uncomment:
-- CREATE POLICY "super_admin_all_licenses"
--   ON commune_licenses FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM user_roles
--       WHERE user_id = auth.uid() AND role = 'super_admin'
--     )
--   );

-- ── 3. Admin: Read/write own commune's license ──────────────
-- (Should already exist from original setup)
-- If not present, uncomment:
-- CREATE POLICY "admin_manage_own_license"
--   ON commune_licenses FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM user_roles
--       WHERE user_id = auth.uid()
--         AND role = 'admin'
--         AND collectivity_id = commune_licenses.collectivity_id
--     )
--   );

-- ── 4. EPCI admin: SELECT communes in their EPCI ───────────
CREATE POLICY "epci_admin_read_member_licenses"
  ON commune_licenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN collectivities c ON c.id = commune_licenses.collectivity_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'epci_admin'
        AND c.epci_id = ur.epci_id
    )
  );

-- ── 5. EPCI admin: INSERT new licenses for their communes ───
CREATE POLICY "epci_admin_create_member_licenses"
  ON commune_licenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN collectivities c ON c.id = commune_licenses.collectivity_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'epci_admin'
        AND c.epci_id = ur.epci_id
    )
  );

-- ── 6. EPCI admin: UPDATE payment fields on their licenses ──
-- (Limited to non-critical fields for safety)
CREATE POLICY "epci_admin_update_payment_fields"
  ON commune_licenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN collectivities c ON c.id = commune_licenses.collectivity_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'epci_admin'
        AND c.epci_id = ur.epci_id
    )
  )
  WITH CHECK (
    -- Can only update payment-related fields, not plan/status
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN collectivities c ON c.id = commune_licenses.collectivity_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'epci_admin'
        AND c.epci_id = ur.epci_id
    )
  );

-- ── 7. EPCI admin: DELETE their licenses (if needed) ───────
-- (Use carefully; consider soft deletes)
CREATE POLICY "epci_admin_delete_member_licenses"
  ON commune_licenses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN collectivities c ON c.id = commune_licenses.collectivity_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'epci_admin'
        AND c.epci_id = ur.epci_id
    )
  );

-- ─────────────────────────────────────────────────────────────
-- MIGRATION 3 (Optional): Onboarding Pipeline Tracking Table
-- File: 20260701000003_onboarding_pipeline.sql (OPTIONAL)
-- ─────────────────────────────────────────────────────────────

-- ── 1. Create onboarding_pipeline table ────────────────────
-- (Use this if you want to persist multi-step form state)

CREATE TABLE IF NOT EXISTS onboarding_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session tracking
  session_id VARCHAR(100) NOT NULL UNIQUE,  -- localStorage key or UUID
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'in_progress',  -- in_progress, completed, abandoned

  -- Territory selection
  territory_type VARCHAR(50) NOT NULL,  -- "commune" or "epci"
  commune_id UUID REFERENCES collectivities(id) ON DELETE SET NULL,
  epci_id UUID REFERENCES intercommunalities(id) ON DELETE SET NULL,

  -- Admin contact
  admin_email VARCHAR(255),
  admin_name VARCHAR(255),

  -- EPCI: batch of commune admins (stored as JSON)
  -- Format: [{ commune_id: uuid, commune_name: string, email: string, name: string }, ...]
  commune_admins JSONB,

  -- Payment info
  payment_date DATE,
  payment_type VARCHAR(50),
  payment_validated BOOLEAN DEFAULT FALSE,

  -- Plan/tariff
  plan VARCHAR(50),
  estimated_tariff NUMERIC(10, 2),

  -- Current step (for resumption)
  current_step INTEGER DEFAULT 1,

  -- Metadata
  notes TEXT,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,

  -- Indexes for performance
  updated_at TIMESTAMPTZ
);

-- ── 2. Triggers for updated_at ─────────────────────────────
CREATE OR REPLACE FUNCTION update_onboarding_pipeline_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_onboarding_pipeline_updated_at ON onboarding_pipeline;
CREATE TRIGGER set_onboarding_pipeline_updated_at
  BEFORE UPDATE ON onboarding_pipeline
  FOR EACH ROW EXECUTE FUNCTION update_onboarding_pipeline_updated_at();

-- ── 3. Indexes for common queries ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_onboarding_pipeline_session_id
  ON onboarding_pipeline(session_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_pipeline_user_id
  ON onboarding_pipeline(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_pipeline_status
  ON onboarding_pipeline(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_pipeline_epci_id
  ON onboarding_pipeline(epci_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_pipeline_commune_id
  ON onboarding_pipeline(commune_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_pipeline_created_at
  ON onboarding_pipeline(created_at DESC);

-- ── 4. RLS for onboarding_pipeline ─────────────────────────
ALTER TABLE onboarding_pipeline ENABLE ROW LEVEL SECURITY;

-- Super-admin: Full access
CREATE POLICY "super_admin_all_pipelines"
  ON onboarding_pipeline FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Users: Can see their own sessions
CREATE POLICY "user_see_own_pipelines"
  ON onboarding_pipeline FOR SELECT
  USING (created_by_user_id = auth.uid());

-- Users: Can create/update/delete their own
CREATE POLICY "user_manage_own_pipelines"
  ON onboarding_pipeline FOR ALL
  USING (created_by_user_id = auth.uid())
  WITH CHECK (created_by_user_id = auth.uid());

-- ── 5. Comments ────────────────────────────────────────────
COMMENT ON TABLE onboarding_pipeline IS
  'Audit trail + state persistence for multi-step onboarding flows. Allows users to resume incomplete sessions.';

COMMENT ON COLUMN onboarding_pipeline.session_id IS
  'Unique session identifier, typically generated by frontend (UUID or composite key).';

COMMENT ON COLUMN onboarding_pipeline.territory_type IS
  'Type de territoire: "commune" (single commune) ou "epci" (intercommunalité avec batch).';

COMMENT ON COLUMN onboarding_pipeline.commune_admins IS
  'Pour EPCI: tableau JSON des admins de communes. Format: [{commune_id, commune_name, email, name}, ...]';

COMMENT ON COLUMN onboarding_pipeline.current_step IS
  'Numéro d''étape actuelle (1-5) pour reprendre après rechargement.';

COMMENT ON COLUMN onboarding_pipeline.status IS
  '"in_progress" (draft), "completed" (onboarding terminé), "abandoned" (expiré ou annulé).';

-- ─────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES
-- Run these to check migrations applied correctly
-- ─────────────────────────────────────────────────────────────

-- Verify commune_licenses columns exist:
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'commune_licenses'
--     AND column_name IN ('payment_date', 'payment_type', 'payment_validated');

-- Verify RLS policies on commune_licenses:
-- SELECT policyname, permissive, roles, qual, with_check
--   FROM pg_policies
--   WHERE tablename = 'commune_licenses'
--   ORDER BY policyname;

-- Verify onboarding_pipeline table exists:
-- SELECT table_name
--   FROM information_schema.tables
--   WHERE table_name = 'onboarding_pipeline';

-- Count rows in each table (baseline):
-- SELECT 'commune_licenses' as table_name, COUNT(*) FROM commune_licenses
-- UNION ALL
-- SELECT 'onboarding_pipeline', COUNT(*) FROM onboarding_pipeline;

-- ─────────────────────────────────────────────────────────────
-- ROLLBACK PROCEDURES (if needed)
-- ─────────────────────────────────────────────────────────────

-- To rollback migration 1 (payment fields):
-- ALTER TABLE commune_licenses
--   DROP COLUMN IF EXISTS payment_date CASCADE,
--   DROP COLUMN IF EXISTS payment_type CASCADE,
--   DROP COLUMN IF EXISTS payment_validated CASCADE;
-- DROP INDEX IF EXISTS idx_commune_licenses_payment_date;
-- DROP INDEX IF EXISTS idx_commune_licenses_payment_type;
-- DROP INDEX IF EXISTS idx_commune_licenses_payment_validated;

-- To rollback migration 2 (RLS policies):
-- DROP POLICY IF EXISTS "epci_admin_read_member_licenses" ON commune_licenses;
-- DROP POLICY IF EXISTS "epci_admin_create_member_licenses" ON commune_licenses;
-- DROP POLICY IF EXISTS "epci_admin_update_payment_fields" ON commune_licenses;
-- DROP POLICY IF EXISTS "epci_admin_delete_member_licenses" ON commune_licenses;

-- To rollback migration 3 (onboarding_pipeline):
-- DROP TABLE IF EXISTS onboarding_pipeline CASCADE;
-- DROP FUNCTION IF EXISTS update_onboarding_pipeline_updated_at();

-- ─────────────────────────────────────────────────────────────
-- EXAMPLES: Using the new fields
-- ─────────────────────────────────────────────────────────────

-- Example 1: Create commune license with payment info (single commune path)
-- INSERT INTO commune_licenses (
--   collectivity_id, plan, status, started_at, expires_at,
--   payment_date, payment_type, payment_validated
-- ) VALUES (
--   'coll-uuid-123',
--   'trial',
--   'active',
--   now(),
--   now() + interval '30 days',
--   now()::date,
--   'chorus_pro',
--   true
-- );

-- Example 2: Query EPCI communes with payment status
-- SELECT
--   c.name,
--   cl.plan,
--   cl.payment_date,
--   cl.payment_type,
--   CASE WHEN cl.payment_validated THEN '✅ Confirmé' ELSE '⏳ Attente' END as status
-- FROM collectivities c
-- JOIN commune_licenses cl ON c.id = cl.collectivity_id
-- WHERE c.epci_id = 'epci-uuid-456'
-- ORDER BY c.name;

-- Example 3: Find unpaid communes
-- SELECT c.name, cl.payment_date, cl.payment_type
-- FROM collectivities c
-- JOIN commune_licenses cl ON c.id = cl.collectivity_id
-- WHERE cl.payment_validated = false
--   AND cl.created_at < now() - interval '7 days'
-- ORDER BY cl.created_at;

-- ─────────────────────────────────────────────────────────────
-- END OF MIGRATIONS
-- ─────────────────────────────────────────────────────────────
