# create-commune-batch Client Integration Guide

This guide explains how to call the batch creation function from the VigieCity admin platform or backend services.

## Quick Start

### 1. Import types and helpers

```typescript
import {
  BatchRequest,
  BatchResponse,
  callBatchCreate,
  validateBatchRequest,
} from "@supabase/functions/create-commune-batch/types";
```

### 2. Prepare the request

```typescript
const request: BatchRequest = {
  epci_id: "550e8400-e29b-41d4-a716-446655440000",
  admin_email: "epci-admin@example.com",
  admin_name: "EPCI Admin",
  admin_password: "SecurePassword123!", // Min 8 chars
  communes: [
    {
      commune_name: "Paris",
      insee_code: "75001",
      admin_email: "admin@paris.fr",
      admin_name: "Paris Administrator",
      admin_phone: "+33 1 42 76 72 00",
    },
    {
      commune_name: "Boulogne-Billancourt",
      insee_code: "75005",
      admin_email: "admin@boulogne.fr",
      admin_name: "Boulogne Admin",
    },
  ],
  payment_date: "2026-07-01",
  payment_type: "chorus_pro",
  payment_validated: false,
};
```

### 3. Validate the request

```typescript
const errors = validateBatchRequest(request);
if (errors.length > 0) {
  console.error("Validation errors:", errors);
  return;
}
```

### 4. Call the function

```typescript
const response = await callBatchCreate(request, {
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  supabaseUrl: process.env.SUPABASE_URL!,
  timeout: 120000, // 2 minutes for large batches
});

if (response.success) {
  console.log(`Created ${response.communes_created} communes`);
  console.log("EPCI Admin ID:", response.epci_user_id);
  console.log("Created licenses:", response.details.commune_license_ids);

  if (response.communes_failed.length > 0) {
    console.warn("Failed communes:", response.communes_failed);
  }
} else {
  console.error("Batch creation failed:", response);
}
```

## Integration Patterns

### Pattern 1: Backend API endpoint (Node.js/Next.js)

**File:** `pages/api/admin/epci/batch-create.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from "next";
import { BatchRequest, callBatchCreate } from "@supabase/functions/create-commune-batch/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Verify user is super_admin (check JWT/session)
    const userRole = req.session?.user?.role; // Adjust per your auth setup
    if (userRole !== "super_admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const request: BatchRequest = req.body;

    const response = await callBatchCreate(request, {
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      supabaseUrl: process.env.SUPABASE_URL!,
    });

    // Log to audit trail
    console.log(`[BATCH_CREATE] EPCI: ${request.epci_id}, Created: ${response.communes_created}, Failed: ${response.communes_failed.length}`);

    return res.status(200).json(response);
  } catch (error) {
    console.error("Batch creation error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
```

### Pattern 2: Vercel Edge Function

**File:** `functions/epci-batch-create.ts`

```typescript
import { BatchRequest, callBatchCreate } from "@supabase/functions/create-commune-batch/types";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Verify authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Verify token (your auth logic)
    // ...

    const request: BatchRequest = await req.json();

    const response = await callBatchCreate(request, {
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      supabaseUrl: process.env.SUPABASE_URL!,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
```

### Pattern 3: React Hook for admin UI

**File:** `hooks/useCreateCommuneBatch.ts`

```typescript
import { useState } from "react";
import {
  BatchRequest,
  BatchResponse,
  callBatchCreate,
  validateBatchRequest,
} from "@supabase/functions/create-commune-batch/types";

interface UseCreateBatchOptions {
  onSuccess?: (response: BatchResponse) => void;
  onError?: (error: Error) => void;
}

export function useCreateCommuneBatch(options?: UseCreateBatchOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [response, setResponse] = useState<BatchResponse | null>(null);

  const createBatch = async (request: BatchRequest) => {
    try {
      setLoading(true);
      setError(null);

      // Validate request
      const validationErrors = validateBatchRequest(request);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
      }

      // Call API endpoint (which calls the Edge Function)
      const res = await fetch("/api/admin/epci/batch-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
      }

      const data: BatchResponse = await res.json();
      setResponse(data);
      options?.onSuccess?.(data);

      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options?.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { createBatch, loading, error, response };
}
```

