import fs from 'node:fs/promises';
import path from 'node:path';
import Handlebars from 'handlebars';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  };
  approvedFacts: string;
  selectedConcerns: Array<{ key: string; body: string }>;
  styleSample: string;
  allowedLinks?: string[];
  maxWordsOverride?: number;
};

async function generateWithOpenAI(args: GenerateArgs, system: string, user: string, maxWords: number) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const temperature = Number(process.env.OPENAI_TEMPERATURE || 0.2);
  const maxTokens = Number(process.env.OPENAI_MAX_TOKENS || 900);

  return await retryService.executeWithRetry(
    async () => {
      const base = process.cwd();
      const schemaPath = path.resolve(base, 'packages/prompts/submission.schema.json');
      const schemaStr = await fs.readFile(schemaPath, 'utf8');

      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await client.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system.replace('{{MAX_WORDS}}', String(maxWords)) },
          { role: 'user', content: user }
        ],
        response_format: { type: 'json_schema', json_schema: JSON.parse(schemaStr) }
      });

      const msg = response.choices[0]?.message?.content ?? '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(msg);
      } catch {
        throw new Error('OpenAI returned invalid JSON');
      }
      const finalText = String(parsed.final_text ?? '');

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

async function generateWithGemini(args: GenerateArgs, system: string, user: string, maxWords: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const temperature = Number(process.env.GEMINI_TEMPERATURE || 0.2);

  return await retryService.executeWithRetry(
    async () => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({ 
        model,
        generationConfig: {
          temperature,
          maxOutputTokens: Number(process.env.GEMINI_MAX_TOKENS || 900),
        }
      });

      // Combine system and user prompts for Gemini
      const prompt = `${system.replace('{{MAX_WORDS}}', String(maxWords))}

${user}

Please respond with ONLY valid JSON in this exact format:
{
  "final_text": "your generated submission text here"
}`;

      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response (Gemini might include extra text)
      let jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Gemini did not return valid JSON format');
      }

      let parsed: any;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('Gemini returned invalid JSON');
      }
      
      const finalText = String(parsed.final_text ?? '');
      if (!finalText) {
        throw new Error('Gemini response missing final_text field');
      }

      return {
        finalText,
        usage: {
          prompt: null, // Gemini doesn't provide token counts in the same way
          completion: null
        },
        model,
        temperature,
        provider: 'gemini'
      };
    },
    {
      operationName: 'gemini_generate',
      retryConfig: {
        maxRetries: 2,
        initialDelayMs: 1000,
        maxDelayMs: 8000
      },
      errorContext: {
        operation: 'generate_submission_gemini',
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
  const maxWords = Number(args.maxWordsOverride ?? process.env.WORD_LIMIT ?? 600);

  // Check if AI generation is enabled
  const openaiEnabled = process.env.OPENAI_ENABLED !== 'false';
  const geminiEnabled = process.env.GEMINI_ENABLED !== 'false';
  
  if (!openaiEnabled && !geminiEnabled) {
    const error = await errorHandler.handleError(
      ErrorType.SYSTEM,
      ErrorCode.CONFIGURATION_ERROR,
      'Both OpenAI and Gemini are disabled',
      {
        operation: 'generate_submission',
        metadata: { openaiEnabled, geminiEnabled }
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
    ...args.meta,
    approved_facts: args.approvedFacts,
    selected_concerns: args.selectedConcerns,
    user_style_sample: args.styleSample
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

  // Fallback to Gemini if OpenAI failed (and Gemini is enabled)
  if (!result && geminiEnabled && process.env.GEMINI_API_KEY) {
    try {
      console.log('🤖 Falling back to Gemini...');
      result = await generateWithGemini(args, system, user, maxWords);
      console.log(`✅ Gemini generation successful with ${result.model}`);
    } catch (error: any) {
      console.warn('⚠️ Gemini generation failed:', error.message);
      
      // Log Gemini specific error
      await errorHandler.handleError(
        ErrorType.INTEGRATION,
        ErrorCode.GEMINI_API_ERROR,
        `Gemini generation failed: ${error.message}`,
        {
          operation: 'generate_submission_gemini',
          metadata: { 
            applicantName: args.meta.applicant_name,
            model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
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
      openaiEnabled && geminiEnabled ? ErrorCode.OPENAI_API_ERROR : 
        (openaiEnabled ? ErrorCode.OPENAI_API_ERROR : ErrorCode.GEMINI_API_ERROR),
      `All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}`,
      {
        operation: 'generate_submission',
        retryable: true,
        metadata: { 
          applicantName: args.meta.applicant_name,
          openaiEnabled,
          geminiEnabled,
          openaiKey: !!process.env.OPENAI_API_KEY,
          geminiKey: !!process.env.GEMINI_API_KEY
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
  const maxWords = Number(args.maxWordsOverride ?? process.env.WORD_LIMIT ?? 600);
  // Compose a safe, plain-text draft strictly from provided inputs.
  const concernText = args.selectedConcerns.map((c) => c.body.trim()).join('\n\n');
  const parts = [args.approvedFacts.trim(), concernText.trim()].filter(Boolean);
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

