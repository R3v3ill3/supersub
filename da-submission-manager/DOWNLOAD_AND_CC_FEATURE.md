# Download and CC Feature Implementation

## Overview
This document describes the implementation of two new features for the web app submission flow:
1. **CC Applicant**: Automatically CC the applicant on the submission email sent to the council
2. **Download PDFs**: Allow users to download their submission PDFs after submitting

## Changes Made

### 1. Database Migration
**File**: `packages/db/migrations/0026_pdf_storage.sql`
- Added fields to store PDF data in the `submissions` table:
  - `cover_pdf_data` (BYTEA) - stores the cover letter PDF
  - `grounds_pdf_data` (BYTEA) - stores the grounds/submission PDF
  - `cover_pdf_filename` (TEXT) - stores the cover letter filename
  - `grounds_pdf_filename` (TEXT) - stores the submission filename
- Added index for faster PDF lookups

**To apply this migration**, run it against your database:
```bash
# Using psql
psql -h <host> -U <user> -d <database> -f packages/db/migrations/0026_pdf_storage.sql

# Or via Supabase dashboard SQL editor
```

### 2. API Changes

#### Email Service (`apps/api/src/services/email.ts`)
- Added `cc` field to `SendEmailOptions` type
- Updated `sendEmail` method to include CC in the mail options
- Added `ccApplicant` parameter (default: `true`) to `sendDirectSubmissionWithAttachments` method
- When `ccApplicant` is true, the applicant's email is automatically added to the CC field

#### Document Workflow (`apps/api/src/services/documentWorkflow.ts`)
- Updated `processDirectSubmission` to store generated PDFs in the database
- PDFs are now saved to the `submissions` table along with their filenames
- This enables users to download their submissions later

#### Submissions Route (`apps/api/src/routes/submissions.ts`)
- Added new GET endpoint: `/api/submissions/:submissionId/download/:fileType`
- Supported file types:
  - `cover` - downloads the cover letter PDF
  - `grounds` - downloads the submission/grounds PDF
  - `both` - returns error suggesting to download separately
- Returns PDFs as downloadable files with proper content-type and content-disposition headers

### 3. Web App Changes

#### API Client (`apps/web/src/lib/api.ts`)
- Added `downloadPdf` method to the `submissions` API
- Configured to receive blob responses for PDF downloads

#### Submission Form (`apps/web/src/pages/SubmissionForm.tsx`)
- Updated `submitMutation` to pass submission data to the Thank You page via router state
- Passes: `submissionId`, `applicantEmail`, `applicantName`, `siteAddress`

#### Thank You Page (`apps/web/src/pages/ThankYou.tsx`)
- Completely redesigned to show download options
- Displays confirmation that email was sent to applicant
- Provides two download buttons:
  - "Download Cover Letter" - downloads the cover letter PDF
  - "Download Submission" - downloads the main submission PDF
- Shows loading state while downloading
- Handles download errors gracefully

## User Flow

1. User fills out the submission form with their email address
2. User completes the survey and reviews the generated submission
3. User clicks "Submit" to finalize
4. Backend processes the submission:
   - Generates cover letter and grounds PDFs
   - Stores PDFs in the database
   - Sends email to council with PDFs attached
   - **CCs the applicant** on the email (NEW)
5. User is redirected to Thank You page with:
   - Confirmation message
   - Notice that they were CC'd on the email
   - Download buttons for both PDFs (NEW)

## Testing

### Test CC Functionality
1. Submit a form with a valid email address
2. Check the email inbox for the applicant
3. Verify they received a CC of the submission email with PDFs attached

### Test Download Functionality
1. Submit a form successfully
2. On the Thank You page, click "Download Cover Letter"
3. Verify the PDF downloads correctly
4. Click "Download Submission"
5. Verify the PDF downloads correctly
6. Check that both PDFs contain the correct content

### Test Error Handling
1. Try to download PDFs for a non-existent submission ID
2. Verify appropriate error message is shown
3. Test with network disconnection
4. Verify error handling works gracefully

## Configuration

### Environment Variables
No new environment variables are required. The feature uses existing email configuration:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `DEFAULT_FROM_EMAIL`
- `DEFAULT_FROM_NAME`

### Disable CC Feature
If you need to disable the CC feature, modify the call in `documentWorkflow.ts`:
```typescript
// Change this:
const emailResult = await this.emailService.sendDirectSubmissionWithAttachments(
  // ... other params
  bodyHtml
);

// To this:
const emailResult = await this.emailService.sendDirectSubmissionWithAttachments(
  // ... other params
  bodyHtml,
  false  // ccApplicant = false
);
```

## Database Impact

### Storage Considerations
- PDFs are stored as BYTEA (binary data) in PostgreSQL
- Average PDF size: 100-500 KB per file
- Two PDFs per submission: ~200 KB - 1 MB total
- For 1000 submissions: ~200 MB - 1 GB storage

### Performance
- Added index on submissions table for faster lookups
- PDFs are only loaded when downloading, not during normal queries
- Consider adding a cleanup job to remove old PDFs after a retention period (e.g., 90 days)

## Future Enhancements

1. **Combined PDF Download**: Add functionality to download both PDFs as a ZIP file
2. **Email-only Downloads**: Send download links via email instead of storing in database
3. **Cloud Storage**: Move PDFs to S3/Cloud Storage and store URLs instead of binary data
4. **Retention Policy**: Automatically delete PDFs after X days to save storage
5. **Preview**: Add ability to preview PDFs in browser before downloading
6. **Resend Email**: Add button to resend the submission email to applicant

## Rollback Instructions

If you need to rollback these changes:

1. **Database**: Remove the PDF columns:
```sql
ALTER TABLE submissions 
  DROP COLUMN cover_pdf_data,
  DROP COLUMN grounds_pdf_data,
  DROP COLUMN cover_pdf_filename,
  DROP COLUMN grounds_pdf_filename;
```

2. **API**: Revert the changes to:
   - `apps/api/src/services/email.ts`
   - `apps/api/src/services/documentWorkflow.ts`
   - `apps/api/src/routes/submissions.ts`

3. **Web App**: Revert the changes to:
   - `apps/web/src/lib/api.ts`
   - `apps/web/src/pages/SubmissionForm.tsx`
   - `apps/web/src/pages/ThankYou.tsx`

## Support

For issues or questions, check:
- Email logs in the `email_logs` table
- Application logs in `apps/api/logs/`
- Browser console for frontend errors

