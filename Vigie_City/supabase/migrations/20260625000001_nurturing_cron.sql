-- ── J22 Séquence email post-activation ───────────────────────────────────────
-- Table de tracking pour éviter les doublons de nurturing emails

CREATE TABLE IF NOT EXISTS nurturing_sent (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id UUID        NOT NULL REFERENCES collectivities(id) ON DELETE CASCADE,
  day_number      INTEGER     NOT NULL CHECK (day_number IN (3, 7)),
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient_email TEXT,
  UNIQUE (collectivity_id, day_number)
);

-- Index pour les lookups rapides par collectivity_id
CREATE INDEX IF NOT EXISTS nurturing_sent_collectivity_idx
  ON nurturing_sent (collectivity_id);

-- RLS : lecture/écriture uniquement via service role (EF)
ALTER TABLE nurturing_sent ENABLE ROW LEVEL SECURITY;

-- Pas de SELECT public : les données nurturing sont internes
CREATE POLICY "service_role_only_nurturing" ON nurturing_sent
  USING (false)
  WITH CHECK (false);

-- ── pg_cron : send-nurturing daily à 9h UTC ───────────────────────────────────
SELECT cron.schedule(
  'send-nurturing-daily-9h',
  '0 9 * * *',
  $$SELECT net.http_post(
    url     := 'https://xfhkngecpbvmlstjymfy.supabase.co/functions/v1/send-nurturing',
    headers := '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaGtuZ2VjcGJ2bWxzdGp5bWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDg4NTYsImV4cCI6MjA5NzM4NDg1Nn0.KeYioZ-ckiXLBziQVrqPsPUQ9A-19PW7JNu1YL9aUdQ","Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id$$
);
