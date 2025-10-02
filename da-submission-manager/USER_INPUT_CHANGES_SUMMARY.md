# User Input Changes - Summary

## Changes Made

### 1. USER_STYLE_SAMPLE (Field 1) - Now Verbatim Introduction

**Previous Behavior:**
- Used as style/tone guidance
- AI would rewrite in formal planning language
- User's exact words not included

**New Behavior:**
- Included **verbatim** at the start of submission
- AI begins with user's exact words
- If empty, AI generates standard opening

**UI Changes:**
- **Old label:** "In your own words, briefly describe your thoughts on this development *"
- **New label:** "Provide an optional introductory paragraph stating your opinion"
- **Removed:** `required` attribute
- **Added:** Helpful explanation text: "This will appear verbatim at the start of your submission. If left blank, a standard opening will be generated."
- **New placeholder:** "Optional: e.g., 'I strongly oppose this development due to its significant impacts on our rural community...'"

**Prompt Changes:**
```
OLD: Use USER_STYLE_SAMPLE to create a strong opening paragraph
NEW: If USER_STYLE_SAMPLE is provided, BEGIN with it verbatim as the opening statement
```

---

### 2. CUSTOM_GROUNDS (Field 2) - Now Appears First

**Previous Behavior:**
- Appeared AFTER all selected concerns
- Near end of document before conclusion
- User might miss that it was included

**New Behavior:**
- Appears **FIRST** in the submission
- Shows up before selected concerns
- Ensures user sees their input was incorporated

**UI Changes:**
- **Old label:** "Add any additional grounds you'd like included"
- **New label:** "Add any additional concerns of your own"
- **Added:** Helpful explanation text: "These will appear first in your submission, before the selected concerns. Your text will not be modified."
- **New placeholder:** "Optional: e.g., 'I am particularly concerned about impacts on local wildlife corridors and koala habitat connectivity...'"

**Prompt Changes:**
```
OLD: Include CUSTOM_GROUNDS as additional sections AFTER all SELECTED_CONCERNS
NEW: If CUSTOM_GROUNDS contains text, present it FIRST as section 1 or in opening paragraphs
     This appears BEFORE the selected concerns to ensure visibility
```

---

## Files Modified

1. **packages/prompts/submission.system.txt**
   - Updated introduction instructions for USER_STYLE_SAMPLE
   - Moved CUSTOM_GROUNDS instructions to appear before main body
   - Clarified verbatim inclusion for both fields

2. **apps/web/src/pages/SubmissionForm.tsx**
   - Updated field labels to be clearer
   - Removed `required` attribute from user_style_sample field
   - Added helpful explanation text for both fields
   - Updated placeholders with better examples

---

## Expected Output Structure

### With Both Fields Filled:

```
[USER_STYLE_SAMPLE VERBATIM]
"I strongly oppose this development due to its significant impacts..."

[CUSTOM_GROUNDS - SECTION 1]
1. Additional Concern
I am particularly concerned about impacts on local wildlife corridors...

[SELECTED CONCERNS - SECTIONS 2+]
2. Non-Compliance with Gold Coast City Plan
The proposed development's intensity, scale, and traffic generation...

3. Traffic and Parking Issues
The proposed infrastructure is inadequate...

[CONCLUSION]
The proposed development is unsuitable...
```

### With USER_STYLE_SAMPLE Only:

```
[USER_STYLE_SAMPLE VERBATIM]
"I strongly oppose this development due to its significant impacts..."

[SELECTED CONCERNS - SECTIONS 1+]
1. Non-Compliance with Gold Coast City Plan
...

[CONCLUSION]
...
```

### With CUSTOM_GROUNDS Only:

```
[GENERATED INTRODUCTION]
I object to this development on the following grounds...

[CUSTOM_GROUNDS - SECTION 1]
1. Additional Concern
I am particularly concerned about impacts on local wildlife corridors...

[SELECTED CONCERNS - SECTIONS 2+]
2. Non-Compliance with Gold Coast City Plan
...

[CONCLUSION]
...
```

### With Neither Field:

```
[GENERATED INTRODUCTION]
I object to this development on the following grounds...

[SELECTED CONCERNS - SECTIONS 1+]
1. Non-Compliance with Gold Coast City Plan
...

[CONCLUSION]
...
```

---

## User Benefits

1. **Clarity:** Users now understand exactly what will happen with their input
2. **Visibility:** Custom concerns appear first, so users immediately see they were included
3. **Control:** Users can provide opening paragraph in their own voice
4. **Flexibility:** Both fields are optional - users can use neither, one, or both
5. **Transparency:** Explanation text makes it clear that text won't be modified

---

## Testing Recommendations

### Test Case 1: Both Fields Filled
1. Enter introduction: "I strongly oppose this development..."
2. Enter custom concern: "I am concerned about drainage impacts..."
3. Select some concerns
4. Generate
5. **Verify:** Introduction appears verbatim at start
6. **Verify:** Custom concern appears as Section 1
7. **Verify:** Selected concerns follow as Section 2, 3, etc.

### Test Case 2: Only Introduction
1. Enter introduction: "As a long-time resident..."
2. Leave custom grounds empty
3. Select some concerns
4. Generate
5. **Verify:** Introduction appears verbatim at start
6. **Verify:** Selected concerns start as Section 1

### Test Case 3: Only Custom Grounds
1. Leave introduction empty
2. Enter custom concern: "Wildlife corridor impacts..."
3. Select some concerns
4. Generate
5. **Verify:** Generated introduction appears
6. **Verify:** Custom concern appears as Section 1
7. **Verify:** Selected concerns follow as Section 2, 3, etc.

### Test Case 4: Neither Field
1. Leave both empty
2. Select some concerns
3. Generate
4. **Verify:** Generated introduction appears
5. **Verify:** Selected concerns start as Section 1

---

## Rollback Plan

If issues arise, the changes are isolated to:
1. System prompt instructions (easy to revert)
2. UI labels and help text (cosmetic)

No database schema changes or core logic changes were made.

To rollback:
```bash
git checkout HEAD -- packages/prompts/submission.system.txt
git checkout HEAD -- apps/web/src/pages/SubmissionForm.tsx
```

---

## Status

✅ Changes complete and ready for testing
✅ Both fields remain optional in database schema (already was)
✅ No breaking changes to API or database
✅ Backward compatible (existing submissions unaffected)

