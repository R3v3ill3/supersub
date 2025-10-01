import { describe, it, expect } from 'vitest';
import { generateSubmissionMock } from './llm';

/**
 * Test suite for prompt strengthening changes
 * Validates that specific data, measurements, and facts are preserved verbatim
 * Based on actual Currumbin project concerns
 */

const approvedFacts = `Subject: Development Application submission regarding the proposal at the site address provided in the application documentation.

The council's Local Environmental Plan and Development Control Plan outline guidance on traffic, noise, and neighbourhood character. Community submissions can raise planning considerations relevant to these controls.

This submission focuses only on planning matters and public interest considerations within council processes.`;

// Test concerns with specific measurements and data (from your Currumbin project)
const currumbinConcerns = [
  {
    key: 'bulk_excavation',
    body: 'Approximately 12,600 m³ of cut, 2,400 m³ of fill, and 7,000 m³ of soil export, with steep batters and extensive retaining walls causing significant construction impacts and permanent visual scarring.'
  },
  {
    key: 'seqrp_non_compliance',
    body: 'The development site falls within the Regional Landscape and Rural Production Area. This area aims to protect rural values from urban encroachment. The proposed educational facility is incompatible with the rural character. It undermines the purpose of maintaining the rural landscape.'
  },
  {
    key: 'traffic_safety',
    body: 'Significant traffic safety issues including insufficient sightlines, inadequate parking, unsafe ingress/egress locations, and infrastructure that cannot support additional traffic from daily operations and events.'
  },
  {
    key: 'planning_non_compliance',
    body: 'The proposed development violates the Gold Coast City Plan Strategic Framework and Rural Zone Code, conflicting with the South East Queensland Regional Plan designation as Regional Landscape and Rural Production Area.'
  }
];

