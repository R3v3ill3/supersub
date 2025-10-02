# Email Template Update V2 - Add Name and Residential Address

## Changes Implemented ✅

### What Was Added
Added the following fields to the email body, positioned above the email address:
- **Name:** User's full name
- **Residential Address:** Complete residential address with suburb, state, and postcode

### New Template Format
```
Dear {{council_name}},

Attention: Tim Baker CEO,

Please find attached the development application submission for {{site_address}}.

Name: {{applicant_full_name}}
Residential Address: {{applicant_residential_address}}, {{applicant_suburb}} {{applicant_state}} {{applicant_postcode}}
Email: {{applicant_email}}
{{application_number_line}}

Kind regards,
{{applicant_full_name}}
```

### Example Output
```
Dear Gold Coast City Council,

Attention: Tim Baker CEO,

Please find attached the development application submission for 940 Currumbin Creek Road, Currumbin Valley, QLD.

Name: Troy Burton
Residential Address: 123 Main Street, Brisbane QLD 4000
Email: troyburton@gmail.com
Application Number: COM/2025/271

Kind regards,
Troy Burton
```

## Files Updated (8 files)

### Code Templates
1. ✅ `apps/api/src/services/documentWorkflow.ts` - DEFAULT_COUNCIL_EMAIL_BODY constant
2. ✅ `packages/db/migrations/0012_cover_email_template.sql` - Migration defaults
3. ✅ `apps/api/packages/db/migrations/0012_cover_email_template.sql` - Duplicate migration
4. ✅ `apps/admin/src/pages/CreateProject.tsx` - Admin form default
5. ✅ `apps/admin/src/components/GoldCoastDefaultSelector.tsx` - Gold Coast template
6. ✅ `apps/admin/src/components/EmailBodyEditor.tsx` - Editor default
7. ✅ `apps/api/src/routes/templates.ts` - API templates
8. ✅ `apps/api/src/routes/templates.ts.bak` - Backup file

### Database Update
- ✅ Updated existing "High Trees Currumbin Valley" project in database
- ✅ Created `scripts/force-update-email-template.mjs` for future updates

## Variables Used

All variables were already available in `prepareSubmissionData()`:

| Variable | Source | Purpose |
|----------|--------|---------|
| `{{applicant_full_name}}` | Line 767 | User's full name |
| `{{applicant_residential_address}}` | Line 786 | Street address |
| `{{applicant_suburb}}` | Line 787 | Suburb/city |
| `{{applicant_state}}` | Line 788 | State |
| `{{applicant_postcode}}` | Line 789 | Postcode |
| `{{applicant_email}}` | Line 783 | Email address |

**Note:** Uses residential address, NOT postal address (as requested).

## Testing

To test the new format:
1. Navigate to the submission form
2. Complete a submission with all address fields
3. Go to "Review Your Email" (step 5)
4. Verify the email preview shows:
   - ✅ "Name:" line with user's full name
   - ✅ "Residential Address:" line with complete address
   - ✅ Email address below that
   - ✅ User's name in signature
   - ✅ "Attention: Tim Baker CEO," at top

## Impact Assessment

### Zero Risk Areas ✅
- AI content generation (completely separate)
- Prompt system (untouched)
- Data structures (using existing fields)
- Template processing (same Handlebars flow)

### Modified Areas ⚠️
- Email preview generation (intentional change)
- Council email body (intentional change)
- Database templates (updated successfully)

### Benefits
- ✅ More complete submitter information for council
- ✅ Better identification of submission author
- ✅ Professional formatting maintained
- ✅ Uses only verified residential address data

## Next Steps

**Restart your API server** for the code changes to take effect:
```bash
# Stop current server (Ctrl+C)
# Restart your API server
```

Then test a complete submission to verify the new format appears correctly in the email preview.

