-- Freemium moderation system
-- Supports Phase 1 (super-admin moderation) and Phase 2 (city takes over)

-- Reports table (extends existing reports if necessary)
-- Add moderation columns if table exists, create if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'reports' AND table_schema = 'public'
  ) THEN
    CREATE TABLE public.reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      municipality_id BIGINT REFERENCES public.municipalities(id),
      citizen_id UUID REFERENCES auth.users(id),
      content TEXT NOT NULL,
      category TEXT,
      latitude FLOAT,
      longitude FLOAT,

      -- Moderation fields
      status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'public', 'hidden', 'escalated')),
      auto_filter_score FLOAT DEFAULT 0.0, -- 0-1, >0.7 = flag for review
      citizen_flags_count INT DEFAULT 0,
      visible_to_public BOOLEAN DEFAULT FALSE,

      -- City response fields
      city_response TEXT,
      city_response_date TIMESTAMP WITH TIME ZONE,

      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX idx_reports_municipality ON public.reports(municipality_id);
    CREATE INDEX idx_reports_status ON public.reports(status);
    CREATE INDEX idx_reports_visible ON public.reports(visible_to_public);
    CREATE INDEX idx_reports_created ON public.reports(created_at DESC);
  ELSE
    -- Add columns if they don't exist
    ALTER TABLE public.reports
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'public', 'hidden', 'escalated')),
    ADD COLUMN IF NOT EXISTS auto_filter_score FLOAT DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS citizen_flags_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS city_response TEXT,
    ADD COLUMN IF NOT EXISTS city_response_date TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS visible_to_public BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Moderation queue (super-admin review)
CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  reason TEXT, -- why it was flagged (spam, profanity, abuse, etc.)
  reviewed_by_admin TEXT, -- admin name/email who reviewed
  reviewed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(report_id) -- only one queue entry per report
);

CREATE INDEX idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX idx_moderation_queue_created ON public.moderation_queue(created_at DESC);
CREATE INDEX idx_moderation_queue_report ON public.moderation_queue(report_id);

-- Citizen flags on reports (voting/reporting)
CREATE TABLE IF NOT EXISTS public.report_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  citizen_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('spam', 'profanity', 'abuse', 'misinformation')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(report_id, citizen_id) -- one flag per citizen per report
);

CREATE INDEX idx_report_flags_report ON public.report_flags(report_id);
CREATE INDEX idx_report_flags_citizen ON public.report_flags(citizen_id);

-- License status for municipalities (to determine moderation owner)
-- This extends the existing municipalities table
ALTER TABLE public.municipalities
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'freemium' CHECK (subscription_status IN ('freemium', 'active', 'paused', 'canceled')),
ADD COLUMN IF NOT EXISTS subscription_tier TEXT CHECK (subscription_tier IN ('Hameau', 'Village', 'Bourg', 'Bastide', 'Cité', 'Métropole')),
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE;

-- RLS Policies for moderation

-- Reports: citizens can see public reports from anywhere
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_public_visible"
  ON public.reports FOR SELECT
  USING (visible_to_public = TRUE);

-- Super-admin can see all reports for moderation
CREATE POLICY "reports_admin_moderation"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'user_role' = 'super_admin'
  );

-- City admins can see reports in their municipality if subscribed
CREATE POLICY "reports_city_own_municipality"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    municipality_id IN (
      SELECT id FROM public.municipalities
      WHERE admin_user_id = auth.uid()
      AND subscription_status = 'active'
    )
  );

-- Citizens can see their own reports
CREATE POLICY "reports_citizen_own"
  ON public.reports FOR SELECT
  TO authenticated
  USING (citizen_id = auth.uid());

-- Moderation queue: only super-admin and city admins
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moderation_queue_admin_only"
  ON public.moderation_queue FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'user_role' = 'super_admin'
  );

-- Report flags: citizens can add flags to public reports
ALTER TABLE public.report_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_flags_citizens_can_add"
  ON public.report_flags FOR INSERT
  TO authenticated
  WITH CHECK (
    citizen_id = auth.uid()
    AND report_id IN (SELECT id FROM public.reports WHERE visible_to_public = TRUE)
  );

CREATE POLICY "report_flags_admin_view_all"
  ON public.report_flags FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'user_role' = 'super_admin'
  );

-- Trigger to auto-update citizen_flags_count on reports
CREATE OR REPLACE FUNCTION update_report_flags_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.reports
  SET citizen_flags_count = (
    SELECT COUNT(*) FROM public.report_flags
    WHERE report_id = NEW.report_id
  ),
  updated_at = NOW()
  WHERE id = NEW.report_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_report_flags_count ON public.report_flags;
CREATE TRIGGER trigger_update_report_flags_count
AFTER INSERT ON public.report_flags
FOR EACH ROW
EXECUTE FUNCTION update_report_flags_count();

-- Trigger to escalate reports when citizen flags exceed 3
CREATE OR REPLACE FUNCTION escalate_flagged_reports()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.citizen_flags_count >= 3 AND OLD.citizen_flags_count < 3 THEN
    UPDATE public.moderation_queue
    SET status = 'escalated'
    WHERE report_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_escalate_flagged_reports ON public.reports;
CREATE TRIGGER trigger_escalate_flagged_reports
AFTER UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION escalate_flagged_reports();
