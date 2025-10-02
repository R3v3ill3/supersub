-- Update existing projects to use new email template format
-- This migration updates ALL projects to remove "Applicant:" line and use submitter name in signature

UPDATE projects
SET council_email_body_template = 'Dear {{council_name}},

Attention: Tim Baker CEO,

Please find attached the development application submission for {{site_address}}.

Email: {{applicant_email}}
{{application_number_line}}

Kind regards,
{{applicant_full_name}}'
WHERE council_email_body_template LIKE '%Applicant: {{applicant_full_name}}%'
   OR council_email_body_template LIKE '%Kind regards,%{{sender_name}}%';

-- Also update projects that have the old Gold Coast specific template
UPDATE projects
SET council_email_body_template = 'Dear {{council_name}},

Attention: Tim Baker CEO,

Please find attached our development application submission in response to Application {{application_number}}.

Property: {{site_address}}
Email: {{applicant_email}}
Position: OBJECTING

This submission outlines community concerns regarding the proposed development and its compliance with the Gold Coast City Plan.

Kind regards,
{{applicant_full_name}}'
WHERE council_email_body_template LIKE '%Property: {{site_address}}%Applicant: {{applicant_full_name}}%';

