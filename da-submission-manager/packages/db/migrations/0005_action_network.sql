-- Action Network integration schema updates

-- Projects: store Action Network linkage including forms, tags, groups, lists
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS action_network_config JSONB NOT NULL DEFAULT '{}';

-- Submissions: track Action Network sync state
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS action_network_person_id TEXT,
  ADD COLUMN IF NOT EXISTS action_network_submission_id TEXT,
  ADD COLUMN IF NOT EXISTS action_network_sync_status TEXT DEFAULT 'pending' CHECK (action_network_sync_status IN ('pending','synced','failed')),
  ADD COLUMN IF NOT EXISTS action_network_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS action_network_payload JSONB,
  ADD COLUMN IF NOT EXISTS action_network_sync_error TEXT;

-- Index for faster querying of unsynced submissions
CREATE INDEX IF NOT EXISTS idx_submissions_action_network_status ON submissions(action_network_sync_status, updated_at DESC);

