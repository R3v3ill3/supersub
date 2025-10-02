# Optional Download and CC Feature Implementation

## Overview
This document describes the implementation of features for the web app submission flow:
1. **CC Applicant**: Automatically CC the applicant on the submission email sent to the council
2. **Optional PDF Download**: Allow users to optionally download their submission PDFs during submission

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
- Displays confirmation that email was sent to applicant and PDF was downloaded (if opted in)
- Simple confirmation page without download buttons (downloads happen during submission)
- Shows clear status of what happened during submission

## User Flow

1. User fills out the submission form with their email address
2. User completes the survey and reviews the generated submission
3. User reaches email preview step and can choose to download PDF automatically (default: enabled)
4. User clicks "Submit" to finalize
5. Backend processes the submission:
   - Generates cover letter and grounds PDFs
   - Sends email to council with PDFs attached
   - **CCs the applicant** on the email (NEW)
   - **Optionally** returns PDF data for immediate download (NEW)
6. If user opted for download: PDF downloads immediately
7. User is redirected to Thank You page with:
   - Confirmation message
   - Notice that they were CC'd on the email
   - Confirmation of PDF download (if opted in)

## Testing

### Test CC Functionality
1. Submit a form with a valid email address
2. Check the email inbox for the applicant
3. Verify they received a CC of the submission email with PDFs attached

### Test Optional Download Functionality
1. Submit a form successfully with download option enabled (default)
2. Verify PDF downloads immediately during submission
3. Submit a form with download option disabled
4. Verify no automatic download occurs
5. Check that email is sent in both cases with PDF attached
6. Verify PDF content is correct in both cases

### Test Error Handling
1. Test with network disconnection during submission
2. Verify error handling works gracefully
3. Test submission with invalid data
4. Verify appropriate error messages are shown

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
- No PDF storage in database for downloads (eliminates storage concerns)
- PDFs are generated on-demand and sent immediately or via email
- Minimal database impact compared to storing binary data

## Future Enhancements

1. **Combined PDF Download**: Add functionality to download both PDFs as a ZIP file (during submission)
2. **Email-only Downloads**: Send download links via email instead of immediate download
3. **Cloud Storage**: Move PDFs to S3/Cloud Storage and store URLs for persistent access
4. **Preview**: Add ability to preview PDFs in browser before downloading
5. **Resend Email**: Add button to resend the submission email to applicant
6. **Download History**: Track which users downloaded their PDFs for analytics

## Rollback Instructions

If you need to rollback these changes:

1. **API**: Revert the changes to:
   - `apps/api/src/services/email.ts` (CC functionality)
   - `apps/api/src/services/documentWorkflow.ts` (optional download logic)
   - `apps/api/src/routes/submissions.ts` (downloadPdf parameter)

2. **Web App**: Revert the changes to:
   - `apps/web/src/lib/api.ts` (downloadPdf parameter in submit method)
   - `apps/web/src/pages/SubmissionForm.tsx` (remove download checkbox and logic)
   - `apps/web/src/pages/ThankYou.tsx` (revert to simple confirmation)

## Support

For issues or questions, check:
- Email logs in the `email_logs` table
- Application logs in `apps/api/logs/`
- Browser console for frontend errors

