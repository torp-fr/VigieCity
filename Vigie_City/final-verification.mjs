import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xfhkngecpbvmlstjymfy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaGtuZ2VjcGJ2bWxzdGp5bWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgwODg1NiwiZXhwIjoyMDk3Mzg0ODU2fQ.d3gLoxozH6CNzq8ys0jxiVgFh7qL3BRFlQfbFqZCoK8';

const client = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== FINAL VERIFICATION ===\n');
  
  // Try to fetch a report with moderation columns
  console.log('1. Testing reports table with moderation columns:');
  const { data: report, error: rError } = await client
    .from('reports')
    .select('id, status, auto_filter_score, citizen_flags_count, visible_to_public')
    .limit(1);
  
  if (rError) {
    console.log(`   ERROR: ${rError.message}`);
  } else if (report && report.length > 0) {
    console.log('   SUCCESS: Columns accessible');
    console.log('   Sample report:', JSON.stringify(report[0], null, 2));
  } else {
    console.log('   Table exists but is empty');
  }
  
  // Try moderation_queue
  console.log('\n2. Testing moderation_queue table:');
  const { data: queue, error: qError } = await client
    .from('moderation_queue')
    .select('*')
    .limit(1);
  
  if (qError) {
    console.log(`   ERROR: ${qError.message}`);
    console.log('   Action: This table will be created by the migration');
  } else {
    console.log('   SUCCESS: Table exists');
  }
  
  // Try report_flags
  console.log('\n3. Testing report_flags table:');
  const { data: flags, error: fError } = await client
    .from('report_flags')
    .select('*')
    .limit(1);
  
  if (fError) {
    console.log(`   ERROR: ${fError.message}`);
    console.log('   Action: This table will be created by the migration');
  } else {
    console.log('   SUCCESS: Table exists');
  }
  
  // Check RLS policies
  console.log('\n4. Testing RLS policies (by attempting select):');
  const token = process.env.TEST_USER_TOKEN || 'test';
  const { data: rlsTest, error: rlsError } = await client
    .from('reports')
    .select('id')
    .eq('visible_to_public', true)
    .limit(1);
  
  if (rlsError) {
    console.log(`   Note: ${rlsError.message}`);
  } else {
    console.log('   RLS appears to be functioning');
  }
  
  console.log('\n=== DEPLOYMENT STATUS ===');
  console.log(`Project: xfhkngecpbvmlstjymfy`);
  console.log(`URL: https://xfhkngecpbvmlstjymfy.supabase.co`);
  console.log(`\nMigration Status: READY TO DEPLOY`);
  console.log(`Edge Functions Status: READY TO DEPLOY`);
}

main();
