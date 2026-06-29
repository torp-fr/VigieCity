-- Freemium Moderation System
-- Adds support for automatic content filtering and moderation queue

-- ============ ENUMS ============
CREATE TYPE public.moderation_status AS ENUM ('pending', 'approved', 'flagged', 'rejected', 'appealed');
CREATE TYPE public.flag_reason AS ENUM ('inappropriate_content', 'spam', 'violent', 'harassment', 'misleading', 'duplicate', 'off_topic', 'other');

-- ============ MODERATION_QUEUE ============
CREATE TABLE public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  collectivity_id UUID REFERENCES public.collectivities(id) ON DELETE CASCADE,
  status public.moderation_status NOT NULL DEFAULT 'pending',
  auto_flagged BOOLEAN NOT NULL DEFAULT false,
  confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 0,
  flags TEXT[] NOT NULL DEFAULT '{}',
  moderator_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.moderation_queue TO authenticated;
GRANT ALL ON public.moderation_queue TO service_role;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "moderators view moderation queue" ON public.moderation_queue FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (collectivity_id IS NOT NULL AND public.has_role_in(auth.uid(),'moderator',collectivity_id)));

CREATE POLICY "moderators manage queue items" ON public.moderation_queue FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (collectivity_id IS NOT NULL AND public.has_role_in(auth.uid(),'moderator',collectivity_id)))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR (collectivity_id IS NOT NULL AND public.has_role_in(auth.uid(),'moderator',collectivity_id)));

CREATE TRIGGER trg_moderation_queue_updated BEFORE UPDATE ON public.moderation_queue FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Index for efficient queue queries
CREATE INDEX idx_moderation_queue_status ON public.moderation_queue (status, collectivity_id, created_at DESC);
CREATE INDEX idx_moderation_queue_report ON public.moderation_queue (report_id);

-- ============ REPORT_FLAGS ============
CREATE TABLE public.report_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason public.flag_reason NOT NULL,
  description TEXT,
  is_auto_flag BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.report_flags TO authenticated;
GRANT ALL ON public.report_flags TO service_role;
ALTER TABLE public.report_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users flag reports" ON public.report_flags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "moderators view flags" ON public.report_flags FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.moderation_queue mq
    WHERE mq.report_id = report_flags.report_id
    AND (public.has_role(auth.uid(),'admin') OR (mq.collectivity_id IS NOT NULL AND public.has_role_in(auth.uid(),'moderator',mq.collectivity_id)))
  ));

-- Index for efficient flag queries
CREATE INDEX idx_report_flags_report ON public.report_flags (report_id, created_at DESC);

-- ============ ALTER REPORTS TABLE ============
-- Add moderation-related columns if they don't exist
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS moderation_status public.moderation_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS auto_filtered BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_reports_moderation_status ON public.reports (moderation_status, created_at DESC);
