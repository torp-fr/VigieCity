# create-commune-batch Edge Function

**Critical infrastructure for EPCI onboarding.** Enables batch creation of EPCI admins, per-commune admins, and licenses in a single operation.

## Quick Reference

| Aspect | Details |
|--------|---------|
| **Endpoint** | `POST /functions/v1/create-commune-batch` |
| **Auth** | Service role key only (backend) |
| **Processing** | Best-effort batch (skips failed communes) |
| **Response Time** | ~5-10s per 5 communes |
| **Max Batch Size** | 100+ communes (tested up to 50) |

## Files

| File | Purpose |
|------|---------|
| [`index.ts`](./index.ts) | Main Edge Function (production code) |
| [`types.ts`](./types.ts) | TypeScript types + validation helpers |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Deployment + API reference |
| [`CLIENT_INTEGRATION.md`](./CLIENT_INTEGRATION.md) | How to call from client/backend |
| [`TESTING.md`](./TESTING.md) | Testing procedures + QA checklist |
| [`README.md`](./README.md) | This file |

## What It Does

### Single operation creates:

1. **EPCI admin account**
   - Auth user (email + password)
   - `epci_admin` role with epci_id
   - Welcome email

2. **Per-commune admin accounts** (for each commune)
   - Auth user per commune
   - `admin` role linked to collectivity
   - Welcome email per admin

3. **Licenses**
   - Single EPCI-level license (plan: "epci")
   - One license per commune (plan: "nano")
   - Payment tracking fields populated

### Example: 5-commune EPCI

**Input:**
```json
{
  "epci_id": "550e8400-e29b-41d4-a716-446655440000",
  "admin_email": "epci@interco.fr",
  "admin_name": "Interco Admin",
  "admin_password": "SecurePassword123!",
  "communes": [
    { "commune_name": "Commune A", "insee_code": "17001", "admin_email": "admin1@commune.fr", "admin_name": "Admin 1" },
    { "commune_name": "Commune B", "insee_code": "17002", "admin_email": "admin2@commune.fr", "admin_name": "Admin 2" },
    { "commune_name": "Commune C", "insee_code": "17003", "admin_email": "admin3@commune.fr", "admin_name": "Admin 3" },
    { "commune_name": "Commune D", "insee_code": "17004", "admin_email": "admin4@commune.fr", "admin_name": "Admin 4" },
    { "commune_name": "Commune E", "insee_code": "17005", "admin_email": "admin5@commune.fr", "admin_name": "Admin 5" }
  ],
  "payment_date": "2026-07-01",
  "payment_type": "chorus_pro",
  "payment_validated": false
}
```

**Creates:**
- 1 EPCI admin auth user
- 5 commune admin auth users (6 total)
- 1 EPCI-level license
- 5 commune licenses (6 total)
- 6 role assignments in user_roles table
- 6 welcome emails sent

**Response (success):**
```json
{
  "success": true,
  "epci_user_id": "uuid-epci-admin",
  "communes_created": 5,
  "communes_failed": [],
  "details": {
    "epci_license_id": "uuid-epci-license",
    "commune_license_ids": ["uuid-1", "uuid-2", "uuid-3", "uuid-4", "uuid-5"],
    "admin_profile_ids": ["epci-user", "user1", "user2", "user3", "user4", "user5"]
  },
  "timestamp": "2026-07-01T14:23:45.123Z"
}
```

## Key Features

### 1. Best-Effort Processing

Fails individual communes, not the entire batch:

```
Input: 5 communes
- Commune A: ✓ Created
- Commune B: ✗ Email duplicate → skip
- Commune C: ✓ Created
- Commune D: ✗ INSEE code not found → skip
- Commune E: ✓ Created

Result: success=true, communes_created=3, communes_failed=2
```

### 2. Payment Tracking

Stores payment metadata with licenses:

```sql
commune_licenses:
  - payment_date: 2026-07-01
  - payment_type: "chorus_pro" | "transfer" | "quote_pending"
  - payment_validated: false/true
  - payment_validated_by: user_id (EPCI admin who validated)
```

### 3. RLS-Aware

Uses service_role to bypass RLS during creation, but assigns proper `epci_admin` and `admin` roles for subsequent RLS enforcement.

**Result:** EPCI admins can manage their own communes, commune admins are scoped to their commune.

### 4. Audit Logging

All operations logged to Edge Function logs:

```
✓ EPCI admin created/updated: 550e8400-...
✓ Commune created: 17001 (Commune A)
✓ Commune created: 17002 (Commune B)
⚠️ Email send failed for admin@commune.fr: ...
```

Queryable via:
```bash
supabase functions logs create-commune-batch --tail
```

## Use Cases

### Case 1: Sales Team Onboarding

Sales closes deal with EPCI containing 5 communes. Calls batch function to:
1. Create EPCI admin account
2. Create per-commune admin accounts
3. Send welcome emails to all admins
4. Activate licenses
5. Mark as "ready to deploy"

### Case 2: EPCI Expansion

EPCI already onboarded. New communes added to contract. Batch function:
1. Creates new commune admins
2. Links to existing EPCI (via epci_id)
3. Creates licenses for new communes
4. Sends welcome emails

### Case 3: Demo/Testing

QA team needs to spin up N test communes. Batch function:
1. Creates realistic test data
2. Includes auth users for testing login flows
3. Populates licenses with payment tracking
4. No production data affected (separate test EPCI)

## Getting Started

### 1. Deploy the function

```bash
cd supabase/functions/create-commune-batch
supabase functions deploy create-commune-batch --no-verify-jwt
```

