# How to Generate a New JSON Key for Existing Service Account

## Quick Recovery (2 minutes)

### Step 1: Find Your Service Account

1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts
2. Select your project from the dropdown at the top
3. You'll see your service account listed

### Step 2: Create New Key

1. **Click** on the service account (the row, not the checkbox)
2. Click the **"Keys"** tab at the top
3. Click **"Add Key"** button
4. Select **"Create new key"**
5. Choose **"JSON"** format
6. Click **"Create"**
7. The JSON file downloads automatically

### Step 3: Update Railway

1. **Open the downloaded JSON file** in a text editor
2. **Copy the ENTIRE contents** (from `{` to `}`)
3. Go to Railway dashboard → Your API service → **"Variables"** tab
4. Find `GOOGLE_CREDENTIALS_JSON`
5. **Delete the placeholder text**
6. **Paste the real JSON** (as ONE LINE - Railway handles formatting)
7. Click **"Deploy"**

### Step 4: Update Local .env (Optional)

```bash
cd /Volumes/DataDrive/cursor_repos/supersub/da-submission-manager

# Open .env and replace the GOOGLE_CREDENTIALS_JSON value with the real one
# Or use this command (paste your JSON after the =):
# GOOGLE_CREDENTIALS_JSON={"type":"service_account",...} 
```

---

## ⚠️ Important Notes

- **Multiple keys are OK**: Creating a new key doesn't delete the old one
- **Old key still works**: If the old key is used elsewhere, it keeps working
- **Clean up later**: You can delete old/unused keys from the Keys tab

---

## 🧹 Optional: Delete Old Keys

If you want to clean up old keys:

1. In the **"Keys"** tab
2. Find the old key (check the creation date)
3. Click the **⋮** (three dots) menu
4. Select **"Delete"**
5. Confirm deletion

**Note:** Only delete keys you're sure aren't being used!

---

## 🔍 How to Verify Your Real Credentials

After pasting the new key, check these values in Railway:

```json
{
  "project_id": "your-actual-project-id-12345",  // ✅ Should be a real project ID
  "client_email": "service-name@project-id-12345.iam.gserviceaccount.com",  // ✅ Real email
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE..."  // ✅ Actual long key
}
```

If you still see `"your-project"` → it's still a placeholder!

---

## 🚀 After Updating Railway

1. Wait 1-2 minutes for Railway to redeploy
2. Test a submission
3. Check Railway logs for success messages
4. Email should be generated with PDFs!

---

## Need the Service Account Email?

You can find it in two places:

**Option 1: Google Cloud Console**
- IAM & Admin → Service Accounts → Listed under "Email" column

**Option 2: From the JSON**
- Look for the `client_email` field in the JSON you just downloaded

---

## Still Having Issues?

If you get errors after updating:

1. **Check the JSON is valid**: Paste it into https://jsonlint.com
2. **Make sure APIs are enabled**: Docs API + Drive API
3. **Verify service account has permissions**: Should have Editor role or Docs/Drive access
4. **Check Railway logs**: Look for "Google" or "credentials" errors

Let me know if you hit any snags!

