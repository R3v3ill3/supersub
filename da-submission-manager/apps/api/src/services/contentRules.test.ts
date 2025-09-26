import { describe, it, expect } from 'vitest';
import { sanitizeAndValidate } from './contentRules';

describe('contentRules', () => {
  it('rejects emojis', () => {
    expect(() => sanitizeAndValidate('Hello 🙂', { maxWords: 100 })).toThrow();
  });
  it('rejects em dashes', () => {
    expect(() => sanitizeAndValidate('Hello — world', { maxWords: 100 })).toThrow('em dashes');
  });
  it('rejects AI-isms', () => {
    expect(() => sanitizeAndValidate('As an AI, I cannot do that', { maxWords: 100 })).toThrow();
  });
  it('rejects new links not in whitelist', () => {
    expect(() => sanitizeAndValidate('Check https://example.com', { maxWords: 100, allowedLinks: [] })).toThrow();
  });
  it('enforces max words', () => {
    const text = Array.from({ length: 101 }).map((_, i) => `w${i}`).join(' ');
    expect(() => sanitizeAndValidate(text, { maxWords: 100 })).toThrow();
  });
  it('sanitizes zero-width chars and collapses whitespace', () => {
    const out = sanitizeAndValidate('Hello\u200B   world', { maxWords: 5 });
    expect(out).toBe('Hello world');
  });
});
