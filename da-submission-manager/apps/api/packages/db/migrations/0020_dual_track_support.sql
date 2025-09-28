-- Dual-track support enhancements

-- Ensure submissions table has submission track defaults populated
ALTER TABLE submissions
  ALTER COLUMN submission_track SET DEFAULT 'single',
  ALTER COLUMN submission_track DROP NOT NULL;

-- Track returning submitters at the database level for analytics
ALTER TABLE submissions
  ALTER COLUMN is_returning_submitter SET DEFAULT false;

-- Additional survey metadata for track-aware flows
ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS submission_track TEXT CHECK (submission_track IN ('followup', 'comprehensive', 'single')),
  ADD COLUMN IF NOT EXISTS ordered_keys TEXT[],
  ADD COLUMN IF NOT EXISTS custom_grounds TEXT;

-- Indexes to support analytics queries on track usage
CREATE INDEX IF NOT EXISTS idx_submissions_track ON submissions(submission_track);
CREATE INDEX IF NOT EXISTS idx_survey_responses_track ON survey_responses(submission_track);

-- Analytics helper for track breakdown
CREATE OR REPLACE FUNCTION get_submission_track_breakdown(
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  track TEXT,
  total BIGINT,
  returning_count BIGINT
)
LANGUAGE sql
AS $$
  SELECT
    COALESCE(submission_track, 'single') AS track,
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE is_returning_submitter) :: BIGINT AS returning_count
  FROM submissions
  WHERE p_project_id IS NULL OR project_id = p_project_id
  GROUP BY COALESCE(submission_track, 'single')
  ORDER BY track;
$$;


