#!/usr/bin/env node

/**
 * Update existing projects to use new email template format
 * This removes the "Applicant: [object Object]" bug and uses submitter name in signature
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const NEW_DEFAULT_TEMPLATE = `Dear {{council_name}},

Attention: Tim Baker CEO,

Please find attached the development application submission for {{site_address}}.

Email: {{applicant_email}}
{{application_number_line}}

Kind regards,
{{applicant_full_name}}`;

const NEW_GOLD_COAST_TEMPLATE = `Dear {{council_name}},

Attention: Tim Baker CEO,

Please find attached our development application submission in response to Application {{application_number}}.

Property: {{site_address}}
Email: {{applicant_email}}
Position: OBJECTING

This submission outlines community concerns regarding the proposed development and its compliance with the Gold Coast City Plan.

Kind regards,
{{applicant_full_name}}`;

async function updateEmailTemplates() {
  console.log('🔍 Checking for projects with old email templates...\n');

  // Get all active projects
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, slug, council_email_body_template')
    .eq('is_active', true);

  if (error) {
    console.error('❌ Error fetching projects:', error);
    process.exit(1);
  }

  console.log(`Found ${projects.length} active projects\n`);

  let updatedCount = 0;

  for (const project of projects) {
    const template = project.council_email_body_template;
    
    // Skip if already updated
    if (!template || template.includes('Attention: Tim Baker CEO')) {
      console.log(`✓ ${project.name} (${project.slug}) - Already updated`);
      continue;
    }

    // Check if it needs updating
    const hasOldApplicantLine = template.includes('Applicant: {{applicant_full_name}}');
    const hasOldSenderName = template.includes('{{sender_name}}');
    const isGoldCoast = template.includes('Property: {{site_address}}') && template.includes('Position: OBJECTING');

    if (!hasOldApplicantLine && !hasOldSenderName) {
      console.log(`⊘ ${project.name} (${project.slug}) - Custom template, skipping`);
      continue;
    }

    // Determine which new template to use
    const newTemplate = isGoldCoast ? NEW_GOLD_COAST_TEMPLATE : NEW_DEFAULT_TEMPLATE;

    // Update the project
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        council_email_body_template: newTemplate,
        updated_at: new Date().toISOString()
      })
      .eq('id', project.id);

    if (updateError) {
      console.error(`❌ Error updating ${project.name}:`, updateError);
      continue;
    }

    console.log(`✓ Updated ${project.name} (${project.slug}) - Using ${isGoldCoast ? 'Gold Coast' : 'default'} template`);
    updatedCount++;
  }

  console.log(`\n✅ Updated ${updatedCount} project(s)`);
  console.log(`✓ ${projects.length - updatedCount} project(s) were already up-to-date or had custom templates`);
}

updateEmailTemplates()
  .then(() => {
    console.log('\n🎉 Email template update complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });

