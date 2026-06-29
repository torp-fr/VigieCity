# Deployment Checklist: create-commune-batch

Use this checklist to deploy and verify the function in your environment.

---

## Pre-Deployment (Dev Environment)

### Code Quality
- [ ] Function code reviewed (`index.ts`)
- [ ] No hardcoded secrets
- [ ] TypeScript compiles without errors
- [ ] All imports resolve
- [ ] No console.log left in code (use console.error/warn)
- [ ] Error messages are generic (no DB details leaked)

### Dependencies
- [ ] Supabase JS client v2.49.4+ (in index.ts)
- [ ] Deno std library 0.208.0+ (in index.ts)
- [ ] No external npm dependencies
- [ ] No version conflicts

### Database
- [ ] Migration `20260701000001_add_payment_fields.sql` applied
- [ ] Migration `20260620000007_intercommunalities_epci.sql` applied
- [ ] Migration `20260701000002_add_epci_admin_rls.sql` applied
- [ ] RLS enabled on `commune_licenses` table
- [ ] Test EPCI created in `intercommunalities` table
- [ ] Test communes linked to EPCI in `collectivities` table

**Verify migrations:**
```bash
supabase db pull
# Check migrations/ folder for the three files above
```

**Verify test data:**
```sql
-- Supabase SQL editor
SELECT id, name FROM intercommunalities LIMIT 1;
SELECT insee_code, name, epci_id FROM collectivities 
WHERE epci_id IS NOT NULL LIMIT 3;
```

