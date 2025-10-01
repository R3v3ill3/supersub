# How to Apply the Download & CC Feature

## Quick Start

### 1. Apply Database Migration

You need to run the migration to add PDF storage columns to your database.

**Option A: Using Supabase Dashboard**
1. Log into your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `packages/db/migrations/0026_pdf_storage.sql`
4. Run the query

**Option B: Using psql (if you have direct database access)**
```bash
cd /Volumes/DataDrive/cursor_repos/supersub/da-submission-manager
psql $DATABASE_URL -f packages/db/migrations/0026_pdf_storage.sql
```

**Option C: Using the Supabase CLI**
```bash
cd /Volumes/DataDrive/cursor_repos/supersub/da-submission-manager
supabase db push
```

### 2. Deploy API Changes

The API changes are in these files:
- `apps/api/src/services/email.ts`
- `apps/api/src/services/documentWorkflow.ts`
- `apps/api/src/routes/submissions.ts`

If you're using Railway or another platform:

```bash
cd /Volumes/DataDrive/cursor_repos/supersub/da-submission-manager
git add -A
git commit -m "Add download and CC features for submissions"
git push origin main
```

Your platform should automatically deploy the changes.

### 3. Deploy Web App Changes

The web app changes are in:
- `apps/web/src/lib/api.ts`
- `apps/web/src/pages/SubmissionForm.tsx`
- `apps/web/src/pages/ThankYou.tsx`

If you're using Vercel:
```bash
cd /Volumes/DataDrive/cursor_repos/supersub/da-submission-manager/apps/web
# Vercel will auto-deploy from git, or manually:
vercel --prod
```

### 4. Test the Changes

1. **Test Email CC:**
   - Submit a test form with your email
   - Check that you receive a CC of the submission email
   - Verify PDFs are attached

2. **Test Downloads:**
   - After submitting, you should see the Thank You page
   - Click "Download Cover Letter" - should download a PDF
   - Click "Download Submission" - should download a PDF
   - Verify both PDFs contain the correct content

## What Each Feature Does

### CC Feature ✉️
When a submission is sent to the council, the applicant (the person who filled out the form) will automatically receive a CC (carbon copy) of the email with all the PDF attachments. This way they have a copy of what was sent.

### Download Feature 📥
After submitting, users can download both PDFs from the Thank You page:
- **Cover Letter PDF** - The formal cover letter sent to council
- **Submission PDF** - The full grounds/submission document

These PDFs are the exact same files that were emailed to the council.

## Troubleshooting

### Migration Fails
- Check if columns already exist: `\d submissions` in psql
- If they exist, you can skip the migration

### Downloads Don't Work
- Check browser console for errors
- Verify the API endpoint is accessible: `GET /api/submissions/:id/download/cover`
- Check that PDFs were stored in database

### CC Emails Not Received
- Check email logs in `email_logs` table
- Verify SMTP settings are correct
- Check spam folder
- Test with a different email provider

### PDFs Are Empty/Corrupted
- Check API logs for PDF generation errors
- Verify Puppeteer is installed and working
- Test PDF generation manually via API

## Configuration

### Disable CC Feature
Edit `apps/api/src/services/documentWorkflow.ts` line ~503:

```typescript
// Change from:
bodyHtml
);

// To:
bodyHtml,
false  // Don't CC applicant
);
```

### Change Download Retention
To automatically delete old PDFs, add a cleanup job (example):

```sql
-- Delete PDFs older than 90 days
UPDATE submissions 
SET 
  cover_pdf_data = NULL,
  grounds_pdf_data = NULL,
  cover_pdf_filename = NULL,
  grounds_pdf_filename = NULL
WHERE 
  submitted_to_council_at < NOW() - INTERVAL '90 days'
  AND cover_pdf_data IS NOT NULL;
```

## Support

If you encounter issues:
1. Check `apps/api/logs/error.log` for API errors
2. Check browser console for frontend errors
3. Check `email_logs` table for email delivery issues
4. Review the full documentation in `DOWNLOAD_AND_CC_FEATURE.md`

