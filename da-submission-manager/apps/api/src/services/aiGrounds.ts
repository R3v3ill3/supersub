import OpenAI from 'openai';
import { sanitizeAndValidate } from './contentRules';

export type ExtractedConcern = {
  key: string;
  label: string;
  body: string;
};

export async function extractConcernsFromText(groundsText: string): Promise<ExtractedConcern[]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system = `You extract a concise list of concerns from a "Grounds for Submission" document.
Rules:
- Output JSON only: {"concerns":[{"key":"...","label":"...","body":"..."}, ...]}
- 5–15 items. key: lowercase snake_case; label: short title; body: 1–3 sentences concise, factual.
- Do not invent content. Only summarise from the provided text.`;

  const user = `TEXT:\n\n${groundsText}`;

  const resp = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.1,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    response_format: { type: 'json_object' }
  });

  let json: any = {};
  try {
    json = JSON.parse(resp.choices[0]?.message?.content || '{}');
  } catch {
    json = { concerns: [] };
  }
  const list: ExtractedConcern[] = Array.isArray(json.concerns) ? json.concerns : [];
  return list
    .filter((c: any) => c && c.key && c.label && c.body)
    .map((c: any) => ({ key: String(c.key), label: String(c.label), body: String(c.body) }));
}

export async function generateGroundsText(args: {
  orderedConcerns: Array<{ key: string; body: string }>;
  extraGrounds?: string;
  maxWords?: number;
}): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const maxWords = Number(args.maxWords ?? process.env.WORD_LIMIT ?? 2500);

  const system = `You write a professionally formatted "Grounds for Submission" section for a Gold Coast development application.

CRITICAL REQUIREMENTS:

1. CONTENT FIDELITY:
   - Use ONLY the language, facts, and arguments from GROUNDS_BULLETS and EXTRA_INPUT
   - DO NOT create, invent, or add ANY facts, statistics, or claims not in the input
   - DO NOT conduct research or recall external information
   - Your job is to ORGANIZE existing content, NOT to CREATE new content

2. DATA PRESERVATION:
   - Include ALL content from GROUNDS_BULLETS - DO NOT summarize or truncate
   - PRESERVE ALL SPECIFIC DATA VERBATIM:
     * Measurements (e.g., "12,600 m³ of cut", "2,400 m³ of fill")
     * Distances (e.g., "50 metres", "200m setback")
     * Quantities (e.g., "7,000 m³ of soil export")
     * Percentages, dates, times, addresses, section numbers
     * Planning code references (e.g., "Gold Coast City Plan Section 8.2.3.1")
     * Technical terms (e.g., "steep batters", "retaining walls")
   - If a measurement or statistic is in GROUNDS_BULLETS, it MUST appear in your output EXACTLY

3. FORMATTING & STRUCTURE:
   - Use markdown formatting for professional appearance
   - Use ## for main section headings (e.g., "## Non-Compliance with Planning Framework")
   - Use ### for subsections if needed
   - Use **bold** for key planning terms, code references, and specific measurements
   - Break content into clear paragraphs (separate with blank lines)
   - Create numbered sections for each major concern
   - Include the FULL text from each concern bullet point
   - Add minimal transitional text only where needed for flow

4. STYLE:
   - Australian English, clear civic tone
   - Professional planning submission language
   - No emojis, no em-dashes (use hyphens instead), no rhetoric
   - Be comprehensive, not concise
   - Target ${maxWords} words - use the full limit to be thorough

5. SELF-CHECK:
   - All specific data from input appears in output verbatim
   - No facts or measurements were generalized or omitted
   - Output is comprehensive (uses substantial portion of word limit)
   - Document is properly formatted with headings and paragraphs

Output formatted markdown text with headings (##), bold (**text**), and proper paragraph breaks.`;

  const bullets = args.orderedConcerns.map((c, i) => `${i + 1}. ${c.body}`).join('\n');
  const extra = (args.extraGrounds || '').trim();
  const user = `GROUNDS_BULLETS:\n${bullets}\n\nEXTRA_INPUT:\n${extra}

REMEMBER: Include ALL specific measurements, quantities, and technical terms from the bullets VERBATIM. Do not generalize "12,600 m³ of cut" as "substantial excavation" - preserve the exact numbers.`;

  const resp = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: Number(process.env.OPENAI_TEMPERATURE || 0.05),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });

  const text = resp.choices[0]?.message?.content || '';
  const sanitized = sanitizeAndValidate(text, { maxWords });
  return sanitized;
}



