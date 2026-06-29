/**
 * create-commune-batch types
 * Shared types for batch creation operations
 */

export interface CommuneInput {
  commune_name: string;    // Display name (informational)
  insee_code: string;      // 5-digit INSEE code (MUST match collectivities.insee_code)
  admin_email: string;     // Per-commune admin email
  admin_name: string;      // Per-commune admin full name
  admin_phone?: string;    // Optional contact phone number
}

export interface BatchRequest {
  epci_id: string;                                           // UUID of intercommunalities record
  admin_email: string;                                       // EPCI admin email (primary account)
  admin_name: string;                                        // EPCI admin full name
  admin_password: string;                                    // Plaintext (sent over HTTPS only)
  communes: CommuneInput[];                                  // Array of communes to create
  payment_date: string;                                      // ISO date (YYYY-MM-DD)
  payment_type: "chorus_pro" | "transfer" | "quote_pending"; // Payment method
  payment_validated: boolean;                                // Has payment been verified?
}

export interface FailedCommune {
  commune_name: string;    // Name of the commune that failed
  insee_code?: string;     // INSEE code (if available)
  error: string;           // Reason for failure
}

export interface BatchDetails {
  epci_license_id?: string;        // EPCI-level license ID (if created)
  commune_license_ids: string[];   // Array of created commune license IDs
  admin_profile_ids: string[];     // Array of created user profile IDs (EPCI + commune admins)
}

export interface BatchResponse {
  success: boolean;                    // true if at least one commune succeeded
  epci_user_id?: string;              // EPCI admin auth user ID
  communes_created: number;           // Count of successfully created communes
  communes_failed: FailedCommune[];   // Details of failures
  details: BatchDetails;              // IDs of created resources
  timestamp: string;                  // ISO timestamp of operation
}

/**
 * Options for calling the batch function from frontend/client code
 */
export interface BatchCallOptions {
  serviceRoleKey: string;    // Supabase service role key
  supabaseUrl: string;       // Supabase project URL
  timeout?: number;          // Request timeout in ms (default: 60000)
  retryAttempts?: number;    // Number of retries on failure (default: 0)
}

/**
 * Helper to call the batch function
 *
 * @example
 * ```ts
 * const response = await callBatchCreate(
 *   {
 *     epci_id: "uuid-...",
 *     admin_email: "admin@epci.fr",
 *     admin_password: "secure...",
 *     communes: [...],
 *     payment_date: "2026-07-01",
 *     payment_type: "chorus_pro",
 *     payment_validated: false,
 *   },
 *   { serviceRoleKey: "...", supabaseUrl: "..." }
 * );
 *
 * if (response.success) {
 *   console.log(`Created ${response.communes_created} communes`);
 * } else {
 *   console.error(response.communes_failed);
 * }
 * ```
 */
export async function callBatchCreate(
  request: BatchRequest,
  options: BatchCallOptions,
): Promise<BatchResponse> {
  const { serviceRoleKey, supabaseUrl, timeout = 60000 } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/create-commune-batch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      },
    );

    const data: BatchResponse | { error: string } = await response.json();

    if (!response.ok) {
      throw new Error(
        "error" in data ? data.error : `HTTP ${response.status}`,
      );
    }

    return data as BatchResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Validate a batch request before sending
 *
 * @returns Array of error strings; empty if valid
 */
export function validateBatchRequest(req: BatchRequest): string[] {
  const errors: string[] = [];

  // EPCI ID
  if (!req.epci_id) errors.push("epci_id is required");
  if (req.epci_id && !isValidUUID(req.epci_id)) {
    errors.push("epci_id must be a valid UUID");
  }

  // EPCI admin
  if (!req.admin_email) errors.push("admin_email is required");
  if (req.admin_email && !isValidEmail(req.admin_email)) {
    errors.push("admin_email is not a valid email");
  }

  if (!req.admin_name) errors.push("admin_name is required");
  if (!req.admin_password) errors.push("admin_password is required");
  if (req.admin_password && req.admin_password.length < 8) {
    errors.push("admin_password must be at least 8 characters");
  }

  // Payment
  if (!req.payment_date) errors.push("payment_date is required");
  if (req.payment_date && !isValidDate(req.payment_date)) {
    errors.push("payment_date must be ISO format (YYYY-MM-DD)");
  }

  if (!req.payment_type) errors.push("payment_type is required");
  if (
    req.payment_type &&
    !["chorus_pro", "transfer", "quote_pending"].includes(req.payment_type)
  ) {
    errors.push(
      'payment_type must be "chorus_pro", "transfer", or "quote_pending"',
    );
  }

  if (typeof req.payment_validated !== "boolean") {
    errors.push("payment_validated must be a boolean");
  }

  // Communes
  if (!req.communes || !Array.isArray(req.communes)) {
    errors.push("communes must be an array");
  } else {
    if (req.communes.length === 0) {
      errors.push("communes array cannot be empty");
    }

    for (let i = 0; i < req.communes.length; i++) {
      const c = req.communes[i];
      const idx = i + 1;

      if (!c.commune_name) {
        errors.push(`communes[${idx}].commune_name is required`);
      }

      if (!c.insee_code) {
        errors.push(`communes[${idx}].insee_code is required`);
      } else if (!isValidInseeCode(c.insee_code)) {
        errors.push(`communes[${idx}].insee_code must be 5 digits`);
      }

      if (!c.admin_email) {
        errors.push(`communes[${idx}].admin_email is required`);
      } else if (!isValidEmail(c.admin_email)) {
        errors.push(`communes[${idx}].admin_email is not valid`);
      }

      if (!c.admin_name) {
        errors.push(`communes[${idx}].admin_name is required`);
      }
    }
  }

  return errors;
}

// ── Validation helpers ────────────────────────────────────────────────────

function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidInseeCode(code: string): boolean {
  return /^\d{5}$/.test(code);
}

function isValidDate(date: string): boolean {
  // ISO format: YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}
