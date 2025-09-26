export function sanitizeBasic(text: string) {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/—/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

