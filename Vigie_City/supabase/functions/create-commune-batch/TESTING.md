# create-commune-batch Testing & QA Guide

Comprehensive testing procedures for the batch creation Edge Function.

## Pre-deployment checklist

- [ ] Function compiles without errors
- [ ] All imports resolve correctly
- [ ] Database migrations applied (payment fields, RLS policies)
- [ ] Service role key accessible in Supabase secrets
- [ ] EPCI demo record created in intercommunalities table
- [ ] Communes linked to EPCI in collectivities table

## Unit Tests

### Test Suite: Validation

```typescript
import { validateBatchRequest } from "../types";

describe("validateBatchRequest", () => {
  it("should accept valid request", () => {
    const req = {
      epci_id: "550e8400-e29b-41d4-a716-446655440000",
      admin_email: "admin@example.com",
      admin_name: "Admin",
      admin_password: "SecurePassword123!",
      communes: [
        {
          commune_name: "Test",
          insee_code: "75001",
          admin_email: "commune@example.com",
          admin_name: "Commune Admin",
        },
      ],
      payment_date: "2026-07-01",
      payment_type: "chorus_pro",
      payment_validated: false,
    };

    const errors = validateBatchRequest(req);
    expect(errors).toHaveLength(0);
  });

  it("should reject invalid EPCI ID", () => {
    const req = { ...validRequest, epci_id: "not-uuid" };
    const errors = validateBatchRequest(req);
    expect(errors).toContain("epci_id must be a valid UUID");
  });

  it("should reject invalid email", () => {
    const req = { ...validRequest, admin_email: "not-an-email" };
    const errors = validateBatchRequest(req);
    expect(errors).toContain("admin_email is not a valid email");
  });

  it("should reject short password", () => {
    const req = { ...validRequest, admin_password: "short" };
    const errors = validateBatchRequest(req);
    expect(errors).toContain("admin_password must be at least 8 characters");
  });

  it("should reject invalid INSEE code", () => {
    const req = {
      ...validRequest,
      communes: [
        { ...validRequest.communes[0], insee_code: "ABC12" },
      ],
    };
    const errors = validateBatchRequest(req);
    expect(errors).toContain("communes[1].insee_code must be 5 digits");
  });

  it("should reject empty communes array", () => {
    const req = { ...validRequest, communes: [] };
    const errors = validateBatchRequest(req);
    expect(errors).toContain("communes array cannot be empty");
  });

  it("should reject invalid payment type", () => {
    const req = { ...validRequest, payment_type: "invalid" };
    const errors = validateBatchRequest(req);
    expect(errors).toContain(
      'payment_type must be "chorus_pro", "transfer", or "quote_pending"'
    );
  });
});
```

## Integration Tests

### Test 1: Full EPCI onboarding (happy path)

**Setup:**
```sql
-- Ensure demo EPCI exists
INSERT INTO intercommunalities (name, siren, max_communes, contact_email)
VALUES ('Test EPCI', '200000001', 10, 'epci@test.fr')
ON CONFLICT (siren) DO NOTHING;

-- Ensure communes exist and link to EPCI
UPDATE collectivities 
SET epci_id = (SELECT id FROM intercommunalities WHERE siren = '200000001')
WHERE insee_code IN ('17001', '17002', '17003');
```

