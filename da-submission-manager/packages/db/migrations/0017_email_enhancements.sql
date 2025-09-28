-- Email queue table to manage outgoing emails with retries
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id),
  email_type TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending', -- Can be: pending, processing, sent, failed
  payload JSONB NOT NULL,
  error_log TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhance email_logs table for better tracking
ALTER TABLE email_logs
ADD COLUMN retry_count INTEGER DEFAULT 0,
ADD COLUMN delivery_status TEXT DEFAULT 'unknown', -- Can be: unknown, sent, delivered, bounced, spam
ADD COLUMN delivery_metadata JSONB,
ADD COLUMN email_type TEXT;
