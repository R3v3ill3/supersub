import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log('\n=== STEP 1: CHECK DATABASE STORAGE ===\n');

// Get most recent submission
const { data: submission, error: subError } = await client
  .from('submissions')
  .select('id, created_at')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

if (subError) {
  console.error('Error fetching submission:', subError);
  process.exit(1);
}

console.log('Latest submission ID:', submission.id);
console.log('Created:', submission.created_at);

// Get survey response for this submission
const { data: survey, error: surveyError } = await client
  .from('survey_responses')
  .select('*')
  .eq('submission_id', submission.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

if (surveyError) {
  console.error('Error fetching survey:', surveyError);
  process.exit(1);
}

console.log('\n--- Survey Response Data ---');
console.log('user_style_sample:', survey.user_style_sample ? `"${survey.user_style_sample}"` : '(empty/null)');
console.log('user_style_sample length:', survey.user_style_sample?.length || 0);
console.log('');
console.log('custom_grounds:', survey.custom_grounds ? `"${survey.custom_grounds}"` : '(empty/null)');
console.log('custom_grounds length:', survey.custom_grounds?.length || 0);
console.log('');
console.log('selected_keys:', survey.selected_keys);
console.log('ordered_keys:', survey.ordered_keys);

// Get the actual draft that was generated
const { data: draft, error: draftError } = await client
  .from('llm_drafts')
  .select('output_text, provider, model, input_summary')
  .eq('submission_id', submission.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

if (draftError) {
  console.error('Error fetching draft:', draftError);
  process.exit(1);
}

console.log('\n=== STEP 2: CHECK GENERATED OUTPUT ===\n');
console.log('Provider:', draft.provider);
console.log('Model:', draft.model);
console.log('Output length:', draft.output_text.length, 'chars');

// Search for user input in output
if (survey.user_style_sample && survey.user_style_sample.trim()) {
  const styleInOutput = draft.output_text.includes(survey.user_style_sample.trim());
  console.log('\n--- user_style_sample in output:', styleInOutput ? '✅ YES' : '❌ NO');
  if (!styleInOutput) {
    // Try partial match
    const words = survey.user_style_sample.trim().split(/\s+/).slice(0, 5).join(' ');
    const partialMatch = draft.output_text.includes(words);
    console.log('   Partial match (first 5 words):', partialMatch ? '⚠️ PARTIAL' : '❌ NO');
  }
}

if (survey.custom_grounds && survey.custom_grounds.trim()) {
  const customInOutput = draft.output_text.includes(survey.custom_grounds.trim());
  console.log('\n--- custom_grounds in output:', customInOutput ? '✅ YES' : '❌ NO');
  if (!customInOutput) {
    const words = survey.custom_grounds.trim().split(/\s+/).slice(0, 5).join(' ');
    const partialMatch = draft.output_text.includes(words);
    console.log('   Partial match (first 5 words):', partialMatch ? '⚠️ PARTIAL' : '❌ NO');
  }
}

// Show beginning of output
console.log('\n--- Output Preview (first 500 chars) ---');
console.log(draft.output_text.substring(0, 500));
console.log('...');

// Check input_summary to see what was sent to AI
console.log('\n=== STEP 3: CHECK INPUT SUMMARY ===\n');
console.log('Input summary:', JSON.stringify(draft.input_summary, null, 2));

