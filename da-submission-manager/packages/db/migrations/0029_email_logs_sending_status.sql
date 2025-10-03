-- Add 'sending' status to email_logs table constraint
-- This allows the email service to log emails with 'sending' status
-- before the actual email is sent

-- Drop the existing check constraint
ALTER TABLE email_logs
  DROP CONSTRAINT IF EXISTS email_logs_status_check;

-- Add new constraint with 'sending' included
ALTER TABLE email_logs
  ADD CONSTRAINT email_logs_status_check
  CHECK (status IN ('pending', 'sending', 'sent', 'delivered', 'failed', 'bounced'));

