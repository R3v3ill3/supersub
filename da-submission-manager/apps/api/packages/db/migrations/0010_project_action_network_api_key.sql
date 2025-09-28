-- Add encrypted Action Network API key to projects table
-- This replaces the global ACTION_NETWORK_API_KEY environment variable with per-project keys

-- Add encrypted API key field to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS action_network_api_key_encrypted TEXT;

-- Add a created_by field to track who added API keys (for audit purposes)
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS api_key_updated_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN projects.action_network_api_key_encrypted IS 'Encrypted Action Network API key for this project';
COMMENT ON COLUMN projects.api_key_updated_at IS 'Timestamp when API key was last updated';

-- Create index for faster lookups when we need to find projects with API keys
CREATE INDEX IF NOT EXISTS idx_projects_has_api_key ON projects(action_network_api_key_encrypted) 
WHERE action_network_api_key_encrypted IS NOT NULL;
