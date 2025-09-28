-- Dual-track project support migration

-- Add dual-track configuration fields to projects
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS is_dual_track BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dual_track_config JSONB;

-- Add submission track tracking fields to submissions
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS submission_track TEXT CHECK (submission_track IN ('followup', 'comprehensive', 'single')),
  ADD COLUMN IF NOT EXISTS is_returning_submitter BOOLEAN NOT NULL DEFAULT false;

-- Ensure the default track for existing records is 'single'
UPDATE submissions
SET submission_track = COALESCE(submission_track, 'single');

-- Create indexes to support analytics queries
CREATE INDEX IF NOT EXISTS idx_projects_is_dual_track ON projects(is_dual_track);
CREATE INDEX IF NOT EXISTS idx_submissions_submission_track ON submissions(submission_track);

