-- ============================================================
-- M13 — Intercommunalités (EPCI)
-- Hiérarchie des rôles :
--   super_admin  → accès global (Baptiste)
--   epci_admin   → gère N communes d'une interco
--   admin        → gère 1 commune
--   moderator    → modère 1 commune
--
-- IMPORTANT : Appliquer en 2 étapes séparées à cause de la
-- contrainte PostgreSQL sur les nouvelles valeurs d'enum.
--
-- Étape A (déjà appliqué via MCP) :
--   ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';
--   ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'epci_admin';
--
-- Étape B (ci-dessous) : tout le reste
-- ============================================================

-- ── 0. Nécessite que les valeurs enum soient déjà commitées ─
-- (Si vous appliquez manuellement, exécutez d'abord les
--  deux ALTER TYPE ci-dessus, commitez, puis exécutez ce fichier.)

-- ── 1. is_active sur collectivities ──────────────────────────
ALTER TABLE collectivities
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- ── 2. Table intercommunalities ──────────────────────────────
CREATE TABLE IF NOT EXISTS intercommunalities (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  siren         TEXT        UNIQUE,                     -- SIREN EPCI (9 chiffres)
  type          TEXT        NOT NULL DEFAULT 'communaute_communes',
  -- communaute_communes | communaute_agglomeration | communaute_urbaine | metropole | syndicat
  region        TEXT,
  department    TEXT,
  -- Quota contractuel : nombre max de communes activables
  max_communes  INTEGER     NOT NULL DEFAULT 5,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Contact admin de l'EPCI (pour nous)
  contact_name  TEXT,
  contact_email TEXT,
  -- Notes internes VigieCity
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_intercommunalities_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_intercommunalities_updated_at ON intercommunalities;
CREATE TRIGGER set_intercommunalities_updated_at
  BEFORE UPDATE ON intercommunalities
  FOR EACH ROW EXECUTE FUNCTION update_intercommunalities_updated_at();

-- ── 2. Rattachement d'une commune à un EPCI ──────────────────
-- Une commune peut appartenir à un EPCI (ou aucun).
ALTER TABLE collectivities
  ADD COLUMN IF NOT EXISTS epci_id UUID REFERENCES intercommunalities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_collectivities_epci_id ON collectivities(epci_id);

-- ── 3. Rôle epci_admin dans user_roles ───────────────────────
-- Un epci_admin a un epci_id mais pas de collectivity_id.
-- Un admin/moderator a un collectivity_id mais pas d'epci_id direct.
-- On ajoute la colonne epci_id sur user_roles.
ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS epci_id UUID REFERENCES intercommunalities(id) ON DELETE CASCADE;

-- Contrainte : epci_admin doit avoir epci_id, pas collectivity_id
--              admin/moderator doit avoir collectivity_id
-- (On applique ça en logique applicative + RLS plutôt qu'une contrainte CHECK complexe
--  pour rester flexible lors des évolutions.)

-- Index pour les lookups courants
CREATE INDEX IF NOT EXISTS idx_user_roles_epci_id ON user_roles(epci_id);

-- ── 4. Vue : communes d'un EPCI avec stats ───────────────────
CREATE OR REPLACE VIEW epci_communes_summary AS
SELECT
  i.id                                    AS epci_id,
  i.name                                  AS epci_name,
  i.max_communes,
  COUNT(c.id)                             AS total_communes,
  COUNT(c.id) FILTER (WHERE c.is_active)  AS active_communes,
  i.max_communes - COUNT(c.id) FILTER (WHERE c.is_active) AS remaining_slots
FROM intercommunalities i
LEFT JOIN collectivities c ON c.epci_id = i.id
GROUP BY i.id, i.name, i.max_communes;

-- ── 5. RLS — intercommunalities ──────────────────────────────
ALTER TABLE intercommunalities ENABLE ROW LEVEL SECURITY;

-- Super-admin : accès total
CREATE POLICY "super_admin_all_intercommunalities"
  ON intercommunalities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- EPCI admin : lecture de sa propre interco
CREATE POLICY "epci_admin_read_own"
  ON intercommunalities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'epci_admin'
        AND epci_id = intercommunalities.id
    )
  );

-- Commune admin/moderator : lecture de l'interco de leur commune
CREATE POLICY "admin_read_own_epci"
  ON intercommunalities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN collectivities c ON c.id = ur.collectivity_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'moderator')
        AND c.epci_id = intercommunalities.id
    )
  );

