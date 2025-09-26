-- Add AI provider tracking to llm_drafts table
-- This tracks which AI provider (openai, gemini, mock) was used for each generation

ALTER TABLE llm_drafts 
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'openai';

-- Add index for provider analytics
CREATE INDEX IF NOT EXISTS idx_llm_drafts_provider ON llm_drafts(provider, created_at DESC);

-- Add index for model analytics (combined with provider)
CREATE INDEX IF NOT EXISTS idx_llm_drafts_provider_model ON llm_drafts(provider, model, created_at DESC);
