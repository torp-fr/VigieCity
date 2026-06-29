#!/usr/bin/env node

import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xfhkngecpbvmlstjymfy.supabase.co";

// Extract project ID from URL
const projectId = SUPABASE_URL.split("//")[1].split(".")[0];

function parseMigration(filePath) {
  const filename = path.basename(filePath);

  try {
    const sql = fs.readFileSync(filePath, "utf-8");

    // Split statements carefully, respecting comments
    const lines = sql.split("\n");
    let currentStatement = "";
    const statements = [];
    let inStatement = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        if (inStatement && currentStatement.trim()) {
          currentStatement += "\n";
        }
        continue;
      }

      // Handle comments
      if (trimmed.startsWith("--")) {
        continue;
      }

      inStatement = true;
      currentStatement += (currentStatement ? "\n" : "") + line;

      // Check if statement ends with semicolon
      if (trimmed.endsWith(";")) {
        statements.push(currentStatement.trim());
        currentStatement = "";
        inStatement = false;
      }
    }

    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    return statements;
  } catch (error) {
    console.error(`Error reading migration: ${error.message}`);
    return [];
  }
}

function main() {
  console.log("\n╔════════════════════════════════════════════════════════╗\n");
  console.log("  Supabase Migration Display");
  console.log("  Payment Fields + EPCI Admin RLS");
  console.log("\n╚════════════════════════════════════════════════════════╝\n");

  const migrations = [
    "supabase/migrations/20260701000001_add_payment_fields.sql",
    "supabase/migrations/20260701000002_add_epci_admin_rls.sql",
  ];

  console.log(`Database: ${SUPABASE_URL}`);
  console.log(`Project ID: ${projectId}\n`);

  for (const migrationFile of migrations) {
    if (fs.existsSync(migrationFile)) {
      console.log(`\n${"─".repeat(60)}`);
      console.log(`FILE: ${migrationFile}`);
      console.log(`${"─".repeat(60)}\n`);

      const statements = parseMigration(migrationFile);

      statements.forEach((stmt, i) => {
        console.log(`-- Statement ${i + 1}`);
        console.log(stmt);
        console.log();
      });
    } else {
      console.error(`✗ Migration file not found: ${migrationFile}`);
    }
  }

  console.log(`╔════════════════════════════════════════════════════════╗\n`);
  console.log("  HOW TO APPLY MIGRATIONS\n");
  console.log("Option 1: Supabase CLI (Recommended)");
  console.log("─────────────────────────────────────────────");
  console.log("$ supabase migration up\n");
  console.log("Option 2: Supabase Dashboard SQL Editor");
  console.log("─────────────────────────────────────────────");
  console.log(`Visit: https://app.supabase.co/project/${projectId}/sql/new`);
  console.log("Then:");
  console.log("1. Copy the SQL above");
  console.log("2. Paste into the SQL editor");
  console.log("3. Click 'Run'\n");
  console.log("Option 3: Direct PostgreSQL (if you have psql installed)");
  console.log("─────────────────────────────────────────────");
  console.log("$ psql postgresql://[user]:[password]@db.${projectId}.supabase.co/postgres");
  console.log("postgres# \\i supabase/migrations/20260701000001_add_payment_fields.sql");
  console.log("postgres# \\i supabase/migrations/20260701000002_add_epci_admin_rls.sql\n");
  console.log(`╚════════════════════════════════════════════════════════╝\n`);
}

main();