### Pattern 4: React component for batch creation form

**File:** `components/admin/EpciOnboardingForm.tsx`

```typescript
import React, { useState } from "react";
import { useCreateCommuneBatch } from "@/hooks/useCreateCommuneBatch";
import type { BatchRequest, CommuneInput } from "@supabase/functions/create-commune-batch/types";

export function EpciOnboardingForm() {
  const [communes, setCommunes] = useState<CommuneInput[]>([
    {
      commune_name: "",
      insee_code: "",
      admin_email: "",
      admin_name: "",
    },
  ]);

  const [epciEmail, setEpciEmail] = useState("");
  const [epciName, setEpciName] = useState("");
  const [epciPassword, setEpciPassword] = useState("");
  const [epciId, setEpciId] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentType, setPaymentType] = useState<"chorus_pro" | "transfer" | "quote_pending">(
    "chorus_pro",
  );

  const { createBatch, loading, error, response } = useCreateCommuneBatch({
    onSuccess: (res) => {
      alert(
        `Created ${res.communes_created} communes! EPCI Admin: ${res.epci_user_id}`,
      );
      // Reset form
      setCommunes([{ commune_name: "", insee_code: "", admin_email: "", admin_name: "" }]);
    },
    onError: (err) => {
      alert(`Error: ${err.message}`);
    },
  });

  const handleAddCommune = () => {
    setCommunes([
      ...communes,
      {
        commune_name: "",
        insee_code: "",
        admin_email: "",
        admin_name: "",
      },
    ]);
  };

  const handleUpdateCommune = (
    index: number,
    field: keyof CommuneInput,
    value: string,
  ) => {
    const updated = [...communes];
    updated[index] = { ...updated[index], [field]: value };
    setCommunes(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const request: BatchRequest = {
      epci_id: epciId,
      admin_email: epciEmail,
      admin_name: epciName,
      admin_password: epciPassword,
      communes,
      payment_date: paymentDate,
      payment_type: paymentType,
      payment_validated: false,
    };

    await createBatch(request);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* EPCI Admin Section */}
      <fieldset className="border p-4 rounded">
        <legend className="font-bold">EPCI Administrator</legend>

        <div className="mb-4">
          <label>EPCI ID</label>
          <input
            type="text"
            value={epciId}
            onChange={(e) => setEpciId(e.target.value)}
            placeholder="550e8400-e29b-41d4-a716-446655440000"
            required
          />
        </div>

        <div className="mb-4">
          <label>Email</label>
          <input
            type="email"
            value={epciEmail}
            onChange={(e) => setEpciEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label>Full Name</label>
          <input
            type="text"
            value={epciName}
            onChange={(e) => setEpciName(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label>Password (min 8 chars)</label>
          <input
            type="password"
            value={epciPassword}
            onChange={(e) => setEpciPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
      </fieldset>

      {/* Communes Section */}
      <fieldset className="border p-4 rounded">
        <legend className="font-bold">Communes</legend>

        {communes.map((commune, idx) => (
          <div key={idx} className="mb-4 p-4 bg-gray-50 rounded">
            <h4>Commune {idx + 1}</h4>

            <div className="mb-2">
              <label>Commune Name</label>
              <input
                type="text"
                value={commune.commune_name}
                onChange={(e) =>
                  handleUpdateCommune(idx, "commune_name", e.target.value)
                }
                placeholder="e.g., Paris"
                required
              />
            </div>

            <div className="mb-2">
              <label>INSEE Code (5 digits)</label>
              <input
                type="text"
                value={commune.insee_code}
                onChange={(e) =>
                  handleUpdateCommune(idx, "insee_code", e.target.value)
                }
                placeholder="75001"
                pattern="\d{5}"
                required
              />
            </div>

            <div className="mb-2">
              <label>Admin Email</label>
              <input
                type="email"
                value={commune.admin_email}
                onChange={(e) =>
                  handleUpdateCommune(idx, "admin_email", e.target.value)
                }
                required
              />
            </div>

            <div className="mb-2">
              <label>Admin Name</label>
              <input
                type="text"
                value={commune.admin_name}
                onChange={(e) =>
                  handleUpdateCommune(idx, "admin_name", e.target.value)
                }
                required
              />
            </div>

            <div className="mb-2">
              <label>Admin Phone (optional)</label>
              <input
                type="tel"
                value={commune.admin_phone || ""}
                onChange={(e) =>
                  handleUpdateCommune(idx, "admin_phone", e.target.value)
                }
                placeholder="+33 1 23 45 67 89"
              />
            </div>
          </div>
        ))}

        <button type="button" onClick={handleAddCommune} className="btn btn-secondary">
          + Add Commune
        </button>
      </fieldset>

      {/* Payment Section */}
      <fieldset className="border p-4 rounded">
        <legend className="font-bold">Payment</legend>

        <div className="mb-4">
          <label>Payment Date</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label>Payment Type</label>
          <select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as any)}
            required
          >
            <option value="chorus_pro">Chorus Pro</option>
            <option value="transfer">Bank Transfer</option>
            <option value="quote_pending">Quote Pending</option>
          </select>
        </div>
      </fieldset>

      {error && <div className="error">{error.message}</div>}

      {response && (
        <div className="success">
          <p>Created {response.communes_created} communes</p>
          {response.communes_failed.length > 0 && (
            <div className="mt-4">
              <h5>Failed:</h5>
              <ul>
                {response.communes_failed.map((f, i) => (
                  <li key={i}>
                    {f.commune_name} ({f.insee_code}): {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? "Creating..." : "Create Batch"}
      </button>
    </form>
  );
}
```

