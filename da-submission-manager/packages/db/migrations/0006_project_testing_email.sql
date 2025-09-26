-- Optional test submission email to allow admins to route emails during QA
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS test_submission_email TEXT;

