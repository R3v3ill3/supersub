import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const submissionId = 'e61d65b1-af1d-44bb-9cf0-812d6a872369';

console.log('\n=== ALL DRAFTS FOR SUBMISSION ===\n');

const { data: drafts, error } = await client
  .from('llm_drafts')
  .select('id, provider, model, created_at, output_text, input_summary')
  .eq('submission_id', submissionId)
  .order('created_at', { ascending: true });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Found ${drafts.length} drafts:\n`);

drafts.forEach((draft, i) => {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Draft ${i + 1}:`);
  console.log(`Created: ${draft.created_at}`);
  console.log(`Provider: ${draft.provider}`);
  console.log(`Model: ${draft.model}`);
  console.log(`Output length: ${draft.output_text.length} chars`);
  console.log(`Input summary:`, JSON.stringify(draft.input_summary, null, 2));
  
  // Check for user inputs
  const testStyle = 'As a neighbour across the road';
  const hasUserStyle = draft.output_text.includes(testStyle);
  
  console.log(`\nContains user_style_sample phrase: ${hasUserStyle ? '✅ YES' : '❌ NO'}`);
  
  console.log(`\nOutput preview (first 400 chars):`);
  console.log(draft.output_text.substring(0, 400));
  console.log('...\n');
});

// Also check the survey to confirm what was passed
const { data: survey } = await client
  .from('survey_responses')
  .select('user_style_sample, custom_grounds')
  .eq('submission_id', submissionId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

console.log('\n=== SURVEY DATA (WHAT WAS AVAILABLE) ===\n');
console.log('user_style_sample:', survey.user_style_sample ? `"${survey.user_style_sample}"` : '(empty)');
console.log('custom_grounds:', survey.custom_grounds ? `"${survey.custom_grounds}"` : '(empty)');

