-- Add full_text column to concern_templates for comprehensive content used by AI generation
-- This enables storing both short summaries (for UI display) and full detailed text (for AI generation)

-- Add the full_text column (nullable for backward compatibility)
ALTER TABLE concern_templates
  ADD COLUMN IF NOT EXISTS full_text TEXT;

-- Add comments for documentation
COMMENT ON COLUMN concern_templates.body IS 
  'Short summary (1-3 sentences) displayed in user selection UI during survey step';

COMMENT ON COLUMN concern_templates.full_text IS 
  'Complete text from comprehensive template section, passed to AI for generation. 
   Contains full paragraphs with all measurements, planning code references, technical 
   terms, and detailed arguments. May be NULL for backward compatibility - generation 
   will fall back to body field if full_text is not available.';

-- Create index for efficient querying during generation
CREATE INDEX IF NOT EXISTS idx_concern_templates_full_text
  ON concern_templates(version, is_active)
  WHERE full_text IS NOT NULL;

-- Validation: Check current state before backfill
DO $$
DECLARE
  total_concerns INTEGER;
  concerns_with_measurements INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_concerns 
  FROM concern_templates 
  WHERE version = 'v1' AND is_active = true;
  
  SELECT COUNT(*) INTO concerns_with_measurements
  FROM concern_templates
  WHERE version = 'v1' 
    AND is_active = true 
    AND body LIKE '%12,600%';
  
  RAISE NOTICE 'Migration 0028 applied successfully';
  RAISE NOTICE 'Total active v1 concerns: %', total_concerns;
  RAISE NOTICE 'Concerns with bulk excavation measurements in body: %', concerns_with_measurements;
  RAISE NOTICE 'NEXT STEP: Backfill full_text column with complete sections from source templates';
END $$;

