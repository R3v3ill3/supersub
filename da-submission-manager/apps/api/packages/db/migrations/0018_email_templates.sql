CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL UNIQUE, -- e.g., 'submission-confirmation'
    subject_template TEXT NOT NULL,
    body_html_template TEXT,
    body_text_template TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with some initial templates
INSERT INTO email_templates (template_name, subject_template, body_text_template, body_html_template) VALUES
(
    'submission-confirmation',
    'Submission Confirmation for {{siteAddress}}',
    'Dear {{applicantName}},\n\nThis is to confirm that we have received your submission for {{siteAddress}}.\n\nThank you,\nThe Team',
    '<p>Dear {{applicantName}},</p><p>This is to confirm that we have received your submission for {{siteAddress}}.</p><p>Thank you,<br>The Team</p>'
),
(
    'review-deadline-reminder',
    'Reminder: Finalise your DA submission for {{siteAddress}}',
    'Dear {{applicantName}},\n\nThis is a reminder to finalise your submission for {{siteAddress}} by {{deadline}}.\n\nYou can review your submission here: {{editUrl}}\n\nThank you,\nThe Team',
    '<p>Dear {{applicantName}},</p><p>This is a reminder to finalise your submission for {{siteAddress}} by {{deadline}}.</p><p>You can review your submission here: <a href="{{editUrl}}">Review Submission</a></p><p>Thank you,<br>The Team</p>'
),
(
    'admin-failure-notification',
    '[URGENT] Email delivery failed for submission {{submissionId}}',
    'Hello Admin,\n\nThe email of type ''{{emailType}}'' for submission {{submissionId}} failed to be delivered after multiple retries.\n\nLast error: {{errorMessage}}\n\nPlease investigate.\n\n- The System',
    '<p>Hello Admin,</p><p>The email of type ''{{emailType}}'' for submission {{submissionId}} failed to be delivered after multiple retries.</p><p><b>Last error:</b> {{errorMessage}}</p><p>Please investigate.</p><p>- The System</p>'
),
(
    'direct-submission',
    'Development Application Submission for {{siteAddress}}',
    'Development Application Submission\n\nApplicant: {{name}}\nEmail: {{email}}\nSite Address: {{siteAddress}}\n\n{{submissionBody}}',
    '<h2>Development Application Submission</h2><p><strong>Applicant:</strong> {{name}}</p><p><strong>Email:</strong> {{email}}</p><p><strong>Site Address:</strong> {{siteAddress}}</p><h3>Submission:</h3><div style="white-space: pre-wrap;">{{submissionBody}}</div>'
),
(
    'review-link',
    'Review Your DA Submission for {{siteAddress}}',
    'Dear {{name}},\n\nYour submission for {{siteAddress}} is ready for review. Please use the link below:\n{{editUrl}}',
    '<p>Dear {{name}},</p><p>Your submission for {{siteAddress}} is ready for review. Please click the button below to review and edit.</p><p><a href="{{editUrl}}" class="button">Review Submission</a></p>'
),
(
    'draft-with-info-pack',
    'Your DA Submission Draft for {{siteAddress}}',
    'Dear {{name}},\n\nYour draft submission for {{siteAddress}} is ready, along with some background information.\n\nBackground Info:\n{{infoPack}}\n\nReview your draft here: {{editUrl}}',
    '<p>Dear {{name}},</p><p>Your draft submission for {{siteAddress}} is ready, along with some background information.</p><div class="info-pack">{{infoPack}}</div><p><a href="{{editUrl}}" class="button">Review Draft</a></p>'
),
(
    'review-completion-confirmation',
    'Your DA submission for {{siteAddress}} has been sent',
    'Dear {{applicantName}},\n\nGood news! Your submission for {{siteAddress}} has been sent to {{councilName}} on {{submittedAt}}.',
    '<p>Dear {{applicantName}},</p><p>Good news! Your submission for <strong>{{siteAddress}}</strong> has been sent to {{councilName}} on {{submittedAt}}.</p>'
);
