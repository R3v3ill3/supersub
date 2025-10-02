#!/usr/bin/env node
/**
 * Diagnostic script to test PDF download issue
 * 
 * This script will:
 * 1. Check if PDF data exists in database
 * 2. Verify the format of the stored data
 * 3. Test if the data can be properly decoded
 * 4. Write a test PDF file to verify it's valid
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), 'apps', 'api', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPdfDownload() {
  console.log('🔍 Testing PDF Download Issue\n');
  console.log('='.repeat(80));

  // Step 1: Find a recent submission with PDF data
  console.log('\n📊 Step 1: Finding submissions with PDF data...');
  
  const { data: submissions, error: queryError } = await supabase
    .from('submissions')
    .select('id, site_address, grounds_pdf_filename, created_at, status')
    .not('grounds_pdf_data', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (queryError) {
    console.error('❌ Query Error:', queryError);
    return;
  }

  if (!submissions || submissions.length === 0) {
    console.log('⚠️  No submissions found with PDF data');
    console.log('   This might mean:');
    console.log('   1. No submissions have been created yet');
    console.log('   2. PDFs are not being stored in the database');
    return;
  }

  console.log(`✅ Found ${submissions.length} submissions with PDF data:`);
  submissions.forEach((sub, idx) => {
    console.log(`   ${idx + 1}. ${sub.id} - ${sub.site_address} (${sub.status})`);
  });

  // Step 2: Get the PDF data from the most recent submission
  const testSubmissionId = submissions[0].id;
  console.log(`\n📄 Step 2: Retrieving PDF data for submission: ${testSubmissionId}`);

  const { data: submission, error: fetchError } = await supabase
    .from('submissions')
    .select('id, grounds_pdf_data, grounds_pdf_filename')
    .eq('id', testSubmissionId)
    .single();

  if (fetchError) {
    console.error('❌ Fetch Error:', fetchError);
    return;
  }

  if (!submission) {
    console.error('❌ Submission not found');
    return;
  }

  console.log(`✅ Retrieved submission data`);
  console.log(`   Filename: ${submission.grounds_pdf_filename || 'N/A'}`);

  // Step 3: Analyze the PDF data
  console.log('\n🔬 Step 3: Analyzing PDF data format...');
  
  const pdfData = submission.grounds_pdf_data;
  
  if (!pdfData) {
    console.error('❌ PDF data is null or undefined');
    return;
  }

  console.log(`   Data type: ${typeof pdfData}`);
  
  if (typeof pdfData === 'string') {
    console.log(`   String length: ${pdfData.length} characters`);
    console.log(`   First 100 chars: ${pdfData.substring(0, 100)}`);
    
    // Check if it looks like base64
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    const isBase64Like = base64Pattern.test(pdfData.substring(0, 100));
    console.log(`   Looks like base64: ${isBase64Like ? '✅ Yes' : '❌ No'}`);
    
    // Check if it starts with PDF magic bytes (after base64 decode)
    try {
      const buffer = Buffer.from(pdfData, 'base64');
      const magicBytes = buffer.slice(0, 4).toString('ascii');
      const isPdf = magicBytes === '%PDF';
      console.log(`   Decoded magic bytes: "${magicBytes}"`);
      console.log(`   Valid PDF signature: ${isPdf ? '✅ Yes' : '❌ No'}`);
      console.log(`   Decoded buffer size: ${buffer.length} bytes (${(buffer.length / 1024).toFixed(2)} KB)`);
      
      // Step 4: Write test file
      console.log('\n💾 Step 4: Writing test PDF file...');
      const testFilePath = path.join(process.cwd(), 'test-downloaded.pdf');
      fs.writeFileSync(testFilePath, buffer);
      console.log(`✅ Test PDF written to: ${testFilePath}`);
      console.log('   👉 Try opening this file to see if it\'s readable!');
      
    } catch (decodeError) {
      console.error('❌ Failed to decode base64:', decodeError.message);
      console.log('   This suggests the data is NOT properly base64-encoded');
    }
  } else if (Buffer.isBuffer(pdfData)) {
    console.log(`   Buffer size: ${pdfData.length} bytes`);
    const magicBytes = pdfData.slice(0, 4).toString('ascii');
    const isPdf = magicBytes === '%PDF';
    console.log(`   Magic bytes: "${magicBytes}"`);
    console.log(`   Valid PDF signature: ${isPdf ? '✅ Yes' : '❌ No'}`);
    
    // Write test file
    console.log('\n💾 Step 4: Writing test PDF file...');
    const testFilePath = path.join(process.cwd(), 'test-downloaded.pdf');
    fs.writeFileSync(testFilePath, pdfData);
    console.log(`✅ Test PDF written to: ${testFilePath}`);
    console.log('   👉 Try opening this file to see if it\'s readable!');
  } else {
    console.error(`❌ Unexpected data type: ${typeof pdfData}`);
    console.log(`   Value: ${JSON.stringify(pdfData).substring(0, 200)}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Diagnostic complete!');
  console.log('\n📋 Summary:');
  console.log('   1. Check if test-downloaded.pdf opens correctly');
  console.log('   2. If it does, the issue is in the download endpoint');
  console.log('   3. If it doesn\'t, the issue is in how PDFs are stored');
}

testPdfDownload().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});

