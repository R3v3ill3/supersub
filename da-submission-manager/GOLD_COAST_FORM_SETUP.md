# Gold Coast Council Form Implementation Guide

## 📋 Overview

This guide walks through setting up the DA Submission Manager with the exact fields from the Gold Coast Council "Have Your Say - Development Application" form.

## 🏗️ Database Setup

### **1. Run the New Migration**

Execute the new migration to add Gold Coast Council specific fields:

```sql
-- Run this in Supabase SQL Editor:
-- packages/db/migrations/0009_gold_coast_form_fields.sql

ALTER TABLE submissions 
  -- Residential address fields (required)
  ADD COLUMN IF NOT EXISTS applicant_residential_address TEXT,
  ADD COLUMN IF NOT EXISTS applicant_suburb TEXT,
  ADD COLUMN IF NOT EXISTS applicant_state TEXT,
  ADD COLUMN IF NOT EXISTS applicant_postcode TEXT,

  -- Postal address fields (separate from residential)
  ADD COLUMN IF NOT EXISTS postal_suburb TEXT,
  ADD COLUMN IF NOT EXISTS postal_state TEXT,
  ADD COLUMN IF NOT EXISTS postal_postcode TEXT,
  ADD COLUMN IF NOT EXISTS postal_email TEXT,

  -- Property identification fields
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS plan_number TEXT;
```

## 📝 Form Fields Implementation

### **Complete Field Mapping**

The form now captures all official Gold Coast Council fields:

#### **Property Details**
- `lot_number` - Lot Number (optional)
- `plan_number` - Plan Number (optional)  
- `site_address` - Property Address (required)
- `application_number` - Application Number (required)

#### **Submitter Details**  
- `applicant_first_name` - First Name (required)
- `applicant_last_name` - Surname (required)
- `applicant_email` - Email Address (required)

#### **Residential Address** (required)
- `applicant_residential_address` - Street Address
- `applicant_suburb` - Suburb
- `applicant_state` - State (dropdown with all Australian states)
- `applicant_postcode` - Postcode

#### **Postal Address** (conditional)
- `postal_address_same` - Radio button: Same as residential or different
- If different:
  - `applicant_postal_address` - Postal Street Address  
  - `postal_suburb` - Postal Suburb
  - `postal_state` - Postal State
  - `postal_postcode` - Postal Postcode
  - `postal_email` - Postal Email (if different)

#### **Submission Position**
- Fixed as "OBJECTING" (matches Gold Coast Council requirements)

## 📄 Template Structure

### **Gold Coast Submission Template**

The template now matches the official council form structure:

```handlebars
# Gold Coast Council - Development Application Submission

## Property Details
**Lot Number:** {{lot_number}}  
**Plan Number:** {{plan_number}}  
**Property Address:** {{site_address}}  
**Application Number:** {{application_number}}

## Submitter Details  
**First Name:** {{applicant_first_name}}  
**Surname:** {{applicant_last_name}}  

**Residential Address:**  
{{applicant_residential_address}}  
{{applicant_suburb}} {{applicant_state}} {{applicant_postcode}}  
**Email Address:** {{applicant_email}}

## Postal Address
{{#if postal_address_same}}
**Postal Address:** Same as residential address above
{{else}}
**Postal Address:**  
{{applicant_postal_address}}  
{{postal_suburb}} {{postal_state}} {{postal_postcode}}  
**Email Address:** {{postal_email}}
{{/if}}

## Submission Details
**Position on Development Application:** **OBJECTING**

### Grounds of Submission
{{grounds_content}}

## Declaration
I understand and acknowledge that:
✓ The information provided in this submission is true and correct  
✓ I have read the privacy notice as stated on this form  
✓ This submission is NOT confidential and will be displayed through PD Online on the City of Gold Coast's website  
✓ I acknowledge Queensland State Laws will accept this communication as containing my signature within the meaning of the Electronic Transactions (Queensland) Act 2001

**Electronic Signature:** {{applicant_first_name}} {{applicant_last_name}}  
**Date:** {{submission_date}}  
```

## 🔗 Action Network Integration

### **Enhanced Person Data**

The system now sends more detailed person information to Action Network:

```javascript
// Residential address for primary contact
const person = {
  given_name: applicant_first_name,
  family_name: applicant_last_name,
  email_addresses: [{ address: applicant_email }],
  postal_addresses: [{
    address_lines: [applicant_residential_address],
    locality: applicant_suburb,
    region: applicant_state,
    postal_code: applicant_postcode,
    country: "AU",
    primary: true
  }],
  custom_fields: {
    project_id: project.id,
    submission_id: submission.id,
    application_number: application_number,
    lot_number: lot_number,
    plan_number: plan_number,
    site_address: site_address,
    has_different_postal: !postal_address_same
  }
}
```

## 🚀 Setup Instructions

### **1. Update Your Codebase**
All the changes have been implemented in:
- `apps/web/src/pages/SubmissionForm.tsx` - Updated form UI
- `apps/api/src/routes/submissions.ts` - Updated API schema  
- `packages/db/migrations/0009_gold_coast_form_fields.sql` - New database fields
- `packages/templates/gold-coast-submission-template.md` - Official form template

### **2. Run Database Migration**
Execute the new migration in your Supabase SQL editor.

### **3. Test the Form**
Visit your Gold Coast Council form at `/gold-coast-council` and verify:
- All property details fields are present
- Residential address is required
- Postal address option works correctly
- State dropdown includes all Australian states
- Form submission includes all required fields

### **4. Template Integration**
The new template can be used for your cover letter or grounds document with all the official Gold Coast Council fields.

## ✅ Validation & Compliance

### **Required Fields Match Official Form**
- ✅ Lot Number and Plan Number (optional)
- ✅ Property Address (required)
- ✅ Application Number (required)  
- ✅ Submitter first name and surname (required)
- ✅ Email address (required)
- ✅ Residential address with suburb/state/postcode (required)
- ✅ Postal address option (conditional)
- ✅ Position fixed as "OBJECTING"
- ✅ Declaration acknowledgments included

### **Action Network Integration**
- ✅ Enhanced person profiles with complete address data
- ✅ Property details stored in custom fields
- ✅ Submission tracking with all form data
- ✅ Geographic targeting by suburb/state

## 🔄 User Journey

1. **Property Details**: User enters lot/plan numbers, property address, DA number
2. **Personal Details**: User provides name, email, residential address
3. **Postal Options**: User chooses same or different postal address  
4. **Form Validation**: System ensures all required Gold Coast Council fields are complete
5. **Action Network Sync**: Complete profile created with all address/property data
6. **Survey Step**: User prioritizes concerns (unchanged)
7. **AI Generation**: Personalized content using official template structure
8. **Submission**: Official council format with all required fields and declarations

## 📞 Technical Support

The form now fully complies with Gold Coast Council requirements and captures all data from their official "Have Your Say - Development Application" PDF form.

For any issues, verify that:
- The database migration has been applied
- All form fields are properly validated  
- The template includes all required Gold Coast Council elements
- Action Network receives complete person profiles
