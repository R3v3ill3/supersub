# Google Docs Setup Checklist for "review" Pathway

## ⚠️ Critical Issue: Your Credentials Are Placeholders!

Your current `GOOGLE_CREDENTIALS_JSON` contains:
- `"project_id":"your-project"` ← This is a placeholder!
- `"client_email":"your-service-account@your-project.iam.gserviceaccount.com"` ← Also placeholder!

**These are NOT real credentials.** They're example values that need to be replaced.

---

## ✅ What You Need for Option 1 (Review Pathway)

### 1. Real Google Cloud Credentials

**Status:** ❌ Not configured (placeholders only)

**What you need:**
- A Google Cloud Project
- Service Account with Docs & Drive API access
- Real JSON key file

**How to get it:**

#### Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click "Select a project" → "New Project"
3. Name it something like "DA Submission Manager"
4. Click "Create"
5. Note the **Project ID** (e.g., `da-submission-12345`)

#### Step 2: Enable Required APIs

1. In your project, go to "APIs & Services" → "Library"
2. Search for and enable:
   - **Google Docs API**
   - **Google Drive API**

#### Step 3: Create Service Account

1. Go to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
3. Name: `da-submission-service`
4. Description: "Service account for DA submission document generation"
5. Click "Create and Continue"
6. Role: Select "Editor" (or create custom with Docs + Drive access)
7. Click "Continue" → "Done"

#### Step 4: Generate JSON Key

1. Click on the service account you just created
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON"
5. Click "Create"
6. **A file will download** - this is your real credentials file!

#### Step 5: Update Railway Environment Variable

1. Open the downloaded JSON file
2. Copy the ENTIRE contents (it will look like this but with REAL values):
```json
{
  "type": "service_account",
  "project_id": "da-submission-12345",
  "private_key_id": "abc123def456...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk...[LONG STRING]...==\n-----END PRIVATE KEY-----\n",
  "client_email": "da-submission-service@da-submission-12345.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

3. In Railway dashboard:
   - Go to your API service
   - Click "Variables"
   - Find `GOOGLE_CREDENTIALS_JSON`
   - Replace the placeholder with the ENTIRE JSON content (as one line, no formatting)
   - Click "Deploy"

---

### 2. Google Drive Folder ID (Optional)

**Status:** Not set (OK - it's optional)

**What it does:** 
- If set: Generated documents are stored in a specific folder
- If not set: Documents are created in the root of the service account's Drive

**Do you need it?** 
- ❌ No - it's completely optional
- ✅ Leave it empty for now

**To set it up later (optional):**
1. Create a folder in Google Drive
2. Share it with the service account email
3. Get the folder ID from the URL: `https://drive.google.com/drive/folders/[THIS_IS_THE_ID]`
4. Add to Railway as `GOOGLE_DRIVE_FOLDER_ID`

---

### 3. Google Doc Template IDs in Database

**Status:** ❓ Need to check

These are stored in your Supabase database in the `template_files` table for your project.

**What you need:**

For the "review" pathway, your project needs:
- A Google Doc template for the cover letter
- A Google Doc template for the grounds document

**Two options:**

#### Option A: Use Existing Templates (If You Have Them)

If you already have Google Docs you want to use as templates:

1. Open the Google Doc in your browser
2. Get the ID from the URL: `https://docs.google.com/document/d/[THIS_IS_THE_TEMPLATE_ID]/edit`
3. Share the document with your service account email (from step 4 above)
4. Give it "Editor" permissions
5. Save the template ID to your project in the admin interface

#### Option B: Let the System Create Templates (Fallback)

The code has fallback templates built-in. If no templates are configured, it will create basic documents.

**For testing:** You can skip template setup and use the fallback templates.

---

### 4. Switch Back to Review Pathway

**Current:** Using `'direct'` (broken - sends text files)  
**Needed:** Change to `'review'` (works - sends PDFs)

Already done in your recent changes! Just need to make sure when you redeploy, you use:

```typescript
// apps/web/src/pages/SubmissionForm.tsx line 228
submission_pathway: 'review',
```

---

## 🎯 Quick Setup Path (Minimum to Test)

**Absolute minimum to test emails:**

1. ✅ **Get real Google credentials** (Steps 1-5 above) - **~10 minutes**
2. ✅ **Update Railway variable** with real credentials - **~2 minutes**
3. ✅ **Switch to review pathway** (if not already) - **~1 minute**
4. ❌ **Skip** Drive folder ID (optional)
5. ❌ **Skip** custom templates (use fallback)
6. ✅ **Test submission**

**Total time: ~15 minutes**

---

## 🧪 Testing Checklist

After setup:

- [ ] Railway variable `GOOGLE_CREDENTIALS_JSON` has REAL values (not "your-project")
- [ ] Service account email looks like: `name@project-id-12345.iam.gserviceaccount.com`
- [ ] Google Docs API is enabled in Google Cloud Console
- [ ] Google Drive API is enabled in Google Cloud Console
- [ ] Web app is using `submission_pathway: 'review'`
- [ ] Create a test submission
- [ ] Check Railway logs for document creation
- [ ] Check email queue for sent email

---

## 🔍 How to Verify Your Setup

### Check if credentials are real:

```bash
# In Railway dashboard or your .env, check if you see:
"project_id": "your-project"  # ❌ This is FAKE
"project_id": "da-submission-12345"  # ✅ This is REAL
```

### Check if APIs are enabled:

1. Go to https://console.cloud.google.com/apis/dashboard
2. Select your project
3. You should see "Google Docs API" and "Google Drive API" in the enabled list

### Check if service account exists:

1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts
2. Select your project
3. You should see your service account listed

---

## 🚨 Common Issues

### "Invalid credentials"
- Check that you copied the ENTIRE JSON (including the outer `{ }`)
- Check for no extra quotes or escaping in Railway variable
- Make sure you're using the JSON format, not P12

### "Permission denied"
- Make sure the Docs and Drive APIs are enabled
- Check that the service account has the right role (Editor)

### "Document not found"
- Make sure template docs are shared with the service account email
- Give "Editor" permission, not just "Viewer"

---

## 📚 Additional Resources

- [Google Cloud Console](https://console.cloud.google.com)
- [Service Account Documentation](https://cloud.google.com/iam/docs/service-accounts)
- [Google Docs API Documentation](https://developers.google.com/docs/api)
- [Google Drive API Documentation](https://developers.google.com/drive/api)

---

## Next Steps

1. **Create Google Cloud project** (if you don't have one)
2. **Generate real credentials**
3. **Update Railway** with real JSON
4. **Test submission**
5. **Report back results!**

Need help with any step? Let me know!

