# Debug Google Permissions Issue

## APIs Are Enabled But Still Getting Permission Errors

Let's check a few more things:

---

## 1. Check Service Account Has IAM Permissions

**Go here:**
https://console.cloud.google.com/iam-admin/iam?project=supersub-473101

**Look for:**
`supersub@supersub-473101.iam.gserviceaccount.com`

**It should have role:** 
- "Editor" OR
- "Owner" OR
- Custom role with Docs/Drive permissions

**If it's missing or has wrong role:**
1. Click "GRANT ACCESS"
2. Enter: `supersub@supersub-473101.iam.gserviceaccount.com`
3. Role: "Editor"
4. Save

---

## 2. Check Railway Has the Correct Credentials

In Railway dashboard → API service → Variables:

**Check `GOOGLE_CREDENTIALS_JSON` contains:**
```
"project_id": "supersub-473101"
"client_email": "supersub@supersub-473101.iam.gserviceaccount.com"
```

**NOT:**
```
"project_id": "your-project"  ← This is wrong!
```

---

## 3. Wait for API Propagation

Sometimes it takes a few minutes for API enablement to propagate.

**Try:**
1. Wait 2-3 minutes
2. Restart your API service in Railway
3. Try a new submission

---

## 4. Check Railway Logs for Exact Error

Let's see the full error message.

**In Railway:**
1. Go to your API service
2. Click "Deployments"
3. Click "View Logs"
4. Look for the full error message around the permission error

**Common errors:**
- "API has not been used in project" → API not fully enabled yet
- "Request had insufficient authentication scopes" → Service account needs more permissions
- "The caller does not have permission" → IAM role issue

---

## 5. Test Service Account Manually

Let's verify the service account works.

**Try this command locally:**

```bash
# Install gcloud if you haven't
# brew install google-cloud-sdk

# Set the credentials
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/key.json

# Test creating a doc
curl -X POST \
  'https://docs.googleapis.com/v1/documents' \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Test Document"
  }'
```

If this fails, the service account itself has issues.

---

## 6. Common Fixes

### Fix 1: Service Account Needs Editor Role

```
1. https://console.cloud.google.com/iam-admin/iam?project=supersub-473101
2. Find supersub@supersub-473101.iam.gserviceaccount.com
3. Edit → Add "Editor" role → Save
```

### Fix 2: API Not Fully Enabled

```
1. Disable the APIs
2. Wait 30 seconds
3. Re-enable them
4. Wait 2 minutes
5. Try again
```

### Fix 3: Railway Needs Redeploy

```
1. In Railway, trigger a manual redeploy
2. Wait for it to complete
3. Try submission
```

---

## 🔍 What to Check Right Now

1. **IAM Permissions:**
   - Go to: https://console.cloud.google.com/iam-admin/iam?project=supersub-473101
   - Screenshot what you see for the service account

2. **Railway Logs:**
   - Get the FULL error message from logs
   - Look for any additional details

3. **Railway Variables:**
   - Double-check the JSON is correctly pasted
   - No extra quotes or escaping

---

## 📊 Quick Diagnostic

**Tell me:**
1. What role does `supersub@supersub-473101.iam.gserviceaccount.com` have in IAM?
2. What's the FULL error message from Railway logs?
3. Did you redeploy Railway after updating credentials?

This will help me pinpoint the exact issue!