-- ── 6. RLS collectivities — EPCI admin voit ses communes ─────
-- On ajoute une politique SELECT pour les epci_admin.
-- (Les politiques existantes pour admin/citizen restent inchangées.)
CREATE POLICY "epci_admin_read_member_communes"
  ON collectivities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'epci_admin'
        AND epci_id = collectivities.epci_id
    )
  );

-- EPCI admin peut activer/désactiver une commune de son interco
-- (UPDATE limité à is_active et quelques champs non sensibles)
CREATE POLICY "epci_admin_update_member_communes"
  ON collectivities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'epci_admin'
        AND epci_id = collectivities.epci_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'epci_admin'
        AND epci_id = collectivities.epci_id
    )
  );

-- ── 7. RLS user_roles — EPCI admin gère les admins de ses communes ─
-- L'EPCI admin peut lire les rôles des communes de son interco
CREATE POLICY "epci_admin_read_member_roles"
  ON user_roles FOR SELECT
  USING (
    -- Son propre rôle
    user_id = auth.uid()
    OR
    -- Rôles des admins de ses communes
    EXISTS (
      SELECT 1 FROM user_roles my_role
      JOIN collectivities c ON c.id = user_roles.collectivity_id
      WHERE my_role.user_id = auth.uid()
        AND my_role.role = 'epci_admin'
        AND c.epci_id = my_role.epci_id
    )
  );

-- EPCI admin peut attribuer/révoquer des rôles admin/moderator dans ses communes
-- (dans la limite du quota)
CREATE POLICY "epci_admin_manage_member_roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    -- L'EPCI admin peut créer des rôles admin/moderator pour ses communes
    role IN ('admin', 'moderator')
    AND collectivity_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles my_role
      JOIN collectivities c ON c.id = user_roles.collectivity_id
      WHERE my_role.user_id = auth.uid()
        AND my_role.role = 'epci_admin'
        AND c.epci_id = my_role.epci_id
    )
  );

CREATE POLICY "epci_admin_delete_member_roles"
  ON user_roles FOR DELETE
  USING (
    role IN ('admin', 'moderator')
    AND collectivity_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles my_role
      JOIN collectivities c ON c.id = user_roles.collectivity_id
      WHERE my_role.user_id = auth.uid()
        AND my_role.role = 'epci_admin'
        AND c.epci_id = my_role.epci_id
    )
  );

-- ── 8. Plans au niveau EPCI ───────────────────────────────────
-- On ajoute epci_id sur plans pour les contrats interco.
-- (La table plans doit déjà exister ; si non, on crée la colonne après.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plans') THEN
    ALTER TABLE plans ADD COLUMN IF NOT EXISTS epci_id UUID REFERENCES intercommunalities(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- ── 9. Fonction helper : est-ce que l'utilisateur est EPCI admin de cette commune ? ─
CREATE OR REPLACE FUNCTION is_epci_admin_of_commune(commune_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN collectivities c ON c.epci_id = ur.epci_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'epci_admin'
      AND c.id = commune_id
  );
$$;

-- ── 10. Seed : interco de démonstration ──────────────────────
INSERT INTO intercommunalities (name, siren, type, region, department, max_communes, contact_email, notes)
VALUES (
  'CC Côte Lumineuse (démo)',
  '200000172',
  'communaute_communes',
  'Nouvelle-Aquitaine',
  'Charente-Maritime',
  8,
  'admin@cc-cotelumineuse.fr',
  'Interco de démonstration VigieCity — contrat 8 communes'
)
ON CONFLICT (siren) DO NOTHING;

-- ── Commentaires ──────────────────────────────────────────────
COMMENT ON TABLE intercommunalities IS 'EPCI — regroupements de communes. Un EPCI peut contracter avec VigieCity pour un quota de communes.';
COMMENT ON COLUMN intercommunalities.max_communes IS 'Nombre maximum de communes activables dans ce contrat EPCI.';
COMMENT ON COLUMN intercommunalities.siren IS 'SIREN à 9 chiffres de l''EPCI (registre INSEE).';
COMMENT ON COLUMN user_roles.epci_id IS 'Renseigné uniquement pour le rôle epci_admin. NULL pour les rôles admin/moderator/citizen.';
COMMENT ON COLUMN collectivities.epci_id IS 'EPCI auquel appartient cette commune. NULL si commune indépendante (contrat direct avec VigieCity).';
