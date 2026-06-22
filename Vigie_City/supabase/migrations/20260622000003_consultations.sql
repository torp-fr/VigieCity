-- =============================================================================
-- Migration : Tables `consultations` — Consultations citoyennes + votes
-- J8.3 — Phase 0 MVP — Session 24
-- =============================================================================

CREATE TABLE IF NOT EXISTS consultations (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id       UUID          NOT NULL REFERENCES collectivities(id) ON DELETE CASCADE,

  -- Contenu
  title                 TEXT          NOT NULL,
  description           TEXT,
  category              TEXT          DEFAULT 'general',

  -- Dates
  starts_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
  ends_at               TIMESTAMPTZ   NOT NULL,

  -- État
  status                TEXT          NOT NULL DEFAULT 'active', -- active, closed, archived
  is_published          BOOLEAN       NOT NULL DEFAULT false,

  -- Tracking
  created_by            UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT consultation_dates_check CHECK (ends_at > starts_at)
);

-- Questions / sondages
CREATE TABLE IF NOT EXISTS consultation_questions (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id       UUID          NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,

  question_text         TEXT          NOT NULL,
  question_type         TEXT          NOT NULL, -- single_choice, multiple_choice, open_text
  position              INT           NOT NULL DEFAULT 0,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Options de réponse
CREATE TABLE IF NOT EXISTS consultation_options (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id           UUID          NOT NULL REFERENCES consultation_questions(id) ON DELETE CASCADE,

  option_text           TEXT          NOT NULL,
  position              INT           NOT NULL DEFAULT 0,
  vote_count            INT           DEFAULT 0,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Votes / réponses
CREATE TABLE IF NOT EXISTS consultation_responses (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id           UUID          NOT NULL REFERENCES consultation_questions(id) ON DELETE CASCADE,
  respondent_id         UUID          REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Réponse
  option_id             UUID          REFERENCES consultation_options(id) ON DELETE SET NULL,
  text_response         TEXT,  -- pour open_text

  ip_hash               TEXT,  -- pour anonyme si besoin
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_consultations_collectivity
  ON consultations (collectivity_id, status);

CREATE INDEX IF NOT EXISTS idx_consultations_published
  ON consultations (collectivity_id, is_published, ends_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_questions_consultation
  ON consultation_questions (consultation_id, position);

CREATE INDEX IF NOT EXISTS idx_responses_question
  ON consultation_responses (question_id);

CREATE INDEX IF NOT EXISTS idx_responses_user
  ON consultation_responses (respondent_id);

-- RLS
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_responses ENABLE ROW LEVEL SECURITY;

-- Citizens: read published consultations of their commune
CREATE POLICY "consultations_citizen_select" ON consultations
  FOR SELECT
  USING (
    is_published = true
    AND collectivity_id IN (
      SELECT collectivity_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Citizens: insert their responses
CREATE POLICY "consultation_responses_citizen_insert" ON consultation_responses
  FOR INSERT
  WITH CHECK (
    respondent_id = auth.uid()
    AND question_id IN (
      SELECT q.id FROM consultation_questions q
      JOIN consultations c ON c.id = q.consultation_id
      WHERE c.collectivity_id IN (
        SELECT collectivity_id FROM profiles WHERE id = auth.uid()
      )
      AND c.is_published = true
    )
  );

-- Citizens: read responses (aggregate only)
CREATE POLICY "consultation_responses_citizen_select" ON consultation_responses
  FOR SELECT
  USING (
    question_id IN (
      SELECT q.id FROM consultation_questions q
      JOIN consultations c ON c.id = q.consultation_id
      WHERE c.collectivity_id IN (
        SELECT collectivity_id FROM profiles WHERE id = auth.uid()
      )
      AND c.is_published = true
    )
  );

-- Admin: full access
CREATE POLICY "consultations_admin_all" ON consultations
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

-- Service role
CREATE POLICY "consultations_service_all" ON consultations
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "consultation_questions_all" ON consultation_questions
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "consultation_options_all" ON consultation_options
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Triggers
CREATE OR REPLACE FUNCTION update_consultation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consultations_updated_at_trigger
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_consultation_updated_at();

-- Update vote count on response insert
CREATE OR REPLACE FUNCTION increment_option_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE consultation_options SET vote_count = vote_count + 1
  WHERE id = NEW.option_id AND NEW.option_id IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consultation_response_vote_count_trigger
  AFTER INSERT ON consultation_responses
  FOR EACH ROW
  EXECUTE FUNCTION increment_option_vote_count();
