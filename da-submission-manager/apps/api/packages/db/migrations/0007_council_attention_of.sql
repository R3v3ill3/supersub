-- Add optional council attention contact details
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS council_attention_of TEXT;


