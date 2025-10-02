# User Input Flow Analysis - Complete Trace

## Overview
Tracing two user text fields from UI to AI prompt:
1. **Field 1:** "In your own words, describe your thoughts" → `user_style_sample`
2. **Field 2:** "Add any additional grounds" → `custom_grounds`

---

## Step 1: UI Collection ✅

**File:** `apps/web/src/pages/SubmissionForm.tsx`

**Field 1 (user_style_sample):**
- **Line 1146:** `value={surveyData.user_style_sample}`
- **Line 1147:** `onChange={(e) => setSurveyData({ ...surveyData, user_style_sample: e.target.value })}`
- **Label:** "In your own words, briefly describe your thoughts on this development"
- **Required:** YES
- **Placeholder:** "Please share your thoughts about this development application in your own words."

**Field 2 (custom_grounds):**
- **Line 1159:** `value={surveyData.custom_grounds}`
- **Line 1160:** `onChange={(e) => setSurveyData({ ...surveyData, custom_grounds: e.target.value })}`
- **Label:** "Add any additional grounds you'd like included"
- **Required:** NO
- **Placeholder:** "Optional: additional points that matter to you."

**Status:** ✅ Both fields captured in React state correctly

---

## Step 2: API Request ✅

**File:** `apps/web/src/pages/SubmissionForm.tsx` lines 333-340

**When user clicks "Generate My Submission":**
```typescript
api.survey.saveResponse(submissionId, {
  version: 'v1',
  selected_keys: data.selected_keys,
  user_style_sample: data.user_style_sample,  // ✅ SENT
  submission_track: data.submission_track,
  ordered_keys: data.ordered_keys,
  custom_grounds: data.custom_grounds,        // ✅ SENT
});
```

**Status:** ✅ Both fields sent to API

---

## Step 3: Database Storage ✅

**File:** `apps/api/src/routes/survey.ts`

**Schema Validation (lines 88-94):**
```typescript
const bodySchema = z.object({
  version: z.string().default('v1'),
  selected_keys: z.array(z.string()).min(1),
  ordered_keys: z.array(z.string()).optional(),
  user_style_sample: z.string().optional(),  // ✅ ACCEPTED
  custom_grounds: z.string().optional(),     // ✅ ACCEPTED
  submission_track: z.enum(['followup', 'comprehensive', 'single']).optional()
});
```

**Database Insert (lines 166-172):**
```typescript
.insert({
  submission_id: submissionId,
  version: body.version,
  selected_keys: body.selected_keys,
  ordered_keys: body.ordered_keys || null,
  user_style_sample: body.user_style_sample || null,  // ✅ STORED
  custom_grounds: body.custom_grounds || null,         // ✅ STORED
  submission_track: body.submission_track || null
})
```

**Logging (lines 103-105):**
```typescript
console.log('[survey] Saving survey response', {
  submissionId,
  hasStyleSample: !!(req.body?.user_style_sample),     // ✅ LOGGED
  hasCustomGrounds: !!(req.body?.custom_grounds),      // ✅ LOGGED
});
```

**Status:** ✅ Both fields stored in `survey_responses` table

---

## Step 4: Retrieval During Generation ✅

**File:** `apps/api/src/routes/generate.ts`

**Fetch from Database (lines 51-68):**
```typescript
const { data: surveyData, error: surveyErr } = await supabase
  .from('survey_responses')
  .select('*')  // ✅ Gets ALL fields including user_style_sample and custom_grounds
  .eq('submission_id', submissionId)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

survey = surveyData;
```

**Logging (lines 70-76):**
```typescript
console.log('[generate] Survey response found', { 
  submissionId, 
  selectedKeysCount: survey.selected_keys?.length || 0,
  orderedKeysCount: survey.ordered_keys?.length || 0,
  hasStyleSample: !!(survey.user_style_sample?.trim()),   // ✅ LOGGED
  hasCustomGrounds: !!(survey.custom_grounds?.trim())     // ✅ LOGGED
});
```

