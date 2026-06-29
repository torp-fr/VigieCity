import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xfhkngecpbvmlstjymfy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaGtuZ2VjcGJ2bWxzdGp5bWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgwODg1NiwiZXhwIjoyMDk3Mzg0ODU2fQ.d3gLoxozH6CNzq8ys0jxiVgFh7qL3BRFlQfbFqZCoK8';

const client = createClient(supabaseUrl, supabaseKey);

async function verifyConnection() {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await client.auth.admin.listUsers();
    if (error) {
      console.error('Connection failed:', error.message);
      return false;
    }
    console.log('Connection successful');
    return true;
  } catch (err) {
    console.error('Error:', err.message);
    return false;
  }
}

async function checkTables() {
  try {
    console.log('\nChecking existing tables...');
    const { data: reports, error: reportsError } = await client
      .from('reports')
      .select('count', { count: 'exact', head: true });
    
    if (reportsError) {
      console.log('Reports table: Does not exist yet (will be created)');
    } else {
      console.log('Reports table: Already exists');
    }
    
    const { data: queue, error: queueError } = await client
      .from('moderation_queue')
      .select('count', { count: 'exact', head: true });
    
    if (queueError) {
      console.log('Moderation queue table: Does not exist yet (will be created)');
    } else {
      console.log('Moderation queue table: Already exists');
    }
    
    const { data: flags, error: flagsError } = await client
      .from('report_flags')
      .select('count', { count: 'exact', head: true });
    
    if (flagsError) {
      console.log('Report flags table: Does not exist yet (will be created)');
    } else {
      console.log('Report flags table: Already exists');
    }
  } catch (err) {
    console.error('Error checking tables:', err.message);
  }
}

async function main() {
  console.log('=== VigieCity Freemium Moderation Deployment ===\n');
  
  const connected = await verifyConnection();
  if (!connected) {
    console.log('\nCannot proceed without valid Supabase connection');
    process.exit(1);
  }
  
  await checkTables();
  
  console.log('\n=== Important Note ===');
  console.log('The SQL migration cannot be executed directly via the JS SDK.');
  console.log('Use one of these methods to apply the migration:');
  console.log('1. Via Supabase CLI: supabase migration up');
  console.log('2. Via Supabase Dashboard: SQL Editor');
  console.log('3. Via psql directly to the database');
  console.log('\nThe migration file is ready at: supabase/migrations/20260626000001_freemium_moderation.sql');
}

main();
