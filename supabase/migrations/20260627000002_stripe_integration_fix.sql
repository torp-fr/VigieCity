-- Migration: Add Stripe subscription columns to collectivities table (corrected)
-- Date: 2026-06-27
-- NOTE: Previous migration referenced wrong table "municipalities" - this fixes it

-- Add columns for Stripe subscription tracking to collectivities table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'collectivities' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.collectivities ADD COLUMN subscription_status TEXT DEFAULT 'freemium' CHECK (subscription_status IN ('freemium', 'active', 'pending', 'cancelled', 'past_due'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'collectivities' AND column_name = 'subscription_stripe_id'
  ) THEN
    ALTER TABLE public.collectivities ADD COLUMN subscription_stripe_id TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'collectivities' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE public.collectivities ADD COLUMN subscription_tier INTEGER DEFAULT 0 CHECK (subscription_tier >= 0 AND subscription_tier <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'collectivities' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE public.collectivities ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'collectivities' AND column_name = 'subscription_billing_cycle'
  ) THEN
    ALTER TABLE public.collectivities ADD COLUMN subscription_billing_cycle TEXT DEFAULT 'monthly' CHECK (subscription_billing_cycle IN ('monthly', 'annual'));
  END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_collectivities_subscription_status ON public.collectivities(subscription_status);
CREATE INDEX IF NOT EXISTS idx_collectivities_subscription_expires_at ON public.collectivities(subscription_expires_at);
CREATE INDEX IF NOT EXISTS idx_collectivities_subscription_stripe_id ON public.collectivities(subscription_stripe_id);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collectivity_id UUID NOT NULL REFERENCES public.collectivities(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'failed', 'cancelled')),
  stripe_invoice_id TEXT,
  chorus_pro_id TEXT,
  pdf_url TEXT,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes on invoices table
CREATE INDEX IF NOT EXISTS idx_invoices_collectivity_id ON public.invoices(collectivity_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON public.invoices(stripe_invoice_id);

-- RLS for invoices table
DO $$
BEGIN
  -- Enable RLS if not already enabled
  EXECUTE 'ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN OTHERS THEN
  NULL; -- RLS may already be enabled
END $$;

-- RLS policy: City admins can view their own collectivity's invoices
DROP POLICY IF EXISTS "city_admins_can_view_own_invoices" ON public.invoices;
CREATE POLICY "city_admins_can_view_own_invoices" ON public.invoices
  FOR SELECT
  USING (
    collectivity_id IN (
      SELECT collectivity_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'city_admin'
    )
  );

-- RLS policy: Super-admins can view all invoices
DROP POLICY IF EXISTS "super_admins_can_view_all_invoices" ON public.invoices;
CREATE POLICY "super_admins_can_view_all_invoices" ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- RLS policy: Only Supabase service role can insert/update invoices
DROP POLICY IF EXISTS "service_role_can_manage_invoices" ON public.invoices;
CREATE POLICY "service_role_can_manage_invoices" ON public.invoices
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Update moderation_queue table to reference collectivities instead of municipalities
-- (only if the column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'moderation_queue' AND column_name = 'municipality_id') THEN
    ALTER TABLE public.moderation_queue DROP CONSTRAINT IF EXISTS moderation_queue_municipality_id_fkey;
    ALTER TABLE public.moderation_queue RENAME COLUMN municipality_id TO collectivity_id;
    ALTER TABLE public.moderation_queue ADD CONSTRAINT moderation_queue_collectivity_id_fkey
      FOREIGN KEY (collectivity_id) REFERENCES public.collectivities(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update reports table to reference collectivities instead of municipalities
-- (only if the column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'municipality_id') THEN
    ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_municipality_id_fkey;
    ALTER TABLE public.reports RENAME COLUMN municipality_id TO collectivity_id;
    ALTER TABLE public.reports ADD CONSTRAINT reports_collectivity_id_fkey
      FOREIGN KEY (collectivity_id) REFERENCES public.collectivities(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update RLS policies for reports table to use collectivity_id
DROP POLICY IF EXISTS "city_admins_can_view_own_reports" ON public.reports;
CREATE POLICY "city_admins_can_view_own_reports" ON public.reports
  FOR SELECT
  USING (
    collectivity_id IN (
      SELECT collectivity_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'city_admin'
    )
  );
