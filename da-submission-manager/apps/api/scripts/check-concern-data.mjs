#!/usr/bin/env node
/**
 * Diagnostic: Check Concern Template Data
 * Verifies that concern templates contain specific measurements and details
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Critical measurements we're looking for
const CRITICAL_DATA = [
  { search: '12,600', description: 'Cut volume (12,600 m³)' },
  { search: '2,400', description: 'Fill volume (2,400 m³)' },
  { search: '7,000', description: 'Soil export (7,000 m³)' },
  { search: 'steep batters', description: 'Technical term: steep batters' },
  { search: 'retaining walls', description: 'Technical term: retaining walls' }
];

async function checkConcerns() {
  console.log('🔍 CONCERN TEMPLATE DATA CHECK\n' + '='.repeat(60));

  try {
    const { data: concerns, error } = await supabase
      .from('concern_templates')
      .select('key, label, body, version, is_active')
      .eq('version', 'v1')
      .eq('is_active', true)
      .order('key');

    if (error) throw error;

    if (!concerns || concerns.length === 0) {
      console.error('❌ No concern templates found in database!');
      console.error('   Run seed script to populate concerns.');
      return 1;
    }

    console.log(`\n✓ Found ${concerns.length} active concern templates (version v1)\n`);

    // Check each critical data point
    console.log('📊 CHECKING FOR CRITICAL DATA POINTS:\n');
    const results = { found: [], missing: [] };

    for (const check of CRITICAL_DATA) {
      const found = concerns.some(c => c.body.includes(check.search));
      if (found) {
        results.found.push(check);
        console.log(`  ✓ ${check.description}`);
      } else {
        results.missing.push(check);
        console.log(`  ✗ MISSING: ${check.description}`);
      }
    }

    // List all concerns with their bodies
    console.log('\n\n📋 ALL CONCERN TEMPLATES:\n' + '-'.repeat(60));
    
    for (const concern of concerns) {
      console.log(`\n[${concern.key}]`);
      console.log(`Label: ${concern.label}`);
      console.log(`Body: ${concern.body}`);
      console.log(`Length: ${concern.body.length} chars, ${concern.body.split(' ').length} words`);
      
      // Check for specific measurements in this concern
      const hasNumbers = concern.body.match(/\d+,?\d*\s*m³?/g);
      if (hasNumbers) {
        console.log(`Measurements found: ${hasNumbers.join(', ')}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 SUMMARY\n');
    console.log(`✓ Data points found: ${results.found.length}/${CRITICAL_DATA.length}`);
    console.log(`✗ Data points missing: ${results.missing.length}/${CRITICAL_DATA.length}`);

    if (results.missing.length > 0) {
      console.log('\n⚠️  WARNING: Critical measurements are missing from concern templates!');
      console.log('   Missing data:');
      results.missing.forEach(m => console.log(`   - ${m.description}`));
      console.log('\n   Action needed: Update concern templates in database to include specific measurements.');
      return 1;
    } else {
      console.log('\n✅ All critical data points are present in concern templates!');
      console.log('   The measurements should appear in generated submissions.');
      return 0;
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    return 1;
  }
}

checkConcerns()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });

