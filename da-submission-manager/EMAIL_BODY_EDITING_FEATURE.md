# Email Body Editing Feature

## Overview
Added a new step in the submission wizard that allows users to review and edit the email body (cover letter content) before submitting to the council.

## Changes Summary

### Database Changes
**File:** `packages/db/migrations/0027_custom_email_body.sql`
- Added `custom_email_body` column to `submissions` table to store user-edited email body content

### Backend API Changes

#### 1. New Endpoint: Preview Email Body
**File:** `apps/api/src/routes/submissions.ts`
- **Endpoint:** `POST /api/submissions/:submissionId/preview-email-body`
- **Purpose:** Generates and returns the cover letter content that will be used as the email body
- **Returns:** `{ emailBody, subject }`

#### 2. Updated Submit Endpoint
**File:** `apps/api/src/routes/submissions.ts`
- **Endpoint:** `POST /api/submissions/:submissionId/submit`
- **Change:** Now accepts optional `emailBody` parameter
- **Behavior:** Stores custom email body in database and passes it to document workflow

#### 3. Document Workflow Service Updates
**File:** `apps/api/src/services/documentWorkflow.ts`
- **Method:** `processSubmission(submissionId, generatedContent, customEmailBody)`
  - Added `customEmailBody` parameter
  - Passes custom email body to `processDirectSubmission`

- **Method:** `processDirectSubmission(..., customEmailBody)`
  - Added `customEmailBody` parameter
  - Uses custom email body if provided, otherwise generates from template
  - Email body is used instead of generating a cover PDF attachment

### Frontend Changes

#### 1. API Client Updates
**File:** `apps/web/src/lib/api.ts`
- Added `previewEmailBody` method to submissions API
- Updated `submit` method signature to accept `emailBody` parameter

#### 2. Submission Form Updates
**File:** `apps/web/src/pages/SubmissionForm.tsx`

**New State Variables:**
- `emailBody` - Current email body content
- `originalEmailBody` - Original generated email body for reset
- `emailSubject` - Email subject line
- `isEmailEditMode` - Toggle between edit/preview mode
- `showEmailResetConfirm` - Show reset confirmation modal

**New Mutations:**
- `previewEmailBodyMutation` - Fetches email body preview from API
- Updated `submitMutation` - Now includes `emailBody` in submission

**Updated Flow:**
1. **Step 1:** Personal Details
2. **Step 2:** Survey/Concerns Selection
3. **Step 3:** AI Generation (loading)
4. **Step 4:** Review & Edit Submission Document (grounds PDF)
   - Changed "Submit to Council" to "Continue to Email Preview"
5. **NEW Step 5:** Review & Edit Email Body
   - Shows email subject (read-only)
   - Shows email body with edit/preview toggle
   - Indicates that submission document will be attached as PDF
   - Has reset functionality to restore original
   - Final "Submit to Council" button

## User Experience Flow

### Before Submission
1. User completes steps 1-3 as before
2. User reviews and edits the submission document (Step 4)
3. **NEW:** User clicks "Continue to Email Preview"
4. **NEW:** System generates cover letter content
5. **NEW:** User sees email preview (Step 5):
   - Email subject line
   - Email body text
   - Edit/preview toggle
   - Note about PDF attachment
6. User can edit the email body if desired
7. User clicks "Submit to Council"

### What Gets Sent
- **Email Body:** User's edited (or original) cover letter content
- **Email Attachment:** Only the submission document PDF (DA_Submission_*.pdf)
- **No more:** DA_Cover PDF as separate attachment

## Technical Notes

### Email Body Generation
- Cover letter content is generated from the same template as before
- Template: `project.council_email_body_template` or default Gold Coast template
- Uses Handlebars for variable substitution
- Includes applicant details, site address, application number, etc.

### Backwards Compatibility
- If no custom email body is provided, system generates it automatically
- Review and draft pathways unchanged (they don't use this feature)
- Existing direct submissions continue to work

### Security & Validation
- Email body is stored in database for audit trail
- No validation on email body content (user has full control)
- Rate limiting applied via existing submission limiter

## Testing Checklist

- [ ] Run database migration `0027_custom_email_body.sql`
- [ ] Test preview email body endpoint
- [ ] Test submission with default generated email body
- [ ] Test submission with edited email body
- [ ] Verify only one PDF attachment is sent (grounds document)
- [ ] Verify email body appears correctly in sent email
- [ ] Test reset functionality in Step 5
- [ ] Test back navigation between steps
- [ ] Verify custom_email_body is saved in database

## Migration Instructions

1. Apply database migration:
   ```sql
   -- Run: packages/db/migrations/0027_custom_email_body.sql
   ```

2. Restart API server to load new endpoints

3. Clear browser cache and reload web app

4. Test the new flow end-to-end

## Future Enhancements

- Add rich text editor for email body formatting
- Preview email in actual email client format
- Add email body templates library
- Allow editing email subject line
- Show character count limits (if council has any)