### Secrets
- [ ] `SUPABASE_URL` configured (auto)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured (auto)
- [ ] `APP_URL` configured (defaults to https://vigiecity.fr)
- [ ] No secrets visible in code

**Verify:**
```bash
supabase secrets list
```

### Documentation
- [ ] `README.md` written
- [ ] `DEPLOYMENT.md` written
- [ ] `CLIENT_INTEGRATION.md` written
- [ ] `TESTING.md` written
- [ ] `types.ts` exported for client use
- [ ] All links verified

---

## Staging Deployment

### Function Deployment
- [ ] Logged into correct Supabase project
  ```bash
  supabase projects list
  # Verify project name
  ```

- [ ] Function deployed without errors
  ```bash
  supabase functions deploy create-commune-batch --no-verify-jwt
  # Check for "Function deployed successfully"
  ```

- [ ] Function logs accessible
  ```bash
  supabase functions logs create-commune-batch --tail
  # Should show real-time logs
  ```

- [ ] Function accessible via HTTPS
  ```bash
  curl -X OPTIONS https://YOUR_PROJECT.supabase.co/functions/v1/create-commune-batch \
    -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
  # Should return 200 OK
  ```

### Basic Validation Test

```bash
# Test invalid request (missing fields)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/create-commune-batch \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"epci_id": "test"}'
# Expected: 400 with error message about missing fields

# Test EPCI not found
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/create-commune-batch \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "epci_id": "00000000-0000-0000-0000-000000000000",
    "admin_email": "test@example.com",
    "admin_name": "Test",
    "admin_password": "Password123!",
    "communes": [],
    "payment_date": "2026-07-01",
    "payment_type": "chorus_pro",
    "payment_validated": false
  }'
# Expected: 500 with "EPCI ... not found"
```

### Small Batch Test

```bash
# Get EPCI ID from database
# Then run small 1-commune batch

curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/create-commune-batch \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "epci_id": "YOUR_EPCI_ID",
    "admin_email": "staging-epci@vigiecity.fr",
    "admin_name": "Staging EPCI Admin",
    "admin_password": "StagingPassword123!",
    "communes": [
      {
        "commune_name": "Staging Commune",
        "insee_code": "17001",
        "admin_email": "staging-commune@vigiecity.fr",
        "admin_name": "Staging Commune Admin"
      }
    ],
    "payment_date": "2026-07-01",
    "payment_type": "chorus_pro",
    "payment_validated": false
  }'
```

**Verify response:**
- [ ] `success: true`
- [ ] `communes_created: 1`
- [ ] `communes_failed: []`
- [ ] `epci_user_id` is present
- [ ] `details.epci_license_id` is present
- [ ] `details.commune_license_ids` has 1 entry
- [ ] `details.admin_profile_ids` has 2 entries (EPCI + 1 commune)

**Verify in database:**
```sql
-- Check auth users created
SELECT email FROM auth.users 
WHERE email LIKE 'staging-%@vigiecity.fr'
ORDER BY created_at DESC;
-- Should see 2 entries

-- Check roles created
SELECT ur.role, ur.epci_id, ur.collectivity_id 
FROM user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE au.email LIKE 'staging-%@vigiecity.fr';
-- Should see 1 epci_admin + 1 admin

-- Check licenses created
SELECT id, collectivity_id, status, payment_date 
FROM commune_licenses 
WHERE payment_date = '2026-07-01'
ORDER BY created_at DESC;
-- Should see 2 licenses (1 EPCI + 1 commune)
```

### Cleanup Test Data
```sql
-- Delete test licenses
DELETE FROM commune_licenses 
WHERE payment_date = '2026-07-01' 
  AND created_at > NOW() - INTERVAL '1 hour';

-- Delete test user roles
DELETE FROM user_roles 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email LIKE 'staging-%@vigiecity.fr'
);

-- Delete test auth users (via Supabase Dashboard)
-- Go to Authentication > Users > search for "staging-"
```

---

## Production Deployment

### Pre-Production Sign-Off
- [ ] Code reviewed by tech lead
- [ ] QA sign-off (all tests passing)
- [ ] Product lead approves
- [ ] Deployment window scheduled
- [ ] Rollback plan documented (see below)

### Production Deployment Steps

1. **Backup production database**
   ```bash
   # Supabase Dashboard → Database → Backups → Manual Backup
   # Or via CLI if available
   ```

2. **Deploy to production**
   ```bash
   # Switch to production project
   supabase projects list
   # Verify correct project is selected

   # Deploy function
   supabase functions deploy create-commune-batch --no-verify-jwt

   # Verify deployment
   supabase functions logs create-commune-batch --tail
   ```

3. **Verify production deployment**
   ```bash
   # Test basic validation (invalid request should fail)
   curl -X POST https://PROD_PROJECT.supabase.co/functions/v1/create-commune-batch \
     -H "Authorization: Bearer PROD_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"epci_id": "test"}'
   # Expected: 400 error
   ```

4. **Soft launch (internal testing)**
   - [ ] Test with real EPCI ID from production DB
   - [ ] Create small batch (1-3 communes)
   - [ ] Verify users created in auth
   - [ ] Verify roles assigned correctly
   - [ ] Verify licenses created with payment fields
   - [ ] Verify emails sent successfully

5. **Monitor for 24 hours**
   - [ ] Check function logs for errors
   - [ ] Monitor database for any anomalies
   - [ ] Alert on high error rate (>10%)
   - [ ] Alert on slow processing (>5s per commune)

6. **Announce availability**
   - [ ] Notify sales team
   - [ ] Notify support team
   - [ ] Document in internal wiki
   - [ ] Add to onboarding runbook

### Post-Deployment Monitoring

**Daily checks (first week):**
```bash
# Check logs
supabase functions logs create-commune-batch --tail

# Count batches created
supabase sql "
  SELECT DATE(created_at), COUNT(*) 
  FROM commune_licenses 
  WHERE notes LIKE '%batch%' 
  GROUP BY DATE(created_at) 
  ORDER BY DATE(created_at) DESC 
  LIMIT 7;
"

# Check for errors
supabase sql "
  SELECT * FROM error_log 
  WHERE source = 'create-commune-batch' 
  AND created_at > NOW() - INTERVAL '1 day' 
  ORDER BY created_at DESC;
"
```

**Metrics to track:**
- Batch success rate (should be >95%)
- Average processing time per commune (should be <1.5s)
- Email delivery rate (should be >99%)
- Error rate (should be <5%)

---

## Rollback Plan

### If issues occur in production:

1. **Pause new batches**
   - Alert sales team to hold EPCI onboarding
   - Direct customers to contact support

2. **Investigate**
   ```bash
   # Check recent logs
   supabase functions logs create-commune-batch --tail

   # Query error rates
   supabase sql "
     SELECT error_type, COUNT(*) 
     FROM error_log 
     WHERE source = 'create-commune-batch' 
       AND created_at > NOW() - INTERVAL '1 hour' 
     GROUP BY error_type;
   "
   ```

3. **If critical issue found:**
   - **Option A:** Disable function and revert
     ```bash
     # Deployment can be replaced with previous version from git
     git checkout HEAD~1 supabase/functions/create-commune-batch/index.ts
     supabase functions deploy create-commune-batch --no-verify-jwt
     ```

   - **Option B:** Manual cleanup if corrupted data
     ```sql
     -- If licenses created but users failed:
     DELETE FROM commune_licenses 
     WHERE payment_date = '2026-07-01' 
       AND created_at > <incident_time>;

     -- If users created but roles failed:
     DELETE FROM user_roles 
     WHERE created_at > <incident_time> 
       AND (role = 'epci_admin' OR role = 'admin');
     ```

4. **Restore from backup if needed**
   - Go to Supabase Dashboard → Database → Backups
   - Restore to pre-incident point

5. **Post-Incident Review**
   - Document what went wrong
   - Add monitoring/alerts to prevent recurrence
   - Update error handling if needed
   - Re-test and redeploy

---

## Monitoring & Alerting Setup

### Set up in Supabase Dashboard

**Alerts:**
- [ ] Function error rate > 10%
- [ ] Function response time > 5 seconds
- [ ] Database CPU > 80%
- [ ] Database connections > 80% max

**Logs to monitor:**
```bash
# Watch for errors in real-time
supabase functions logs create-commune-batch --tail

# Search for specific patterns
supabase functions logs create-commune-batch | grep "ERROR"
supabase functions logs create-commune-batch | grep "WARN"
```

### Database queries for monitoring

```sql
-- Batch volume
SELECT 
  DATE(created_at) as date,
  COUNT(*) as batches,
  SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active
FROM commune_licenses
WHERE notes LIKE '%batch%'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Error tracking
SELECT 
  DATE(created_at) as date,
  error_type,
  COUNT(*) as count
FROM error_log
WHERE source = 'create-commune-batch'
GROUP BY DATE(created_at), error_type
ORDER BY date DESC, count DESC;

-- Performance metrics
SELECT 
  DATE(created_at) as date,
  EXTRACT(EPOCH FROM (finished_at - started_at)) as duration_seconds,
  COUNT(*) as count
FROM batch_processing_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY date, duration_seconds
ORDER BY date DESC;
```

---

## Integration Verification

Once deployed, verify platforms that call this function:

- [ ] Next.js API endpoint deployed
- [ ] Frontend form component tested
- [ ] React hooks working
- [ ] Email notifications triggering
- [ ] Admin dashboard updated

### Test integration end-to-end

```bash
# From frontend (e.g., Next.js dev server)
curl -X POST http://localhost:3000/api/admin/epci/batch-create \
  -H "Content-Type: application/json" \
  -d '{ ... batch request ... }'
# Should succeed with proper response
```

---

## Sign-Off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Tech Lead | | | |
| QA Lead | | | |
| Product Lead | | | |
| DevOps/Deployment | | | |

---

## Final Verification (Day 1 Post-Deploy)

- [ ] Function responded to first batch request
- [ ] Users created successfully
- [ ] Licenses created with payment fields
- [ ] Emails delivered
- [ ] Roles assigned correctly
- [ ] No errors in logs
- [ ] Database healthy
- [ ] No alerts triggered

---

## Completion

**Date Deployed:** _______________  
**Deployed By:** _______________  
**Version:** create-commune-batch v1.0.0  
**Status:** ✅ LIVE

---

**Questions?** Contact #vigie-city-dev on Slack.
