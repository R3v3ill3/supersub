import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing env vars');
  process.exit(1);
}

const client = createClient(url, key);

console.log('\n=== CONCERNS FOR COMPREHENSIVE TRACK ===\n');

// This mimics what the survey endpoint returns for comprehensive track
const { data, error } = await client
  .from('concern_templates')
  .select('key,label,body,track')
  .eq('version', 'v1')
  .eq('is_active', true);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

// Filter for comprehensive track (same logic as survey.ts)
const comprehensiveConcerns = data.filter(c => {
  const track = c.track;
  if (!track || track === 'all') return true;
  return track === 'comprehensive';
});

console.log('Total concerns in DB:', data.length);
console.log('Concerns shown for COMPREHENSIVE track:', comprehensiveConcerns.length);
console.log('\n');

comprehensiveConcerns.forEach(c => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('KEY:', c.key);
  console.log('LABEL:', c.label);
  console.log('HAS MEASUREMENTS:', c.body.includes('12,600') || c.body.includes('m³') ? 'YES ✓' : 'NO ✗');
  console.log('BODY:', c.body);
  console.log('');
});
