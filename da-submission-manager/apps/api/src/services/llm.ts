import fs from 'node:fs/promises';
import path from 'node:path';
import Handlebars from 'handlebars';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { sanitizeAndValidate } from './contentRules';
import { retryService } from './retryService';
import { errorHandler, ErrorType, ErrorCode } from './errorHandler';

type GenerateArgs = {
  meta: {
    recipient_name: string;
    subject: string;
    applicant_name: string;
    application_number: string;
    site_address: string;
    submission_track?: string;
  };
  approvedFacts: string;
  selectedConcerns: Array<{ key: string; body: string }>;
  styleSample: string;
  customGrounds?: string;
  allowedLinks?: string[];
  maxWordsOverride?: number;
};

async function generateWithOpenAI(args: GenerateArgs, system: string, user: string, maxWords: number) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const temperature = Number(process.env.OPENAI_TEMPERATURE || 0.05);
  const maxTokens = Number(process.env.OPENAI_MAX_TOKENS || 4000);

  return await retryService.executeWithRetry(
    async () => {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Use simple JSON mode instead of strict schema for better compatibility
      // The prompt explicitly instructs to output JSON with { "final_text": "..." }
      const response = await client.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system.replace('{{MAX_WORDS}}', String(maxWords)) },
          { role: 'user', content: user }
        ],
        response_format: { type: 'json_object' }
      });

      const msg = response.choices[0]?.message?.content ?? '{}';
      console.log('[OpenAI] Raw response length:', msg.length);
      console.log('[OpenAI] Raw response preview:', msg.substring(0, 200));
      
      let parsed: any;
      try {
        parsed = JSON.parse(msg);
      } catch (e) {
        console.error('[OpenAI] JSON parse error:', e);
        console.error('[OpenAI] Failed to parse:', msg.substring(0, 500));
        throw new Error('OpenAI returned invalid JSON');
      }
      
      console.log('[OpenAI] Parsed keys:', Object.keys(parsed));
      console.log('[OpenAI] final_text type:', typeof parsed.final_text);
      console.log('[OpenAI] final_text length:', parsed.final_text?.length ?? 0);
      console.log('[OpenAI] body type:', typeof parsed.body);
      console.log('[OpenAI] body length:', typeof parsed.body === 'string' ? parsed.body?.length : 'not a string');
      
      // OpenAI might return content in "body" or "final_text" field
      // Make sure we only accept strings, not objects
      let finalText = '';
      if (typeof parsed.final_text === 'string' && parsed.final_text.length > 0) {
        finalText = parsed.final_text;
        console.log('[OpenAI] Using final_text field');
      } else if (typeof parsed.body === 'string' && parsed.body.length > 0) {
        finalText = parsed.body;
        console.log('[OpenAI] Using body field');
      } else {
        console.error('[OpenAI] ERROR: No valid string content found!');
        console.error('[OpenAI] final_text:', parsed.final_text);
        console.error('[OpenAI] body:', parsed.body);
        console.error('[OpenAI] Full object:', JSON.stringify(parsed).substring(0, 1000));
        throw new Error('OpenAI returned invalid content type');
      }
      
      if (!finalText || finalText.trim().length === 0) {
        throw new Error('OpenAI returned empty content');
      }

      return {
        finalText,
        usage: {
          prompt: response.usage?.prompt_tokens ?? null,
          completion: response.usage?.completion_tokens ?? null
        },
        model,
        temperature,
        provider: 'openai'
      };
    },
    {
      operationName: 'openai_generate',
      retryConfig: {
        maxRetries: 2,
        initialDelayMs: 1000,
        maxDelayMs: 8000
      },
      errorContext: {
        operation: 'generate_submission_openai',
        metadata: { 
          model,
          temperature,
          maxTokens,
          maxWords,
          applicantName: args.meta.applicant_name
        }
      }
    }
  );
}

async function generateWithClaude(args: GenerateArgs, system: string, user: string, maxWords: number) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
  const temperature = Number(process.env.ANTHROPIC_TEMPERATURE || 0.05);

  return await retryService.executeWithRetry(
    async () => {
      const client = new Anthropic({ apiKey });

      const response = await client.messages.create({
        model,
        max_tokens: Number(process.env.ANTHROPIC_MAX_TOKENS || 4000),
        temperature,
        system: system.replace('{{MAX_WORDS}}', String(maxWords)),
        messages: [
          {
            role: 'user',
            content: user + '\n\nPlease respond with ONLY valid JSON in this exact format:\n{\n  "final_text": "your generated submission text here"\n}'
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Claude returned non-text response');
      }

      const text = content.text;

      // Extract JSON from response (Claude is good at following instructions but be safe)
      let jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Claude did not return valid JSON format');
      }

      let parsed: any;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('Claude returned invalid JSON');
      }
      
      const finalText = String(parsed.final_text ?? '');
      if (!finalText) {
        throw new Error('Claude response missing final_text field');
      }

      return {
        finalText,
        usage: {
          prompt: response.usage.input_tokens,
          completion: response.usage.output_tokens
        },
        model,
        temperature,
        provider: 'claude'
      };
    },
    {
      operationName: 'claude_generate',
      retryConfig: {
        maxRetries: 2,
        initialDelayMs: 1000,
        maxDelayMs: 8000
      },
      errorContext: {
        operation: 'generate_submission_claude',
        metadata: { 
          model,
          temperature,
          maxWords,
          applicantName: args.meta.applicant_name
        }
      }
    }
  );
}

