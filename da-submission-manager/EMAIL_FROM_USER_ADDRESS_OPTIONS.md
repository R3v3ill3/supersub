# Sending Emails from User's Own Email Address - Analysis & Options

## Current Situation

Currently, all submission emails to council are sent from a **single shared email address** configured in:
- `DEFAULT_FROM_EMAIL` (e.g., `noreply@yourorganization.org`)
- Or project-specific `from_email` in the project settings

### Code Location
The email is sent in:
- `apps/api/src/services/email.ts` - `sendDirectSubmissionWithAttachments()` method
- Called from `apps/api/src/services/documentWorkflow.ts` - lines 501 and 1165

### Current Email Flow
```typescript
// Line 504 in documentWorkflow.ts
project.from_email || process.env.DEFAULT_FROM_EMAIL!
```

The email includes:
- **To**: Council email (e.g., `mail@goldcoast.qld.gov.au`)
- **From**: System email (currently fixed)
- **CC**: User's email (applicant gets a copy)
- **Attachments**: PDF submission documents

### The Problem
Councils may:
1. **Filter/block** emails from unknown bulk senders
2. **Flag as spam** emails from single source addresses
3. **Prioritize** emails from individual constituents' personal addresses
4. Have **allowlists** that only accept from specific domains

---

## Option 1: Reply-To Header (Easiest, Partial Solution)

### How It Works
Keep sending from the system email but set the `Reply-To` header to the user's email address.

### Pros
- ✅ **Minimal code changes** - just add `replyTo` field
- ✅ **No authentication issues** - system still sends
- ✅ **Council can reply to user** - replies go to user's email
- ✅ **User gets CC'd** - they get a copy of what was sent
- ✅ **Works with all email providers** (Gmail, SendGrid, etc.)

### Cons
- ❌ **Doesn't solve filtering** - still appears from system email
- ❌ **Not actually "from" the user** - just looks like it in replies

### Implementation
```typescript
// In apps/api/src/services/email.ts
await this.transporter.sendMail({
  from: options.fromName ? `"${options.fromName}" <${options.from}>` : options.from,
  replyTo: applicantDetails.email, // ADD THIS LINE
  to: options.to,
  cc: options.cc,
  // ... rest
});
```

### Recommendation
✅ **Implement this immediately** as a baseline improvement, even if pursuing other options.

---

## Option 2: SMTP with User Credentials (Not Practical)

### How It Works
Ask users to provide their Gmail/Outlook credentials and send via their SMTP server.

### Pros
- ✅ Email truly from user's address
- ✅ Bypasses most filters

### Cons
- ❌ **Major security concern** - handling user credentials
- ❌ **Terrible UX** - users must enable "less secure apps" or create app passwords
- ❌ **Privacy issues** - storing passwords
- ❌ **Complex OAuth** - modern email requires OAuth2
- ❌ **Rate limits** - Gmail limits (100-500/day per account)

### Recommendation
❌ **Do not pursue** - security and UX nightmare.

---

## Option 3: Email Service API with "On Behalf Of" (SendGrid, Mailgun)

### How It Works
Use SendGrid's verified sender feature to send "on behalf of" users.

### SendGrid Approach
1. **Domain verification** - verify your organization's domain
2. **Sender verification** - can set `fromEmail` to user's email IF:
   - User verifies their email with SendGrid (not practical)
   - OR use "Sender Identity" feature (requires domain delegation)

### Mailgun Approach
Similar to SendGrid but with:
- Authorized recipients feature
- Mailing list functionality

### Pros
- ✅ Better deliverability than SMTP
- ✅ Tracking and analytics
- ✅ Can set display name to user's name

### Cons
- ❌ **Still can't use arbitrary user emails** without verification
- ❌ **Requires domain ownership** for the user's domain
- ❌ **Cost** - per-email pricing

### Recommendation
⚠️ **Partial solution** - Can improve sender name but not fully solve the "from" address issue.

---

## Option 4: Email Forwarding Service / Proxy (Complex)

### How It Works
Set up email aliases for each submission:
1. Create temporary alias like `submission-123@yourdomain.org`
2. Forward emails from this alias to council
3. Forward council replies back to user
4. Set envelope sender to user's email

