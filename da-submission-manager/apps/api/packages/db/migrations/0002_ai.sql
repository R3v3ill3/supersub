-- survey templates (versioned, admin-managed)
CREATE TABLE IF NOT EXISTS concern_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL DEFAULT 'v1',
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (version, key)
);

-- user survey responses per submission
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT 'v1',
  selected_keys TEXT[] NOT NULL,
  user_style_sample TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- generated drafts with immutable audit
CREATE TABLE IF NOT EXISTS llm_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  temperature NUMERIC NOT NULL,
  prompt_version TEXT NOT NULL DEFAULT 'v1',
  input_summary JSONB NOT NULL,
  output_text TEXT NOT NULL,
  tokens_prompt INT,
  tokens_completion INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