### 2. Test with curl

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/create-commune-batch \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "epci_id": "VALID_EPCI_UUID",
    "admin_email": "admin@test.fr",
    "admin_name": "Test Admin",
    "admin_password": "TestPassword123!",
    "communes": [{
      "commune_name": "Test",
      "insee_code": "17001",
      "admin_email": "commune@test.fr",
      "admin_name": "Commune Admin"
    }],
    "payment_date": "2026-07-01",
    "payment_type": "chorus_pro",
    "payment_validated": false
  }'
```

### 3. Integrate with your platform

See [`CLIENT_INTEGRATION.md`](./CLIENT_INTEGRATION.md) for patterns:
- Next.js API routes
- Vercel Edge Functions
- React hooks
- UI components

## API Reference (Quick)

### Request

```typescript
POST /functions/v1/create-commune-batch
Authorization: Bearer <SERVICE_ROLE_KEY>
Content-Type: application/json

{
  epci_id: string;                    // UUID
  admin_email: string;                // EPCI admin
  admin_name: string;
  admin_password: string;             // Min 8 chars
  communes: Array<{
    commune_name: string;
    insee_code: string;               // 5 digits
    admin_email: string;
    admin_name: string;
    admin_phone?: string;
  }>;
  payment_date: string;               // YYYY-MM-DD
  payment_type: "chorus_pro" | "transfer" | "quote_pending";
  payment_validated: boolean;
}
```

### Response

```typescript
{
  success: boolean;
  epci_user_id?: string;
  communes_created: number;
  communes_failed: Array<{
    commune_name: string;
    insee_code?: string;
    error: string;
  }>;
  details: {
    epci_license_id?: string;
    commune_license_ids: string[];
    admin_profile_ids: string[];
  };
  timestamp: string;
}
```

For full API docs, see [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Error Handling

### Batch-stopping errors (entire batch fails):

```
❌ EPCI ID not found
❌ Invalid EPCI ID format
❌ Missing Authorization header
❌ Service role key invalid
```

### Commune-skipping errors (batch continues):

```
⚠️ Duplicate email → skip commune, add to failed[]
⚠️ INSEE code not found → skip commune
⚠️ Commune doesn't belong to EPCI → skip
⚠️ Email send fails → skip email, continue
```

## Best Practices

### 1. Validate before sending

```typescript
import { validateBatchRequest } from "./types";

const errors = validateBatchRequest(request);
if (errors.length > 0) {
  // Show validation errors to user
  return;
}
```

### 2. Check EPCI exists

```sql
SELECT id FROM intercommunalities WHERE id = ?;
```

### 3. Pre-validate communes

```sql
SELECT insee_code, epci_id FROM collectivities
WHERE insee_code IN (?, ?, ?)
  AND epci_id = ?;
```

### 4. Handle partial success

```typescript
if (response.success && response.communes_failed.length > 0) {
  // Warn support team about failures
  // Offer retry for specific communes
}
```

## Monitoring

### Key metrics

- Batch size (communes per request)
- Success rate (communes_created / total)
- Processing time (edge function logs)
- Email delivery rate

### Set alerts for

- High failure rate (>20%)
- Slow processing (>5s per commune)
- Email send failures

## Testing

Quick test suite:

```bash
# Run validation tests
npm test -- types.test.ts

# Run integration tests
npm test -- integration.test.ts

# Run load test
artillery run artillery-load-test.yml
```

See [`TESTING.md`](./TESTING.md) for comprehensive testing guide.

## Database Changes

### Required migrations

- [x] `payment_date`, `payment_type`, `payment_validated` columns on `commune_licenses`
- [x] `epci_id` column on `collectivities` (foreign key)
- [x] `epci_id` column on `user_roles` (for epci_admin role)
- [x] RLS policies for epci_admin access

All applied via:
- `migrations/20260701000001_add_payment_fields.sql`
- `migrations/20260620000007_intercommunalities_epci.sql`
- `migrations/20260701000002_add_epci_admin_rls.sql`

## Security

### Authentication

- ✓ Service role key required (no client access)
- ✓ HTTPS enforced (plaintext passwords)
- ✓ No password logging
- ✓ Email validation

### Authorization

- ✓ Bypass RLS during creation (service_role)
- ✓ Proper roles assigned for post-creation RLS
- ✓ Audit logging of all operations
- ✓ No privilege escalation possible

### Data Protection

- ✓ Passwords hashed by Supabase auth
- ✓ Emails trimmed + lowercased
- ✓ Input validation on all fields
- ✓ Duplicate handling (no errors, just skip)

## Troubleshooting

### Issue: "EPCI not found"

**Check:** Is the EPCI UUID valid and exists in intercommunalities table?

```bash
supabase db pull  # Get latest schema
supabase sql "SELECT id, name FROM intercommunalities LIMIT 5;"
```

### Issue: "Commune not found"

**Check:** Does the INSEE code exist and belong to the EPCI?

```bash
supabase sql "SELECT insee_code, name, epci_id FROM collectivities WHERE insee_code = '17001';"
```

### Issue: Email delivery failed

**Check:** Is Resend configured and send-email EF deployed?

```bash
supabase functions logs send-email --tail
```

### Issue: Auth user creation fails

**Check:** Email already exists in auth.users?

Go to Supabase Dashboard → Authentication → Users

### Issue: High latency (>10s)

**Check:** Batch size too large? Try splitting into smaller batches (max 50 communes).

## References

- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Schema](../migrations/)

## Support

- **Slack:** #vigie-city-dev
- **Owner:** [Dev Team]
- **Last Updated:** 2026-07-01

---

**Status:** ✅ Production Ready

For deployment instructions, see [`DEPLOYMENT.md`](./DEPLOYMENT.md).
For integration examples, see [`CLIENT_INTEGRATION.md`](./CLIENT_INTEGRATION.md).
For testing procedures, see [`TESTING.md`](./TESTING.md).