export async function generateSubmission(args: GenerateArgs) {
  const maxWords = Number(args.maxWordsOverride ?? process.env.WORD_LIMIT ?? 2500);

  // Check if AI generation is enabled
  const openaiEnabled = process.env.OPENAI_ENABLED !== 'false';
  const claudeEnabled = process.env.ANTHROPIC_ENABLED !== 'false';
  
  if (!openaiEnabled && !claudeEnabled) {
    const error = await errorHandler.handleError(
      ErrorType.SYSTEM,
      ErrorCode.CONFIGURATION_ERROR,
      'Both OpenAI and Claude are disabled',
      {
        operation: 'generate_submission',
        metadata: { openaiEnabled, claudeEnabled }
      }
    );
    throw error;
  }

  Handlebars.registerHelper('indent', function (this: any, text: string, spaces: number) {
    const pad = ' '.repeat(spaces);
    return text
      .split('\n')
      .map((line) => pad + line)
      .join('\n');
  });

  const base = process.cwd();
  const systemPath = path.resolve(base, 'packages/prompts/submission.system.txt');
  const userTplPath = path.resolve(base, 'packages/prompts/submission.user.hbs');

  const [system, userTplStr] = await Promise.all([
    fs.readFile(systemPath, 'utf8'),
    fs.readFile(userTplPath, 'utf8')
  ]);

  const userTpl = Handlebars.compile(userTplStr, { noEscape: true });
  const user = userTpl({
    // Only pass fields actually used in template - exclude applicant_name to prevent AI from echoing it
    recipient_name: args.meta.recipient_name,
    subject: args.meta.subject,
    application_number: args.meta.application_number,
    site_address: args.meta.site_address,
    submission_track: '', // Not currently passed from generate.ts, template doesn't require it
    approved_facts: args.approvedFacts,
    selected_concerns: args.selectedConcerns,
    user_style_sample: args.styleSample,
    custom_grounds: args.customGrounds || ''
  })
    .replace('{{MAX_WORDS}}', String(maxWords));

  let result: any;
  let lastError: Error | null = null;

  // Try OpenAI first (if enabled and has API key)
  if (openaiEnabled && process.env.OPENAI_API_KEY) {
    try {
      console.log('🤖 Attempting generation with OpenAI...');
      result = await generateWithOpenAI(args, system, user, maxWords);
      console.log(`✅ OpenAI generation successful with ${result.model}`);
    } catch (error: any) {
      console.warn('⚠️ OpenAI generation failed:', error.message);
      
      // Log OpenAI specific error
      await errorHandler.handleError(
        ErrorType.INTEGRATION,
        ErrorCode.OPENAI_API_ERROR,
        `OpenAI generation failed: ${error.message}`,
        {
          operation: 'generate_submission_openai',
          metadata: { 
            applicantName: args.meta.applicant_name,
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
          }
        },
        error
      );
      
      lastError = error;
    }
  }

  // Fallback to Claude if OpenAI failed (and Claude is enabled)
  if (!result && claudeEnabled && process.env.ANTHROPIC_API_KEY) {
    try {
      console.log('🤖 Falling back to Claude...');
      result = await generateWithClaude(args, system, user, maxWords);
      console.log(`✅ Claude generation successful with ${result.model}`);
    } catch (error: any) {
      console.warn('⚠️ Claude generation failed:', error.message);
      
      // Log Claude specific error
      await errorHandler.handleError(
        ErrorType.INTEGRATION,
        ErrorCode.OPENAI_API_ERROR, // Reuse OPENAI_API_ERROR code for now
        `Claude generation failed: ${error.message}`,
        {
          operation: 'generate_submission_claude',
          metadata: { 
            applicantName: args.meta.applicant_name,
            model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
          }
        },
        error
      );
      
      lastError = error;
    }
  }

  // If both failed, throw a comprehensive error
  if (!result) {
    const error = await errorHandler.handleError(
      ErrorType.INTEGRATION,
      ErrorCode.OPENAI_API_ERROR,
      `All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`,
      {
        operation: 'generate_submission',
        retryable: true,
        metadata: { 
          applicantName: args.meta.applicant_name,
          openaiEnabled,
          claudeEnabled,
          openaiKey: !!process.env.OPENAI_API_KEY,
          claudeKey: !!process.env.ANTHROPIC_API_KEY
        }
      },
      lastError || new Error('All AI providers failed')
    );
    throw error;
  }

  const sanitized = sanitizeAndValidate(result.finalText, { maxWords, allowedLinks: args.allowedLinks ?? [] });

  return {
    finalText: sanitized,
    usage: result.usage,
    model: result.model,
    temperature: result.temperature,
    provider: result.provider
  };
}

export async function generateSubmissionMock(args: GenerateArgs) {
  const maxWords = Number(args.maxWordsOverride ?? process.env.WORD_LIMIT ?? 2500);
  // Compose a safe, plain-text draft strictly from provided inputs.
  const concernText = args.selectedConcerns.map((c) => c.body.trim()).join('\n\n');
  const customText = args.customGrounds?.trim() || '';
  const parts = [
    args.approvedFacts.trim(), 
    concernText.trim(),
    customText ? `\n\nAdditional Concerns:\n\n${customText}` : ''
  ].filter(Boolean);
  let text = parts.join('\n\n');
  // Enforce word cap via sanitizeAndValidate
  const sanitized = sanitizeAndValidate(text, { maxWords, allowedLinks: args.allowedLinks ?? [] });
  return {
    finalText: sanitized,
    usage: { prompt: 0, completion: 0 },
    model: 'mock',
    temperature: 0,
    provider: 'mock'
  };
}

