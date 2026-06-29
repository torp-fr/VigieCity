import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xfhkngecpbvmlstjymfy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaGtuZ2VjcGJ2bWxzdGp5bWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgwODg1NiwiZXhwIjoyMDk3Mzg0ODU2fQ.d3gLoxozH6CNzq8ys0jxiVgFh7qL3BRFlQfbFqZCoK8';

const client = createClient(supabaseUrl, supabaseKey);

async function deployEdgeFunction(functionName, filePath) {
  try {
    console.log(`\n--- Deploying Edge Function: ${functionName} ---`);
    
    const functionContent = fs.readFileSync(filePath, 'utf8');
    console.log(`Function file size: ${functionContent.length} bytes`);
    
    // Check if function exists by attempting to call it
    const { data: listResult, error: listError } = await client.functions.list();
    
    if (listError) {
      console.log(`Note: Cannot list functions - ${listError.message}`);
      console.log(`Status: To deploy, use Supabase CLI: supabase functions deploy ${functionName}`);
      return false;
    }
    
    const exists = listResult?.functions?.some(f => f.name === functionName);
    console.log(`Function exists: ${exists ? 'YES' : 'NO (will be created on first deploy)'}`);
    
    // Print deployment command
    console.log(`\nDeployment command:`);
    console.log(`  supabase functions deploy ${functionName}`);
    console.log(`\nFunction ready to deploy from: ${filePath}`);
    
    return true;
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return false;
  }
}

async function deployMigration() {
  try {
    console.log('\n--- Deploying Migration: 20260626000001_freemium_moderation ---');
    
    const migrationFile = 'supabase/migrations/20260626000001_freemium_moderation.sql';
    const migrationContent = fs.readFileSync(migrationFile, 'utf8');
    
    console.log(`Migration file size: ${migrationContent.length} bytes`);
    console.log(`SQL statements: ${migrationContent.split(';').filter(s => s.trim()).length}`);
    
    console.log(`\nDeployment command:`);
    console.log(`  supabase migration up`);
    console.log(`\nOr via SQL Editor in Supabase Dashboard:`);
    console.log(`  1. Go to https://app.supabase.com/project/xfhkngecpbvmlstjymfy/sql`);
    console.log(`  2. Copy & paste the contents of ${migrationFile}`);
    console.log(`  3. Click "Run"`);
    
    return true;
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return false;
  }
}

async function verifyCurrentState() {
  try {
    console.log('\n=== Current Database State ===\n');
    
    // Test reports table
    console.log('Reports table:');
    const { data: reports, error: rError } = await client
      .from('reports')
      .select('count', { count: 'exact', head: true });
    
    if (!rError) {
      console.log(`  Status: EXISTS (count endpoint accessible)`);
    } else {
      console.log(`  Status: ERROR - ${rError.message}`);
    }
    
    // Test moderation_queue table
    console.log('Moderation queue table:');
    const { data: queue, error: qError } = await client
      .from('moderation_queue')
      .select('count', { count: 'exact', head: true });
    
    if (!qError) {
      console.log(`  Status: EXISTS`);
    } else {
      console.log(`  Status: NOT YET CREATED - will be created by migration`);
    }
    
    // Test report_flags table
    console.log('Report flags table:');
    const { data: flags, error: fError } = await client
      .from('report_flags')
      .select('count', { count: 'exact', head: true });
    
    if (!fError) {
      console.log(`  Status: EXISTS`);
    } else {
      console.log(`  Status: NOT YET CREATED - will be created by migration`);
    }
    
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

async function main() {
  console.log('========================================');
  console.log('VigieCity Freemium Moderation System');
  console.log('Deployment Plan & Status');
  console.log('========================================');
  
  // Verify connection
  console.log('\nVerifying Supabase connection...');
  try {
    const { data, error } = await client.auth.admin.listUsers();
    if (error) {
      console.error('Connection failed:', error.message);
      process.exit(1);
    }
    console.log('Connection: SUCCESS');
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
  
  // Check current state
  await verifyCurrentState();
  
  // Deploy migration
  console.log('\n========================================');
  await deployMigration();
  
  // Deploy Edge Functions
  console.log('\n========================================');
  await deployEdgeFunction('freemium-auto-filter', 'supabase/functions/freemium-auto-filter/index.ts');
  
  console.log('\n========================================');
  await deployEdgeFunction('city-fetch-reports', 'supabase/functions/city-fetch-reports/index.ts');
  
  // Summary
  console.log('\n========================================');
  console.log('DEPLOYMENT SUMMARY');
  console.log('========================================');
  console.log(`
Project: VigieCity (xfhkngecpbvmlstjymfy)
Date: ${new Date().toISOString()}

TASK 1: Migration
  File: supabase/migrations/20260626000001_freemium_moderation.sql
  Command: supabase migration up
  Expected: 3 tables + triggers + RLS policies
  
TASK 2: Edge Functions
  1. freemium-auto-filter
     - Command: supabase functions deploy freemium-auto-filter
     - Purpose: Auto-filter reports based on spam/profanity scoring
  
  2. city-fetch-reports
     - Command: supabase functions deploy city-fetch-reports
     - Purpose: City admins fetch their reports with moderation status

VERIFICATION:
  Run: supabase functions list
  
NEXT STEPS:
  1. Execute the Supabase CLI commands listed above
  2. Verify tables exist in Supabase dashboard
  3. Check function URLs and deployment logs
  `);
}

main();
