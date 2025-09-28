-- Document review workflow support

-- Add review tracking columns to documents
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS review_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT now();

-- Ensure existing rows have a last modified timestamp
UPDATE documents
SET last_modified_at = COALESCE(last_modified_at, updated_at, created_at, now())
WHERE last_modified_at IS NULL;

-- Maintain default for future inserts
ALTER TABLE documents
  ALTER COLUMN last_modified_at SET DEFAULT now();

-- Add review deadline tracking to submissions
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS review_deadline TIMESTAMPTZ;

