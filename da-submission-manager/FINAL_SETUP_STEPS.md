# Final Setup Steps - You're Almost There!

## ✅ What You've Done

- ✅ Created real Google Cloud service account
- ✅ Updated Railway with real credentials
- Service Account: `supersub@supersub-473101.iam.gserviceaccount.com`
- Project: `supersub-473101`

---

## 🔧 Remaining Steps (5 minutes)

### Step 1: Enable Google APIs ⚠️ **CRITICAL**

Your service account won't work without these APIs enabled!

1. Go to https://console.cloud.google.com/apis/library?project=supersub-473101
2. Search for **"Google Docs API"** → Click it → Click **"Enable"**
3. Search for **"Google Drive API"** → Click it → Click **"Enable"**

**Verify they're enabled:**
- Go to https://console.cloud.google.com/apis/dashboard?project=supersub-473101
- You should see both APIs listed

---

### Step 2: Switch Back to Review Pathway

Your web app is currently using `'direct'` pathway (which sends text files).
You need `'review'` pathway for PDFs.

**Already committed - just needs to be deployed:**

Check that your latest deployment has:
```typescript
// apps/web/src/pages/SubmissionForm.tsx line 293
submission_pathway: 'review',  // NOT 'direct'
```

If you see `'direct'`, change it back to `'review'` and push to Railway.

---

### Step 3: Configure Google Doc Templates (Optional - Can Skip for Testing)

For testing, you can use the built-in fallback templates. The system will create basic documents.

**To use custom templates later:**

1. Create two Google Docs (cover letter + grounds template)
2. Share each with `supersub@supersub-473101.iam.gserviceaccount.com` (Editor permission)
3. Get the document IDs from URLs
4. Configure in admin interface or database

**For now:** Skip this - the system has fallbacks!

---

## 🧪 Test Submission

After Railway redeploys (wait ~2 minutes):

1. **Open your web app**
2. **Create a new test submission:**
   - Fill in all fields
   - Select concerns
   - Generate content
   - Submit

3. **Check Railway logs** for:
   ```
   [submissions] Processing document workflow
   [documentWorkflow] Processing review submission
   Creating Google Doc from template
   Email queued successfully
   Processing email jobs
   Successfully processed email job
   ```

4. **Check your email** (the one you used in the form)
   - You should receive an email with a link to review the Google Doc
   - The document should be a real Google Doc you can edit

---

## 🎯 Expected Flow (Review Pathway)

1. User submits → Creates Google Doc
2. User gets email: "Review your DA submission"
3. Email contains link to **edit the Google Doc**
4. User can make changes in Google Docs
5. Admin/User approves → System generates PDF
6. PDF sent to council

**Note:** With 'review' pathway, the council doesn't get the email immediately - the user reviews first!

---

## 📊 Verification Checklist

Before testing:

- [ ] Google Docs API enabled in project `supersub-473101`
- [ ] Google Drive API enabled in project `supersub-473101`
- [ ] Railway has the real credentials (not placeholders)
- [ ] Railway has redeployed (check deployment logs)
- [ ] Web app using `submission_pathway: 'review'`
- [ ] API is running (check health endpoint)

---

## 🔍 How to Check if APIs are Enabled

Quick check:
1. https://console.cloud.google.com/apis/dashboard?project=supersub-473101
2. Look for "Google Docs API" and "Google Drive API" in the list
3. Both should show as "Enabled"

If they're not there, you need to enable them (Step 1 above).

---

## 🚨 Troubleshooting

### Error: "Google Docs API has not been used"

**Solution:** Enable the API (Step 1 above)

### Error: "Permission denied"

**Solution:** Make sure the service account has the Editor role:
1. https://console.cloud.google.com/iam-admin/iam?project=supersub-473101
2. Find `supersub@supersub-473101.iam.gserviceaccount.com`
3. Should have "Editor" or "Owner" role

### Error: "Invalid credentials"

**Solution:** 
- Check Railway variable has the complete JSON
- No extra quotes or escaping
- Redeploy after changing

### No email sent

**Possible causes:**
1. Check email queue in database: `SELECT * FROM email_queue ORDER BY created_at DESC LIMIT 5`
2. Check Railway logs for email processing errors
3. Verify SendGrid is still configured correctly

---

## 📝 What Happens Next

After you enable the APIs and test:

**Success scenario:**
1. Submission goes through
2. Google Doc is created
3. Email sent to user with review link
4. User can edit the doc
5. Later, can finalize and send to council

**If it fails:**
- Check Railway logs for specific error
- Share the error message with me
- I'll help debug!

---

## 🎉 You're Ready!

Complete steps 1-2 above, then test a submission. Let me know how it goes!

