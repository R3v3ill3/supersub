# Quick Fix Guide: Email Not Sending

## ✅ Issue Fixed

**Problem:** Emails were never sent after submission completion  
**Root Cause:** Document workflow was never triggered  
**Solution:** Updated submission endpoint to trigger document workflow  

---

## 🚀 Deploy the Fix

### Step 1: Commit and Push

```bash
cd /Volumes/DataDrive/cursor_repos/supersub/da-submission-manager

git add apps/api/src/routes/submissions.ts
git commit -m "Fix: Trigger document workflow to send emails after submission"
git push origin main
```

### Step 2: Update Google Credentials ⚠️ IMPORTANT

Your `.env` file has **placeholder** Google credentials:
```json
{"type":"service_account","project_id":"your-project",...}
```

**This will cause PDF generation to fail!**

To fix:
1. Get real Google Cloud service account credentials
2. Update `.env` locally AND Railway environment variable
3. See instructions below

---

## 📋 Required: Google Cloud Setup

### Why You Need This

The document workflow:
1. Generates PDFs from Google Docs templates
2. Attaches PDFs to emails
3. Sends emails via SendGrid

**Without Google credentials, the workflow will fail before sending emails.**

### Quick Setup

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com

2. **Create/Select Project:**
   - Create a new project or use existing
   - Note the project ID

3. **Enable APIs:**
   - Enable "Google Docs API"
   - Enable "Google Drive API"

4. **Create Service Account:**
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Name: `da-submission-service`
   - Role: "Editor" (or minimum: Docs + Drive access)

5. **Generate Key:**
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON"
   - Download the file

6. **Copy to Environment:**
   ```bash
   # The downloaded file contains the JSON
   # Copy its ENTIRE contents to GOOGLE_CREDENTIALS_JSON variable
   ```

7. **Update Railway:**
   - Go to Railway dashboard
   - Select your API service
   - Click "Variables"
   - Find `GOOGLE_CREDENTIALS_JSON`
   - Paste the ENTIRE JSON content
   - Click "Deploy"

### Share Templates (If Using)

If your project uses Google Docs templates:
1. Find the service account email in the JSON: `client_email`
2. Share your template Google Docs with that email
3. Give "Editor" permission

---

## 🧪 Test After Deployment

### 1. Check Railway Deployment

```bash
# Watch the deploy
railway logs --service api

# Look for:
[api] listening on :3500
[api] Email queue processor started (60s interval)
```

### 2. Test a Submission

1. Go to your web app
2. Complete a test submission
3. Watch Railway logs for:
   ```
   [submissions] Processing document workflow for submission <id>
   [submissions] Document workflow completed
   ```

### 3. Verify Email Sent

Within 60 seconds, look for:
```
Processing N email jobs.
Successfully processed email job <id>
```

Check your email inbox (use the email address from the test submission).

---

## 🔍 Quick Diagnostics

### Railway Environment Variables Checklist

✅ Already configured:
- `EMAIL_PROVIDER=sendgrid`
- `SENDGRID_API_KEY=SG.Qy3OnV6mRi...`
- `DEFAULT_FROM_EMAIL=cvcommunitycare@yreveille.net.au`
- `DEFAULT_FROM_NAME="Currumbin Valley Community Care"`
- `SUPABASE_URL=https://sliznojlnyconyxpcebl.supabase.co`

⚠️ **Needs updating:**
- `GOOGLE_CREDENTIALS_JSON` (currently has placeholder values)

### Check Email Queue (Supabase)

```sql
-- Recent email queue jobs
SELECT 
  id, 
  email_type, 
  status, 
  retry_count,
  error_log,
  created_at
FROM email_queue
ORDER BY created_at DESC
LIMIT 5;

-- If status is 'failed', check error_log
-- If status is 'pending' for >2 minutes, email queue may not be running
-- If status is 'sent', emails are working! ✅
```

### Check Email Logs

```sql
SELECT 
  to_email,
  subject,
  status,
  delivery_status,
  error_message,
  sent_at
FROM email_logs
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🆘 Common Issues

### Issue 1: "Google credentials not configured"

**Error in logs:**
```
Failed to generate document
Google credentials not configured
```

**Fix:**
- Update `GOOGLE_CREDENTIALS_JSON` in Railway with real credentials
- Redeploy

### Issue 2: "Email queue jobs stay pending"

**Symptoms:**
- Jobs in `email_queue` with `status='pending'`
- No email sending activity

**Fix:**
- Check if email queue processor is running (look for log message)
- Wait 60 seconds (queue processes every minute)
- Check for errors in Railway logs

### Issue 3: "SendGrid authentication failed"

**Error:**
```
SMTP Error: Authentication failed
```

**Fix:**
- Verify SendGrid API key is valid
- Check SendGrid account status
- Verify sender email is verified in SendGrid

---

## 📊 What Happens Now

### Submission Flow (After Fix)

1. **User submits form** 
   → API saves submission data

2. **User selects concerns** 
   → API saves survey responses

3. **User generates text** 
   → AI generates content

4. **User submits final text** 
   → **NEW:** Document workflow triggered
   → PDFs generated from Google Docs templates
   → Email queued with PDFs attached

5. **Within 60 seconds** 
   → Email queue processor runs
   → Email sent via SendGrid

6. **User receives email** ✅

### Email Contents

Depending on project pathway:

- **Direct:** Email to council with PDF attachments
- **Review:** Email to user with Google Docs link for review
- **Draft:** Email to user with draft document

---

## 🎯 Next Actions

1. ✅ **Deploy code fix** (commit and push)
2. ⚠️ **Update Google credentials** in Railway
3. 🧪 **Test a submission** end-to-end
4. 📊 **Monitor logs** for successful email processing
5. 📧 **Verify email delivery** in user's inbox

---

## 📚 More Help

- **Detailed troubleshooting:** See [EMAIL_TROUBLESHOOTING.md](./EMAIL_TROUBLESHOOTING.md)
- **Complete fix summary:** See [EMAIL_FIX_SUMMARY.md](./EMAIL_FIX_SUMMARY.md)
- **Railway logs:** `railway logs --service api`
- **Database queries:** Connect to Supabase and check `email_queue` and `email_logs` tables

---

**Status:** 
- ✅ Code fix complete
- ⚠️ Google credentials need updating
- 🚀 Ready to deploy

