#!/usr/bin/env node

import fs from "fs";
import path from "path";
import https from "https";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xfhkngecpbvmlstjymfy.supabase.co";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaGtuZ2VjcGJ2bWxzdGp5bWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgwODg1NiwiZXhwIjoyMDk3Mzg0ODU2fQ.d3gLoxozH6CNzq8ys0jxiVgFh7qL3BRFlQfbFqZCoK8";

// Extract project ID from URL
const projectId = SUPABASE_URL.split("//")[1].split(".")[0];

function parseSQL(filePath) {
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

    currentStatement += " " + line;

    // Check if statement ends with semicolon
    if (trimmed.endsWith(";")) {
      statements.push(currentStatement.trim());
      currentStatement = "";
    }
  }

  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  return statements;
}

function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/sql`);

    const data = JSON.stringify({
      query: sql,
    });

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "X-Client-Info": "supabase-migration-runner/1.0",
      },
    };

    const req = https.request(url, options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        } else {
          resolve(responseData);
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════╗\n");
  console.log("  Applying Supabase Migrations");
  console.log("  Payment Fields + EPCI Admin RLS");
  console.log("\n╚════════════════════════════════════════════════════════╝\n");

  const migrations = [
    "supabase/migrations/20260701000001_add_payment_fields.sql",
    "supabase/migrations/20260701000002_add_epci_admin_rls.sql",
  ];

  console.log(`Database: ${SUPABASE_URL}`);
  console.log(`Project: ${projectId}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const migrationFile of migrations) {
    if (!fs.existsSync(migrationFile)) {
      console.error(`✗ Migration file not found: ${migrationFile}`);
      errorCount++;
      continue;
    }

    console.log(`\nProcessing: ${path.basename(migrationFile)}`);
    console.log("─".repeat(60));

    try {
      const statements = parseSQL(migrationFile);
      console.log(`Found ${statements.length} SQL statement(s)\n`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const preview = stmt.substring(0, 70).replace(/\n/g, " ");

        try {
          console.log(`  [${i + 1}/${statements.length}] ${preview}...`);

          // Note: The SQL RPC endpoint might not exist, so we'll just display what would be executed
          // In production, use: await executeSql(stmt);

          console.log(`  ✓ Ready to execute`);
          successCount++;
        } catch (error) {
          console.error(`  ✗ Error: ${error.message}`);
          errorCount++;
        }
      }
    } catch (error) {
      console.error(`✗ Error processing migration: ${error.message}`);
      errorCount++;
    }
  }

  console.log("\n╔════════════════════════════════════════════════════════╗\n");
  console.log(`  Results: ${successCount} statements ready, ${errorCount} errors\n`);

  if (errorCount === 0) {
    console.log("✓ All migrations prepared successfully!\n");
    console.log("⚠ IMPORTANT: These migrations must be applied manually.\n");
    console.log("The Supabase JavaScript SDK does not provide SQL execution");
    console.log("capabilities for arbitrary queries.\n");
    console.log("APPLY USING ONE OF THESE METHODS:\n");
    console.log("1. Supabase Dashboard:");
    console.log(`   https://app.supabase.co/project/${projectId}/sql/new\n`);
    console.log("2. Supabase CLI:");
    console.log("   supabase db push --remote\n");
    console.log("3. PostgreSQL Client:");
    console.log("   psql -f supabase/migrations/20260701000001_add_payment_fields.sql");
    console.log("   psql -f supabase/migrations/20260701000002_add_epci_admin_rls.sql\n");
    console.log("After applying, verify with:");
    console.log("   node verify-migrations.mjs\n");
  }

  console.log("╚════════════════════════════════════════════════════════╝\n");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
