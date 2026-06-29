# Migration Status Report

**Date:** 2026-06-29  
**Status:** CREATED (Awaiting Application)  
**Priority:** HIGH (Foundation for EPCI Onboarding Refactor)

---

## Summary

Two production-ready Supabase migrations have been created to add payment fields and EPCI admin RLS policies to the `commune_licenses` table. These are foundational changes required for the EPCI onboarding refactor.

**Migration Files:**
- `supabase/migrations/20260701000001_add_payment_fields.sql`
- `supabase/migrations/20260701000002_add_epci_admin_rls.sql`

---

## Migration 1: Add Payment Fields

**File:** `supabase/migrations/20260701000001_add_payment_fields.sql`

### Changes

**Columns Added:**
- `payment_date` (DATE) - When payment was received
- `payment_type` (TEXT) - Type of payment: 'chorus_pro', 'transfer', 'quote_pending'
- `payment_validated` (BOOLEAN, default: false) - Validation status
- `payment_validated_by` (TEXT) - User ID who validated

**Constraints:**
- `payment_type` constrained to specific values via CHECK constraint

**Indices Created:**
- `idx_commune_licenses_payment_date` - For date-based queries
- `idx_commune_licenses_payment_type` - For payment type filtering
- `idx_commune_licenses_payment_validated` - For validation status queries

### SQL Statements

```sql
ALTER TABLE commune_licenses
ADD COLUMN IF NOT EXISTS payment_date DATE;

ALTER TABLE commune_licenses
ADD COLUMN IF NOT EXISTS payment_type TEXT
CHECK (payment_type IN ('chorus_pro', 'transfer', 'quote_pending'));

ALTER TABLE commune_licenses
ADD COLUMN IF NOT EXISTS payment_validated BOOLEAN DEFAULT false;

ALTER TABLE commune_licenses
ADD COLUMN IF NOT EXISTS payment_validated_by TEXT;

CREATE INDEX IF NOT EXISTS idx_commune_licenses_payment_date ON commune_licenses(payment_date);
CREATE INDEX IF NOT EXISTS idx_commune_licenses_payment_type ON commune_licenses(payment_type);
CREATE INDEX IF NOT EXISTS idx_commune_licenses_payment_validated ON commune_licenses(payment_validated);
```

### Verification Query

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'commune_licenses'
  AND column_name IN ('payment_date', 'payment_type', 'payment_validated', 'payment_validated_by')
ORDER BY ordinal_position;
```

Expected result (4 rows):
```
payment_date        | date
payment_type        | text
payment_validated   | boolean
payment_validated_by| text
```

---

## Migration 2: Add EPCI Admin RLS Policies

**File:** `supabase/migrations/20260701000002_add_epci_admin_rls.sql`

### Overview

Enables row-level security (RLS) on `commune_licenses` with policies that restrict EPCI admins to accessing only communes within their EPCI.

### RLS Policies

**1. Enable RLS**
```sql
ALTER TABLE commune_licenses ENABLE ROW LEVEL SECURITY;
```

**2. Create Policies**

| Policy | Action | Condition |
|--------|--------|-----------|
| `epci_admin_can_create_licenses` | INSERT | User's EPCI matches commune's EPCI |
| `epci_admin_can_read_licenses` | SELECT | User's EPCI matches commune's EPCI |
| `epci_admin_can_update_licenses` | UPDATE | User's EPCI matches commune's EPCI (both CHECK and USING) |
| `epci_admin_can_delete_licenses` | DELETE | User's EPCI matches commune's EPCI |
| `service_role_full_access` | ALL | Role is 'service_role' |

### Security Model

The RLS policies use `auth.jwt() ->> 'epci_id'` to extract the user's EPCI ID from the JWT token, then verify that the commune belongs to that EPCI via:

```sql
SELECT 1 FROM collectivities c
WHERE c.id = commune_licenses.collectivity_id
  AND c.epci_id = auth.jwt() ->> 'epci_id'
```

### Verification Queries

Check if RLS is enabled:
```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'commune_licenses';
```

Expected: `relrowsecurity = true`

List all RLS policies:
```sql
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'commune_licenses'
ORDER BY policyname;
```

Expected results (5 policies):
- `epci_admin_can_create_licenses`
- `epci_admin_can_read_licenses`
- `epci_admin_can_update_licenses`
- `epci_admin_can_delete_licenses`
- `service_role_full_access`

---

## Application Steps

### Prerequisites

- Supabase project linked: `xfhkngecpbvmlstjymfy`
- Service account has sufficient permissions
- `commune_licenses` table exists
- `collectivities` table exists with `epci_id` column

### Method 1: Supabase Dashboard (Recommended)

1. Go to: https://app.supabase.co/project/xfhkngecpbvmlstjymfy/sql/new
2. Open `supabase/migrations/20260701000001_add_payment_fields.sql`
3. Copy all SQL content
4. Paste into SQL Editor
5. Click "RUN"
6. Wait for success notification
7. Repeat steps 2-6 for `20260701000002_add_epci_admin_rls.sql`

### Method 2: Supabase CLI

```bash
# Link project (if not already linked)
supabase link --project-ref xfhkngecpbvmlstjymfy

