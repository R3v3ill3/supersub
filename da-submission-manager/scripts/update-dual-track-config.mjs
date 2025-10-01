import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = '47e0d49d-0a2a-4385-82eb-7214e109becb';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDualTrackConfig() {
  console.log('🔧 Updating dual-track configuration...\n');

  const { data, error } = await supabase
    .from('projects')
    .update({
      is_dual_track: true,
      dual_track_config: {
        original_grounds_template_id: `templates/${projectId}/currumbin-original-grounds.md`,
        followup_grounds_template_id: `templates/${projectId}/currumbin-followup-grounds.md`,
        track_selection_prompt: "Have you previously made a submission on this development application?",
        track_descriptions: {
          followup: "I have previously made a submission and want to add additional points",
          comprehensive: "This is my first submission (includes all objection grounds)"
        }
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)
    .select('id, name, is_dual_track, dual_track_config')
    .single();

  if (error) {
    console.error('❌ Failed to update project:', error.message);
    process.exit(1);
  }

  console.log('✅ Project updated successfully!\n');
  console.log('Project:', data.name);
  console.log('Dual-track enabled:', data.is_dual_track);
  console.log('\nConfiguration:');
  console.log(JSON.stringify(data.dual_track_config, null, 2));
}

updateDualTrackConfig().catch(console.error);
