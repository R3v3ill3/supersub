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
  const maxWords = Number(args.maxWords ?? process.env.WORD_LIMIT ?? 800);

  const system = `You write a plain-text "Grounds for Submission" section.
Rules:
- Use only the provided GROUNDS_BULLETS and EXTRA_INPUT (if any).
- Australian English. Clear, civic tone. No emojis. No m-dashes. No rhetoric.
- <= ${maxWords} words.
- Output plain text only.`;

  const bullets = args.orderedConcerns.map((c, i) => `${i + 1}. ${c.body}`).join('\n');
  const extra = (args.extraGrounds || '').trim();
  const user = `GROUNDS_BULLETS:\n${bullets}\n\nEXTRA_INPUT:\n${extra}`;

  const resp = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });

  const text = resp.choices[0]?.message?.content || '';
  const sanitized = sanitizeAndValidate(text, { maxWords });
  return sanitized;
}



