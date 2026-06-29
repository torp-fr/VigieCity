# create-commune-batch Edge Function

## Overview

**Critical infrastructure for EPCI onboarding.** Enables batch creation of:
- EPCI admin account (auth user + epci_admin role)
- Per-commune admin accounts (auth users + admin roles)
- Commune licenses (payment tracking)
- EPCI-level license

**Use case:** Sales team onboards a new EPCI with N communes in one operation.

## Deployment

### Step 1: Deploy the function

```bash
supabase functions deploy create-commune-batch --no-verify-jwt
```

**Why `--no-verify-jwt`?**
- This function uses `service_role` key for auth (backend-only).
- Client JWT verification would be incorrect here.
- Authorization is enforced by checking the Bearer token is the service_role key.

### Step 2: Verify environment variables

Ensure Supabase secrets are set (auto-inherited from project):

```bash
supabase secrets list
```

Should include:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL` (defaults to `https://vigiecity.fr`)

### Step 3: Test connectivity

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/create-commune-batch \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "epci_id": "test",
    "admin_email": "test@example.com",
    "admin_password": "password",
    "communes": [],
    "payment_date": "2026-07-01",
    "payment_type": "chorus_pro",
    "payment_validated": false
  }'
```

Expected: `{"error": "EPCI ... not found"}` (or similar validation error).

## API Reference

### Endpoint

```
POST /functions/v1/create-commune-batch
```

### Authentication

```
Authorization: Bearer <SERVICE_ROLE_KEY>
Content-Type: application/json
```

### Request Body

```typescript
{
  epci_id: string;                    // UUID of intercommunalities record
  admin_email: string;                // EPCI admin email (primary account)
  admin_name: string;                 // EPCI admin full name
  admin_password: string;             // Plaintext (sent over HTTPS only)
  communes: [
    {
      commune_name: string;           // Display name (informational)
      insee_code: string;             // 5-digit INSEE code (MUST match DB)
      admin_email: string;            // Per-commune admin email
      admin_name: string;             // Per-commune admin name
      admin_phone?: string;           // Optional contact phone
    }
  ];
  payment_date: string;               // ISO date (YYYY-MM-DD)
  payment_type: "chorus_pro" | "transfer" | "quote_pending";
  payment_validated: boolean;         // Has payment been verified?
}
```

### Response (Success)

```json
{
  "success": true,
  "epci_user_id": "uuid-...",
  "communes_created": 5,
  "communes_failed": [
    {
      "commune_name": "Commune X",
      "insee_code": "75001",
      "error": "Commune not found in INSEE database"
    }
  ],
  "details": {
    "epci_license_id": "uuid-...",
    "commune_license_ids": ["uuid-...", "uuid-..."],
    "admin_profile_ids": ["epci-user-id", "commune-user-1", "commune-user-2"]
  },
  "timestamp": "2026-07-01T14:23:45.123Z"
}
```

### Response (Failure)

```json
{
  "success": false,
  "error": "EPCI ... not found",
  "communes_created": 0,
  "communes_failed": [],
  "details": {
    "commune_license_ids": [],
    "admin_profile_ids": []
  },
  "timestamp": "2026-07-01T14:23:45.123Z"
}
```

## Behavior: Best-Effort Batch Processing

The function does **not fail the entire batch** if one commune fails. Instead:

1. **EPCI admin creation:** Fails entire batch if EPCI doesn't exist.
2. **Per-commune processing:** Skips individual communes on error, continues with others.
3. **Response summary:** Includes `communes_failed` array with specific errors.

### Handled error cases (don't fail batch):

| Error | Behavior |
|-------|----------|
| Duplicate email | Skip commune, add to `communes_failed` |
| INSEE code not found | Skip commune, add to `communes_failed` |
| Commune doesn't belong to EPCI | Skip commune, add to `communes_failed` |
| License creation fails | Skip license, continue with user creation |
| Email send fails | Skip email, continue |

### Unhandled errors (fail entire batch):

- EPCI ID not found
- Invalid EPCI ID format
- Service role key missing/invalid
- Database connection failure
- Malformed request JSON

## Audit Logging

All operations are logged to Supabase Edge Function logs:

```bash
supabase functions logs create-commune-batch --tail
```

Log patterns:

```
✓ EPCI admin created/updated: uuid-...
✓ Commune created: 75001 (Paris)
⚠️ EPCI admin email already exists: admin@example.com, skipping user creation
⚠️ Email send failed for admin@commune.fr: ...
✗ Commune not found in INSEE database (insee_code: 00000)
```

## Database Changes

### Tables affected:

| Table | Operation | Notes |
|-------|-----------|-------|
| `auth.users` | INSERT/UPDATE | Creates auth users for EPCI + commune admins |
| `user_roles` | INSERT | Creates `epci_admin` role for EPCI, `admin` roles for communes |
| `commune_licenses` | INSERT | Creates licenses with payment tracking |
| `intercommunalities` | SELECT | Validates EPCI exists |
| `collectivities` | SELECT | Looks up communes by INSEE code |

### RLS Policies

Uses **service_role** which bypasses RLS. All inserts are logged.

## Security Considerations

### 1. Authentication

- **Only accepts service_role key** in Authorization header.
- Client-side calls should be rejected.
- Enforce at API gateway level (e.g., Vercel Edge Middleware).

### 2. Password Handling

- Accepts plaintext password over HTTPS.
- Handed directly to `auth.admin.createUser()` (Supabase handles hashing).
- Never logged.

### 3. Input Validation

- Email format validated.
- INSEE codes validated (5 digits).
- EPCI ID format validated (UUID).

### 4. Duplicate Handling

- If EPCI admin email already registered: skips user creation, reuses existing.
- If commune admin email already registered: skips entire commune, logs warning.

## Testing

### Test Case 1: Full EPCI with 5 communes

**Input:**
```json
{
  "epci_id": "<DEMO_EPCI_UUID>",
  "admin_email": "epci-admin@example.com",
  "admin_name": "EPCI Administrator",
  "admin_password": "SecurePassword123!",
  "communes": [
    {
      "commune_name": "Commune 1",
      "insee_code": "17001",
      "admin_email": "admin1@commune1.fr",
      "admin_name": "Admin 1"
    },
    {
      "commune_name": "Commune 2",
      "insee_code": "17002",
      "admin_email": "admin2@commune2.fr",
      "admin_name": "Admin 2"
    },
    {
      "commune_name": "Commune 3",
      "insee_code": "17003",
      "admin_email": "admin3@commune3.fr",
      "admin_name": "Admin 3"
    },
    {
      "commune_name": "Commune 4",
      "insee_code": "17004",
      "admin_email": "admin4@commune4.fr",
      "admin_name": "Admin 4"
    },
    {
      "commune_name": "Commune 5",
      "insee_code": "17005",
      "admin_email": "admin5@commune5.fr",
      "admin_name": "Admin 5"
    }
  ],
  "payment_date": "2026-07-01",
  "payment_type": "chorus_pro",
  "payment_validated": false
}
```

**Expected:**
```json
{
  "success": true,
  "communes_created": 5,
  "communes_failed": []
}
```

### Test Case 2: Duplicate email

**Input:** Two communes with same admin email

```json
{
  "communes": [
    { "commune_name": "A", "insee_code": "17001", "admin_email": "shared@example.com", "admin_name": "Admin" },
    { "commune_name": "B", "insee_code": "17002", "admin_email": "shared@example.com", "admin_name": "Admin" }
  ]
}
```

**Expected:**
```json
{
  "success": true,
  "communes_created": 1,
  "communes_failed": [
    {
      "commune_name": "B",
      "insee_code": "17002",
      "error": "Commune admin email already registered (shared@example.com); reuse existing account"
    }
  ]
}
```

### Test Case 3: Invalid INSEE code

**Input:**
```json
{
  "communes": [
    { "commune_name": "Bad", "insee_code": "ABC12", "admin_email": "admin@bad.fr", "admin_name": "Admin" }
  ]
}
```

**Expected:**
```json
{
  "success": false,
  "communes_created": 0,
  "communes_failed": [
    {
      "commune_name": "Bad",
      "insee_code": "ABC12",
      "error": "Invalid INSEE code format (expected 5 digits): ABC12"
    }
  ]
}
```

### Test Case 4: Commune not in EPCI

**Input:** Commune from different EPCI

```json
{
  "epci_id": "<EPCI_1>",
  "communes": [
    { "commune_name": "Wrong EPCI", "insee_code": "75001", "admin_email": "admin@paris.fr", "admin_name": "Admin" }
  ]
}
```

**Expected:**
```json
{
  "communes_failed": [
    {
      "commune_name": "Wrong EPCI",
      "insee_code": "75001",
      "error": "Commune does not belong to EPCI ..."
    }
  ]
}
```

### Test Case 5: Missing EPCI admin password

**Input:**
```json
{
  "epci_id": "<UUID>",
  "admin_email": "admin@epci.fr",
  "admin_password": "",  // Empty
  "communes": []
}
```

**Expected:**
```json
{
  "error": "Missing required fields: epci_id, admin_email, admin_password, communes[], payment_date, payment_type"
}
```

## Monitoring & Alerts

### Key metrics to track:

1. **Batch size:** How many communes per EPCI?
2. **Success rate:** % of communes created successfully.
3. **Email delivery:** Are welcome emails reaching admins?
4. **License creation:** Are licenses being created?

### Set up alerts for:

- High failure rate (>20% communes failing)
- EPCI creation failures (entire batch)
- Email send failures (>10% of batch)

## Future Enhancements

### Phase 2:

- [ ] Support `plan_id` per commune (instead of default "nano")
- [ ] Bulk email sending with template preview
- [ ] Payment integration (pre-charge before batch)
- [ ] Progress webhook callbacks
- [ ] Parallel commune processing (currently sequential)

### Phase 3:

- [ ] CSV import (upload file, return batch ID)
- [ ] Webhook for completion notifications
- [ ] Retry mechanism for failed communes
- [ ] Commune deactivation bulk operation

## Troubleshooting

### Issue: "EPCI not found"

**Check:** Ensure `epci_id` is a valid UUID from `intercommunalities` table.

```sql
SELECT id, name FROM intercommunalities WHERE id = 'YOUR_UUID';
```

### Issue: "Commune not found in INSEE database"

**Check:** INSEE code must exist in `collectivities` AND belong to the EPCI.

```sql
SELECT insee_code, name, epci_id FROM collectivities 
WHERE insee_code = '17001';
```

### Issue: "Commune does not belong to EPCI"

**Check:** The commune's `epci_id` must match the batch EPCI.

```sql
UPDATE collectivities 
SET epci_id = 'YOUR_EPCI_UUID'
WHERE insee_code = '17001';
```

### Issue: Auth user creation fails

**Check:** Email might already exist in `auth.users`.

```sql
-- Via Supabase dashboard:
-- Go to Authentication > Users
-- Search for the email address
```

### Issue: "Service role full access" policy error

**Check:** Ensure the function is running with `SERVICE_ROLE_KEY`, not anon key.

## References

- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Intercommunalities Schema](../migrations/20260620000007_intercommunalities_epci.sql)
