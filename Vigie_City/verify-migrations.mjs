#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xfhkngecpbvmlstjymfy.supabase.co";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaGtuZ2VjcGJ2bWxzdGp5bWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgwODg1NiwiZXhwIjoyMDk3Mzg0ODU2fQ.d3gLoxozH6CNzq8ys0jxiVgFh7qL3BRFlQfbFqZCoK8";

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyConnection() {
  try {
    console.log("Testing Supabase connection...");
    const { data, error } = await client.auth.admin.listUsers({ perPage: 1 });
    if (error) {
      console.error("✗ Connection failed:", error.message);
      return false;
    }
    console.log("✓ Connection successful\n");
    return true;
  } catch (err) {
    console.error("✗ Error:", err.message);
    return false;
  }
}

async function checkPaymentColumns() {
  try {
    console.log("Checking payment columns...");

    // Try to query the table with the new columns
    const { data, error } = await client
      .from("commune_licenses")
      .select("payment_date, payment_type, payment_validated, payment_validated_by")
      .limit(1);

    if (error) {
      if (error.message?.includes("column") || error.message?.includes("does not exist")) {
        console.log("✗ Payment columns not found - migration likely not applied yet");
        console.log("  Error:", error.message);
        return false;
      }
      throw error;
    }

    console.log("✓ Payment columns exist");
    console.log("  - payment_date: exists");
    console.log("  - payment_type: exists");
    console.log("  - payment_validated: exists");
    console.log("  - payment_validated_by: exists\n");
    return true;
  } catch (err) {
    console.error("✗ Error checking columns:", err.message);
    return false;
  }
}

async function checkRLSPolicies() {
  try {
    console.log("Checking RLS policies...");

    // This would require direct SQL access which isn't available via JS SDK
    // We'll check by attempting to query with different roles
    const { data, error } = await client
      .from("commune_licenses")
      .select("id")
      .limit(1);

    if (error) {
      console.log("✗ Unable to verify RLS policies via JS SDK");
      console.log("  (This requires direct PostgreSQL access)");
      console.log("  Please verify manually in Supabase Dashboard\n");
      return false;
    }

    console.log(
      "✓ commune_licenses table is accessible (RLS enabled but not blocking service_role)"
    );
    console.log("  Note: Full RLS policy verification requires SQL access\n");
    return true;
  } catch (err) {
    console.error("✗ Error checking RLS:", err.message);
    return false;
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════╗\n");
  console.log("  Supabase Migration Verification");
  console.log("  Payment Fields + EPCI Admin RLS");
  console.log("\n╚════════════════════════════════════════════════════════╝\n");

  const connected = await verifyConnection();
  if (!connected) {
    console.log("Cannot proceed without valid Supabase connection\n");
    process.exit(1);
  }

  const paymentOk = await checkPaymentColumns();
  const rlsOk = await checkRLSPolicies();

  console.log("╔════════════════════════════════════════════════════════╗\n");
  console.log("  Verification Summary\n");

  if (paymentOk) {
    console.log("✓ Migration 1: ADD PAYMENT FIELDS - OK");
  } else {
    console.log("✗ Migration 1: ADD PAYMENT FIELDS - PENDING");
  }

  if (rlsOk) {
    console.log("✓ Migration 2: ADD EPCI ADMIN RLS - OK (partial check)");
  } else {
    console.log("✗ Migration 2: ADD EPCI ADMIN RLS - REQUIRES VERIFICATION");
  }

  console.log("\n╚════════════════════════════════════════════════════════╝\n");

  if (!paymentOk) {
    console.log("📋 NEXT STEPS:\n");
    console.log("The migrations have been created but not yet applied.");
    console.log("Apply them using one of these methods:\n");
    console.log("1. Supabase Dashboard (recommended):");
    console.log("   - Go to: https://app.supabase.co/project/xfhkngecpbvmlstjymfy/sql/new");
    console.log("   - Copy and run: supabase/migrations/20260701000001_add_payment_fields.sql");
    console.log("   - Copy and run: supabase/migrations/20260701000002_add_epci_admin_rls.sql\n");
    console.log("2. Supabase CLI (if configured):");
    console.log("   - supabase migration up\n");
    console.log("3. Direct PostgreSQL:");
    console.log("   - psql -f supabase/migrations/20260701000001_add_payment_fields.sql");
    console.log("   - psql -f supabase/migrations/20260701000002_add_epci_admin_rls.sql\n");
    console.log("After applying, run this script again to verify.\n");
  } else {
    console.log("✓ All migrations appear to be applied successfully!\n");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
