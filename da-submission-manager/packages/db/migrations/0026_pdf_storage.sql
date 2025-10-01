-- Add fields to store generated PDFs for download
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS cover_pdf_data BYTEA,
  ADD COLUMN IF NOT EXISTS grounds_pdf_data BYTEA,
  ADD COLUMN IF NOT EXISTS cover_pdf_filename TEXT,
  ADD COLUMN IF NOT EXISTS grounds_pdf_filename TEXT;

-- Add index for faster lookups when downloading
CREATE INDEX IF NOT EXISTS idx_submissions_pdf_data ON submissions(id) WHERE cover_pdf_data IS NOT NULL OR grounds_pdf_data IS NOT NULL;

