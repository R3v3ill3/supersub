import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const client = createClient(url, key);

const { data, error } = await client
  .from('concern_templates')
  .select('key,label,body,track,version')
  .eq('version', 'v1')
  .eq('is_active', true)
  .order('key');

if (error) {
  console.error('Error:', error);
  process.exit(1);
} else {
  console.log('\n=== DATABASE CONCERN_TEMPLATES (v1) ===\n');
  console.log('Found', data.length, 'concerns:\n');
  data.forEach(c => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('KEY:', c.key);
    console.log('LABEL:', c.label);
    console.log('TRACK:', c.track || '(not set)');
    console.log('BODY LENGTH:', c.body.length, 'chars');
    console.log('BODY PREVIEW:');
    console.log(c.body.substring(0, 300));
    if (c.body.length > 300) console.log('... (truncated)');
    console.log('');
  });
  
  // Check for specific measurements
  const withMeasurements = data.filter(c => c.body.includes('12,600'));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Concerns with "12,600" measurement:', withMeasurements.length);
  if (withMeasurements.length > 0) {
    withMeasurements.forEach(c => console.log('  -', c.key));
  }
}
