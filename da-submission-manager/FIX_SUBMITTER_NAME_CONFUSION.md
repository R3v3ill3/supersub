# Fix for Submitter Name Confusion Issue

## Problem
The AI-generated grounds text was incorrectly including the submitter's name (the person objecting to the development) as if they were the applicant (the developer). For example:
```
Submission regarding Development Application COM/2025/271 940 Currumbin Creek Road, Currumbin Valley, QLD Applicant: Troy Burton
```

Where "Troy Burton" is actually the submitter, not the development applicant.

## Root Cause Analysis
1. The `applicant_name` was being passed to the LLM service in the metadata, even though it wasn't used in the prompt template
2. The AI was sometimes inferring or generating "Applicant: [Name]" headers based on context
3. The existing post-processing only removed "by [Name]" patterns, not "Applicant: [Name]" patterns

## Solution Implemented

### 1. Removed applicant_name from LLM metadata
**File**: `/apps/api/src/routes/generate.ts`
- Removed the `applicant_name` field from the `meta` object passed to the LLM
- This prevents any potential confusion or data leakage

### 2. Enhanced post-processing to remove submitter names
**File**: `/apps/api/src/routes/generate.ts`
- Added robust pattern matching to detect and replace:
  - "Applicant: [Submitter Name]" → "Applicant: [Developer Name]"
  - "by [Submitter Name]" → removed entirely
- Uses proper regex escaping to handle names with special characters
- Logs when names are removed for debugging

### 3. Updated LLM service type definition
**File**: `/apps/api/src/services/llm.ts`
- Removed `applicant_name` from the `GenerateArgs` type
- Updated all references to use `siteAddress` instead for logging

### 4. Enhanced system prompt instructions
**File**: `/packages/prompts/submission.system.txt`
- Added explicit instructions NOT to include "Applicant: [Name]" anywhere
- Clarified that submitter details are added by the template separately
- Added critical warning in output format section about not referencing submitters by name

## Testing
Created and ran comprehensive tests to verify the name removal logic works correctly for various patterns:
- "Applicant: [Name]" at the start of text
- "by [Name]" in signatures
- Names in parentheses
- All patterns successfully removed/replaced

## Impact Assessment
- **No breaking changes**: The solution only adds post-processing and removes unused fields
- **Preserves formatting**: The AI output structure remains unchanged
- **No upstream/downstream effects**: The name fields are still collected and stored normally
- **Backwards compatible**: Existing submissions are unaffected

## Deployment Notes
1. Deploy the API changes first
2. The prompt changes will take effect immediately
3. No database migrations required
4. No frontend changes required

## Monitoring
After deployment, monitor:
1. Generated grounds text for any remaining name issues
2. Console logs for "Removed submitter name references" messages
3. User feedback on submission quality
