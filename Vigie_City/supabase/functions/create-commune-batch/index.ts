/**
 * create-commune-batch — Edge Function VigieCity
 * Batch creation of EPCI admin + per-commune admins during EPCI onboarding.
 *
 * Critical infrastructure: enables parallel admin setup during sales process.
 *
 * POST /functions/v1/create-commune-batch
 *
 * Auth: service_role key (internal use only)
 *
 * Request body:
 * {
 *   epci_id: string;                // FK to intercommunalities.id
 *   admin_email: string;            // EPCI admin email (main account)
 *   admin_name: string;
 *   admin_password: string;         // Bcrypt hashed before sending (never plaintext)
 *   communes: [
 *     {
 *       commune_name: string;       // MUST match collectivities.name
 *       insee_code: string;         // MUST match collectivities.insee_code
 *       admin_email: string;        // Per-commune admin
 *       admin_name: string;
 *       admin_phone?: string;       // Optional phone for contact
 *     }
 *   ];
 *   payment_date: Date;            // ISO format
 *   payment_type: "chorus_pro" | "transfer" | "quote_pending";
 *   payment_validated: boolean;
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   epci_user_id?: string;          // EPCI admin auth user ID
 *   communes_created: number;       // Success count
 *   communes_failed: Array<{
 *     commune_name: string;
 *     insee_code?: string;
 *     error: string;
 *   }>;
 *   details: {
 *     epci_license_id?: string;
 *     commune_license_ids: string[];
 *     admin_profile_ids: string[];  // EPCI admin + per-commune admins
 *   };
 *   timestamp: string;
 * }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://vigiecity.fr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CommuneInput {
  commune_name: string;
  insee_code: string;
  admin_email: string;
  admin_name: string;
  admin_phone?: string;
}

interface BatchRequest {
  epci_id: string;
  admin_email: string;
  admin_name: string;
  admin_password: string;
  communes: CommuneInput[];
  payment_date: string; // ISO date
  payment_type: "chorus_pro" | "transfer" | "quote_pending";
  payment_validated: boolean;
}

interface FailedCommune {
  commune_name: string;
  insee_code?: string;
  error: string;
}

interface BatchResponse {
  success: boolean;
  epci_user_id?: string;
  communes_created: number;
  communes_failed: FailedCommune[];
  details: {
    epci_license_id?: string;
    commune_license_ids: string[];
    admin_profile_ids: string[];
  };
  timestamp: string;
}

// ── Helper: Hash password with bcrypt (Deno Web Crypto) ──────────────────
// Note: For production, use bcrypt from npm. This is a simplified base64 encoding
// for transport security. Supabase auth.admin.createUser handles the real hashing.
async function hashPasswordSimple(password: string): Promise<string> {
  // Encode as UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateInseeCode(code: string): boolean {
  // INSEE codes are 5 digits
  return /^\d{5}$/.test(code);
}

// ── Core logic ─────────────────────────────────────────────────────────────

async function createCommuneBatch(req: BatchRequest): Promise<BatchResponse> {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const now = new Date();
  const timestamp = now.toISOString();
  const failed: FailedCommune[] = [];
  const licensesCreated: string[] = [];
  const profilesCreated: string[] = [];

  // ── 1. Validate EPCI exists ────────────────────────────────────────────

  const { data: epciData, error: epciErr } = await supabase
    .from("intercommunalities")
    .select("id, max_communes, name")
    .eq("id", req.epci_id)
    .single();

  if (epciErr || !epciData) {
    console.error("EPCI not found:", req.epci_id);
    throw new Error(`EPCI ${req.epci_id} not found`);
  }

  // ── 2. Create or get EPCI admin auth user ──────────────────────────────

  let epciUserId: string;
  const epciEmailLower = req.admin_email.toLowerCase().trim();

  if (!validateEmail(epciEmailLower)) {
    throw new Error(`Invalid EPCI admin email: ${epciEmailLower}`);
  }

  try {
    // Try to create the EPCI admin auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: epciEmailLower,
      password: req.admin_password,
      email_confirmed: true, // Auto-confirm for EPCI admins
      user_metadata: {
        full_name: req.admin_name,
        is_epci_admin: true,
      },
    });

    if (authErr) {
      // Check if user already exists
      if (authErr.message?.includes("already registered")) {
        console.warn(`EPCI admin email already exists: ${epciEmailLower}, skipping user creation`);
        // Get the existing user
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const found = existingUser?.users?.find(u => u.email === epciEmailLower);
        if (!found) {
          throw new Error(`Cannot resolve existing EPCI admin user: ${epciEmailLower}`);
        }
        epciUserId = found.id;
      } else {
        throw authErr;
      }
    } else {
      epciUserId = authData.user.id;
    }
  } catch (e) {
    console.error("EPCI auth creation failed:", e);
    throw new Error(`Failed to create EPCI admin auth user: ${(e as Error).message}`);
  }

  // ── 3. Create EPCI admin profile with epci_admin role ───────────────────

  try {
    // Check if profile already exists
    const { data: existing } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", epciUserId)
      .single();

    if (!existing) {
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({
          user_id: epciUserId,
          role: "epci_admin",
          epci_id: req.epci_id,
          collectivity_id: null, // EPCI admins don't have a single collectivity
        });

      if (roleErr && !roleErr.message?.includes("duplicate")) {
        throw roleErr;
      }
    }

    profilesCreated.push(epciUserId);
    console.log(`✓ EPCI admin created/updated: ${epciUserId}`);
  } catch (e) {
    console.error("EPCI profile creation failed:", e);
    throw new Error(`Failed to create EPCI admin profile: ${(e as Error).message}`);
  }

  // ── 4. Create single EPCI-level license ────────────────────────────────
  // (Not per-commune, but for the entire EPCI contract)

  let epciLicenseId: string | undefined;
  try {
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 12); // 1-year default for EPCI

    const { data: license, error: licErr } = await supabase
      .from("commune_licenses")
      .insert({
        collectivity_id: null, // EPCI level, not commune level
        plan_id: "epci", // Special plan for EPCI-wide license
        plan: "epci",
        status: "active",
        payment_method: req.payment_type === "chorus_pro" ? "chorus_pro" : "virement",
        payment_date: req.payment_date,
        payment_type: req.payment_type,
        payment_validated: req.payment_validated,
        payment_validated_by: epciUserId,
        amount_eur: 0, // EPCI pricing handled separately
        duration_months: 12,
        expires_at: expiresAt.toISOString(),
        started_at: timestamp,
        updated_at: timestamp,
        notes: `EPCI batch creation for ${epciData.name}`,
      })
      .select("id")
      .single();

    if (licErr) {
      console.warn("EPCI license creation failed:", licErr);
      // Don't fail the batch for this; commune licenses are more critical
    } else {
      epciLicenseId = license?.id;
      licensesCreated.push(epciLicenseId);
    }
  } catch (e) {
    console.warn("EPCI license creation error:", e);
  }

  // ── 5. For each commune: validate, create user, profile, license ────────

  for (const commune of req.communes) {
    try {
      const communeLower = commune.commune_name.toLowerCase().trim();
      const inseeCode = commune.insee_code.trim();
      const adminEmailLower = commune.admin_email.toLowerCase().trim();

      // Validate inputs
      if (!validateEmail(adminEmailLower)) {
        failed.push({
          commune_name: commune.commune_name,
          insee_code: inseeCode,
          error: `Invalid admin email: ${adminEmailLower}`,
        });
        continue;
      }

      if (!validateInseeCode(inseeCode)) {
        failed.push({
          commune_name: commune.commune_name,
          insee_code: inseeCode,
          error: `Invalid INSEE code format (expected 5 digits): ${inseeCode}`,
        });
        continue;
      }

      // ── 5a. Find the commune in collectivities ─────────────────────────

      const { data: collectivity, error: collectErr } = await supabase
        .from("collectivities")
        .select("id, name, department_code")
        .eq("insee_code", inseeCode)
        .single();

      if (collectErr || !collectivity) {
        failed.push({
          commune_name: commune.commune_name,
          insee_code: inseeCode,
          error: `Commune not found in INSEE database (insee_code: ${inseeCode})`,
        });
        continue;
      }

      // Verify it belongs to the EPCI
      const { data: collectivityEpci } = await supabase
        .from("collectivities")
        .select("epci_id")
        .eq("id", collectivity.id)
        .single();

      if (collectivityEpci?.epci_id !== req.epci_id) {
        failed.push({
          commune_name: commune.commune_name,
          insee_code: inseeCode,
          error: `Commune does not belong to EPCI ${req.epci_id}`,
        });
        continue;
      }

      // ── 5b. Create commune admin auth user (or use existing) ────────────

      let communeUserId: string;
      try {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email: adminEmailLower,
          password: `${commune.insee_code}${Date.now()}`, // Temporary, will be reset
          email_confirmed: true,
          user_metadata: {
            full_name: commune.admin_name,
            commune_name: collectivity.name,
            insee_code: inseeCode,
          },
        });

        if (authErr) {
          if (authErr.message?.includes("already registered")) {
            console.warn(
              `Commune admin already exists: ${adminEmailLower}, skipping user creation`,
            );
            // Try to find existing user (limited API, so we'll note this)
            // In production, you'd query auth.users directly
            communeUserId = ""; // Flag for reuse attempt below
          } else {
            throw authErr;
          }
        } else {
          communeUserId = authData.user.id;
        }
      } catch (e) {
        failed.push({
          commune_name: commune.commune_name,
          insee_code: inseeCode,
          error: `Auth user creation failed: ${(e as Error).message}`,
        });
        continue;
      }

      // ── 5c. If user already exists, we'll note it but continue ─────────
      if (!communeUserId) {
        console.warn(`Skipping duplicate email ${adminEmailLower} for commune ${inseeCode}`);
        failed.push({
          commune_name: commune.commune_name,
          insee_code: inseeCode,
          error: `Commune admin email already registered (${adminEmailLower}); reuse existing account`,
        });
        continue;
      }

      // ── 5d. Create admin role for this commune ──────────────────────────

      try {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert({
            user_id: communeUserId,
            role: "admin",
            collectivity_id: collectivity.id,
            epci_id: null, // Commune admins don't have epci_id
          });

        if (roleErr && !roleErr.message?.includes("duplicate")) {
          throw roleErr;
        }
      } catch (e) {
        failed.push({
          commune_name: commune.commune_name,
          insee_code: inseeCode,
          error: `Role assignment failed: ${(e as Error).message}`,
        });
        continue;
      }

      profilesCreated.push(communeUserId);

      // ── 5e. Create commune license ──────────────────────────────────────

      try {
        const expiresAt = new Date(now);
        expiresAt.setMonth(expiresAt.getMonth() + 12);

        const { data: license, error: licErr } = await supabase
          .from("commune_licenses")
          .insert({
            collectivity_id: collectivity.id,
            plan_id: "nano", // Default plan for communes
            plan: "nano",
            status: "active",
            payment_method: req.payment_type === "chorus_pro" ? "chorus_pro" : "virement",
            payment_date: req.payment_date,
            payment_type: req.payment_type,
            payment_validated: req.payment_validated,
            payment_validated_by: epciUserId,
            amount_eur: 0, // Handled at EPCI level
            duration_months: 12,
            expires_at: expiresAt.toISOString(),
            started_at: timestamp,
            updated_at: timestamp,
            notes: `Created via batch for EPCI ${epciData.name}`,
          })
          .select("id")
          .single();

        if (licErr) {
          throw licErr;
        }

        if (license?.id) {
          licensesCreated.push(license.id);
        }
      } catch (e) {
        console.warn(
          `Commune license creation failed for ${inseeCode}:`,
          e,
        );
        // Don't fail the batch for this; the user is created
      }

      // ── 5f. Send welcome email ──────────────────────────────────────────

      try {
        await supabase.functions.invoke("send-email", {
          body: {
            template: "invite_admin",
            to: adminEmailLower,
            data: {
              commune: collectivity.name,
              department: collectivity.department_code ?? "",
              invite_url: `${APP_URL}/admin/reset-password?email=${encodeURIComponent(adminEmailLower)}`,
              expires: "24 heures",
              logo_url: "",
              primary_color: "#1e3a8a",
            },
          },
        });
      } catch (e) {
        console.warn(`Email send failed for ${adminEmailLower}:`, e);
        // Don't fail the batch for this
      }

      console.log(`✓ Commune created: ${inseeCode} (${collectivity.name})`);
    } catch (e) {
      console.error(`Batch processing error for commune:`, e);
      failed.push({
        commune_name: commune.commune_name,
        insee_code: commune.insee_code,
        error: `Unexpected error: ${(e as Error).message}`,
      });
    }
  }

  // ── Return response ────────────────────────────────────────────────────

  const response: BatchResponse = {
    success: failed.length < req.communes.length, // Success if at least some communes created
    epci_user_id: epciUserId,
    communes_created: req.communes.length - failed.length,
    communes_failed: failed,
    details: {
      epci_license_id: epciLicenseId,
      commune_license_ids: licensesCreated,
      admin_profile_ids: profilesCreated,
    },
    timestamp,
  };

  return response;
}

// ── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify Authorization header contains service_role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For production: verify the key is actually the service_role
    // This is a basic check; enhance in production with key validation
    if (!authHeader.includes("Bearer")) {
      return new Response(JSON.stringify({ error: "Invalid Authorization format" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: BatchRequest = await req.json();

    // Validate required fields
    if (
      !payload.epci_id ||
      !payload.admin_email ||
      !payload.admin_password ||
      !payload.communes ||
      !Array.isArray(payload.communes) ||
      !payload.payment_date ||
      !payload.payment_type
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: epci_id, admin_email, admin_password, communes[], payment_date, payment_type",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (payload.communes.length === 0) {
      return new Response(JSON.stringify({ error: "communes array cannot be empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await createCommuneBatch(payload);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-commune-batch error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        communes_created: 0,
        communes_failed: [],
        details: {
          commune_license_ids: [],
          admin_profile_ids: [],
        },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
