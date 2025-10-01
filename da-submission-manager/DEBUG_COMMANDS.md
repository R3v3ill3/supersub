# Railway Debugging Commands

## Get Recent Error Logs

```bash
# Get last 100 lines, filter for errors
railway logs --service api --tail 100 | grep -i "error\|fail"

# Get submissions-related errors
railway logs --service api --tail 100 | grep -i "submissions\|workflow"

# Get email-related logs
railway logs --service api --tail 100 | grep -i "email\|queue"

# Get Google Docs errors
railway logs --service api --tail 100 | grep -i "google\|credentials"

# Live tail all logs
railway logs --service api --follow

# Live tail with filtering
railway logs --service api --follow | grep -i "error\|submissions"
```

## Common Error Patterns to Look For

### Google Credentials Error
```
Google credentials not configured
Failed to create document
No Google Doc template configured
```
**Solution:** Either set up Google credentials OR switch to "direct" pathway

### Email Queue Error
```
Failed to send email
SendGrid API error
SMTP authentication failed
```
**Solution:** Check SendGrid API key in Railway variables

### Document Workflow Error
```
Failed to process submission
Document workflow failed
Error processing submission
```
**Solution:** Check the full error message for specific cause

### Database Error
```
Submission not found
Failed to update submission
Database not configured
```
**Solution:** Check Supabase connection

## Get Full Error Context

When you see an error, get more context:

```bash
# Get timestamp of error
railway logs --service api --tail 200 | grep -B 5 -A 10 "the-error-message"

# Get specific submission ID logs
railway logs --service api --tail 200 | grep "submission-id-here"
```

## Check Environment Variables

```bash
# List all variables (from Railway dashboard or CLI)
railway variables

# Check specific variable
railway variables | grep EMAIL_PROVIDER
railway variables | grep GOOGLE_CREDENTIALS
```

## Quick Test After Deployment

```bash
# Watch logs in real-time
railway logs --service api --follow

# Then trigger a submission in the web app
# Watch the logs as they come in
```

## Most Useful Debug Command

This gets the last error with full context:

```bash
railway logs --service api --tail 300 | grep -B 10 -A 10 -i "error.*submission\|submission.*error" | tail -50
```

## Check API Health

```bash
# Check if API is responding
curl https://your-api-url.railway.app/health

# Check specific endpoint
curl https://your-api-url.railway.app/api/projects
```

## Network Tab in Browser

When submitting from the web app:
1. Open Browser DevTools (F12)
2. Go to "Network" tab
3. Submit the form
4. Look for the failed request
5. Click on it to see:
   - Request payload
   - Response body (this will show the exact error message!)
   - Status code

## Expected vs Actual

### Expected Success Flow (in logs):
```
[submissions] Processing document workflow for submission abc-123
[documentWorkflow] Processing direct submission
Processing email jobs
Successfully processed email job xyz-456
```

### If Using "review" Pathway WITHOUT Google:
```
Error: No Google Doc template configured for this project
OR
Error: Google credentials not configured
OR
Failed to create document
```

### If Using "direct" Pathway (Should Work):
```
[submissions] Processing document workflow for submission abc-123
[documentWorkflow] Processing direct submission
Processing email jobs
Successfully processed email job xyz-456
```

