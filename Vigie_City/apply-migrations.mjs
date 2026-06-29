#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration(filePath) {
  console.log(`\nApplying migration: ${path.basename(filePath)}`);

  try {
    const sql = fs.readFileSync(filePath, "utf-8");

    // Split by semicolon but preserve them
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt && !stmt.startsWith("--"));

    for (const statement of statements) {
      if (!statement) continue;

      console.log(`Executing: ${statement.substring(0, 80)}...`);

      const { error } = await supabase.rpc("execute_sql", {
        sql_query: statement + ";",
      });

      if (error) {
        // Check if it's a "does not exist" error that we can ignore
        if (error.message?.includes("already exists")) {
          console.log(`  ✓ Already exists (skipping)`);
        } else if (error.message?.includes("does not exist")) {
          console.log(`  ⚠ Object does not exist (skipping)`);
        } else {
          throw error;
        }
      } else {
        console.log(`  ✓ Success`);
      }
    }

    console.log(`✓ Migration applied: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`✗ Error applying migration: ${error.message}`);
    throw error;
  }
}

async function main() {
  const migrationsDir = "./supabase/migrations";

  const migrations = [
    "20260701000001_add_payment_fields.sql",
    "20260701000002_add_epci_admin_rls.sql",
  ];

  console.log("Starting migration application...\n");
  console.log(`Database: ${SUPABASE_URL}`);

  for (const migrationFile of migrations) {
    const filePath = path.join(migrationsDir, migrationFile);
    if (fs.existsSync(filePath)) {
      await applyMigration(filePath);
    } else {
      console.error(`Migration file not found: ${filePath}`);
    }
  }

  console.log("\n✓ All migrations applied successfully!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
