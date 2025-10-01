# Email Fix Summary

## ✅ What Was Fixed

**File Modified:** `apps/api/src/routes/submissions.ts`

**Changes Made:**
1. Added imports for `DocumentWorkflowService` and `logger`
2. Updated the `/api/submissions/:submissionId/submit` endpoint to:
   - Trigger the document workflow after storing final text
   - Generate PDFs (cover letter + grounds document)
   - Queue emails for sending
   - Return workflow status in response

## 🔍 Root Cause

The web app was completing submissions without ever triggering the document workflow (`DocumentWorkflowService.processSubmission()`), which is responsible for:
- Generating PDF documents from templates
- Queuing emails in the `email_queue` table
- Processing emails via SendGrid/SMTP

Even though:
- ✅ SendGrid was configured correctly
- ✅ Email queue processor was running (every 60 seconds)
- ✅ Email service code was working

**The emails were never queued in the first place!**

## 🚀 Deployment Steps

### For Railway (Production)

1. **Commit and push the changes:**
   ```bash
   git add apps/api/src/routes/submissions.ts
   git commit -m "Fix: Trigger document workflow to send emails after submission"
   git push origin main
   ```

2. **Railway will auto-deploy** (if auto-deploy is enabled)

3. **Verify environment variables in Railway:**
   - `EMAIL_PROVIDER=sendgrid` ✅
   - `SENDGRID_API_KEY=SG.Qy3OnV6mRi...` ✅
   - `DEFAULT_FROM_EMAIL=cvcommunitycare@yreveille.net.au` ✅
   - `DEFAULT_FROM_NAME="Currumbin Valley Community Care"` ✅
   - `GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}` ⚠️ **CHECK THIS**

4. **Monitor Railway logs after deployment:**
   ```bash
   railway logs --service api | grep -i "submissions\|email\|workflow"
   ```

### For Local Development

1. **Restart the API server:**
   ```bash
   cd da-submission-manager/apps/api
   pnpm dev
   ```

2. **Test a submission** through the web app

3. **Check logs** for:
   ```
   [submissions] Processing document workflow for submission <id>
   [submissions] Document workflow completed
   Processing email jobs
   Successfully processed email job <id>
   ```

## ⚠️ Important Configuration Check

Your Google credentials appear to be placeholder values:
```json
{"type":"service_account","project_id":"your-project",...}
```

**You need real Google Cloud credentials for:**
- PDF generation from Google Docs templates
- Document creation and export

### To Get Real Google Credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable Google Docs API and Google Drive API
4. Create a Service Account
5. Download the JSON key file
6. Copy the JSON content to Railway's `GOOGLE_CREDENTIALS_JSON` variable
7. Share any template Google Docs with the service account email

## 🧪 Testing After Deployment

### Test 1: Complete a Submission

1. Visit your web app: `https://your-app.railway.app/project-slug`
2. Fill out the form completely
3. Select concerns and generate content
4. Submit the final text
5. **Check your email** (the one you used in the form)

### Test 2: Check Database

Connect to your Supabase database and run:

```sql
-- Check if emails are being queued
SELECT id, email_type, status, created_at, scheduled_for, error_log
FROM email_queue
ORDER BY created_at DESC
LIMIT 5;

-- Check email logs
SELECT to_email, subject, status, delivery_status, sent_at, error_message
FROM email_logs
ORDER BY created_at DESC
LIMIT 5;
```

### Test 3: Check Railway Logs

```bash
# Look for successful email processing
railway logs --service api | grep "Successfully processed email job"

# Check for any errors
railway logs --service api | grep -i "error"
```

## 📊 Expected Behavior Now

### Before (Broken)
```
User submits → Text saved → Thank you page → ❌ No email
```

### After (Fixed)
```
User submits → Text saved → Document workflow triggered →
  → PDFs generated → Email queued → Email sent via SendGrid → ✅ User receives email
```

### Timeline
- **Immediate:** Submission processed, workflow triggered
- **Within 5-10s:** PDFs generated, email queued
- **Within 60s:** Email queue processed, email sent via SendGrid
- **Within 1-2min:** User receives email

## 🔧 What Emails Are Sent

Depending on the project's `submission_pathway`:

1. **Direct pathway:**
   - Email to **council** with PDF attachments
   - No email to user (they submitted directly)

2. **Review pathway:**
   - Email to **user** with document review link
   - User can edit in Google Docs
   - After approval, email to council

3. **Draft pathway:**
   - Email to **user** with draft and info pack
   - User can review offline

## 🆘 If Emails Still Don't Send

See the detailed troubleshooting guide: [EMAIL_TROUBLESHOOTING.md](./EMAIL_TROUBLESHOOTING.md)

Quick checks:
1. ✅ Code fix deployed?
2. ✅ SendGrid API key valid?
3. ✅ Google credentials configured?
4. ✅ Email queue processor running? (check logs)
5. ✅ No errors in Railway logs?

## 📝 Additional Notes

- **Email queue processes every 60 seconds** - so there may be up to a 1-minute delay
- **Failed emails retry up to 3 times** with exponential backoff
- **All emails are logged** in the `email_logs` table for debugging
- **Queue status tracked** in `email_queue` table

## 🎯 Next Steps

1. **Update Google credentials** in Railway (if using placeholder values)
2. **Deploy the fix** to Railway
3. **Test a submission** end-to-end
4. **Monitor logs** to ensure emails are being sent
5. **Check user inbox** to verify email delivery

---

**Questions or issues?** Check the logs first, then review the troubleshooting guide.

