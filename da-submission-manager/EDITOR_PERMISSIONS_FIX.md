# Submission Editor Permissions Fix

## Issue Reported
The submission editor had incorrect editable/non-editable sections:

**Was incorrectly editable:**
- ❌ Property Address
- ❌ Application Number  
- ❌ Lot Number
- ❌ Plan Number

**Was incorrectly NOT editable:**
- ❌ Declaration text and checkmarks

## Solution Implemented

Updated `/apps/web/src/components/SubmissionEditor.tsx` to properly track which section the parser is in and apply correct editability rules.

### Changes Made

1. **Added section tracking** (line 143):
   ```typescript
   let currentSection: 'property' | 'submitter' | 'grounds' | 'declaration' | 'other' = 'other';
   ```

2. **Section detection based on headers** (lines 169-180):
   - "Property Details" → `currentSection = 'property'`
   - "Submitter Details" → `currentSection = 'submitter'`
   - "Grounds of Submission" → `currentSection = 'grounds'`
   - "Declaration" → `currentSection = 'declaration'`

3. **Conditional editability for field values** (lines 231-238):
   ```typescript
   // Property Details fields are NOT editable, Submitter Details ARE editable
   const isEditable = currentSection === 'submitter';
   
   sections.push({
     type: 'value',
     content: valueText,
     editable: isEditable,
     key: `value-${currentKey++}`
   });
   ```

4. **Made declaration editable** (lines 272-278):
   ```typescript
   sections.push({
     type: 'declaration',
     content: declarationContent.join('\n').trim(),
     editable: true, // Changed from false to true
     key: `declaration-${currentKey++}`
   });
   ```

5. **Added declaration textarea rendering** (lines 88-108):
   - If declaration is editable, render as textarea
   - Otherwise render as grey text

## Current Behavior

### ✅ Editable (White input fields with blue border):
1. **Submitter Details:**
   - First Name
   - Surname
   - Email Address
   - Residential Address
   - Suburb
   - State
   - Postcode
   - Postal Address (if different)
   - All submitter-related fields

2. **Grounds for Submission:**
   - The entire main submission content (large textarea)
   - All arguments and planning objections

3. **Declaration:**
   - Full declaration text including checkmarks
   - "I understand and acknowledge..." content

### ❌ NOT Editable (Grey text - protected):
1. **Property Details:**
   - Lot Number
   - Plan Number
   - Property Address
   - Application Number

2. **Structural Elements:**
   - All headers (##, ###)
   - All labels (**Label:**)
   - Summary paragraphs
   - Footer text

## Why Property Details Are Protected

Property details are specific to the development application being objected to. These should not change because:
- They identify the specific DA
- They match the council records
- Changing them would invalidate the submission
- Users would enter these at the start of the form

## Why Declaration Is Editable

The declaration includes:
- Checkmark acknowledgments
- Electronic signature
- Date
- User's name

Users may need to modify these if:
- They catch a typo in their name
- They want to adjust the acknowledgment text
- Template needs customization

## Testing

Test the following in edit mode:

**Should be editable (white fields):**
- [ ] First Name, Surname, Email
- [ ] Residential Address fields
- [ ] Grounds for Submission (main content)
- [ ] Declaration text

**Should NOT be editable (grey text):**
- [ ] Property Address
- [ ] Application Number
- [ ] Lot Number
- [ ] Plan Number
- [ ] All headers
- [ ] All field labels

## Files Modified

- `/apps/web/src/components/SubmissionEditor.tsx`
- `/SUBMISSION_EDITOR_IMPROVEMENTS.md` (documentation)
- `/EDITOR_PERMISSIONS_FIX.md` (this file)

---

**Status:** ✅ Fixed  
**Date:** October 2, 2025

