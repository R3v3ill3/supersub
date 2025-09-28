-- Expand template file/version storage to support version history metadata

-- Add new columns needed for versioned storage
ALTER TABLE template_versions
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS mimetype TEXT,
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS merge_fields JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS version_notes TEXT;

ALTER TABLE template_files
  ADD COLUMN IF NOT EXISTS active_version_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure template_files has a unique row per project/template_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_template_files_project_type_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_template_files_project_type_unique ON template_files(project_id, template_type)';
  END IF;
END $$;

-- Backfill version records from legacy template_files columns if present
DO $$
BEGIN
  -- Only migrate if legacy columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'template_files' AND column_name = 'storage_path'
  ) THEN
    WITH new_versions AS (
      INSERT INTO template_versions (
        template_file_id,
        version_label,
        version_notes,
        storage_path,
        mimetype,
        original_filename,
        merge_fields,
        created_at
      )
      SELECT
        tf.id,
        'v1',
        'Migrated from legacy template_files',
        tf.storage_path,
        COALESCE(tf.mimetype, 'application/vnd.google-apps.document'),
        COALESCE(tf.original_filename, 'Template Document'),
        COALESCE(tf.merge_fields, '[]'::jsonb),
        COALESCE(tf.created_at, now())
      FROM template_files tf
      WHERE tf.storage_path IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM template_versions tv
          WHERE tv.template_file_id = tf.id
        )
      RETURNING id, template_file_id
    )
    UPDATE template_files tf
    SET active_version_id = nv.id
    FROM new_versions nv
    WHERE tf.id = nv.template_file_id
      AND tf.active_version_id IS NULL;
  END IF;
END $$;

-- Drop legacy columns which are now stored per-version
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'template_files' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE template_files
      DROP COLUMN storage_path,
      DROP COLUMN mimetype,
      DROP COLUMN original_filename,
      DROP COLUMN merge_fields;
  END IF;
END $$;

-- Enforce NOT NULL constraints on the new per-version columns
ALTER TABLE template_versions
  ALTER COLUMN storage_path SET NOT NULL,
  ALTER COLUMN mimetype SET NOT NULL,
  ALTER COLUMN original_filename SET NOT NULL,
  ALTER COLUMN merge_fields SET NOT NULL;

-- Establish FK relationship for active version pointer
ALTER TABLE template_files
  ADD CONSTRAINT template_files_active_version_fkey
  FOREIGN KEY (active_version_id)
  REFERENCES template_versions(id)
  ON DELETE SET NULL;

-- Helpful index for retrieving most recent versions
CREATE INDEX IF NOT EXISTS idx_template_versions_file_created
  ON template_versions(template_file_id, created_at DESC);

