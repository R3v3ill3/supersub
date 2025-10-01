-- Add field to store custom/edited email body content
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS custom_email_body TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN submissions.custom_email_body IS 'User-edited cover letter content to be used as the email body when submitting to council';

