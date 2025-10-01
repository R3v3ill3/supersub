export type ValidationOptions = {
  maxWords: number;
  allowedLinks?: string[]; // whitelist from approved facts
};

export function validateNoEmojis(text: string) {
  const emojiRegex = /[\p{Extended_Pictographic}]/u;
  if (emojiRegex.test(text)) throw new Error('Output contains emojis.');
}

export function validateNoEmDash(text: string) {
  if (text.includes('—')) throw new Error('Output contains em dashes.');
}

export function validateNoAIGiveaways(text: string) {
  const bad = [
    /\bit\'s not just\b/i,
    /\bas an ai\b/i,
    /\bi cannot\b/i,
    /\bi\'m unable\b/i
  ];
  if (bad.some((r) => r.test(text))) throw new Error('AI-isms detected.');
}

export function validateNoNewLinks(text: string, allowed: string[]) {
  const linkRegex = /(https?:\/\/[^\s)]+)/gi;
  const found = new Set<string>();
  for (const m of text.matchAll(linkRegex)) found.add(m[0]);
  for (const link of found) {
    if (!allowed.includes(link)) throw new Error('New links not allowed.');
  }
  const mdLink = /\[[^\]]+\]\([^\)]+\)/;
  if (mdLink.test(text)) throw new Error('Markdown links are not allowed.');
}

export function enforceMaxWords(text: string, maxWords: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length > maxWords) throw new Error(`Output exceeds ${maxWords} words.`);
}

export function sanitizeAndValidate(text: string, opts: ValidationOptions) {
  const allowed = opts.allowedLinks ?? [];
  
  // Decode HTML entities first (e.g., &#x27; -> ')
  const decoded = text
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  
  const sanitized = decoded
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
    .replace(/—/g, '-') // Replace em-dash with hyphen
    .replace(/[ \t]+/g, ' ') // Collapse horizontal whitespace only (preserve newlines!)
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();

  validateNoEmojis(sanitized);
  validateNoEmDash(sanitized);
  validateNoAIGiveaways(sanitized);
  validateNoNewLinks(sanitized, allowed);
  enforceMaxWords(sanitized, opts.maxWords);

  return sanitized;
}

