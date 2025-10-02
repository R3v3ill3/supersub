import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), 'apps', 'api', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: submission } = await supabase
  .from('submissions')
  .select('grounds_pdf_data')
  .not('grounds_pdf_data', 'is', null)
  .limit(1)
  .single();

const pdfData = submission.grounds_pdf_data;
console.log('📊 Testing different decode methods:');
console.log('Data type:', typeof pdfData);
console.log('First 200 chars:', pdfData.substring(0, 200));

// Test 1: Decode as hex (with \x prefix)
try {
  const hexData = pdfData.startsWith('\\x') ? pdfData.slice(2) : pdfData;
  const buffer = Buffer.from(hexData, 'hex');
  const magicBytes = buffer.slice(0, 4).toString('ascii');
  console.log('\n✅ HEX decode result:');
  console.log('   Magic bytes:', magicBytes);
  console.log('   Is valid PDF:', magicBytes === '%PDF');
  console.log('   Buffer size:', buffer.length);
  
  if (magicBytes === '%PDF') {
    fs.writeFileSync('test-hex-decoded.pdf', buffer);
    console.log('   ✅ Written to test-hex-decoded.pdf - TRY OPENING IT!');
  }
} catch (e) {
  console.log('❌ HEX decode failed:', e.message);
}

// Test 2: Decode as base64
try {
  const buffer = Buffer.from(pdfData, 'base64');
  const magicBytes = buffer.slice(0, 4).toString('ascii');
  console.log('\n❌ BASE64 decode result:');
  console.log('   Magic bytes:', magicBytes);
  console.log('   Is valid PDF:', magicBytes === '%PDF');
} catch (e) {
  console.log('❌ BASE64 decode failed:', e.message);
}
