#!/usr/bin/env node

/**
 * Force update existing projects to include name and residential address
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

const NEW_TEMPLATE = `Dear {{council_name}},

Attention: Tim Baker CEO,

Please find attached the development application submission for {{site_address}}.

Name: {{applicant_full_name}}
Residential Address: {{applicant_residential_address}}, {{applicant_suburb}} {{applicant_state}} {{applicant_postcode}}
Email: {{applicant_email}}
{{application_number_line}}

Kind regards,
{{applicant_full_name}}`;

async function forceUpdate() {
  console.log('🔄 Force updating all active projects with new template...\n');

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('is_active', true);

  if (error) {
    console.error('❌ Error fetching projects:', error);
    process.exit(1);
  }

  console.log(`Found ${projects.length} active projects\n`);

  for (const project of projects) {
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        council_email_body_template: NEW_TEMPLATE,
        updated_at: new Date().toISOString()
      })
      .eq('id', project.id);

    if (updateError) {
      console.error(`❌ Error updating ${project.name}:`, updateError);
      continue;
    }

    console.log(`✓ Updated ${project.name} (${project.slug})`);
  }

  console.log(`\n✅ Force update complete!`);
}

forceUpdate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });

