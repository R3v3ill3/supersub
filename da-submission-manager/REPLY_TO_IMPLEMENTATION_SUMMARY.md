# Email Improvements Implementation Summary

## ✅ Phase 1 + Phase 2 Complete

All submission emails now include:
1. **Reply-To header** set to the applicant's email address (Phase 1)
2. **Enhanced sender name** including the applicant's name (Phase 2)

When council staff receive emails, they see "John Smith (via DA Submission Manager)" as the sender, and when they reply, their response goes directly to the submitter instead of bouncing back to the system email.

---

## Changes Made

### Phase 1: Reply-To Header

#### 1. Updated Email Service Type Definition
**File**: `apps/api/src/services/email.ts`

Added `replyTo` field to `SendEmailOptions`:
```typescript
export type SendEmailOptions = {
  to: string;
  from: string;
  fromName?: string;
  replyTo?: string;  // ← NEW: Sets the Reply-To header
  cc?: string | string[];
  subject: string;
  // ... rest of fields
};
```

#### 2. Updated Email Sending Logic
**File**: `apps/api/src/services/email.ts` (line ~150)

Modified `sendEmail()` method to include Reply-To header:
```typescript
const info = await this.transporter.sendMail({
  from: options.fromName ? `"${options.fromName}" <${options.from}>` : options.from,
  replyTo: options.replyTo,  // ← NEW: Passes to nodemailer
  to: options.to,
  cc: options.cc,
  // ... rest
});
```

#### 3. Updated Direct Submission Method
**File**: `apps/api/src/services/email.ts` (line ~435)

Added `replyToEmail` parameter to `sendDirectSubmissionWithAttachments()`:
```typescript
async sendDirectSubmissionWithAttachments(
  // ... existing parameters
  bodyHtml?: string,
  ccApplicant: boolean = true,
  replyToEmail?: string  // ← NEW: Optional, defaults to applicantDetails.email
): Promise<EmailResult> {
  return await this.sendEmail({
    // ...
    replyTo: replyToEmail || applicantDetails.email,  // ← NEW: Sets Reply-To
    // ...
  });
}
```

#### 4. Updated Call Sites in Document Workflow
**File**: `apps/api/src/services/documentWorkflow.ts`

**Direct Pathway** (line ~501)
```typescript
const emailResult = await this.emailService.sendDirectSubmissionWithAttachments(
  // ... existing parameters
  coverBodyHtml,
  true, // ccApplicant
  submission.applicant_email // ← NEW: replyToEmail - council replies go directly to applicant
);
```

**Review Pathway Submit** (line ~1167)
```typescript
const emailResult = await this.emailService.sendDirectSubmissionWithAttachments(
  // ... existing parameters
  undefined, // bodyHtml
  true, // ccApplicant
  submissionData.applicant_email // ← NEW: replyToEmail - council replies go directly to applicant
);
```

---

### Phase 2: Enhanced Sender Name

#### 5. Enhanced Sender Name in Direct Pathway
**File**: `apps/api/src/services/documentWorkflow.ts` (line ~501)

```typescript
// Enhanced sender name: "John Smith (via DA Submission Manager)"
const applicantName = `${submission.applicant_first_name} ${submission.applicant_last_name}`.trim();
const organizationName = project.from_name || process.env.DEFAULT_FROM_NAME || 'DA Submission Manager';
const enhancedFromName = `${applicantName} (via ${organizationName})`;

const emailResult = await this.emailService.sendDirectSubmissionWithAttachments(
  submission.id,
  emailRecipient,
  project.from_email || process.env.DEFAULT_FROM_EMAIL!,
  enhancedFromName,  // ← NEW: Shows applicant name in sender
  subject,
  // ... rest
);
```

#### 6. Enhanced Sender Name in Review Pathway
**File**: `apps/api/src/services/documentWorkflow.ts` (line ~1172)

```typescript
// Enhanced sender name: "John Smith (via DA Submission Manager)"
const applicantName = `${submissionData.applicant_first_name} ${submissionData.applicant_last_name}`.trim();
const organizationName = project.from_name || process.env.DEFAULT_FROM_NAME || 'DA Submission Manager';
const enhancedFromName = `${applicantName} (via ${organizationName})`;

const emailResult = await this.emailService.sendDirectSubmissionWithAttachments(
  submissionId,
  project.test_submission_email || project.council_email,
  project.from_email || process.env.DEFAULT_FROM_EMAIL!,
  enhancedFromName,  // ← NEW: Shows applicant name in sender
  // ... rest
);
```

---

## How It Works

### Email Headers Sent to Council

**Before:**
```
From: DA Submission Manager <noreply@yourorganization.org>
To: mail@goldcoast.qld.gov.au
CC: john.smith@gmail.com
Subject: Development application submission opposing application number COM/2025/271
```

