# Email Troubleshooting Guide

## Issue Identified ✅

**Root Cause:** The document workflow was never triggered after submission, so emails were never queued or sent.

### What Was Happening (Before Fix)

1. ✅ User submits form → Creates submission record
2. ✅ User selects concerns → Saves survey
3. ✅ User generates text → AI generates content
4. ✅ User submits → Saves text to database
5. ❌ **NO EMAIL SENT** - The endpoint had a TODO comment but no implementation

### What Was Fixed

Updated `/api/submissions/:submissionId/submit` endpoint to:
- Import and instantiate `DocumentWorkflowService`
- Call `processSubmission()` after storing the final text
- This triggers the full document workflow which:
  - Generates PDFs (cover letter + grounds document)
  - Queues emails using the email queue service
  - Sends emails via the configured provider (SendGrid/SMTP)

---

## Verification Steps

### 1. Check Email Configuration

Verify these environment variables are set in Railway:

```bash
# Required
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_actual_key
DEFAULT_FROM_EMAIL=your_email@domain.com
DEFAULT_FROM_NAME="Your Organization Name"

# Also required for document generation
GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}
```

### 2. Monitor Email Queue

The email queue processor runs every 60 seconds. Check the logs:

```bash
# Look for these log messages:
[api] Email queue processor started (60s interval)
Processing N email jobs.
Successfully processed email job <id>
```

### 3. Check Database Tables

After a submission, check these tables in Supabase:

**email_queue table:**
```sql
SELECT id, email_type, status, created_at, scheduled_for, error_log
FROM email_queue
WHERE submission_id = 'your-submission-id'
ORDER BY created_at DESC;
```

**email_logs table:**
```sql
SELECT id, to_email, subject, status, delivery_status, sent_at, error_message
FROM email_logs
WHERE submission_id = 'your-submission-id'
ORDER BY created_at DESC;
```

### 4. Test a Submission

1. Complete a test submission on the web app
2. Check Railway logs immediately after submission:
   ```
   [submissions] Processing document workflow for submission <id>
   [submissions] Document workflow completed
   ```
3. Within 60 seconds, you should see:
   ```
   Processing email job <id>
   Successfully processed email job <id>
   ```

---

## Common Issues & Solutions

### Issue 1: Email Queue Jobs Stay "pending"

**Symptoms:**
- Jobs appear in `email_queue` table with `status='pending'`
- No email sending attempts in logs
- `scheduled_for` date might be in the future

**Solutions:**
1. Check if the email queue processor is running:
   ```
   grep "Email queue processor started" railway_logs.txt
   ```
2. Check for errors in processing:
   ```
   grep "Email queue processing error" railway_logs.txt
   ```
3. Manually trigger queue processing (dev only):
   ```bash
   curl -X POST http://localhost:3500/api/dev/process-email-queue
   ```

### Issue 2: SendGrid Authentication Errors

**Symptoms:**
```
Error processing email job
SMTP Error: Authentication failed
```

**Solutions:**
1. Verify SendGrid API key is correct
2. Check SendGrid account status at https://app.sendgrid.com
3. Verify sender email is verified in SendGrid
4. Test SendGrid connection:
   ```bash
   curl -X POST https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"your@email.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
   ```

### Issue 3: Google Credentials Error

**Symptoms:**
```
Failed to generate document
Google credentials not configured
```

**Solutions:**
1. Verify `GOOGLE_CREDENTIALS_JSON` is set in Railway
2. Ensure the JSON is valid (not escaped or malformed)
3. Check service account has Google Docs API enabled
4. Verify service account has access to any template documents

### Issue 4: Email Queue Stuck in "processing"

**Symptoms:**
- Jobs have `status='processing'` but never complete
- No success or error logs

**Solutions:**
1. The job likely crashed mid-processing
2. Manually reset the job:
   ```sql
   UPDATE email_queue 
   SET status = 'pending', retry_count = retry_count + 1
   WHERE id = 'stuck-job-id' AND status = 'processing';
   ```
3. Check for memory or timeout issues in Railway

### Issue 5: Emails Go to Spam

