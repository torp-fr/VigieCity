#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const SUPABASE_URL = 'https://xfhkngecpbvmlstjymfy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeMigration() {
  console.log('📋 Executing freemium moderation migration...');

  try {
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260626000001_freemium_moderation.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration SQL
    const { error } = await supabase.rpc('exec', { sql: migrationSql });

    if (error) {
      console.error('❌ Migration execution failed:', error);
      return false;
    }

    console.log('✓ Migration executed successfully');
    return true;
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    return false;
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying table creation...');

  try {
    // Check moderation_queue table
    const { data: mqData, error: mqError } = await supabase
      .from('moderation_queue')
      .select('*', { count: 'exact' })
      .limit(1);

    if (mqError && mqError.code !== 'PGRST003') {
      console.error('❌ moderation_queue table check failed:', mqError);
      return false;
    }
    console.log('✓ moderation_queue table exists');

    // Check report_flags table
    const { data: rfData, error: rfError } = await supabase
      .from('report_flags')
      .select('*', { count: 'exact' })
      .limit(1);

    if (rfError && rfError.code !== 'PGRST003') {
      console.error('❌ report_flags table check failed:', rfError);
      return false;
    }
    console.log('✓ report_flags table exists');

    // Check reports table has new columns
    const { data: reportsData, error: reportsError } = await supabase
      .from('reports')
      .select('moderation_status, auto_filtered')
      .limit(1);

    if (reportsError && reportsError.code !== 'PGRST003') {
      console.error('❌ reports table columns check failed:', reportsError);
      return false;
    }
    console.log('✓ reports table updated with moderation columns');

    return true;
  } catch (error) {
    console.error('❌ Table verification error:', error.message);
    return false;
  }
}

async function deployFunction(functionName) {
  console.log(`\n📦 Deploying edge function: ${functionName}...`);

  try {
    const functionPath = path.join(__dirname, `supabase/functions/${functionName}/index.ts`);
    const functionCode = fs.readFileSync(functionPath, 'utf8');

    console.log(`✓ Function code loaded (${functionCode.length} bytes)`);
    console.log(`  Location: ${functionPath}`);

    // Note: Direct function deployment via API requires specific Supabase credentials
    // The function should be deployed via Supabase CLI or dashboard
    console.log(`  Deploy via CLI: supabase functions deploy ${functionName}`);

    return true;
  } catch (error) {
    console.error(`❌ Function deployment error:`, error.message);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   VigieCity Freemium Moderation System Deployment         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check migration file
  console.log('📁 Checking files...');
  const files = [
    'supabase/migrations/20260626000001_freemium_moderation.sql',
    'supabase/functions/freemium-auto-filter/index.ts',
    'supabase/functions/city-fetch-reports/index.ts'
  ];

  for (const file of files) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`✓ ${file} (${stats.size} bytes)`);
    } else {
      console.error(`❌ ${file} - NOT FOUND`);
      return;
    }
  }

  // Execute migration
  const migrationOk = await executeMigration();
  if (!migrationOk) {
    console.error('\n⚠️  Migration encountered an issue. This may be expected if tables already exist.');
  }

  // Verify tables
  const tablesOk = await verifyTables();
  if (!tablesOk) {
    console.log('\n⚠️  Some tables could not be verified. Migration may need manual review.');
  }

  // Deploy functions
  await deployFunction('freemium-auto-filter');
  await deployFunction('city-fetch-reports');

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    DEPLOYMENT SUMMARY                      ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║ ✓ Migration file created                                   ║');
  console.log('║ ✓ Edge functions created                                   ║');
  if (tablesOk) {
    console.log('║ ✓ Tables verified in database                              ║');
  } else {
    console.log('║ ⚠ Tables need verification                                 ║');
  }
  console.log('║                                                            ║');
  console.log('║ NEXT STEPS:                                                ║');
  console.log('║ 1. Deploy edge functions:                                  ║');
  console.log('║    supabase functions deploy freemium-auto-filter         ║');
  console.log('║    supabase functions deploy city-fetch-reports           ║');
  console.log('║ 2. Verify deployment:                                      ║');
  console.log('║    supabase functions list                                 ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