**Test Code:**
```typescript
import { callBatchCreate } from "../types";

test("should create full EPCI batch successfully", async () => {
  const epciId = "550e8400-e29b-41d4-a716-446655440000"; // Get from DB

  const response = await callBatchCreate(
    {
      epci_id: epciId,
      admin_email: "batch-test@vigiecity.fr",
      admin_name: "Batch Test Admin",
      admin_password: "TestPassword123!",
      communes: [
        {
          commune_name: "Commune 1",
          insee_code: "17001",
          admin_email: "commune1@test.fr",
          admin_name: "Admin 1",
        },
        {
          commune_name: "Commune 2",
          insee_code: "17002",
          admin_email: "commune2@test.fr",
          admin_name: "Admin 2",
        },
        {
          commune_name: "Commune 3",
          insee_code: "17003",
          admin_email: "commune3@test.fr",
          admin_name: "Admin 3",
        },
      ],
      payment_date: "2026-07-01",
      payment_type: "chorus_pro",
      payment_validated: false,
    },
    {
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      supabaseUrl: process.env.SUPABASE_URL!,
    }
  );

  expect(response.success).toBe(true);
  expect(response.communes_created).toBe(3);
  expect(response.communes_failed).toHaveLength(0);
  expect(response.epci_user_id).toBeDefined();
  expect(response.details.epci_license_id).toBeDefined();
  expect(response.details.commune_license_ids).toHaveLength(3);
  expect(response.details.admin_profile_ids).toHaveLength(4); // 1 EPCI + 3 communes
});
```

**Verification:**
```sql
-- Verify EPCI admin created
SELECT * FROM auth.users WHERE email = 'batch-test@vigiecity.fr';

-- Verify EPCI admin has epci_admin role
SELECT * FROM user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'batch-test@vigiecity.fr')
  AND role = 'epci_admin';

-- Verify commune admins created
SELECT * FROM auth.users WHERE email LIKE 'commune%@test.fr';

-- Verify commune admins have admin roles
SELECT ur.* FROM user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE au.email LIKE 'commune%@test.fr'
  AND ur.role = 'admin';

-- Verify licenses created
SELECT * FROM commune_licenses 
WHERE payment_date = '2026-07-01'
ORDER BY created_at DESC;
```

### Test 2: Duplicate email handling

**Test Code:**
```typescript
test("should skip duplicate emails gracefully", async () => {
  const response = await callBatchCreate(
    {
      epci_id: epciId,
      admin_email: "shared@test.fr",
      admin_name: "Shared Admin",
      admin_password: "TestPassword123!",
      communes: [
        {
          commune_name: "Commune A",
          insee_code: "17001",
          admin_email: "shared@test.fr", // Same email
          admin_name: "Admin A",
        },
        {
          commune_name: "Commune B",
          insee_code: "17002",
          admin_email: "shared@test.fr", // Same email again
          admin_name: "Admin B",
        },
      ],
      payment_date: "2026-07-01",
      payment_type: "transfer",
      payment_validated: false,
    },
    options
  );

  expect(response.success).toBe(true);
  expect(response.communes_created).toBe(1); // Only first succeeds
  expect(response.communes_failed).toHaveLength(1);
  expect(response.communes_failed[0].error).toContain("already registered");
});
```

### Test 3: Invalid INSEE code

**Test Code:**
```typescript
test("should reject invalid INSEE codes", async () => {
  const response = await callBatchCreate(
    {
      epci_id: epciId,
      admin_email: "test@vigiecity.fr",
      admin_name: "Test",
      admin_password: "TestPassword123!",
      communes: [
        {
          commune_name: "Bad Commune",
          insee_code: "ABC12", // Invalid: not 5 digits
          admin_email: "admin@bad.fr",
          admin_name: "Admin",
        },
      ],
      payment_date: "2026-07-01",
      payment_type: "chorus_pro",
      payment_validated: false,
    },
    options
  );

  expect(response.success).toBe(false);
  expect(response.communes_created).toBe(0);
  expect(response.communes_failed[0].error).toContain("Invalid INSEE code format");
});
```

### Test 4: Commune not in EPCI

