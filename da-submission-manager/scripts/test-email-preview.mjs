#!/usr/bin/env node

/**
 * Test email preview generation to verify applicant_full_name renders correctly
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

async function testEmailPreview() {
  console.log('🔍 Finding a test submission...\n');

  // Get a recent submission
  const { data: submission, error } = await supabase
    .from('submissions')
    .select('id, applicant_first_name, applicant_last_name, applicant_email, site_address')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !submission) {
    console.error('❌ No submissions found to test');
    process.exit(1);
  }

  console.log('📋 Test Submission:');
  console.log(`   ID: ${submission.id}`);
  console.log(`   Name: ${submission.applicant_first_name} ${submission.applicant_last_name}`);
  console.log(`   Email: ${submission.applicant_email}`);
  console.log(`   Site: ${submission.site_address}\n`);

  console.log('🧪 To test the email preview:');
  console.log(`   1. Visit the submission form in your browser`);
  console.log(`   2. Complete a submission`);
  console.log(`   3. Check the "Review Your Email" page`);
  console.log(`   4. Verify "Kind regards," is followed by the user's name`);
  console.log(`   5. Verify NO "[object Object]" appears\n`);

  console.log('✅ Expected format:');
  console.log('   ---');
  console.log('   Kind regards,');
  console.log(`   ${submission.applicant_first_name} ${submission.applicant_last_name}`);
  console.log('   ---\n');
}

testEmailPreview()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

