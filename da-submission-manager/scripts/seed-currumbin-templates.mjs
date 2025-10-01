import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from environment or command line
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = process.env.PROJECT_ID || '47e0d49d-0a2a-4385-82eb-7214e109becb';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedCurrumbinTemplates() {
  console.log('🌴 Seeding Currumbin Valley project templates...\n');
  console.log(`Project ID: ${projectId}\n`);

  // Verify project exists
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    console.error(`❌ Project not found: ${projectError?.message || projectId}`);
    return;
  }

  console.log(`✅ Found project: ${project.name} (${project.slug})\n`);

  // Read template files
  const originalGrounds = await fs.readFile(
    path.join(__dirname, '../packages/templates/currumbin-original-grounds.md'),
    'utf-8'
  );

  const followupGrounds = await fs.readFile(
    path.join(__dirname, '../packages/templates/currumbin-followup-grounds.md'),
    'utf-8'
  );

  // Upload templates
  console.log('📤 Uploading templates to storage...\n');

  const originalPath = await uploadTemplate(
    projectId,
    'currumbin-original-grounds.md',
    originalGrounds
  );

  const followupPath = await uploadTemplate(
    projectId,
    'currumbin-followup-grounds.md',
    followupGrounds
  );

  console.log('\n✅ Currumbin Valley templates seeded successfully!\n');
  console.log('📋 Next step: Update the project dual-track configuration:\n');
  console.log(JSON.stringify({
    is_dual_track: true,
    dual_track_config: {
      original_grounds_template_id: originalPath,
      followup_grounds_template_id: followupPath,
      track_selection_prompt: "Have you previously made a submission on this development application?",
      track_descriptions: {
        followup: "I have previously made a submission and want to add additional points",
        comprehensive: "This is my first submission (includes all objection grounds)"
      }
    }
  }, null, 2));

  console.log('\n💡 You can update this via the API:');
  console.log(`PATCH /api/projects/${projectId}/dual-track`);
}

async function uploadTemplate(projectId, filename, content) {
  const storagePath = `templates/${projectId}/${filename}`;

  console.log(`  Uploading ${filename}...`);

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('templates')
    .upload(storagePath, content, {
      contentType: 'text/markdown',
      upsert: true
    });

  if (uploadError) {
    console.error(`  ❌ Upload failed: ${uploadError.message}`);
    throw uploadError;
  }

  console.log(`  ✅ Uploaded to: ${storagePath}`);
  return storagePath;
}

seedCurrumbinTemplates().catch(console.error);
