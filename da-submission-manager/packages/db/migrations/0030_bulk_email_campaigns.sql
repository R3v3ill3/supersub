-- Bulk Email Campaigns
-- Allows admins to send bulk emails to lists of recipients with tracking

CREATE TABLE IF NOT EXISTS bulk_email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Campaign details
  name TEXT NOT NULL,
  description TEXT,
  
  -- Email content
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  reply_to TEXT,
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT NOT NULL,
  preview_text TEXT,
  
  -- Tracking
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  pending_count INTEGER NOT NULL DEFAULT 0,
  
  -- Status: draft, testing, sending, completed, failed, cancelled
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'testing', 'sending', 'completed', 'failed', 'cancelled')),
  
  -- Metadata
  csv_filename TEXT,
  created_by TEXT, -- user email or ID
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bulk_email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES bulk_email_campaigns(id) ON DELETE CASCADE,
  
  -- Recipient details
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Custom merge fields (optional - for personalization)
  merge_fields JSONB,
  
  -- Tracking
  -- Status: pending, sending, sent, failed, bounced
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'bounced')),
  
  -- Email log reference (if sent)
  email_log_id UUID REFERENCES email_logs(id),
  
  -- SendGrid tracking
  message_id TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_project ON bulk_email_campaigns(project_id);
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_status ON bulk_email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_created ON bulk_email_campaigns(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_recipients_campaign ON bulk_email_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bulk_recipients_status ON bulk_email_recipients(status);
CREATE INDEX IF NOT EXISTS idx_bulk_recipients_email ON bulk_email_recipients(email);

-- Update timestamp trigger for campaigns
CREATE OR REPLACE FUNCTION update_bulk_campaign_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bulk_campaign_updated_at
  BEFORE UPDATE ON bulk_email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_bulk_campaign_updated_at();

-- Update timestamp trigger for recipients
CREATE TRIGGER bulk_recipient_updated_at
  BEFORE UPDATE ON bulk_email_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_bulk_campaign_updated_at();

