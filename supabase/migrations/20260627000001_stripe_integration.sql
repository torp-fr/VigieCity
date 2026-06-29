-- Migration: Add Stripe subscription columns to municipalities table
-- Date: 2026-06-27

-- Add columns for Stripe subscription tracking
ALTER TABLE municipalities
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'freemium' CHECK (subscription_status IN ('freemium', 'active', 'pending', 'cancelled', 'past_due')),
ADD COLUMN IF NOT EXISTS subscription_stripe_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subscription_tier INTEGER DEFAULT 0 CHECK (subscription_tier >= 0 AND subscription_tier <= 5),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_billing_cycle TEXT DEFAULT 'monthly' CHECK (subscription_billing_cycle IN ('monthly', 'annual'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_municipalities_subscription_status ON municipalities(subscription_status);
CREATE INDEX IF NOT EXISTS idx_municipalities_subscription_expires_at ON municipalities(subscription_expires_at);
CREATE INDEX IF NOT EXISTS idx_municipalities_subscription_stripe_id ON municipalities(subscription_stripe_id);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id UUID NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL, -- Amount in cents (19€ = 1900)
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
CREATE INDEX IF NOT EXISTS idx_invoices_municipality_id ON invoices(municipality_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);

-- RLS for invoices table
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS policy: City admins can view their own invoices
CREATE POLICY "city_admins_can_view_own_invoices" ON invoices
  FOR SELECT
  USING (
    municipality_id IN (
      SELECT municipality_id FROM user_roles WHERE user_id = auth.uid() AND role = 'city_admin'
    )
  );

-- RLS policy: Super-admins can view all invoices
CREATE POLICY "super_admins_can_view_all_invoices" ON invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- RLS policy: Only Supabase service role can insert/update invoices
CREATE POLICY "service_role_can_manage_invoices" ON invoices
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
