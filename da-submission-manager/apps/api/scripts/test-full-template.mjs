import Handlebars from 'handlebars';
import fs from 'node:fs/promises';

Handlebars.registerHelper('indent', function (text, spaces) {
  const pad = ' '.repeat(spaces);
  return text.split('\n').map((line) => pad + line).join('\n');
});

const templateContent = await fs.readFile('packages/prompts/submission.user.hbs', 'utf8');

console.log('Template file length:', templateContent.length, 'chars');
console.log('Template file lines:', templateContent.split('\n').length);
console.log('\n--- Template content lines 18-24 ---');
templateContent.split('\n').slice(17, 24).forEach((line, i) => {
  console.log(`${i + 18}: "${line}"`);
});

const compiled = Handlebars.compile(templateContent, { noEscape: true });

const testData = {
  recipient_name: 'Test Recipient',
  subject: 'Test Subject',
  application_number: 'TEST/123',
  site_address: 'Test Address',
  submission_track: 'comprehensive',
  approved_facts: 'Test facts here',
  selected_concerns: [{ key: 'test', body: 'Test body' }],
  user_style_sample: 'USER INTRO TEXT',
  custom_grounds: 'USER CUSTOM GROUNDS TEXT'
};

const output = compiled(testData);

console.log('\n--- Compiled output length:', output.length, 'chars');
console.log('--- Compiled output lines:', output.split('\n').length);

console.log('\n--- Looking for CUSTOM_GROUNDS section ---');
const outputLines = output.split('\n');
outputLines.forEach((line, i) => {
  if (line.includes('CUSTOM') || line.includes('USER_STYLE') || line.includes('GROUNDS')) {
    console.log(`Line ${i}: "${line}"`);
  }
});

console.log('\n--- Output lines 17-25 ---');
outputLines.slice(16, 25).forEach((line, i) => {
  console.log(`${i + 17}: "${line}"`);
});

console.log('\n--- Searching for user text ---');
console.log('Output contains "USER INTRO TEXT":', output.includes('USER INTRO TEXT'));
console.log('Output contains "USER CUSTOM GROUNDS TEXT":', output.includes('USER CUSTOM GROUNDS TEXT'));
console.log('Output contains "CUSTOM_GROUNDS":', output.includes('CUSTOM_GROUNDS'));