# Push migrations
supabase db push --remote

# Verify
node verify-migrations.mjs
```

### Method 3: Direct PostgreSQL

Requires connection string: `postgresql://postgres:[password]@db.xfhkngecpbvmlstjymfy.supabase.co/postgres`

```bash
psql "postgresql://postgres:[password]@db.xfhkngecpbvmlstjymfy.supabase.co/postgres" \
  -f supabase/migrations/20260701000001_add_payment_fields.sql

psql "postgresql://postgres:[password]@db.xfhkngecpbvmlstjymfy.supabase.co/postgres" \
  -f supabase/migrations/20260701000002_add_epci_admin_rls.sql
```

---

## Verification

After applying both migrations:

```bash
# Run verification script
node verify-migrations.mjs

# Expected output:
# ✓ Migration 1: ADD PAYMENT FIELDS - OK
# ✓ Migration 2: ADD EPCI ADMIN RLS - OK
```

Or manually verify with SQL queries in the Supabase Dashboard:

```sql
-- Check columns
SELECT * FROM commune_licenses LIMIT 1;

-- Check indices
SELECT indexname FROM pg_indexes
WHERE tablename = 'commune_licenses'
  AND indexname LIKE 'idx_commune_licenses_payment%';

-- Check RLS policies
SELECT policyname FROM pg_policies
WHERE tablename = 'commune_licenses';
```

---

## Schema Changes

### Before Migration

```
commune_licenses
├── id (uuid)
├── collectivity_id (uuid, FK)
├── plan_id (uuid, FK)
├── plan (text)
├── status (text)
├── expires_at (timestamp)
├── started_at (timestamp)
├── auto_renew (boolean)
├── contact_name (text)
├── contact_phone (text)
├── billing_email (text)
├── max_users (int)
├── notes (text)
├── features (jsonb)
├── stripe_customer_id (text) [DEPRECATED]
├── created_at (timestamp)
└── updated_at (timestamp)
```

### After Migration

```
commune_licenses
├── [all previous columns]
├── payment_date (DATE) [NEW]
├── payment_type (TEXT) [NEW]
├── payment_validated (BOOLEAN) [NEW]
└── payment_validated_by (TEXT) [NEW]
```

### RLS Status

**Before:** RLS disabled (no row filtering)  
**After:** RLS enabled with 5 policies

---

## TypeScript Types Update

After migrations are applied, regenerate types:

```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

Expected new properties in `commune_licenses.Row`:
```typescript
export interface CommuneLicensesRow {
  // ... existing fields ...
  payment_date?: string | null;      // DATE
  payment_type?: 'chorus_pro' | 'transfer' | 'quote_pending' | null;
  payment_validated?: boolean | null; // DEFAULT false
  payment_validated_by?: string | null;
}
```

---

## Rollback Plan

If rollback is needed:

```sql
-- Drop RLS policies
DROP POLICY "epci_admin_can_create_licenses" ON commune_licenses;
DROP POLICY "epci_admin_can_read_licenses" ON commune_licenses;
DROP POLICY "epci_admin_can_update_licenses" ON commune_licenses;
DROP POLICY "epci_admin_can_delete_licenses" ON commune_licenses;
DROP POLICY "service_role_full_access" ON commune_licenses;

-- Disable RLS
ALTER TABLE commune_licenses DISABLE ROW LEVEL SECURITY;

-- Drop indices
DROP INDEX IF EXISTS idx_commune_licenses_payment_validated;
DROP INDEX IF EXISTS idx_commune_licenses_payment_type;
DROP INDEX IF EXISTS idx_commune_licenses_payment_date;

-- Drop columns
ALTER TABLE commune_licenses
DROP COLUMN IF EXISTS payment_validated_by;
DROP COLUMN IF EXISTS payment_validated;
DROP COLUMN IF EXISTS payment_type;
DROP COLUMN IF EXISTS payment_date;
```

---

## Dependencies

- ✓ Blocks: EPCI Onboarding Refactor (blocked until applied)
- ✗ Depends on: commune_licenses table (must exist)
- ✗ Depends on: collectivities table with epci_id column (must exist)

---

## Notes

- Both migrations use `IF NOT EXISTS` for safety (idempotent)
- No data will be lost or modified
- New columns default to NULL or FALSE (existing rows unaffected)
- RLS policies only affect authenticated users with specific roles
- Service role (`auth.jwt() ->> 'role' = 'service_role'`) always has full access

---

## Related Documentation

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Step-by-step application guide
- [Session 48 — Clients Payants Tab Refactor](./project_vigie_session48_clients_tab_refactor.md) - Context
- Supabase Dashboard: https://app.supabase.co/project/xfhkngecpbvmlstjymfy

---

**Last Updated:** 2026-06-29  
**Ready for Review:** YES  
**Ready for Application:** YES
