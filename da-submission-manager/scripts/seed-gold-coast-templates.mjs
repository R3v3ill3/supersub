import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load from .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedGoldCoastTemplates() {
  console.log('🌴 Seeding Gold Coast default templates...\n');

  // Read template files
  const submissionTemplate = await fs.readFile(
    path.join(__dirname, '../packages/templates/gold-coast-submission-template.md'),
    'utf-8'
  );
  
  const coverTemplate = await fs.readFile(
    path.join(__dirname, '../packages/templates/gold-coast-cover-template.md'),
    'utf-8'
  );

  // Get all projects (or specific Gold Coast project)
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('council_name', 'Gold Coast City Council');

  if (projectError || !projects?.length) {
    console.warn('⚠️  No Gold Coast projects found. Templates will be added when project is created.');
    return;
  }

  for (const project of projects) {
    console.log(`\n📁 Processing project: ${project.name} (${project.slug})`);

    // 1. Add submission_format (Gold Coast structure template)
    await addTemplate(project.id, 'submission_format', 'Gold Coast Submission Structure', submissionTemplate);

    // 2. Add council_email (cover letter)
    await addTemplate(project.id, 'council_email', 'Gold Coast Cover Letter', coverTemplate);
  }

  console.log('\n✅ Gold Coast templates seeded successfully!');
}

async function addTemplate(projectId, templateType, name, content) {
  const filename = `${templateType}-default.md`;
  const storagePath = `templates/${projectId}/${filename}`;

  console.log(`  Adding ${templateType}...`);

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('templates')
    .upload(storagePath, content, {
      contentType: 'text/markdown',
      upsert: true
    });

  if (uploadError) {
    console.error(`  ❌ Upload failed: ${uploadError.message}`);
    return;
  }

  // Create template_file entry
  const { data: templateFile, error: fileError } = await supabase
    .from('template_files')
    .upsert({
      project_id: projectId,
      template_type: templateType,
      storage_path: storagePath,
      mimetype: 'text/markdown',
      original_filename: filename,
      merge_fields: []
    }, {
      onConflict: 'project_id,template_type',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (fileError) {
    console.error(`  ❌ Database insert failed: ${fileError.message}`);
    return;
  }

  // Create version entry
  const { data: version, error: versionError } = await supabase
    .from('template_versions')
    .insert({
      template_file_id: templateFile.id,
      version_label: 'v1.0',
      storage_path: storagePath,
      mimetype: 'text/markdown',
      original_filename: filename,
      merge_fields: [],
      version_notes: 'Default Gold Coast template'
    })
    .select()
    .single();

  if (versionError) {
    console.error(`  ❌ Version insert failed: ${versionError.message}`);
    return;
  }

  // Set as active version
  const { error: updateError } = await supabase
    .from('template_files')
    .update({ active_version_id: version.id })
    .eq('id', templateFile.id);

  if (updateError) {
    console.error(`  ❌ Failed to set active version: ${updateError.message}`);
    return;
  }

  console.log(`  ✅ ${templateType} added successfully`);
}

seedGoldCoastTemplates().catch(console.error);
