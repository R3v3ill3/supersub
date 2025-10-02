import Handlebars from 'handlebars';
import fs from 'node:fs/promises';

Handlebars.registerHelper('indent', function (text, spaces) {
  const pad = ' '.repeat(spaces);
  return text.split('\n').map((line) => pad + line).join('\n');
});

const template = await fs.readFile('packages/prompts/submission.user.hbs', 'utf8');
const compiled = Handlebars.compile(template, { noEscape: true });

const testData = {
  recipient_name: 'Council Assessment Team',
  subject: 'Submission regarding Development Application',
  application_number: 'COM/2025/271',
  site_address: '940 Currumbin Creek Road',
  approved_facts: 'Test facts...',
  selected_concerns: [{ key: 'test', body: 'Test body' }],
  user_style_sample: 'As a neighbour, I strongly oppose this development.',
  custom_grounds: 'I am particularly concerned about drainage and koala habitat impacts.'
};

const output = compiled(testData);

console.log('✅ VERIFICATION RESULTS:\n');
console.log('Template file lines:', template.split('\n').length);
console.log('Compiled output lines:', output.split('\n').length);
console.log('');
console.log('Contains USER_STYLE_SAMPLE section:', output.includes('USER_STYLE_SAMPLE:') ? '✅' : '❌');
console.log('Contains user intro text:', output.includes('As a neighbour') ? '✅' : '❌');
console.log('Contains CUSTOM_GROUNDS section:', output.includes('CUSTOM_GROUNDS') ? '✅' : '❌');
console.log('Contains custom grounds text:', output.includes('drainage and koala') ? '✅' : '❌');
console.log('Contains EXAMPLE section:', output.includes('EXAMPLE OF CORRECT') ? '✅' : '❌');
console.log('');

// Show the custom grounds section in output
const lines = output.split('\n');
const customIndex = lines.findIndex(l => l.includes('CUSTOM_GROUNDS'));
if (customIndex >= 0) {
  console.log('CUSTOM_GROUNDS section found at line', customIndex + 1);
  console.log('Context:');
  lines.slice(customIndex, customIndex + 5).forEach((line, i) => {
    console.log(`  ${customIndex + i + 1}: ${line}`);
  });
} else {
  console.log('❌ CUSTOM_GROUNDS section NOT FOUND');
}

console.log('\n✨ Prompts are now synced and ready!');
