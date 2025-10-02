#!/usr/bin/env node

/**
 * Check the current email template for a project
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

async function checkEmailTemplate() {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, slug, council_email_body_template')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Error fetching project:', error);
    process.exit(1);
  }

  console.log('📧 Current Email Template for:', projects.name);
  console.log('=' .repeat(60));
  console.log(projects.council_email_body_template);
  console.log('=' .repeat(60));
}

checkEmailTemplate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });

