-- Migration : emergency_contacts + radio_streams
-- M7 (numéros d'urgence configurables) + M9 (radio locale)

-- ─── Table emergency_contacts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  label            TEXT        NOT NULL,
  phone            TEXT        NOT NULL,
  category         TEXT        NOT NULL DEFAULT 'autre',
  hours            TEXT,
  priority         INTEGER     NOT NULL DEFAULT 5,
  description      TEXT,
  collectivity_id  UUID        REFERENCES collectivities(id) ON DELETE CASCADE,
  is_national      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_national
  ON emergency_contacts (is_national);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_collectivity
  ON emergency_contacts (collectivity_id, priority);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Citoyens : lecture de tous les nationaux + ceux de leur commune
CREATE POLICY IF NOT EXISTS "emergency_contacts_citizen_select"
  ON emergency_contacts FOR SELECT
  USING (
    is_national = TRUE
    OR collectivity_id IN (
      SELECT collectivity_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admins : CRUD sur les contacts de leur commune uniquement
CREATE POLICY IF NOT EXISTS "emergency_contacts_admin_all"
  ON emergency_contacts FOR ALL
  USING (
    collectivity_id IN (
      SELECT collectivity_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    collectivity_id IN (
      SELECT collectivity_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  );

-- ─── Seed : numéros nationaux ─────────────────────────────────────────────────
INSERT INTO emergency_contacts (label, phone, category, hours, priority, description, is_national)
VALUES
  ('Police secours',             '17',   'securite', '24h/24',          1, 'Police nationale / gendarmerie', TRUE),
  ('Pompiers',                   '18',   'incendie', '24h/24',          2, 'Secours incendie et accidents',  TRUE),
  ('SAMU — Urgences médicales',  '15',   'medical',  '24h/24',          3, 'Aide médicale urgente',          TRUE),
  ('Numéro européen d''urgence', '112',  'securite', '24h/24',          4, 'Tous services depuis l''EU',     TRUE),
  ('Numéro d''urgence sourd',    '114',  'securite', '24h/24',          5, 'SMS ou visiophonie',             TRUE),
  ('Personnes en danger',        '3977', 'social',   'Lun–Ven 9h–19h',  6, 'Maltraitance personnes âgées',  TRUE),
  ('Enfance en danger',          '119',  'social',   '24h/24',          7, 'Signalement mineur en danger',   TRUE),
  ('SOS Amitié',                 '09 72 39 40 50', 'social', '24h/24',  8, 'Détresse psychologique',         TRUE)
ON CONFLICT DO NOTHING;

-- ─── Table radio_streams ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS radio_streams (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  stream_url       TEXT        NOT NULL,
  logo_url         TEXT,
  collectivity_id  UUID        REFERENCES collectivities(id) ON DELETE CASCADE,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order       INTEGER     NOT NULL DEFAULT 10,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- collectivity_id NULL = station nationale disponible à toutes les communes

CREATE INDEX IF NOT EXISTS idx_radio_streams_collectivity
  ON radio_streams (collectivity_id, sort_order);

ALTER TABLE radio_streams ENABLE ROW LEVEL SECURITY;

-- Lecture publique (les flux ne sont pas des données sensibles)
CREATE POLICY IF NOT EXISTS "radio_streams_select_all"
  ON radio_streams FOR SELECT
  USING (
    is_active = TRUE
    AND (
      collectivity_id IS NULL
      OR collectivity_id IN (
        SELECT collectivity_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Admins : gérer les radios locales de leur commune
CREATE POLICY IF NOT EXISTS "radio_streams_admin_all"
  ON radio_streams FOR ALL
  USING (
    collectivity_id IS NOT NULL
    AND collectivity_id IN (
      SELECT collectivity_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    collectivity_id IS NOT NULL
    AND collectivity_id IN (
      SELECT collectivity_id FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  );

-- ─── Seed : radios nationales ─────────────────────────────────────────────────
INSERT INTO radio_streams (name, stream_url, sort_order, is_active)
VALUES
  ('France Info',    'https://icecast.radiofrance.fr/franceinfo-midfi.mp3',      1, TRUE),
  ('France Bleu',    'https://icecast.radiofrance.fr/francebleu-midfi.mp3',      2, TRUE),
  ('France Inter',   'https://icecast.radiofrance.fr/franceinter-midfi.mp3',     3, TRUE),
  ('RFM',            'https://rfm-live.ice.infomaniak.ch/rfm-live.mp3',          4, TRUE),
  ('RTL',            'https://streaming.radio.rtl.fr/rtl-1-44-128',             5, TRUE),
  ('Europe 1',       'https://europe1.lmn.fm/europe1.mp3',                       6, TRUE),
  ('Nostalgie',      'https://scdn.nrjaudio.fm/adwz1/fr/30601/mp3_128.mp3',     7, TRUE),
  ('NRJ',            'https://scdn.nrjaudio.fm/adwz1/fr/30001/mp3_128.mp3',     8, TRUE)
ON CONFLICT DO NOTHING;
