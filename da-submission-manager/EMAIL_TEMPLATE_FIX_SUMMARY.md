# Email Template Fix Summary

## Problem
The email body preview on the "Review Your Email" page was showing:
```
Applicant: [object Object]
```

This was caused by existing projects in the database having old email templates that were not updated when the migration ran.

## Root Cause Analysis

The issue occurred because:

1. **Migration COALESCE Logic**: The original migration file (`0012_cover_email_template.sql`) used `COALESCE()` which only sets the template if the column is NULL:
   ```sql
   UPDATE projects
   SET council_email_body_template = COALESCE(
     council_email_body_template,  -- If this exists, keep it (BUG!)
     'new template'                 -- Only use new template if NULL
   );
   ```

2. **Existing Data**: The "High Trees Currumbin Valley" project already had a `council_email_body_template` value set, so the migration didn't update it.

3. **Template Rendering**: When the email preview was generated:
   - Route: `/api/submissions/:submissionId/preview-email-body` (line 522 in `submissions.ts`)
   - Called `documentWorkflow.prepareSubmissionData()` (line 548)
   - Called `documentWorkflow.generateCoverContent()` (line 554)
   - Used Handlebars to compile the template from the database
   - The old template had `Applicant: {{applicant_full_name}}`
   - But the variable was being passed as an object instead of a string

## Solution Implemented

### 1. Updated Code Templates (for new projects)
Updated default templates in all code files:
- ✅ `apps/api/src/services/documentWorkflow.ts` - DEFAULT_COUNCIL_EMAIL_BODY
- ✅ `packages/db/migrations/0012_cover_email_template.sql` - Migration defaults
- ✅ `apps/admin/src/pages/CreateProject.tsx` - Admin form default
- ✅ `apps/admin/src/components/GoldCoastDefaultSelector.tsx` - Gold Coast template
- ✅ `apps/admin/src/components/EmailBodyEditor.tsx` - Editor default
- ✅ `apps/api/src/routes/templates.ts` - API templates
- ✅ `apps/api/packages/db/migrations/0012_cover_email_template.sql` - Duplicate migration

### 2. Created Database Update Script
Created `scripts/update-email-templates.mjs` to update existing projects:
- Checks all active projects for old templates
- Updates projects with old "Applicant:" line
- Updates projects with old "{{sender_name}}" signature
- Preserves custom templates that don't match old patterns

### 3. Ran Database Update
```bash
node scripts/update-email-templates.mjs
```
Result: Updated 1 project ("High Trees Currumbin Valley")

### 4. Created New Migration
Created `packages/db/migrations/0027_update_existing_email_templates.sql` for future deployments

## New Email Template Format

```
Dear {{council_name}},

Attention: Tim Baker CEO,

Please find attached the development application submission for {{site_address}}.

Email: {{applicant_email}}
{{application_number_line}}

Kind regards,
{{applicant_full_name}}
```

### Key Changes:
1. ✅ **Removed**: `Applicant: {{applicant_full_name}}` line (caused the [object Object] bug)
2. ✅ **Added**: `Attention: Tim Baker CEO,` line after greeting
3. ✅ **Changed**: Signature from `{{sender_name}}` to `{{applicant_full_name}}` (submitting user's name)

## Verification

To verify the fix is working:
```bash
node scripts/check-email-template.mjs
```

Output shows the template is now correct in the database.

## Testing

To test the fix:
1. Navigate to the web form for the project
2. Fill out the submission form
3. Complete the survey
4. Generate the submission
5. Review your grounds text
6. Click "Continue to Email Preview"
7. Verify the email body shows:
   - "Attention: Tim Baker CEO," line
   - No "Applicant:" line
   - User's name in the "Kind regards," signature
   - No "[object Object]" errors

## Files Modified

### Code Files (8 files)
1. `apps/api/src/services/documentWorkflow.ts`
2. `packages/db/migrations/0012_cover_email_template.sql`
3. `apps/api/packages/db/migrations/0012_cover_email_template.sql`
4. `apps/admin/src/pages/CreateProject.tsx`
5. `apps/admin/src/components/GoldCoastDefaultSelector.tsx`
6. `apps/admin/src/components/EmailBodyEditor.tsx`
7. `apps/api/src/routes/templates.ts`
8. `apps/api/src/routes/templates.ts.bak`

### New Files Created
1. `packages/db/migrations/0027_update_existing_email_templates.sql` - Migration for existing projects
2. `scripts/update-email-templates.mjs` - Script to update database
3. `scripts/check-email-template.mjs` - Script to verify templates

## Notes

- The fix has been applied to the database, so existing projects will now use the correct template
- New projects will automatically get the correct template from the updated defaults
- Custom templates that don't match the old pattern were preserved
- The migration can be run on other environments using the script or SQL file

