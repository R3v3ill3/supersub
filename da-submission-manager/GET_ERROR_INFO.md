# How to Get the 400 Error Details

## Method 1: Browser DevTools (FASTEST) ⭐

This will show you the EXACT error message:

1. **Open your web app** in the browser
2. **Open DevTools:**
   - Chrome/Edge: Press `F12` or `Cmd+Option+I` (Mac)
   - Firefox: Press `F12` or `Cmd+Option+K` (Mac)
3. **Go to the "Network" tab**
4. **Keep DevTools open** and submit a form
5. **Look for the failed request** (it will be RED and show "400")
6. **Click on it** to see details
7. **Click "Response" or "Preview" tab**

You'll see something like:
```json
{
  "error": "No Google Doc template configured for this project"
}
```

**This is the actual error!** Share this with me.

## Method 2: Railway Dashboard (Also Good)

1. Go to https://railway.app
2. Log in
3. Select your project
4. Click on the "API" service
5. Click on "Deployments" tab
6. Click "View Logs" on the latest deployment
7. Click the filter icon and search for "error" or "submission"

## Method 3: Add Logging to Frontend

Temporarily add this to see the error in browser console:

```typescript
// In apps/web/src/pages/SubmissionForm.tsx
// Around line 272 (in the submitMutation)

const submitMutation = useMutation({
  mutationFn: async () => {
    const response = await api.submissions.submit(submissionId, { finalText: generatedText });
    return response.data;
  },
  onSuccess: () => {
    navigate('/thank-you');
  },
  onError: (error: any) => {
    // ADD THIS:
    console.error('Submission error:', error);
    console.error('Error response:', error?.response?.data);
    alert('Error: ' + (error?.response?.data?.error || error.message));
  }
});
```

## Most Likely Errors & Solutions

### Error 1: "No Google Doc template configured"
```json
{"error": "No Google Doc template configured for this project"}
```

**Cause:** Using "review" pathway without Google Docs setup

**Quick Fix:** Switch to "direct" pathway
```typescript
// apps/web/src/pages/SubmissionForm.tsx line 228
submission_pathway: 'direct',
```

### Error 2: "Google credentials not configured"
```json
{"error": "Google credentials not configured"}
```

**Cause:** Using "review" pathway with placeholder Google credentials

**Quick Fix:** Same as above - switch to "direct" pathway

### Error 3: "Failed to generate document"
```json
{"error": "Failed to generate document", "details": "..."}
```

**Cause:** Issue with Google Docs API

**Quick Fix:** Switch to "direct" pathway

### Error 4: "Submission not found"
```json
{"error": "Submission not found"}
```

**Cause:** submissionId is invalid or null

**Fix:** Check that previous steps completed successfully

## Quick Test: Switch to Direct Pathway

This should fix the 400 error if it's Google Docs related:

```bash
# Edit the file
cd /Volumes/DataDrive/cursor_repos/supersub/da-submission-manager/apps/web/src/pages

# Change line 228 from:
# submission_pathway: 'review',
# To:
# submission_pathway: 'direct',

# Then rebuild
cd ../..
pnpm build
```

## What to Share with Me

Please share:
1. **The exact error message** from Browser DevTools Network tab
2. **The submission pathway** you're using (review or direct)
3. **Any logs** from Railway dashboard that show around the time of the error

This will help me pinpoint the exact issue!