**Test Code:**
```typescript
test("should reject communes from different EPCI", async () => {
  // Create second EPCI
  const otherEpciId = "650e8400-e29b-41d4-a716-446655440000";

  const response = await callBatchCreate(
    {
      epci_id: epciId, // Our EPCI
      admin_email: "test@vigiecity.fr",
      admin_name: "Test",
      admin_password: "TestPassword123!",
      communes: [
        {
          commune_name: "Other EPCI Commune",
          insee_code: "75001", // Belongs to different EPCI
          admin_email: "admin@other.fr",
          admin_name: "Admin",
        },
      ],
      payment_date: "2026-07-01",
      payment_type: "chorus_pro",
      payment_validated: false,
    },
    options
  );

  expect(response.success).toBe(false);
  expect(response.communes_failed[0].error).toContain("does not belong to EPCI");
});
```

### Test 5: Non-existent commune

**Test Code:**
```typescript
test("should handle non-existent communes", async () => {
  const response = await callBatchCreate(
    {
      epci_id: epciId,
      admin_email: "test@vigiecity.fr",
      admin_name: "Test",
      admin_password: "TestPassword123!",
      communes: [
        {
          commune_name: "Ghost Town",
          insee_code: "99999", // Doesn't exist
          admin_email: "admin@ghost.fr",
          admin_name: "Admin",
        },
      ],
      payment_date: "2026-07-01",
      payment_type: "chorus_pro",
      payment_validated: false,
    },
    options
  );

  expect(response.success).toBe(false);
  expect(response.communes_failed[0].error).toContain("not found");
});
```

### Test 6: EPCI not found

**Test Code:**
```typescript
test("should fail if EPCI not found", async () => {
  const response = await callBatchCreate(
    {
      epci_id: "550e8400-e29b-41d4-a716-000000000000", // Invalid UUID
      admin_email: "test@vigiecity.fr",
      admin_name: "Test",
      admin_password: "TestPassword123!",
      communes: [
        {
          commune_name: "Test",
          insee_code: "17001",
          admin_email: "admin@test.fr",
          admin_name: "Admin",
        },
      ],
      payment_date: "2026-07-01",
      payment_type: "chorus_pro",
      payment_validated: false,
    },
    options
  );

  expect(response.success).toBe(false);
  expect(response.error).toContain("not found");
});
```

## Performance Tests

### Large batch test (50 communes)

```typescript
test("should handle large batch (50 communes)", async () => {
  const communes = Array.from({ length: 50 }, (_, i) => ({
    commune_name: `Commune ${i + 1}`,
    insee_code: String(17100 + i).padStart(5, "0"),
    admin_email: `admin${i + 1}@vigiecity.fr`,
    admin_name: `Admin ${i + 1}`,
  }));

  const start = Date.now();
  const response = await callBatchCreate(
    {
      epci_id: epciId,
      admin_email: "large-batch@vigiecity.fr",
      admin_name: "Large Batch",
      admin_password: "TestPassword123!",
      communes,
      payment_date: "2026-07-01",
      payment_type: "chorus_pro",
      payment_validated: false,
    },
    { ...options, timeout: 180000 } // 3 minute timeout
  );
  const duration = Date.now() - start;

  console.log(`Processed 50 communes in ${duration}ms (${(duration / 50).toFixed(0)}ms per commune)`);

  expect(response.communes_created).toBeGreaterThanOrEqual(40); // At least 80%
  expect(duration).toBeLessThan(120000); // Under 2 minutes
});
```

### Concurrent requests test

```typescript
test("should handle concurrent batch requests", async () => {
  const promises = Array.from({ length: 5 }, (_, i) =>
    callBatchCreate(
      {
        epci_id: epciId,
        admin_email: `concurrent${i}@vigiecity.fr`,
        admin_name: `Concurrent ${i}`,
        admin_password: "TestPassword123!",
        communes: [
          {
            commune_name: "Test",
            insee_code: String(17000 + i).padStart(5, "0"),
            admin_email: `admin${i}@vigiecity.fr`,
            admin_name: "Admin",
          },
        ],
        payment_date: "2026-07-01",
        payment_type: "chorus_pro",
        payment_validated: false,
      },
      options
    )
  );

  const results = await Promise.all(promises);

  // All should succeed
  expect(results.every((r) => r.success)).toBe(true);
  expect(results.every((r) => r.communes_created === 1)).toBe(true);
});
```

