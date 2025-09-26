-- Covering email template configuration

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS council_email_body_template TEXT;

UPDATE projects
SET council_email_body_template = COALESCE(
  council_email_body_template,
  'Dear {{council_name}},\n\nPlease find attached the development application submission for {{site_address}}.\n\nApplicant: {{applicant_full_name}}\nEmail: {{applicant_email}}\n{{application_number_line}}\n\nKind regards,\n{{sender_name}}'
);

ALTER TABLE projects
  ALTER COLUMN council_email_body_template SET DEFAULT 'Dear {{council_name}},\n\nPlease find attached the development application submission for {{site_address}}.\n\nApplicant: {{applicant_full_name}}\nEmail: {{applicant_email}}\n{{application_number_line}}\n\nKind regards,\n{{sender_name}}';

