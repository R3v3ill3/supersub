-- Projects and document management tables

-- Projects table for multi-project support
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  council_email TEXT NOT NULL,
  council_name TEXT NOT NULL,
  
  -- Document templates
  google_doc_template_id TEXT,
  
  -- Email settings
  from_email TEXT,
  from_name TEXT,
  subject_template TEXT DEFAULT 'Development Application Submission - {{site_address}}',
  
  -- Workflow settings
  default_pathway TEXT NOT NULL DEFAULT 'review' CHECK (default_pathway IN ('direct', 'review', 'draft')),
  enable_ai_generation BOOLEAN NOT NULL DEFAULT true,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update submissions table to properly reference projects
ALTER TABLE submissions 
  ADD CONSTRAINT fk_submissions_project_id 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Add missing fields to submissions
ALTER TABLE submissions 
  ADD COLUMN IF NOT EXISTS application_number TEXT,
  ADD COLUMN IF NOT EXISTS submission_pathway TEXT DEFAULT 'review' CHECK (submission_pathway IN ('direct', 'review', 'draft')),
  ADD COLUMN IF NOT EXISTS google_doc_id TEXT,
  ADD COLUMN IF NOT EXISTS google_doc_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS submitted_to_council_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS council_confirmation_id TEXT;

-- Documents table for tracking generated documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  
  -- Google Docs info
  google_doc_id TEXT NOT NULL,
  google_doc_url TEXT NOT NULL,
  pdf_url TEXT,
  
  -- Document metadata
  template_id TEXT,
  placeholders_data JSONB NOT NULL DEFAULT '{}',
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'user_editing', 'finalized', 'submitted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email logs for audit trail
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  
  -- Email details
  to_email TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,
  
  -- Attachments
  attachments JSONB DEFAULT '[]',
  
  -- Delivery tracking
  email_service_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  error_message TEXT,
  
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook events for external integrations
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source info
  source TEXT NOT NULL DEFAULT 'action_network',
  event_type TEXT NOT NULL,
  external_id TEXT,
  
  -- Raw payload
  payload JSONB NOT NULL,
  
  -- Processing status
  processed BOOLEAN NOT NULL DEFAULT false,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_submissions_project_id ON submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_documents_submission_id ON documents(submission_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_submission_id ON email_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_external_id ON webhook_events(source, external_id);
