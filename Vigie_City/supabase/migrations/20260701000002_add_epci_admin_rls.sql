-- Migration: Add RLS policies for epci_admin role
-- Purpose: Enable EPCI admins to manage licenses for their communes
-- Date: 2026-07-01
-- Related: EPCI onboarding refactor, commune_licenses table

-- Enable RLS on commune_licenses if not already enabled
ALTER TABLE commune_licenses ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow epci_admin to create licenses for their EPCI's communes
CREATE POLICY "epci_admin_can_create_licenses" ON commune_licenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM collectivities c
      WHERE c.id = commune_licenses.collectivity_id
        AND c.epci_id = auth.jwt() ->> 'epci_id'
    )
  );

-- Policy 2: Allow epci_admin to read licenses for their communes
CREATE POLICY "epci_admin_can_read_licenses" ON commune_licenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collectivities c
      WHERE c.id = commune_licenses.collectivity_id
        AND c.epci_id = auth.jwt() ->> 'epci_id'
    )
  );

-- Policy 3: Allow epci_admin to update their licenses
CREATE POLICY "epci_admin_can_update_licenses" ON commune_licenses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM collectivities c
      WHERE c.id = commune_licenses.collectivity_id
        AND c.epci_id = auth.jwt() ->> 'epci_id'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM collectivities c
      WHERE c.id = commune_licenses.collectivity_id
        AND c.epci_id = auth.jwt() ->> 'epci_id'
    )
  );

-- Policy 4: Allow epci_admin to delete their licenses
CREATE POLICY "epci_admin_can_delete_licenses" ON commune_licenses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM collectivities c
      WHERE c.id = commune_licenses.collectivity_id
        AND c.epci_id = auth.jwt() ->> 'epci_id'
    )
  );

-- Policy 5: Service role full access (for backend operations)
CREATE POLICY "service_role_full_access" ON commune_licenses
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
