-- ═══════════════════════════════════════════════════════════════════
-- Panel Opérateur — Migration
-- Tables : otp_codes, operator_sessions
-- Enum   : app_role += 'operator'
-- ═══════════════════════════════════════════════════════════════════

-- 1. Ajouter le rôle opérateur à l'enum existant
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'operator' AFTER 'moderator';

-- 2. Codes OTP (SMS ou email)
CREATE TABLE IF NOT EXISTS otp_codes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           TEXT        NOT NULL,
  code_hash       TEXT        NOT NULL,     -- SHA-256(phone:code)
  collectivity_id UUID        REFERENCES collectivities(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
  used_at         TIMESTAMPTZ,
  attempts        INTEGER     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);

-- 3. Sessions opérateur (post-vérification OTP)
CREATE TABLE IF NOT EXISTS operator_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collectivity_id UUID        NOT NULL REFERENCES collectivities(id) ON DELETE CASCADE,
  session_token   TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '8 hours',
  last_used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_sessions_token ON operator_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_operator_sessions_user  ON operator_sessions(user_id);

-- 4. RLS
ALTER TABLE otp_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_sessions ENABLE ROW LEVEL SECURITY;

-- OTP : uniquement via service role (Edge Functions)
CREATE POLICY "otp_service_only" ON otp_codes
  USING (false) WITH CHECK (false);

-- Sessions : opérateur voit ses propres sessions
CREATE POLICY "op_session_own_select" ON operator_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Vue pratique pour l'admin : liste des opérateurs d'une collectivité
CREATE OR REPLACE VIEW operator_habilitations AS
  SELECT
    ur.id,
    ur.user_id,
    p.display_name   AS operator_name,
    p.phone          AS operator_phone,
    p.id             AS profile_id,
    ur.collectivity_id,
    c.name           AS collectivity_name,
    ur.created_at,
    ur.role
  FROM user_roles ur
  JOIN profiles    p ON p.id = ur.user_id
  JOIN collectivities c ON c.id = ur.collectivity_id
  WHERE ur.role = 'operator';

-- 6. Cleanup automatique des OTP expirés
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM otp_codes
  WHERE expires_at < NOW() - INTERVAL '30 minutes';
$$;

-- 7. Cleanup automatique des sessions expirées
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM operator_sessions
  WHERE expires_at < NOW();
$$;
