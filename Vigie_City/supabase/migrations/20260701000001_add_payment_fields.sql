-- Migration: Add payment fields to commune_licenses
-- Purpose: Add payment tracking columns for EPCI onboarding refactor (Chorus Pro integration)
-- Date: 2026-07-01

ALTER TABLE commune_licenses
ADD COLUMN IF NOT EXISTS payment_date DATE;

ALTER TABLE commune_licenses
ADD COLUMN IF NOT EXISTS payment_type TEXT
CHECK (payment_type IN ('chorus_pro', 'transfer', 'quote_pending'));

ALTER TABLE commune_licenses
ADD COLUMN IF NOT EXISTS payment_validated BOOLEAN DEFAULT false;

ALTER TABLE commune_licenses
ADD COLUMN IF NOT EXISTS payment_validated_by TEXT;

-- Indices for payment tracking queries
CREATE INDEX IF NOT EXISTS idx_commune_licenses_payment_date ON commune_licenses(payment_date);
CREATE INDEX IF NOT EXISTS idx_commune_licenses_payment_type ON commune_licenses(payment_type);
CREATE INDEX IF NOT EXISTS idx_commune_licenses_payment_validated ON commune_licenses(payment_validated);