### Pros
- ✅ Council sees user's email in "From" field
- ✅ Bidirectional communication
- ✅ You control the relay

### Cons
- ❌ **Very complex infrastructure** - requires email server setup
- ❌ **SPF/DKIM issues** - forwarding breaks email authentication
- ❌ **Maintenance burden** - managing email infrastructure
- ❌ **Cost** - dedicated email server

### Recommendation
❌ **Too complex** for the value provided.

---

## Option 5: OAuth2 Integration with User's Email Provider (Best but Complex)

### How It Works
Use OAuth2 to get permission to send on behalf of users:
1. User authorizes your app via OAuth2 (Gmail/Microsoft)
2. Store refresh token
3. Send email directly from their account via their provider's API

### Gmail API
```typescript
// Pseudocode
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oauth2Client.setCredentials({ refresh_token: user.refreshToken });

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
await gmail.users.messages.send({
  userId: 'me',
  requestBody: { raw: emailMessage }
});
```

### Pros
- ✅ **Truly from user's email** - actually sent from their Gmail/Outlook
- ✅ **No credential storage** - only OAuth tokens
- ✅ **Modern security** - OAuth2 standard
- ✅ **Best deliverability** - council sees real user email
- ✅ **No additional cost** - uses user's email quota

### Cons
- ❌ **Complex implementation** - OAuth flow, token management
- ❌ **UX friction** - user must authorize app
- ❌ **Multi-provider support** needed (Gmail, Outlook, Yahoo, etc.)
- ❌ **Token expiration** - refresh token management
- ❌ **Provider-specific APIs** - different for each provider
- ❌ **User consent screen** - may look intimidating

### Implementation Overview
1. Add OAuth2 endpoints for Gmail/Microsoft
2. Redirect user to authorize email sending
3. Store encrypted refresh tokens
4. Before sending, refresh access token
5. Use Gmail/Outlook API to send email
6. Fallback to system email if OAuth fails

### Recommendation
⚠️ **Best solution long-term** but significant development effort. Consider for Phase 2.

---

## Option 6: Hybrid Approach with User Choice (Recommended)

### How It Works
Offer users multiple options:
1. **Default**: Send from system email with user's Reply-To (Option 1)
2. **OAuth**: User can optionally connect their email for direct sending (Option 5)
3. **Manual**: Generate PDF and provide instructions for manual submission

### Implementation Strategy
```typescript
interface SubmissionDeliveryMethod {
  type: 'system_email' | 'user_oauth' | 'manual_download';
  oauthToken?: string; // If using OAuth
}

// Add to submissions table
alter table submissions add column delivery_method text default 'system_email';
alter table submissions add column user_email_oauth_token text; // encrypted
```

### Pros
- ✅ **Immediate improvement** - Reply-To for everyone
- ✅ **Optional advanced feature** - OAuth for power users
- ✅ **Flexibility** - users choose based on their needs
- ✅ **Progressive enhancement** - can implement in phases

### Cons
- ⚠️ **Multiple code paths** to maintain
- ⚠️ **UX complexity** - explaining options to users

### Recommendation
✅ **RECOMMENDED APPROACH**

---

## Recommended Implementation Plan

### Phase 1: Quick Win (1-2 hours)
**Implement Reply-To header immediately**

```typescript
// apps/api/src/services/email.ts - Line ~150
await this.transporter.sendMail({
  from: options.fromName ? `"${options.fromName}" <${options.from}>` : options.from,
  replyTo: options.replyTo || options.from, // Add this
  to: options.to,
  cc: options.cc,
  subject: options.subject,
  text: options.text,
  html: options.html,
  attachments: options.attachments,
});

// Update SendEmailOptions type - Line ~15
export type SendEmailOptions = {
  to: string;
  from: string;
  fromName?: string;
  replyTo?: string; // Add this
  cc?: string | string[];
  // ... rest
};

// Update call site in documentWorkflow.ts - Line ~501
const emailResult = await this.emailService.sendDirectSubmissionWithAttachments(
  submission.id,
  emailRecipient,
  project.from_email || process.env.DEFAULT_FROM_EMAIL!,
  project.from_name || process.env.DEFAULT_FROM_NAME || 'DA Submission Manager',
  subject,
  coverBodyText,
  [{ filename: groundsFileName, buffer: groundsFile }],
  {
    name: `${submission.applicant_first_name} ${submission.applicant_last_name}`.trim(),
    email: submission.applicant_email,
    siteAddress: submission.site_address,
    postalAddress: submission.applicant_postal_address,
    applicationNumber
  },
  coverBodyHtml,
  true, // ccApplicant
  submission.applicant_email // ADD THIS - for Reply-To
);
```

