#!/usr/bin/env node

import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xfhkngecpbvmlstjymfy.supabase.co";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaGtuZ2VjcGJ2bWxzdGp5bWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgwODg1NiwiZXhwIjoyMDk3Mzg0ODU2fQ.d3gLoxozH6CNzq8ys0jxiVgFh7qL3BRFlQfbFqZCoK8";

// Extract project ID from URL
const projectId = SUPABASE_URL.split("//")[1].split(".")[0];

async function executeSql(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "X-Client-Info": "supabase-cli/1.0",
      },
      body: JSON.stringify({
        query: sql,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

async function applyMigration(filePath) {
  const filename = path.basename(filePath);
  console.log(`\nApplying: ${filename}`);

  try {
    const sql = fs.readFileSync(filePath, "utf-8");

    // Split statements carefully, respecting comments
    const lines = sql.split("\n");
    let currentStatement = "";
    const statements = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comment-only lines
      if (!trimmed || trimmed.startsWith("--")) {
        continue;
      }

      currentStatement += " " + trimmed;

      // Check if statement ends with semicolon
      if (trimmed.endsWith(";")) {
        statements.push(currentStatement.trim());
        currentStatement = "";
      }
    }

    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`  Found ${statements.length} SQL statement(s)`);

    // Note: Direct SQL execution via REST API isn't available
    // We need to use the Supabase Dashboard or CLI
    console.log("\n  ⚠ Note: Direct SQL execution requires Supabase CLI or Dashboard");
    console.log("  Use: supabase db push --remote");
    console.log("  Or visit: https://app.supabase.co/project/" + projectId + "/sql/new\n");

    return statements;
  } catch (error) {
    console.error(`✗ Error reading migration: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════╗\n");
  console.log("  Supabase Migration Executor");
  console.log("  Payment Fields + EPCI Admin RLS");
  console.log("\n╚════════════════════════════════════════════════════════╝\n");

  const migrations = [
    "supabase/migrations/20260701000001_add_payment_fields.sql",
    "supabase/migrations/20260701000002_add_epci_admin_rls.sql",
  ];

  console.log(`Database: ${SUPABASE_URL}`);
  console.log(`Project: ${projectId}\n`);

  const allStatements = [];

  for (const migrationFile of migrations) {
    if (fs.existsSync(migrationFile)) {
      const statements = await applyMigration(migrationFile);
      allStatements.push({ file: migrationFile, statements });
    } else {
      console.error(`✗ Migration file not found: ${migrationFile}`);
    }
  }

  console.log("\n╔════════════════════════════════════════════════════════╗\n");
  console.log("  SQL Statements to Execute\n");

  for (const { file, statements } of allStatements) {
    console.log(`File: ${file}`);
    console.log("─".repeat(60));
    statements.forEach((stmt, i) => {
      console.log(`${i + 1}. ${stmt.substring(0, 80)}...`);
    });
    console.log();
  }

  console.log("╔════════════════════════════════════════════════════════╗\n");
  console.log("  ⚠ IMPORTANT: Manual Execution Required\n");
  console.log("The Supabase JavaScript SDK does not provide direct SQL");
  console.log("execution capabilities for migrations.\n");
  console.log("APPLY MIGRATIONS USING ONE OF THESE METHODS:\n");
  console.log("1. Supabase CLI (Recommended):");
  console.log("   $ supabase db push --remote\n");
  console.log("2. Supabase Dashboard:");
  console.log(`   https://app.supabase.co/project/${projectId}/sql/new\n`);
  console.log("3. Copy and paste the SQL above into your preferred method\n");
  console.log("After applying, run:");
  console.log("   $ node verify-migrations.mjs\n");
  console.log("╚════════════════════════════════════════════════════════╝\n");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
