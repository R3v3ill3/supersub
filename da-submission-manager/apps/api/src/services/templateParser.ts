import JSZip from 'jszip';
import pdfParse from 'pdf-parse';

export type TemplatePlaceholderSummary = {
  placeholders: Array<{ placeholder: string }>;
};

const PLACEHOLDER_REGEX = /{{\s*([a-zA-Z0-9_\.]+)\s*}}/g;

export async function extractDocxPlaceholders(buffer: Buffer): Promise<TemplatePlaceholderSummary> {
  const zip = await JSZip.loadAsync(buffer);
  const document = await zip.file('word/document.xml')?.async('string');
  if (!document) {
    throw new Error('Invalid DOCX template: missing document.xml');
  }

  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  PLACEHOLDER_REGEX.lastIndex = 0;
  while ((match = PLACEHOLDER_REGEX.exec(document)) !== null) {
    matches.add(match[1]);
  }

  return {
    placeholders: Array.from(matches)
      .sort()
      .map((name) => ({ placeholder: name })),
  };
}

export function extractTextPlaceholders(text: string): TemplatePlaceholderSummary {
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  PLACEHOLDER_REGEX.lastIndex = 0;
  while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
    matches.add(match[1]);
  }
  return {
    placeholders: Array.from(matches)
      .sort()
      .map((name) => ({ placeholder: name })),
  };
}

export async function extractPdfPlaceholders(buffer: Buffer): Promise<TemplatePlaceholderSummary> {
  const result = await pdfParse(buffer);
  return extractTextPlaceholders(result.text || '');
}
