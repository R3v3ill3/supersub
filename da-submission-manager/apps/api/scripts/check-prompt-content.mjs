import 'dotenv/config';
import Handlebars from 'handlebars';
import fs from 'node:fs/promises';
import path from 'node:path';

// Register the indent helper (same as in llm.ts)
Handlebars.registerHelper('indent', function (text, spaces) {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => pad + line)
    .join('\n');
});

// Load templates
const systemPath = path.resolve(process.cwd(), 'packages/prompts/submission.system.txt');
const userTplPath = path.resolve(process.cwd(), 'packages/prompts/submission.user.hbs');

const [system, userTplStr] = await Promise.all([
  fs.readFile(systemPath, 'utf8'),
  fs.readFile(userTplPath, 'utf8')
]);

// Simulate the data that would be passed
const userTpl = Handlebars.compile(userTplStr, { noEscape: true });
const user = userTpl({
  recipient_name: 'Council Assessment Team',
  subject: 'Submission regarding Development Application',
  application_number: 'COM/2025/271',
  site_address: '940 Currumbin Creek Road',
  submission_track: 'comprehensive',
  approved_facts: 'Test facts...',
  selected_concerns: [
    { key: 'test_concern', body: 'Test concern body text...' }
  ],
  user_style_sample: 'As a neighbour across the road, I strongly oppose this inappropriate development',
  custom_grounds: 'I am also concerned about drainage and koala habitat'
});

console.log('\n=== COMPILED USER PROMPT ===\n');
console.log(user);
console.log('\n=== END USER PROMPT ===\n');

// Check if fields are present
console.log('Contains USER_STYLE_SAMPLE section:', user.includes('USER_STYLE_SAMPLE'));
console.log('Contains CUSTOM_GROUNDS section:', user.includes('CUSTOM_GROUNDS'));
console.log('Contains user text "As a neighbour":', user.includes('As a neighbour'));
console.log('Contains custom text "drainage":', user.includes('drainage'));

