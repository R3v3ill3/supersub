-- Add project_id, track, and metadata columns to concern_templates
-- This enables project-specific concerns and dual-track filtering

-- Add new columns
ALTER TABLE concern_templates
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS track TEXT CHECK (track IN ('followup', 'comprehensive', 'all')),
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Drop old unique constraint
ALTER TABLE concern_templates
  DROP CONSTRAINT IF EXISTS concern_templates_version_key_key;

-- Add new unique constraint that includes project_id
-- NULL project_id means global/default concerns
ALTER TABLE concern_templates
  ADD CONSTRAINT concern_templates_project_version_key_unique
  UNIQUE NULLS NOT DISTINCT (project_id, version, key);

-- Create index for efficient querying by project and track
CREATE INDEX IF NOT EXISTS idx_concern_templates_project_track
  ON concern_templates(project_id, track, is_active)
  WHERE is_active = true;

-- Add comment for documentation
COMMENT ON COLUMN concern_templates.project_id IS 'NULL for global/default concerns, or specific project UUID for project-specific concerns';
COMMENT ON COLUMN concern_templates.track IS 'NULL or "all" for all tracks, "followup" for follow-up submissions, "comprehensive" for comprehensive submissions';
COMMENT ON COLUMN concern_templates.metadata IS 'Additional metadata such as priority, category, source template, extraction timestamp';