describe('Prompt Strengthening - Data Preservation', () => {
  it('preserves exact measurements and quantities', async () => {
    const { finalText } = await generateSubmissionMock({
      meta: {
        recipient_name: 'Council Assessment Team',
        subject: 'Submission regarding Development Application',
        applicant_name: 'Test Resident',
        application_number: 'COM/2025/271',
        site_address: '940 Currumbin Creek Road'
      },
      approvedFacts,
      selectedConcerns: currumbinConcerns,
      styleSample: '',
      allowedLinks: [],
      maxWordsOverride: 2500
    });

    // CRITICAL: All specific measurements must appear verbatim
    expect(finalText).toContain('12,600 m³');
    expect(finalText).toContain('2,400 m³');
    expect(finalText).toContain('7,000 m³');
    
    // Should not generalize measurements
    expect(finalText).not.toMatch(/approximately \d+,?\d* m³(?! of cut)/i); // "approximately X m³" without specifics
    expect(finalText).not.toMatch(/substantial.*excavation/i); // generic term instead of measurements
    expect(finalText).not.toMatch(/large.*volume/i); // generic instead of specific
  });

  it('preserves technical terminology', async () => {
    const { finalText } = await generateSubmissionMock({
      meta: {
        recipient_name: 'Council Assessment Team',
        subject: 'Submission regarding Development Application',
        applicant_name: 'Test Resident',
        application_number: 'COM/2025/271',
        site_address: '940 Currumbin Creek Road'
      },
      approvedFacts,
      selectedConcerns: currumbinConcerns,
      styleSample: '',
      allowedLinks: [],
      maxWordsOverride: 2500
    });

    // Technical terms must be preserved
    expect(finalText).toContain('steep batters');
    expect(finalText).toContain('retaining walls');
    expect(finalText).toContain('Regional Landscape and Rural Production Area');
    expect(finalText).toContain('Gold Coast City Plan');
    expect(finalText).toContain('South East Queensland Regional Plan');
  });

  it('preserves all concern content without omission', async () => {
    const { finalText } = await generateSubmissionMock({
      meta: {
        recipient_name: 'Council Assessment Team',
        subject: 'Submission regarding Development Application',
        applicant_name: 'Test Resident',
        application_number: 'COM/2025/271',
        site_address: '940 Currumbin Creek Road'
      },
      approvedFacts,
      selectedConcerns: currumbinConcerns,
      styleSample: '',
      allowedLinks: [],
      maxWordsOverride: 2500
    });

    // All concerns should be present (check key phrases from each)
    expect(finalText).toContain('construction impacts');
    expect(finalText).toContain('permanent visual scarring');
    expect(finalText).toContain('urban encroachment');
    expect(finalText).toContain('rural character');
    expect(finalText).toContain('insufficient sightlines');
    expect(finalText).toContain('inadequate parking');
    expect(finalText).toContain('Rural Zone Code');
  });

  it('does not add hallucinated facts or statistics', async () => {
    const { finalText } = await generateSubmissionMock({
      meta: {
        recipient_name: 'Council Assessment Team',
        subject: 'Submission regarding Development Application',
        applicant_name: 'Test Resident',
        application_number: 'COM/2025/271',
        site_address: '940 Currumbin Creek Road'
      },
      approvedFacts,
      selectedConcerns: currumbinConcerns,
      styleSample: '',
      allowedLinks: [],
      maxWordsOverride: 2500
    });

    // Should not contain facts not in source material
    // Common AI hallucinations to check for:
    expect(finalText).not.toMatch(/studies show/i);
    expect(finalText).not.toMatch(/research indicates/i);
    expect(finalText).not.toMatch(/according to.*(?!Gold Coast City Plan|South East Queensland Regional Plan)/i);
    expect(finalText).not.toMatch(/(\d{4})\s+residents/i); // specific population numbers not in source
    expect(finalText).not.toMatch(/increase.*by.*%/i); // percentage increases not in source
    
    // Should not invent specific distances or setbacks not mentioned
    const sourceMeters = ['12,600', '2,400', '7,000'];
    const allNumbers = finalText.match(/\d+,?\d*\s*m³?/gi) || [];
    allNumbers.forEach(num => {
      const digits = num.replace(/[^\d]/g, '');
      // If it's a measurement in cubic metres, it should be one of our source numbers
      if (num.includes('m³')) {
        const isSourceNumber = sourceMeters.some(src => src.replace(',', '') === digits.replace(',', ''));
        if (!isSourceNumber && parseInt(digits) > 1000) {
          // Large measurements not in source are likely hallucinations
          throw new Error(`Potential hallucinated measurement: ${num}`);
        }
      }
    });
  });

  it('respects word limit while being comprehensive', async () => {
    const { finalText } = await generateSubmissionMock({
      meta: {
        recipient_name: 'Council Assessment Team',
        subject: 'Submission regarding Development Application',
        applicant_name: 'Test Resident',
        application_number: 'COM/2025/271',
        site_address: '940 Currumbin Creek Road'
      },
      approvedFacts,
      selectedConcerns: currumbinConcerns,
      styleSample: '',
      allowedLinks: [],
      maxWordsOverride: 2500
    });

    const words = finalText.trim().split(/\s+/).filter(Boolean);
    
    // Should not exceed limit
    expect(words.length).toBeLessThanOrEqual(2500);
    
    // With 4 detailed concerns, should use substantial portion of limit (not be overly brief)
    // Each concern ~50-80 words, so 4 concerns ≈ 200-320 words minimum + intro/conclusion
    expect(words.length).toBeGreaterThan(250);
  });

  it('does not compress multi-sentence concerns into single sentences', async () => {
    const multiSentenceConcern = [
      {
        key: 'seqrp_non_compliance',
        body: 'The development site falls within the Regional Landscape and Rural Production Area. This area aims to protect rural values from urban encroachment. The proposed educational facility is incompatible with the rural character. It undermines the purpose of maintaining the rural landscape.'
      }
    ];

    const { finalText } = await generateSubmissionMock({
      meta: {
        recipient_name: 'Council Assessment Team',
        subject: 'Submission regarding Development Application',
        applicant_name: 'Test Resident',
        application_number: '',
        site_address: ''
      },
      approvedFacts,
      selectedConcerns: multiSentenceConcern,
      styleSample: '',
      allowedLinks: [],
      maxWordsOverride: 500
    });

    // Source has 4 sentences, output should have similar count (±1 for flow)
    // Count sentences ending with period
    const sentenceCount = (finalText.match(/\./g) || []).length;
    
    // Approved facts has 2 sentences, concern has 4 sentences
    // Output should have at least 5 sentences (most of both sources)
    expect(sentenceCount).toBeGreaterThanOrEqual(5);
  });
});

