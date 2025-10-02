# Proposed Email Template Change

## Current Template
```
Dear {{council_name}},

Attention: Tim Baker CEO,

Please find attached the development application submission for {{site_address}}.

Email: {{applicant_email}}
{{application_number_line}}

Kind regards,
{{applicant_full_name}}
```

## Proposed Template
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

## Example Output
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

## Variables Used (All Available)
- `{{applicant_full_name}}` - Already being used, working correctly
- `{{applicant_residential_address}}` - Available from prepareSubmissionData (line 786)
- `{{applicant_suburb}}` - Available from prepareSubmissionData (line 787)
- `{{applicant_state}}` - Available from prepareSubmissionData (line 788)
- `{{applicant_postcode}}` - Available from prepareSubmissionData (line 789)
- `{{applicant_email}}` - Already being used, working correctly

## Files to Update
1. `apps/api/src/services/documentWorkflow.ts` - DEFAULT_COUNCIL_EMAIL_BODY
2. `packages/db/migrations/0012_cover_email_template.sql` - Migration default
3. `apps/api/packages/db/migrations/0012_cover_email_template.sql` - Duplicate migration
4. `apps/admin/src/pages/CreateProject.tsx` - Admin form default
5. `apps/admin/src/components/GoldCoastDefaultSelector.tsx` - Gold Coast template
6. `apps/admin/src/components/EmailBodyEditor.tsx` - Editor default
7. `apps/api/src/routes/templates.ts` - API templates
8. `apps/api/src/routes/templates.ts.bak` - Backup file
9. Run update script to update existing projects in database

## Impact
- ✅ No impact on AI generation (completely separate process)
- ✅ Uses existing variables already in the system
- ✅ Provides more complete submitter information to council
- ✅ Maintains professional formatting

