# High Trees Primary School Submission Templates - Implementation Guide

## Overview

This implementation creates two distinct submission templates for the High Trees Primary School development application, designed to work with the existing DA Submission Manager system's OpenAI integration.

## Template Structure

### 1. Follow-Up Template (`high-trees-follow-up-template.md`)
**Use Case:** Users who have previously made a submission  
**Content Source:** Based on the shorter "Draft Second Submission" example  
**Key Features:**
- References previous submission with `{{previous_submission_date}}` placeholder
- Focuses on "amended grounds" approach
- Shorter, more focused content targeting changed application aspects
- Maintains formal council submission structure

### 2. Comprehensive Template (`high-trees-comprehensive-template.md`)
**Use Case:** Users making their first submission  
**Content Source:** Combines both submission examples for complete coverage  
**Key Features:**
- Full objection foundation covering all major concerns
- Detailed planning framework analysis
- Comprehensive coverage of traffic, environmental, and community impacts
- Complete regulatory non-compliance assessment

## System Integration Capabilities

### ✅ Current System CAN Support This Implementation

**Conditional Logic Support:**
- Templates use existing Handlebars conditional syntax (`{{#if}}`)
- System already tracks users via email in submissions table
- Database schema supports tracking submission history

**Implementation Path:**
1. **Database Enhancement:** Add `has_previous_submission` boolean field to submissions table
2. **Logic Enhancement:** Query existing submissions by email before template generation
3. **Template Selection:** Use conditional logic to select appropriate template based on submission history
4. **Variable Population:** System already supports all required template variables

**Required Database Migration:**
```sql
ALTER TABLE submissions ADD COLUMN has_previous_submission BOOLEAN DEFAULT FALSE;

-- Create index for efficient lookup of previous submissions
CREATE INDEX idx_submissions_email_created ON submissions(applicant_email, created_at);
```

**Template Selection Logic (Pseudocode):**
```javascript
async function selectTemplate(applicantEmail) {
  const previousSubmissions = await db.query(
    'SELECT id FROM submissions WHERE applicant_email = ? AND created_at < NOW()',
    [applicantEmail]
  );
  
  return previousSubmissions.length > 0 
    ? 'high-trees-follow-up-template.md'
    : 'high-trees-comprehensive-template.md';
}
```

## OpenAI Rules Compliance ✅

Both templates comply with the system's OpenAI generation rules:

**✅ Content Rules:**
- Australian English throughout
- Clear, civic tone with no rhetorical devices
- Short, direct sentences
- No emojis or em dashes
- Professional planning language

**✅ Structure Rules:**
- Uses only `{{grounds_content}}` placeholder for AI-generated content
- Follows existing Gold Coast Council template structure
- Maintains required declaration and signature blocks
- Includes proper planning framework references

**✅ Technical Compliance:**
- Compatible with existing Handlebars template engine
- Uses established placeholder naming conventions
- Follows JSON schema requirements for AI responses
- Respects word limit constraints (600-800 words for AI sections)

## Template Variables

### Standard Variables (Already Supported)
- `{{applicant_first_name}}`, `{{applicant_last_name}}`
- `{{applicant_email}}`
- `{{applicant_residential_address}}`, `{{applicant_suburb}}`, `{{applicant_state}}`, `{{applicant_postcode}}`
- `{{postal_address_same}}`, postal address fields
- `{{lot_number}}`, `{{plan_number}}`
- `{{site_address}}`, `{{application_number}}`
- `{{submission_date}}`
- `{{grounds_content}}` (AI-generated)

### New Variable Required
- `{{previous_submission_date}}` - For follow-up template only

## AI Content Generation Strategy

### Follow-Up Submission AI Prompt Enhancement
```
SYSTEM: You are drafting amended grounds for a follow-up submission. Focus on new concerns arising from revised application. Reference that previous detailed submission grounds are maintained. Use provided concerns to highlight additional impacts from changes.

USER_CONTEXT: This is a follow-up submission. Previous comprehensive objection was filed. Focus on what has changed or worsened in the amended application.
```

### Comprehensive Submission AI Prompt Enhancement
```
SYSTEM: You are drafting comprehensive grounds for initial submission. Cover all major planning, environmental, traffic, and community concerns. Build complete case against inappropriate development in rural setting.

USER_CONTEXT: This is the submitter's first objection. Provide complete grounds covering all relevant planning framework violations and community impacts.
```

## Deployment Recommendation

1. **Phase 1:** Database schema update to support submission history tracking
2. **Phase 2:** Template selection logic implementation 
3. **Phase 3:** AI prompt customization based on template type
4. **Phase 4:** Testing with both template scenarios
5. **Phase 5:** Production deployment for High Trees Primary School campaign

## Benefits

- **User Experience:** Appropriate template complexity based on engagement history
- **Content Quality:** Follow-up submissions avoid repetition, comprehensive submissions provide complete coverage
- **Efficiency:** Shorter templates for returning users, complete templates for new users
- **Compliance:** Both templates maintain full regulatory compliance and professional standards
