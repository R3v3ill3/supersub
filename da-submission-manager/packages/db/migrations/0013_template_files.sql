CREATE TABLE IF NOT EXISTS template_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL CHECK (template_type IN ('submission_format','grounds','council_email','supporter_email')),
  storage_path TEXT NOT NULL,
  mimetype TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  merge_fields JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_file_id UUID NOT NULL REFERENCES template_files(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  version_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_files_project_type ON template_files(project_id, template_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_versions_unique ON template_versions(template_file_id, version_label);
