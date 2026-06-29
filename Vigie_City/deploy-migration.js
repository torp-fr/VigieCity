const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfhkngecpbvmlstjymfy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaGtuZ2VjcGJ2bWxzdGp5bWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgwODg1NiwiZXhwIjoyMDk3Mzg0ODU2fQ.d3gLoxozH6CNzq8ys0jxiVgFh7qL3BRFlQfbFqZCoK8';

const client = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    const sqlFile = fs.readFileSync('supabase/migrations/20260626000001_freemium_moderation.sql', 'utf8');
    
    console.log('Reading migration file...');
    console.log('Migration file size:', sqlFile.length, 'bytes');
    
    // Split by statements and execute
    const statements = sqlFile.split(';').filter(stmt => stmt.trim());
    console.log(`Found ${statements.length} SQL statements`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim() + ';';
      if (stmt.length > 1) {
        console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
        
        const { error, data } = await client.rpc('execute_sql', {
          sql: stmt
        }).catch(err => ({ error: err, data: null }));
        
        if (error) {
          console.error(`Statement ${i + 1} error:`, error.message || error);
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      }
    }
    
    console.log('\nMigration deployment attempt completed');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

applyMigration();
