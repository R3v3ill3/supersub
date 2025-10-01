# Check Email Queue Status

## The PDFs Generated Successfully! ✅

Now we need to see if the email is being sent.

---

## Check #1: Email Queue Table

Connect to your Supabase database and run:

```sql
SELECT 
  id,
  email_type,
  status,
  retry_count,
  scheduled_for,
  error_log,
  created_at
FROM email_queue
WHERE submission_id = 'f9c1c3ff-0a5e-4c7e-a67e-ce6e752b9291'
ORDER BY created_at DESC;
```

**What to look for:**
- `status = 'pending'` → Email is waiting to be sent (queue runs every 60 seconds)
- `status = 'processing'` → Email is being sent right now
- `status = 'sent'` → Email was sent successfully!
- `status = 'failed'` → Check the `error_log` column

---

## Check #2: Email Logs Table

```sql
SELECT 
  id,
  to_email,
  subject,
  status,
  delivery_status,
  sent_at,
  error_message,
  created_at
FROM email_logs
WHERE submission_id = 'f9c1c3ff-0a5e-4c7e-a67e-ce6e752b9291'
ORDER BY created_at DESC;
```

**What to look for:**
- `status = 'sent'` → Email was sent
- `to_email` → Make sure this is the correct email address
- `error_message` → Any SendGrid errors

---

## Check #3: Railway Logs for Email Processing

Look for these in Railway logs (they appear every 60 seconds):

```
Processing N email jobs.
Successfully processed email job <id>
```

Or errors:
```
Error processing email job
Failed to send email
```

---

## Most Likely Scenarios

### Scenario 1: Email is Queued, Waiting to Send
- Queue runs every 60 seconds
- Wait a minute and check email again
- Check queue table to confirm status changed to 'sent'

### Scenario 2: Email Queue Processor Not Running
- Look for this in logs: `[api] Email queue processor started (60s interval)`
- If missing, the API server needs to restart

### Scenario 3: SendGrid Error
- Check `email_logs` table for error message
- Could be:
  - Invalid sender email
  - SendGrid API key issue
  - Rate limiting

### Scenario 4: Email Sent to Wrong Address
- Check the `to_email` in email_logs
- Make sure it matches the email you used in the form

---

## Quick Checks

1. **Wait 2 minutes** then check your email (including spam folder)

2. **Check Supabase** email_queue table for the status

3. **Check Railway logs** for "Processing email jobs" messages

**Share what you find in the database tables and I'll help debug!**

