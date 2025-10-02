import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await client
  .from('llm_drafts')
  .select('output_text')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

// Show the raw markdown with visible line breaks
const text = data.output_text;
console.log('\n=== RAW MARKDOWN (first 2000 chars) ===\n');
console.log(text.substring(0, 2000).replace(/\n/g, '⏎\n'));
console.log('\n...\n');

// Find bullet point sections
console.log('\n=== BULLET POINT PATTERNS ===\n');
const bulletPattern = /^[-•*]\s+(.+)$/gm;
const matches = [...text.matchAll(bulletPattern)];
console.log(`Found ${matches.length} bullet points`);
console.log('\nFirst 10 bullets with context:');
matches.slice(0, 10).forEach((match, i) => {
  const line = match[0];
  const content = match[1];
  console.log(`\n${i + 1}. "${line}"`);
  console.log(`   Content starts with bold: ${content.startsWith('**')}`);
  console.log(`   Content length: ${content.length} chars`);
});
