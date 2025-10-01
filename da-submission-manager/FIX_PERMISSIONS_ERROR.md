# Fix: "The caller does not have permission"

## This Error Means: Google APIs Are NOT Enabled Yet!

You **MUST** enable these APIs before it will work.

---

## 🚨 **DO THIS NOW** (2 minutes)

### Step 1: Enable Google Docs API

**Click this link and enable:**
https://console.cloud.google.com/apis/library/docs.googleapis.com?project=supersub-473101

1. Click the blue **"ENABLE"** button
2. Wait for it to say "API enabled"

### Step 2: Enable Google Drive API

**Click this link and enable:**
https://console.cloud.google.com/apis/library/drive.googleapis.com?project=supersub-473101

1. Click the blue **"ENABLE"** button
2. Wait for it to say "API enabled"

---

## ✅ **Verify They're Enabled**

After enabling both, check here:
https://console.cloud.google.com/apis/dashboard?project=supersub-473101

You should see:
- ✅ Google Docs API (enabled)
- ✅ Google Drive API (enabled)

---

## 🧪 **Then Test Again**

After enabling both APIs:

1. **Wait 30 seconds** for the changes to propagate
2. **Try a new submission** (fresh one)
3. Should work now!

---

## 🔍 **Still Getting Errors?**

If you still get permission errors after enabling:

### Check Service Account Permissions

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=supersub-473101
2. Find: `supersub@supersub-473101.iam.gserviceaccount.com`
3. Should have role: **Editor** or **Owner**

If it's not there or has limited permissions:
1. Click **"GRANT ACCESS"**
2. Enter: `supersub@supersub-473101.iam.gserviceaccount.com`
3. Select role: **"Editor"**
4. Click **"Save"**

---

## 📝 **Common Permission Errors**

| Error | Cause | Fix |
|-------|-------|-----|
| "The caller does not have permission" | APIs not enabled | Enable Docs + Drive APIs |
| "API has not been used in project" | APIs not enabled | Enable Docs + Drive APIs |
| "Insufficient Permission" | Service account needs Editor role | Add Editor role in IAM |
| "Permission denied" | Wrong project selected | Check you're in supersub-473101 |

---

## 🎯 **Quick Checklist**

- [ ] Google Docs API enabled in supersub-473101
- [ ] Google Drive API enabled in supersub-473101
- [ ] Service account has Editor role
- [ ] Waited 30 seconds after enabling
- [ ] Tried a NEW submission (not retry)

---

**The APIs MUST be enabled. There's no way around it!**