## Error Handling

### Expected error responses

```typescript
// 400: Validation error
{
  "error": "Missing required fields: ..."
}

// 401: Unauthorized
{
  "error": "Missing Authorization header"
}

// 404: EPCI not found
{
  "error": "EPCI ... not found"
}

// 500: Server error
{
  "error": "Unexpected error: ..."
}
```

### Handling partial success

The function returns success with some failures:

```typescript
const response = await callBatchCreate(request, options);

if (response.success) {
  // At least some communes created
  if (response.communes_failed.length > 0) {
    // But some failed
    console.warn("Partial success:", response.communes_failed);
    // Handle warnings: notify support, retry later, etc.
  }
} else {
  // Complete failure
  console.error("Batch failed entirely");
}
```

## Best Practices

### 1. Pre-validate INSEE codes

Before calling the batch function, check that communes exist in the database:

```typescript
async function validateCommunesExist(communes: CommuneInput[]) {
  const { data } = await supabase
    .from("collectivities")
    .select("insee_code")
    .in("insee_code", communes.map((c) => c.insee_code));

  const validCodes = new Set(data?.map((d) => d.insee_code) || []);
  return communes.filter((c) => validCodes.has(c.insee_code));
}
```

### 2. Implement progress tracking

For large batches (>20 communes), track progress:

```typescript
async function trackProgress(
  epciId: string,
  onProgress: (created: number, failed: number) => void,
) {
  const interval = setInterval(async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("id")
      .eq("epci_id", epciId)
      .eq("role", "admin");

    onProgress(data?.length || 0, 0);
  }, 5000);

  return () => clearInterval(interval);
}
```

### 3. Retry failed communes

```typescript
async function retryFailed(failed: FailedCommune[], request: BatchRequest) {
  const retriable = failed
    .filter((f) => !f.error.includes("not found"))
    .map((f) => {
      const c = request.communes.find((cc) => cc.insee_code === f.insee_code);
      return c;
    })
    .filter(Boolean) as CommuneInput[];

  if (retriable.length === 0) return;

  // Retry with only retriable communes
  return await callBatchCreate(
    { ...request, communes: retriable },
    options,
  );
}
```

### 4. Audit logging

```typescript
async function logBatchCreation(request: BatchRequest, response: BatchResponse) {
  await supabase
    .from("admin_audit_log")
    .insert({
      action: "batch_create",
      epci_id: request.epci_id,
      communes_count: request.communes.length,
      created_count: response.communes_created,
      failed_count: response.communes_failed.length,
      epci_user_id: response.epci_user_id,
      timestamp: response.timestamp,
    });
}
```

## References

- [Deployment Guide](./DEPLOYMENT.md)
- [Batch Function Source](./index.ts)
- [Type Definitions](./types.ts)