### Phase 2: Enhanced Sender Identity (2-4 hours)
**Improve sender name to include user's name**

```typescript
// Make the "From" field more personal while keeping system email
const fromName = `${submission.applicant_first_name} ${submission.applicant_last_name} (via ${project.from_name})`;
// Results in: "John Smith (via DA Submission Manager) <noreply@yourdomain.org>"
```

### Phase 3: OAuth Integration (2-3 weeks)
Only if Phase 1 & 2 don't solve the filtering issue:

1. **Week 1**: Gmail OAuth integration
   - OAuth flow endpoints
   - Token storage (encrypted)
   - Gmail API integration
   - UI for connecting email

2. **Week 2**: Microsoft OAuth integration
   - Similar flow for Outlook/Microsoft 365
   - Unified interface

3. **Week 3**: Testing & rollout
   - Fallback mechanisms
   - Error handling
   - User documentation

---

## Security Considerations

### For Reply-To Approach (Phase 1)
- ✅ No new security concerns
- ✅ No credential storage
- ✅ Existing email security applies

### For OAuth Approach (Phase 3)
- ⚠️ **Token storage**: Encrypt refresh tokens at rest
- ⚠️ **Scope limitation**: Only request "send email" scope
- ⚠️ **Token rotation**: Implement refresh token rotation
- ⚠️ **Revocation**: Allow users to disconnect
- ⚠️ **Audit logging**: Log all OAuth sends
- ⚠️ **Fallback**: Always have system email fallback

---

## Testing the Filtering Hypothesis

**Before major development**, test if filtering is actually happening:

1. **Test current setup**: Send test submissions, check spam scores
2. **Test with Reply-To**: Does it improve deliverability?
3. **Contact council**: Ask about email filtering policies
4. **Monitor delivery**: Use email logs to track bounces/rejections

---

## Cost Analysis

| Solution | Development Time | Infrastructure Cost | Ongoing Maintenance |
|----------|-----------------|---------------------|---------------------|
| Reply-To | 1-2 hours | $0 | None |
| Enhanced Sender | 2-4 hours | $0 | None |
| SendGrid "On Behalf" | 1-2 days | $10-50/month | Low |
| OAuth Integration | 2-3 weeks | $0 | Medium |
| Email Proxy | 3-4 weeks | $20-100/month | High |

---

## Final Recommendation

### Immediate Action
✅ **Implement Reply-To header** (Phase 1) - takes 1-2 hours, zero risk, improves user experience

### Monitor & Evaluate
📊 Track email delivery success rates for 2-4 weeks

### If filtering issues persist
🔧 Implement **Enhanced Sender Identity** (Phase 2) first before considering OAuth

### Only if absolutely necessary
⚠️ Proceed with **Gmail/Outlook OAuth integration** (Phase 3) - significant effort but best deliverability

---

## Questions to Ask Yourself

1. **Has council actually blocked/filtered emails?** Or is this a hypothetical concern?
2. **What email provider are you using currently?** (Gmail SMTP, SendGrid, etc.)
3. **How many submissions per day?** (Affects provider choice)
4. **What's the user technical level?** (Affects OAuth UX feasibility)
5. **Budget for email service?** (Affects provider options)

---

## Code Changes Summary

### Minimal Change (Reply-To only)
**Files to modify**: 
- `apps/api/src/services/email.ts` (~10 lines)
- `apps/api/src/services/documentWorkflow.ts` (~5 lines)

**Risk**: Very low
**Benefit**: Medium
**Time**: 1-2 hours

### Want me to implement this now?
Let me know and I can make these changes immediately!

