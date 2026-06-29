import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xfhkngecpbvmlstjymfy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaGtuZ2VjcGJ2bWxzdGp5bWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgwODg1NiwiZXhwIjoyMDk3Mzg0ODU2fQ.d3gLoxozH6CNzq8ys0jxiVgFh7qL3BRFlQfbFqZCoK8';

const client = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
  try {
    console.log('=== Verifying Moderation Schema ===\n');
    
    // Check reports table columns
    console.log('1. Reports table columns:');
    const { data: reports, error: rError } = await client
      .from('reports')
      .select('*')
      .limit(0);
    
    if (rError) {
      console.error('Error:', rError.message);
    } else {
      const cols = Object.keys(reports?.[0] || {});
      const moderationCols = ['status', 'auto_filter_score', 'citizen_flags_count', 'visible_to_public'];
      console.log('   All columns:', cols);
      moderationCols.forEach(col => {
        const found = cols.includes(col);
        console.log(`   - ${col}: ${found ? 'PRESENT' : 'MISSING'}`);
      });
    }
    
    // Check moderation_queue table
    console.log('\n2. Moderation queue table:');
    const { data: queue, error: qError } = await client
      .from('moderation_queue')
      .select('*')
      .limit(0);
    
    if (qError) {
      console.log('   Status: TABLE NOT FOUND');
    } else {
      const cols = Object.keys(queue?.[0] || {});
      console.log('   Status: TABLE EXISTS');
      console.log('   Columns:', cols);
    }
    
    // Check report_flags table
    console.log('\n3. Report flags table:');
    const { data: flags, error: fError } = await client
      .from('report_flags')
      .select('*')
      .limit(0);
    
    if (fError) {
      console.log('   Status: TABLE NOT FOUND');
    } else {
      const cols = Object.keys(flags?.[0] || {});
      console.log('   Status: TABLE EXISTS');
      console.log('   Columns:', cols);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

verifySchema();
