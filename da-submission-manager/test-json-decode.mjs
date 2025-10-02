import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'apps', 'api', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: submission } = await supabase
  .from('submissions')
  .select('grounds_pdf_data')
  .not('grounds_pdf_data', 'is', null)
  .limit(1)
  .single();

const pdfData = submission.grounds_pdf_data;

// Decode from hex
const hexData = pdfData.startsWith('\\x') ? pdfData.slice(2) : pdfData;
const hexBuffer = Buffer.from(hexData, 'hex');
const jsonString = hexBuffer.toString('utf8');

console.log('📊 Decoded string (first 500 chars):');
console.log(jsonString.substring(0, 500));

// Parse the JSON
try {
  const bufferJson = JSON.parse(jsonString);
  console.log('\n✅ Successfully parsed as JSON!');
  console.log('   Type:', bufferJson.type);
  console.log('   Data length:', bufferJson.data?.length);
  
  // Reconstruct the buffer from the JSON data array
  const reconstructedBuffer = Buffer.from(bufferJson.data);
  const magicBytes = reconstructedBuffer.slice(0, 4).toString('ascii');
  console.log('   Magic bytes:', magicBytes);
  console.log('   Is valid PDF:', magicBytes === '%PDF');
  console.log('   Buffer size:', reconstructedBuffer.length);
  
  if (magicBytes === '%PDF') {
    fs.writeFileSync('test-final-decoded.pdf', reconstructedBuffer);
    console.log('\n🎉 SUCCESS! Written to test-final-decoded.pdf');
    console.log('   👉 This PDF should be readable now!');
  }
} catch (e) {
  console.log('❌ JSON parse failed:', e.message);
}