**Pass to LLM Service (lines 164-180):**
```typescript
const gen = enabled
  ? await generateSubmission({
      meta,
      approvedFacts,
      selectedConcerns: concerns,
      styleSample: survey.user_style_sample || '',   // ✅ PASSED
      customGrounds: survey.custom_grounds || '',    // ✅ PASSED
      allowedLinks
    })
  : await generateSubmissionMock({
      meta,
      approvedFacts,
      selectedConcerns: concerns,
      styleSample: survey.user_style_sample || '',   // ✅ PASSED
      customGrounds: survey.custom_grounds || '',    // ✅ PASSED
      allowedLinks
    });
```

**Status:** ✅ Both fields retrieved and passed to generation

---

## Step 5: LLM Service Processing ✅

**File:** `apps/api/src/services/llm.ts`

**Prompt Construction (lines 240-246):**
```typescript
const userTpl = Handlebars.compile(userTplStr, { noEscape: true });
const user = userTpl({
  ...args.meta,
  approved_facts: args.approvedFacts,
  selected_concerns: args.selectedConcerns,
  user_style_sample: args.styleSample,        // ✅ INCLUDED
  custom_grounds: args.customGrounds || ''    // ✅ INCLUDED
})
  .replace('{{MAX_WORDS}}', String(maxWords));
```

**Status:** ✅ Both fields passed to Handlebars template

---

## Step 6: Prompt Template ✅

**File:** `packages/prompts/submission.user.hbs`

**Template Content:**
```handlebars
RECIPIENT_NAME: {{recipient_name}}
SUBJECT: {{subject}}

APPLICATION_NUMBER: {{application_number}}
SITE_ADDRESS: {{site_address}}
SUBMISSION_TRACK: {{submission_track}}

APPROVED_FACTS:
{{{approved_facts}}}

SELECTED_CONCERNS:
{{#each selected_concerns}}
- KEY: {{this.key}}
  BODY: |
{{{indent this.body 2}}}
{{/each}}

USER_STYLE_SAMPLE:
{{{user_style_sample}}}                           // ✅ LINE 18-19

CUSTOM_GROUNDS (user-provided additional concerns):
{{{custom_grounds}}}                              // ✅ LINE 21-22

---
[...examples...]
```

**Status:** ✅ Both fields present in user prompt template

---

## Step 7: System Instructions ✅

**File:** `packages/prompts/submission.system.txt`

**Instructions for USER_STYLE_SAMPLE (line 39):**
```
• INTRODUCTION: Use USER_STYLE_SAMPLE to create a strong opening paragraph (3-5 sentences)
  - State clear opposition to the development
  - Reference the specific DA number and site address
  - Indicate the submission covers planning compliance, community impacts, etc.
```

**Instructions for CUSTOM_GROUNDS (lines 70-76):**
```
• CUSTOM_GROUNDS (if provided):
  - If CUSTOM_GROUNDS contains text, include it as additional sections AFTER all SELECTED_CONCERNS
  - DO NOT modify, rephrase, or paraphrase the user's custom text
  - Present it with appropriate formatting and structure
  - Treat custom grounds with the same fidelity as SELECTED_CONCERNS
  - If the custom grounds are brief, format as a numbered section with appropriate heading
  - If no custom grounds provided, skip this section entirely
```

**Status:** ✅ Clear instructions provided to AI

---

## Diagnosis: Why User Input Might Not Appear

### Possible Issues:

#### 1. ❓ USER_STYLE_SAMPLE Usage
**Instruction:** "Use USER_STYLE_SAMPLE to create a strong opening paragraph"

**Potential Problem:** The instruction says "**use**" not "**include**" - AI might be using it for **tone/style** rather than **verbatim inclusion**.

**Example:**
- User enters: "I am deeply concerned about traffic safety and environmental impacts"
- AI interprets: Use this as a guide for tone, write opening in that style
- AI outputs: "I strongly oppose this development due to significant planning concerns..."
- **Result:** User's exact words not present, just the style/sentiment

