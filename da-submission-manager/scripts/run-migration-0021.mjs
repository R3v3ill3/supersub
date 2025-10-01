import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔧 Running migration 0021_concern_templates_project_track.sql...\n');

  const migrationPath = join(__dirname, '../packages/db/migrations/0021_concern_templates_project_track.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  console.log('📋 Migration SQL:');
  console.log('─'.repeat(80));
  console.log(sql);
  console.log('─'.repeat(80));
  console.log('\n⚠️  Note: This migration must be run manually in the Supabase SQL editor');
  console.log('\nSteps:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy the SQL above and run it');
  console.log('\nOr copy this file:');
  console.log(`   ${migrationPath}`);
}

runMigration().catch(console.error);