## Load Testing

Using `artillery` for load testing:

**artillery-load-test.yml:**
```yaml
config:
  target: "{{ $processEnvironment.SUPABASE_URL }}"
  phases:
    - duration: 60
      arrivalRate: 1  # 1 request per second
      name: "Ramp up"
    - duration: 300
      arrivalRate: 5  # 5 requests per second
      name: "Sustained load"
  variables:
    serviceRoleKey: "{{ $processEnvironment.SUPABASE_SERVICE_ROLE_KEY }}"
    epciId: "{{ $processEnvironment.TEST_EPCI_ID }}"

scenarios:
  - name: "Batch creation"
    flow:
      - post:
          url: "/functions/v1/create-commune-batch"
          headers:
            Authorization: "Bearer {{ serviceRoleKey }}"
            Content-Type: "application/json"
          json:
            epci_id: "{{ epciId }}"
            admin_email: "batch-{{ $timestamp }}@test.fr"
            admin_name: "Test Admin"
            admin_password: "TestPassword123!"
            communes:
              - commune_name: "Test 1"
                insee_code: "17001"
                admin_email: "admin1-{{ $timestamp }}@test.fr"
                admin_name: "Admin 1"
              - commune_name: "Test 2"
                insee_code: "17002"
                admin_email: "admin2-{{ $timestamp }}@test.fr"
                admin_name: "Admin 2"
            payment_date: "2026-07-01"
            payment_type: "chorus_pro"
            payment_validated: false
          expect:
            - statusCode: 200
```

**Run load test:**
```bash
artillery run artillery-load-test.yml
```

## Cleanup & Teardown

After testing, clean up test data:

```typescript
async function cleanupTestData(emailPattern: string) {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Find test users
  const { data: users } = await supabase.auth.admin.listUsers();
  const testUsers = users?.users?.filter((u) => u.email?.includes(emailPattern)) || [];

  // Delete test user roles
  for (const user of testUsers) {
    await supabase.from("user_roles").delete().eq("user_id", user.id);
  }

  // Delete auth users
  for (const user of testUsers) {
    await supabase.auth.admin.deleteUser(user.id);
  }

  console.log(`Cleaned up ${testUsers.length} test users`);
}

// Usage
await cleanupTestData("@vigiecity.fr");
```

## Monitoring & Alerts

### Key metrics to monitor

```sql
-- Batch creation volume
SELECT 
  DATE(created_at),
  COUNT(*) as batch_count,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count
FROM commune_licenses
WHERE plan = 'epci' OR notes LIKE '%batch%'
GROUP BY DATE(created_at);

-- Failed batch attempts
SELECT 
  DATE(created_at),
  COUNT(*) as failed_attempts
FROM error_log
WHERE source = 'create-commune-batch'
GROUP BY DATE(created_at);

-- Average processing time
SELECT 
  AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) as avg_seconds,
  MAX(EXTRACT(EPOCH FROM (finished_at - started_at))) as max_seconds
FROM batch_processing_log;
```

## Regression Testing Checklist

After any code changes:

- [ ] Full EPCI batch (5+ communes)
- [ ] Duplicate email handling
- [ ] Invalid INSEE code rejection
- [ ] Non-existent commune handling
- [ ] Partial success response (some fail)
- [ ] Large batch (25+ communes)
- [ ] Concurrent requests
- [ ] Email delivery
- [ ] License creation
- [ ] RLS policies enforced
- [ ] Audit logging complete

## Sign-off

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Performance tests completed
- [ ] Load tests completed
- [ ] Regression tests passed
- [ ] Manual QA completed
- [ ] Documentation updated
- [ ] Deployment ready

## Contact & Support

- **Owner:** [Dev Team]
- **Slack:** #vigie-city-dev
- **Issues:** Create issue in private GitHub repo