**This is WORKING AS DESIGNED** if the field is meant for style guidance, not verbatim inclusion.

#### 2. ✅ CUSTOM_GROUNDS Placement
**Instruction:** "include it as additional sections **AFTER all SELECTED_CONCERNS**"

**Location:** Should appear near the end, before conclusion

**Potential Issue:** User might be looking for it earlier in the document

#### 3. ⚠️ Empty/Whitespace Values
**Code:** `survey.user_style_sample || ''` and `survey.custom_grounds || ''`

**Potential Issue:** If fields contain only whitespace, they'll be sent but AI might ignore empty sections

#### 4. ⚠️ AI Interpretation Variability
Even with clear instructions, AI models can:
- Interpret "use" differently than "include verbatim"
- Skip empty-looking sections
- Merge user text into other sections thinking it's helpful

---

## Verification Tests

### Test 1: Check Console Logs
When generating, check terminal for:
```
[generate] Survey response found { 
  hasStyleSample: true,      // Should be true if field filled
  hasCustomGrounds: true     // Should be true if field filled
}
```

### Test 2: Check Actual Prompt
Add temporary logging in `llm.ts` after line 246:
```typescript
console.log('=== PROMPT TO AI ===');
console.log(user.substring(0, 1000));
console.log('...');
console.log('Has USER_STYLE_SAMPLE:', user.includes('USER_STYLE_SAMPLE'));
console.log('Has CUSTOM_GROUNDS:', user.includes('CUSTOM_GROUNDS'));
console.log('Style sample content:', user.match(/USER_STYLE_SAMPLE:\n(.+)/)?.[1]);
console.log('Custom grounds content:', user.match(/CUSTOM_GROUNDS.*:\n(.+)/)?.[1]);
```

### Test 3: Specific Test Inputs
Try generating with:
- **user_style_sample:** "TESTING_STYLE_SAMPLE_123 - I object to this development"
- **custom_grounds:** "TESTING_CUSTOM_GROUNDS_456 - Additional concern about drainage"

Then search output for "TESTING_" to see if/where they appear.

---

## Summary

### What's Confirmed Working ✅
1. UI captures both fields
2. Frontend sends both fields to API
3. Backend stores both fields in database
4. Generation retrieves both fields from database
5. Both fields passed to LLM service
6. Both fields present in prompt template
7. System instructions reference both fields

### Potential Explanation ⚠️

**USER_STYLE_SAMPLE:**
- Instruction says "**Use** to create opening paragraph"
- AI may interpret this as: adopt the tone/style, not include verbatim
- **This might be intentional design** - field is for style guidance

**CUSTOM_GROUNDS:**
- Instruction says include "AFTER all SELECTED_CONCERNS"
- Should appear near end of document
- May be missed if looking at beginning/middle

### Recommended Actions

1. **Run verification test** with distinctive test strings to see where they appear
2. **Check console logs** during generation to confirm fields have content
3. **Review generated output end** - custom grounds should be there, not at start
4. **Consider if user_style_sample design is correct** - is it meant for style or verbatim inclusion?

---

## Field Purpose Clarification Needed

**Question for Review:**

**USER_STYLE_SAMPLE** - What is the intended behavior?
- **Option A:** Include user's text verbatim in introduction
- **Option B:** Use user's text as a style/tone guide (current behavior)

**Current instruction:** "Use USER_STYLE_SAMPLE to create a strong opening paragraph"

If Option A is desired, instruction should be:
```
• INTRODUCTION: Create a strong opening paragraph (3-5 sentences) incorporating USER_STYLE_SAMPLE
  - Begin with or include the user's own words from USER_STYLE_SAMPLE
  - Then state clear opposition to the development
  - Reference the specific DA number and site address
```

**CUSTOM_GROUNDS** - Placement OK?
- Currently instructed to appear AFTER all selected concerns
- This means near the end before conclusion
- Is this the desired location, or should it be earlier?

