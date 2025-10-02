import { describe, it, expect } from 'vitest';
import { generateSubmissionMock } from './llm';

const approvedFacts = `Facts: Council controls consider traffic, noise, and character.`;
const concerns = [
  { key: 'traffic_safety', body: 'Increased vehicle movements affect pedestrian safety and crossings.' },
  { key: 'noise', body: 'Construction noise may occur in early mornings and weekends if conditions allow.' }
];

describe('generateSubmissionMock', () => {
  it('returns sanitized text under limit', async () => {
    const { finalText } = await generateSubmissionMock({
      meta: {
        recipient_name: 'Team',
        subject: 'Subject',
        application_number: '',
        site_address: ''
      },
      approvedFacts,
      selectedConcerns: concerns,
      styleSample: 'tone only',
      allowedLinks: [],
      maxWordsOverride: 80
    });
    const words = finalText.trim().split(/\s+/).filter(Boolean);
    expect(words.length).toBeLessThanOrEqual(80);
    expect(finalText).not.toMatch(/—|\[.*\]\(.*\)/); // no em dash or md links
  });
});