describe('Prompt Strengthening - Comprehensive Multi-Concern Test', () => {
  it('handles 7+ concerns without summarization', async () => {
    const manyConcerns = [
      { key: 'seqrp_non_compliance', body: 'The development site falls within the Regional Landscape and Rural Production Area. This area aims to protect rural values from urban encroachment.' },
      { key: 'strategic_framework_non_compliance', body: 'The proposed development does not align with the Gold Coast City Plan designation of the area as a Natural Landscape Area. The development intrudes on the rural landscape.' },
      { key: 'rural_zone_code_non_compliance', body: 'The intensity and scale of the proposed development are inconsistent with the intended land use in the Rural Zone. This urban-scale development is inappropriate for the rural landscape.' },
      { key: 'community_needs_and_infrastructure', body: 'The applicant has not demonstrated a legitimate need for a school in this rural setting. Most prospective students are expected to come from urban areas.' },
      { key: 'traffic_and_parking_issues', body: 'The current road infrastructure cannot support the additional traffic generated by the development. The proposed parking arrangements are inadequate.' },
      { key: 'bulk_excavation_and_earthworks', body: 'The extensive earthworks required for the development will lead to significant construction impacts. The proposal includes large-scale excavation, steep batters, and retaining walls.' },
      { key: 'amenity_and_environmental_concerns', body: 'The development will create noise pollution and visual intrusion. The proposal causes ecological disruption and increased runoff, threatening local biodiversity.' }
    ];

    const { finalText } = await generateSubmissionMock({
      meta: {
        recipient_name: 'Council Assessment Team',
        subject: 'Submission regarding Development Application',
        applicant_name: 'Test Resident',
        application_number: 'COM/2025/271',
        site_address: '940 Currumbin Creek Road'
      },
      approvedFacts,
      selectedConcerns: manyConcerns,
      styleSample: '',
      allowedLinks: [],
      maxWordsOverride: 2500
    });

    // All 7 concerns should have their key phrases present
    expect(finalText).toContain('Regional Landscape and Rural Production Area');
    expect(finalText).toContain('Natural Landscape Area');
    expect(finalText).toContain('Rural Zone');
    expect(finalText).toContain('legitimate need');
    expect(finalText).toContain('road infrastructure');
    expect(finalText).toContain('extensive earthworks');
    expect(finalText).toContain('noise pollution');

    const words = finalText.trim().split(/\s+/).filter(Boolean);
    // With 7 concerns, should use substantial portion of 2500 words
    expect(words.length).toBeGreaterThan(400);
  });
});

describe('Mock vs Real Generation Comparison', () => {
  it('mock mode includes all source content', async () => {
    const testConcerns = [
      {
        key: 'test_concern',
        body: 'This is a test concern with specific data: 150 metres, 25% increase, Section 8.2.3.1 of the City Plan.'
      }
    ];

    const { finalText } = await generateSubmissionMock({
      meta: {
        recipient_name: 'Team',
        subject: 'Test',
        applicant_name: 'Test',
        application_number: '',
        site_address: ''
      },
      approvedFacts: 'Test fact.',
      selectedConcerns: testConcerns,
      styleSample: '',
      allowedLinks: [],
      maxWordsOverride: 500
    });

    // All specific data points should appear
    expect(finalText).toContain('150 metres');
    expect(finalText).toContain('25%');
    expect(finalText).toContain('8.2.3.1');
  });
});

