import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false } });

// Options for cleanup
const CLEANUP_OPTIONS = {
  // Option 1: Delete all submissions (use with caution!)
  ALL: 'all',
  
  // Option 2: Delete submissions by email pattern (e.g., test@example.com)
  BY_EMAIL: 'by_email',
  
  // Option 3: Delete submissions from today only
  TODAY: 'today',
  
  // Option 4: Delete submissions older than X days
  OLDER_THAN: 'older_than'
};

async function askConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(message + ' (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function previewDeletion(filter) {
  let query = client.from('submissions').select('id, applicant_email, created_at, site_address, status');
  
  if (filter.email) {
    query = query.ilike('applicant_email', filter.email);
  }
  if (filter.dateFrom) {
    query = query.gte('created_at', filter.dateFrom);
  }
  if (filter.dateTo) {
    query = query.lte('created_at', filter.dateTo);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }
  
  return data || [];
}

async function deleteSubmissions(submissionIds) {
  console.log(`\n🗑️  Deleting ${submissionIds.length} submissions...\n`);
  
  // Delete submissions (cascades to survey_responses, llm_drafts, documents, etc.)
  const { error } = await client
    .from('submissions')
    .delete()
    .in('id', submissionIds);
  
  if (error) {
    console.error('❌ Error deleting submissions:', error.message);
    return false;
  }
  
  console.log(`✅ Successfully deleted ${submissionIds.length} submissions`);
  console.log('   (Related survey_responses, llm_drafts, and documents also deleted via CASCADE)');
  return true;
}

async function main() {
  console.log('\n🧹 Submission Cleanup Tool\n');
  console.log('Choose cleanup option:\n');
  console.log('1. Delete ALL submissions (⚠️  DANGEROUS)');
  console.log('2. Delete submissions by email pattern (e.g., test@example.com, %@test.com)');
  console.log('3. Delete submissions from today only');
  console.log('4. Delete submissions from last N days');
  console.log('5. Exit\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const choice = await new Promise((resolve) => {
    rl.question('Enter choice (1-5): ', resolve);
  });
  
  let filter = {};
  
  switch (choice) {
    case '1':
      console.log('\n⚠️  WARNING: This will delete ALL submissions!');
      filter = {};
      break;
      
    case '2':
      const email = await new Promise((resolve) => {
        rl.question('Enter email pattern (e.g., troyburton@gmail.com or %test%): ', resolve);
      });
      filter = { email };
      break;
      
    case '3':
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filter = { dateFrom: today.toISOString() };
      break;
      
    case '4':
      const days = await new Promise((resolve) => {
        rl.question('Delete submissions from last N days: ', resolve);
      });
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      filter = { dateFrom: daysAgo.toISOString() };
      break;
      
    case '5':
      console.log('Exiting...');
      rl.close();
      process.exit(0);
      
    default:
      console.log('Invalid choice');
      rl.close();
      process.exit(1);
  }
  
  rl.close();
  
  // Preview what will be deleted
  console.log('\n🔍 Finding submissions to delete...\n');
  const submissions = await previewDeletion(filter);
  
  if (submissions.length === 0) {
    console.log('No submissions found matching criteria.');
    process.exit(0);
  }
  
  console.log(`Found ${submissions.length} submissions:\n`);
  submissions.forEach((sub, i) => {
    console.log(`${i + 1}. ${sub.applicant_email} - ${sub.site_address || '(no address)'}`);
    console.log(`   Created: ${new Date(sub.created_at).toLocaleString()}`);
    console.log(`   Status: ${sub.status}`);
    console.log('');
  });
  
  const confirmed = await askConfirmation(`\n⚠️  Delete these ${submissions.length} submissions?`);
  
  if (!confirmed) {
    console.log('Cancelled.');
    process.exit(0);
  }
  
  const success = await deleteSubmissions(submissions.map(s => s.id));
  
  if (success) {
    console.log('\n✨ Cleanup complete!\n');
  } else {
    console.log('\n❌ Cleanup failed\n');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});

