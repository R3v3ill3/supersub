import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const version = process.env.TEMPLATE_VERSION || 'v1';
const client = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const file = path.resolve(__dirname, '../../../packages/templates/concerns.' + version + '.json');
  const raw = await fs.readFile(file, 'utf8');
  const list = JSON.parse(raw);
  for (const item of list) {
    const { error } = await client
      .from('concern_templates')
      .upsert(
        {
          version,
          key: item.key,
          label: item.label,
          body: item.body,
          is_active: true
        },
        { onConflict: 'version,key' }
      );
    if (error) {
      console.error('Upsert failed for key', item.key, error.message);
      process.exitCode = 1;
    } else {
      console.log('Upserted', item.key);
    }
  }
  console.log('Seed complete for version', version);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
