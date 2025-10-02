import Handlebars from 'handlebars';
import fs from 'node:fs/promises';

Handlebars.registerHelper('indent', function (text, spaces) {
  const pad = ' '.repeat(spaces);
  return text.split('\n').map((line) => pad + line).join('\n');
});

const template = await fs.readFile('packages/prompts/submission.user.hbs', 'utf8');
const compiled = Handlebars.compile(template, { noEscape: true });

const output = compiled({
  recipient_name: 'Test Recipient',
  subject: 'Test Subject',
  application_number: 'TEST/123',
  site_address: 'Test Address',
  submission_track: 'comprehensive',
  approved_facts: 'Test facts here',
  selected_concerns: [
    { key: 'test', body: 'Test concern body' }
  ],
  user_style_sample: 'MY USER STYLE SAMPLE TEXT HERE',
  custom_grounds: 'MY CUSTOM GROUNDS TEXT HERE'
});

console.log('\n=== TEMPLATE OUTPUT ===\n');
console.log(output);
console.log('\n=== CHECKS ===\n');
console.log('Has "USER_STYLE_SAMPLE:"', output.includes('USER_STYLE_SAMPLE:'));
console.log('Has "MY USER STYLE"', output.includes('MY USER STYLE'));
console.log('Has "CUSTOM_GROUNDS"', output.includes('CUSTOM_GROUNDS'));
console.log('Has "MY CUSTOM GROUNDS"', output.includes('MY CUSTOM GROUNDS'));

// Count lines
const lines = output.split('\n');
console.log('\nTotal lines:', lines.length);
console.log('\nLines 15-25:');
lines.slice(14, 25).forEach((line, i) => {
  console.log(`${i + 15}: "${line}"`);
});

