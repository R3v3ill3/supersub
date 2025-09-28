-- Dual-document workflow migration
-- Adds cover/grounds template fields, postal address, and document typing

-- Projects: subject template and separate Google Doc templates for cover and grounds
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS council_subject_template TEXT,
  ADD COLUMN IF NOT EXISTS cover_template_id TEXT,
  ADD COLUMN IF NOT EXISTS grounds_template_id TEXT,
  ADD COLUMN IF NOT EXISTS default_application_number TEXT NOT NULL;

-- Submissions: applicant postal address and generated grounds tracking
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS applicant_postal_address TEXT,
  ADD COLUMN IF NOT EXISTS grounds_text_generated TEXT,
  ADD COLUMN IF NOT EXISTS grounds_doc_id TEXT,
  ADD COLUMN IF NOT EXISTS grounds_pdf_url TEXT;

-- Documents: type column to distinguish cover vs grounds
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS doc_type TEXT CHECK (doc_type IN ('cover','grounds'));

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);