**Symptoms:**
- Emails are sent successfully
- Recipients don't receive them (check spam folder)

**Solutions:**
1. Configure SendGrid domain authentication (SPF/DKIM)
2. Use a verified sender domain
3. Add unsubscribe link to emails
4. Warm up your sending domain gradually

---

## Testing Email Configuration

### Test 1: Check Email Provider Connection

Create a simple test script or use the API:

```bash
curl -X POST http://your-api-url/api/dev/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "text": "This is a test"
  }'
```

### Test 2: Verify Queue Processing

1. Create a test submission
2. Check queue table immediately:
   ```sql
   SELECT * FROM email_queue WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1;
   ```
3. Wait 60 seconds
4. Check if status changed to 'sent':
   ```sql
   SELECT * FROM email_queue WHERE id = 'your-job-id';
   ```

### Test 3: Check Email Logs

```sql
SELECT 
  el.created_at,
  el.to_email,
  el.subject,
  el.status,
  el.delivery_status,
  el.error_message,
  s.site_address,
  p.name as project_name
FROM email_logs el
LEFT JOIN submissions s ON el.submission_id = s.id
LEFT JOIN projects p ON s.project_id = p.id
WHERE el.created_at > NOW() - INTERVAL '24 hours'
ORDER BY el.created_at DESC;
```

---

## Railway-Specific Debugging

### Check Environment Variables

In Railway dashboard:
1. Go to your API service
2. Click "Variables" tab
3. Verify all email-related variables are set
4. Click "Deploy" after any changes

### Check Logs

```bash
# In Railway dashboard or CLI
railway logs --service api

# Filter for email-related logs
railway logs --service api | grep -i email
railway logs --service api | grep -i sendgrid
railway logs --service api | grep -i "queue"
```

### Monitor Resource Usage

High email volume can cause:
- Memory issues (check Railway metrics)
- Rate limiting (SendGrid has limits)
- Timeout errors (increase if needed)

---

## Email Queue Behavior

### Normal Flow

1. **Submission completed** → Email queued with `status='pending'`
2. **Queue processor runs** (every 60s) → Status changes to `processing`
3. **Email sent via SendGrid** → Status changes to `sent`
4. **Email log created** → Records success/failure

### Retry Logic

- Failed emails retry up to 3 times (configurable)
- Exponential backoff: 5min, 10min, 20min
- After max retries, status becomes `failed`

### Priority

- Priority 1 = Highest (processed first)
- Priority 5 = Default
- Priority 10 = Lowest

---

## Quick Diagnostic Checklist

- [ ] SendGrid API key is valid and set in Railway
- [ ] `DEFAULT_FROM_EMAIL` matches a verified SendGrid sender
- [ ] Google credentials are configured (for PDF generation)
- [ ] Email queue processor is running (check logs for "Email queue processor started")
- [ ] No errors in Railway logs related to email
- [ ] Database tables `email_queue` and `email_logs` exist
- [ ] Test submission creates entries in `email_queue`
- [ ] Entries in `email_queue` change from 'pending' to 'sent' within 60 seconds

---

## Getting Help

If issues persist:

1. **Check Railway logs** for the exact error message
2. **Query the database** to see email queue status
3. **Verify SendGrid dashboard** for sent emails
4. **Test with a different email provider** (SMTP) to isolate the issue
5. **Enable debug logging** by setting `LOG_LEVEL=debug` in Railway

## Helpful SQL Queries

```sql
-- Check recent email queue jobs
SELECT id, email_type, status, retry_count, scheduled_for, error_log, created_at
FROM email_queue
ORDER BY created_at DESC
LIMIT 10;

-- Check recent email logs
SELECT to_email, subject, status, delivery_status, sent_at, error_message
FROM email_logs
ORDER BY created_at DESC
LIMIT 10;

-- Find failed emails
SELECT eq.*, el.error_message as log_error
FROM email_queue eq
LEFT JOIN email_logs el ON el.submission_id = eq.submission_id
WHERE eq.status = 'failed'
ORDER BY eq.updated_at DESC;

-- Check email success rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM email_queue
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

