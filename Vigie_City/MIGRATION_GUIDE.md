# Supabase Migration Guide - Payment Fields & EPCI Admin RLS

## Overview
Two migrations have been created to support EPCI onboarding refactor:

1. **20260701000001_add_payment_fields.sql** - Adds payment tracking columns
2. **20260701000002_add_epci_admin_rls.sql** - Adds RLS policies for epci_admin role

## Migration Files Location
- `supabase/migrations/20260701000001_add_payment_fields.sql`
- `supabase/migrations/20260701000002_add_epci_admin_rls.sql`

## Application Methods

### Method 1: Supabase CLI (Recommended for local dev)
```bash
# Push migrations to local Supabase instance
supabase migration up

# Or if using remote:
supabase db push --remote
```

### Method 2: Supabase Dashboard SQL Editor (For production)
1. Go to: https://app.supabase.co/project/xfhkngecpbvmlstjymfy/sql/new
2. Copy content from each migration file
3. Execute each statement
4. Verify in the Schema tab

### Method 3: Direct PostgreSQL (if you have access credentials)
```bash
# Extract the Supabase database URL from the connection string
psql "postgresql://postgres:[password]@db.xfhkngecpbvmlstjymfy.supabase.co:5432/postgres" \
  -f supabase/migrations/20260701000001_add_payment_fields.sql

psql "postgresql://postgres:[password]@db.xfhkngecpbvmlstjymfy.supabase.co:5432/postgres" \
  -f supabase/migrations/20260701000002_add_epci_admin_rls.sql
```

## What Gets Added

### Migration 1: Payment Fields
**Columns added to `commune_licenses`:**
- `payment_date` (DATE) - Date when payment was received
- `payment_type` (TEXT) - 'chorus_pro' | 'transfer' | 'quote_pending'
- `payment_validated` (BOOLEAN, default: false) - Whether payment has been validated
- `payment_validated_by` (TEXT) - User ID who validated the payment

**Indices created:**
- `idx_commune_licenses_payment_date`
- `idx_commune_licenses_payment_type`
- `idx_commune_licenses_payment_validated`

### Migration 2: EPCI Admin RLS Policies
**Policies added to `commune_licenses`:**
1. `epci_admin_can_create_licenses` - CREATE permission for own EPCI's communes
2. `epci_admin_can_read_licenses` - SELECT permission for own EPCI's communes
3. `epci_admin_can_update_licenses` - UPDATE permission for own EPCI's communes
4. `epci_admin_can_delete_licenses` - DELETE permission for own EPCI's communes
5. `service_role_full_access` - Full access for backend/service role

## Verification Queries

After applying migrations, verify with these SQL queries:

### Check new columns exist
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'commune_licenses'
  AND column_name IN ('payment_date', 'payment_type', 'payment_validated', 'payment_validated_by')
ORDER BY ordinal_position;
```

### Check indices exist
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'commune_licenses'
  AND indexname LIKE 'idx_commune_licenses_payment%';
```

### Check RLS policies exist
```sql
SELECT * FROM pg_policies
WHERE tablename = 'commune_licenses'
  AND policyname LIKE 'epci_admin%';
```

### Verify RLS is enabled
```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'commune_licenses';
```

## Expected Results

After successful migration:

**Column structure:**
```
payment_date          | date
payment_type          | text
payment_validated     | boolean
payment_validated_by  | text
```

**Indices:**
```
idx_commune_licenses_payment_date
idx_commune_licenses_payment_type
idx_commune_licenses_payment_validated
```

**RLS Policies:**
```
epci_admin_can_create_licenses
epci_admin_can_read_licenses
epci_admin_can_update_licenses
epci_admin_can_delete_licenses
service_role_full_access
```

## Rollback (if needed)

If you need to undo these migrations:

```sql
-- Rollback Migration 2 (RLS policies)
DROP POLICY IF EXISTS "epci_admin_can_create_licenses" ON commune_licenses;
DROP POLICY IF EXISTS "epci_admin_can_read_licenses" ON commune_licenses;
DROP POLICY IF EXISTS "epci_admin_can_update_licenses" ON commune_licenses;
DROP POLICY IF EXISTS "epci_admin_can_delete_licenses" ON commune_licenses;
DROP POLICY IF EXISTS "service_role_full_access" ON commune_licenses;

-- Rollback Migration 1 (Payment fields)
DROP INDEX IF EXISTS idx_commune_licenses_payment_validated;
DROP INDEX IF EXISTS idx_commune_licenses_payment_type;
DROP INDEX IF EXISTS idx_commune_licenses_payment_date;

ALTER TABLE commune_licenses
DROP COLUMN IF EXISTS payment_validated_by;

ALTER TABLE commune_licenses
DROP COLUMN IF EXISTS payment_validated;

ALTER TABLE commune_licenses
DROP COLUMN IF EXISTS payment_type;

ALTER TABLE commune_licenses
DROP COLUMN IF EXISTS payment_date;
```

## Notes

- Migration 1 uses `IF NOT EXISTS` clauses for safety (idempotent)
- Migration 2 enables RLS on the table (necessary for policies to work)
- All RLS policies reference `auth.jwt() ->> 'epci_id'` which must be set in JWT tokens
- Service role always has full access (necessary for backend operations)
- No data loss: migrations are additive only

## Timeline

- Created: 2026-07-01
- Purpose: Foundation for EPCI onboarding refactor
- Blocks: None (independent)
- Depends on: commune_licenses table must exist