**After Phase 1:**
```
From: DA Submission Manager <noreply@yourorganization.org>
Reply-To: john.smith@gmail.com  ← NEW: Council replies go here
To: mail@goldcoast.qld.gov.au
CC: john.smith@gmail.com
Subject: Development application submission opposing application number COM/2025/271
```

**After Phase 1 + Phase 2:**
```
From: John Smith (via DA Submission Manager) <noreply@yourorganization.org>  ← ENHANCED: Shows applicant name
Reply-To: john.smith@gmail.com
To: mail@goldcoast.qld.gov.au
CC: john.smith@gmail.com
Subject: Development application submission opposing application number COM/2025/271
```

### User Experience

1. **Submitter**: Receives a CC copy of the email sent to council (no change)
2. **Council**: When they click "Reply" in their email client, it will:
   - Automatically address the reply to `john.smith@gmail.com` (the applicant)
   - NOT send the reply to `noreply@yourorganization.org`
3. **Your System**: Doesn't receive council replies (which is good - they're noise)
4. **Applicant**: Receives direct replies from council about their submission

---

## Testing

### Manual Testing Steps

1. **Send a test submission**:
   ```bash
   # Use the form or API to create a test submission
   # Make sure to use a real email address you control
   ```

2. **Check the email received by council**:
   - Look at email headers (View → Show Original in Gmail)
   - Verify `Reply-To: <applicant-email>` header is present

3. **Test the reply functionality**:
   - As the "council" recipient, click Reply
   - Verify the To: field is auto-populated with the applicant's email
   - Send the reply
   - Verify applicant receives it (not the system email)

### Automated Testing (if you have tests)

```typescript
// Example test
it('should set Reply-To header to applicant email', async () => {
  const result = await emailService.sendDirectSubmissionWithAttachments(
    submissionId,
    'council@example.com',
    'system@example.org',
    'System Name',
    'Test Subject',
    'Test Body',
    [],
    { email: 'applicant@example.com', /* ... */ },
    undefined,
    true,
    'applicant@example.com'
  );
  
  // Verify email was sent with Reply-To header
  expect(sentEmail.replyTo).toBe('applicant@example.com');
});
```

### Email Provider Compatibility

✅ Works with all email providers:
- Gmail SMTP
- SendGrid
- Amazon SES
- Mailgun
- Any SMTP server

The `Reply-To` header is a standard email header (RFC 822) supported by all email systems.

---

## Benefits

### Phase 1: Reply-To Header

#### ✅ Improved User Experience
- Council staff can reply directly to submitters
- No "undeliverable" bounces from noreply addresses
- More natural communication flow

#### ✅ Better Email Reputation
- Shows emails are from real people (even if sent via system)
- Less likely to be flagged as bulk/automated mail
- Demonstrates legitimate correspondence

#### ✅ Reduced Support Burden
- Users don't need to contact you to get council responses
- Council doesn't need to manually copy user emails for replies
- Cleaner inbox management

#### ✅ Zero Risk Implementation
- **No breaking changes** - fully backward compatible
- **No infrastructure changes** needed
- **No new dependencies**
- **Works with existing email setup**

### Phase 2: Enhanced Sender Name

#### ✅ Appears More Personal
- Council sees a **real person's name** first (not just "DA Submission Manager")
- Clearly indicates it's from a constituent (John Smith)
- Still shows it's facilitated by your organization

#### ✅ Better Legitimacy
- Not just system name (looks automated)
- **"John Smith (via DA Submission Manager)"** looks like genuine constituent correspondence
- Reduces appearance of bulk/spam email

#### ✅ Improved Filtering Bypass
- Spam filters see a personal name, not just organization
- Email reputation tied to individuals, not just system
- Less likely to be caught by automated filters

#### ✅ Maintains Transparency
- Clear that it's **"via"** your system (not deceptive)
- Council knows it's a facilitated submission
- Organization name still visible for context

---

## Next Steps (Optional Enhancements)

If you still experience deliverability issues after monitoring for a few weeks, consider:

### Phase 3: OAuth Integration
See `EMAIL_FROM_USER_ADDRESS_OPTIONS.md` for full analysis of OAuth implementation.

---

## Rollout

### No Deployment Changes Needed
- ✅ Just deploy the updated code
- ✅ No environment variable changes
- ✅ No database migrations
- ✅ No configuration updates

### Monitoring
After deployment, monitor:
- Email delivery success rates
- Bounce rates
- Whether councils are successfully replying to users

### Rollback Plan
If needed, simply remove the `replyTo` parameter from the function calls. The system will continue to work as before.

---

## Questions?

If you encounter any issues:
1. Check email logs in the `email_logs` table
2. Verify the applicant email is being correctly captured in submissions
3. Check email provider logs (SendGrid dashboard, etc.)
4. Test with different email clients (Gmail, Outlook, etc.)

---

**Implementation Date**: October 3, 2025  
**Developer**: AI Assistant  
**Phases Implemented**: Phase 1 (Reply-To) + Phase 2 (Enhanced Sender Name)  
**Status**: ✅ Complete & Ready for Deployment

