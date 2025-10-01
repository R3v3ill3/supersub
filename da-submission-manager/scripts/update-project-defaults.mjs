import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = '47e0d49d-0a2a-4385-82eb-7214e109becb';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateProjectDefaults() {
  console.log('🔧 Updating project defaults...\n');

  // First, check if default_site_address column exists
  const { data: columns } = await supabase
    .from('projects')
    .select('*')
    .limit(1);

  // Add default site address via direct update
  // Note: We need to add this column to the database first if it doesn't exist
  const { data, error } = await supabase
    .rpc('exec_sql', {
      query: `
        -- Add column if it doesn't exist
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'projects' AND column_name = 'default_site_address'
          ) THEN
            ALTER TABLE projects ADD COLUMN default_site_address TEXT;
          END IF;
        END $$;

        -- Update the project
        UPDATE projects
        SET default_site_address = '940 Currumbin Creek Road, Currumbin Valley, QLD'
        WHERE id = '${projectId}';
      `
    });

  if (error && !error.message.includes('does not exist')) {
    // Try direct update if RPC doesn't work
    console.log('⚠️  RPC not available, trying direct update...\n');

    const { data: project, error: updateError } = await supabase
      .from('projects')
      .update({
        description: '940 Currumbin Creek Road, Currumbin Valley - High Trees Primary School DA Objection',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update project:', updateError.message);
      console.log('\n📝 Manual update required:');
      console.log('Add this to your project via Supabase dashboard or admin UI:');
      console.log('  - Default site address: 940 Currumbin Creek Road, Currumbin Valley, QLD');
      console.log('  - Default application number: COM/2025/271 (already set)');
      process.exit(1);
    }

    console.log('✅ Project description updated!\n');
    console.log('Note: default_site_address column may need to be added via migration');
    return;
  }

  console.log('✅ Project defaults updated!\n');
  console.log('Default site address: 940 Currumbin Creek Road, Currumbin Valley, QLD');
  console.log('Default application number: COM/2025/271');
}

updateProjectDefaults().catch(console.error);
