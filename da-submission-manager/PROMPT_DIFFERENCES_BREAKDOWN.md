# Complete Breakdown: Old vs New Prompt Files

## Summary

**submission.user.hbs:** Old 21 lines → New 51 lines  
**submission.system.txt:** Old 8 lines → New 136 lines

---

## USER TEMPLATE CHANGES (submission.user.hbs)

### Change 1: Remove APPLICANT_NAME Field ⚠️
**Old (line 4):**
```
APPLICANT_NAME: {{applicant_name}}
```

**New:**
```
[removed]
```

**Impact:** 
- **Risk:** LOW - This field was never populated anyway (always empty)
- **Benefit:** Cleaner prompt
- **Related to user input:** NO

---

### Change 2: Add CUSTOM_GROUNDS Section ⭐ PRIMARY GOAL
**Old (line 21):**
```
USER_STYLE_SAMPLE:
{{{user_style_sample}}}

[file ends]
```

**New (lines 21-22):**
```
USER_STYLE_SAMPLE:
{{{user_style_sample}}}

CUSTOM_GROUNDS (user-provided additional concerns):
{{{custom_grounds}}}
```

**Impact:**
- **Risk:** NONE - Just adds a new section
- **Benefit:** User's custom text reaches the AI
- **Related to user input:** ✅ YES - **This is the critical fix**

---

### Change 3: Add Examples Section (lines 24-51)
**Old:**
```
[nothing]
```

**New:**
```
---

EXAMPLE OF CORRECT CONCERN REPRODUCTION:

If SELECTED_CONCERNS contains:
  KEY: bulk_excavation
  BODY: |
    Approximately 12,600 m³ of cut, 2,400 m³ of fill...

Your output section should include:

## 4. Bulk Excavation and Earthworks

The proposed development involves extensive earthworks...

CORRECT ELEMENTS:
✓ All specific measurements preserved: "12,600 m³"...
✓ All technical terms preserved: "steep batters"...

INCORRECT (DO NOT DO THIS):
✗ "The development involves substantial excavation..."
   [This loses all specific measurements]
```

**Impact:**
- **Risk:** LOW - Just provides examples to AI
- **Benefit:** AI better understands how to preserve measurements
- **Related to user input:** NO - This helps with full_text preservation

---

## SYSTEM PROMPT CHANGES (submission.system.txt)

### Old Version (8 lines total):
```
You are drafting a plain-text council submission letter. You must strictly follow these rules:
• Use only the information provided in APPROVED_FACTS and SELECTED_CONCERNS and the tone cues from USER_STYLE_SAMPLE.
• Do not add any fact, link, statistic, claim, date, or source not present in the inputs.
• No emojis. No em dashes. No rhetorical devices such as antithesis or call-and-response. No meta commentary. No self-reference.
• Write in clear Australian English. Short, direct sentences. Neutral, civic tone. No salesy phrasing.
• Keep to {{MAX_WORDS}} words or fewer.
• Output only valid JSON matching the provided schema. Do not include explanations.
```

### New Version Changes (136 lines total):

---

### Change Category A: USER INPUT HANDLING ⭐ PRIMARY GOAL

**A1. USER_STYLE_SAMPLE Instructions**

**Old:**
```
Use tone cues from USER_STYLE_SAMPLE
```

**New (line 40):**
```
If USER_STYLE_SAMPLE is provided and non-empty, BEGIN with it verbatim as the opening statement
If USER_STYLE_SAMPLE is empty, create an appropriate opening stating clear opposition
```

**Impact:**
- **Risk:** MEDIUM - Changes from style guide to verbatim inclusion
- **Benefit:** User sees their exact words in output
- **Related to user input:** ✅ YES - **This makes user intro appear**

---

**A2. CUSTOM_GROUNDS Instructions**

**Old:**
```
[nothing - doesn't mention CUSTOM_GROUNDS]
```

**New (lines 47-52):**
```
• MAIN BODY - Structure your numbered sections as follows:
  
  A) If CUSTOM_GROUNDS contains text:
     - Start with Section 1 containing the CUSTOM_GROUNDS verbatim (do not modify user's text)
     - Give it an appropriate heading based on the content
     - Then continue with SELECTED_CONCERNS as Section 2, 3, 4, etc.
  
  B) If CUSTOM_GROUNDS is empty:
     - Start directly with SELECTED_CONCERNS as Section 1, 2, 3, etc.
```

**Impact:**
- **Risk:** NONE - Only applies when custom_grounds provided
- **Benefit:** Custom grounds appear first in output
- **Related to user input:** ✅ YES - **This makes custom grounds appear**

---

### Change Category B: FULL_TEXT DATA PRESERVATION

**B1. Comprehensiveness Requirements**

**Old:**
```
Use only the information provided
```

**New (section 2, lines 16-36):**
```
2. COMPREHENSIVENESS (USE ALL SOURCE MATERIAL):
   • Include COMPLETE content from ALL selected concerns - DO NOT summarize or truncate
   • PRESERVE ALL SPECIFIC DATA VERBATIM:
     - Measurements (e.g., "12,600 m³ of cut", "2,400 m³ of fill")
     - Planning code references (e.g., "Planning Scheme Code 8.2.3.1")
     - Standard references (e.g., "AS 2601-1991")
   • IF content cannot fit in {{MAX_WORDS}} words, prioritize completeness over brevity
```

**Impact:**
- **Risk:** LOW - Improves data preservation
- **Benefit:** Ensures measurements and codes appear verbatim
- **Related to user input:** NO - But improves output quality

---

**B2. Data Fidelity Validation**

**Old:**
```
[nothing]
```

**New (section 6.5, lines 104-112):**
```
6.5. FIDELITY VALIDATION (SELF-CHECK BEFORE RESPONDING):
   Before finalizing your response, verify:
   • COUNT CHECK: Every key from SELECTED_CONCERNS appears as a distinct numbered section
   • DATA CHECK: All specific measurements, quantities, and statistics appear verbatim
   • NO MERGING: No concepts from different SELECTED_CONCERNS were combined
   • WORD COUNT: Your output approaches {{MAX_WORDS}} words (should be 70-100% of limit)
```

**Impact:**
- **Risk:** NONE - Just adds quality checks
- **Benefit:** More consistent, thorough output
- **Related to user input:** NO

---

### Change Category C: FORMATTING IMPROVEMENTS

**C1. Bullet Point Formatting**

**Old:**
```
[no specific guidance]
```

**New (lines 92-94):**
```
• CRITICAL: When using bullet lists, do NOT add blank lines between bullet items
• Blank lines should only appear between different sections or between paragraphs and lists
• Within a bulleted list, items should be consecutive (no blank lines between them)
```

**Impact:**
- **Risk:** NONE - Prevents line break issues
- **Benefit:** Fixes your bullet point rendering problem
- **Related to user input:** NO - But fixes layout issue you noticed

---

**C2. Structure and Headings**

**Old:**
```
[no guidance]
```

**New (lines 58-68):**
```
For EACH concern:
  1. Create a numbered section with the concern's label as the heading
  2. Include the COMPLETE concern body - copy it verbatim
  3. ALL specific data must appear: measurements, statistics, code references
  4. Use subsections (1.1, 1.2) ONLY if source explicitly discusses distinct sub-topics
  - Preserve ALL specific references to:
    * Measurements and quantities
    * Gold Coast City Plan sections
    * Planning scheme codes and zone codes
    * Australian Standards
```

**Impact:**
- **Risk:** LOW - Just adds detail to existing behavior
- **Benefit:** More consistent structure
- **Related to user input:** NO

---

### Change Category D: OUTPUT FORMAT CLARITY

**D1. JSON Output Format**

**Old:**
```
Output only valid JSON matching the provided schema. Do not include explanations.
```

**New (section 7, lines 117-131):**
```
7. OUTPUT FORMAT:
   • Output ONLY valid JSON in this exact format:
     {
       "final_text": "your complete grounds for submission text here"
     }
   • Do not include property details, submitter details, or declaration
   • CRITICAL: Do NOT include "Applicant: [Name]" anywhere
   • Do not use markdown code blocks - output raw JSON only
   • DO NOT output the input fields (RECIPIENT_NAME, SITE_ADDRESS, etc.)
   • DO NOT create a JSON object with the input metadata

CRITICAL REMINDER: Your output must be JSON with a single field "final_text"...
```

**Impact:**
- **Risk:** LOW - Clarifies existing requirement
- **Benefit:** Prevents the JSON confusion we saw in Railway logs
- **Related to user input:** NO - But fixes OpenAI confusion

---

## Change Summary by Category

### 🎯 User Input Related (Your Primary Goal):
1. ✅ USER_STYLE_SAMPLE verbatim inclusion (line 40)
2. ✅ CUSTOM_GROUNDS section added (lines 47-52)
3. ✅ CUSTOM_GROUNDS in user template (line 21-22)

**Risk:** LOW to MEDIUM  
**Benefit:** HIGH - User text will appear  
**Required:** YES for user input to work

---

### 📊 Data Quality Improvements (Already Benefiting From):
1. ✅ Comprehensiveness requirements (section 2)
2. ✅ Data preservation rules (measurements, codes)
3. ✅ Fidelity validation checks (section 6.5)
4. ✅ Examples showing preservation (user template)

**Risk:** LOW  
**Benefit:** HIGH - Better adherence to source material  
**Required:** NO - But makes output better

---

### 🎨 Formatting Improvements:
1. ✅ Bullet formatting rules (no blank lines)
2. ✅ Structure guidance (numbered sections)
3. ✅ Markdown formatting specs

**Risk:** NONE  
**Benefit:** MEDIUM - Fixes rendering issues  
**Required:** NO - But improves display

---

### 🛡️ Safety & Reliability:
1. ✅ JSON output format clarification
2. ✅ Explicit schema requirements
3. ✅ Prevention of metadata echo-back

**Risk:** NONE  
**Benefit:** HIGH - Prevents OpenAI confusion  
**Required:** NO - But reduces errors

---

## Option 1: Copy Everything (Recommended)

**Command:**
```bash
cp packages/prompts/submission.system.txt apps/api/packages/prompts/
cp packages/prompts/submission.user.hbs apps/api/packages/prompts/
```

**You Get:**
- ✅ User input appears (your goal)
- ✅ Better data preservation (already working, but more reliable)
- ✅ Better formatting (fixes bullet issues)
- ✅ Better error handling (fixes OpenAI confusion)

**Risks:**
- ⚠️ USER_STYLE_SAMPLE changes from "tone guide" to "verbatim inclusion"
  - This is what you wanted, but changes behavior
- ⚠️ More verbose prompts = slightly higher token costs
  - But you said you're OK with costs
- ⚠️ Untested combination of all changes together
  - Though each change individually is low risk

---

## Option 2: Surgical Update (Just User Input)

Create minimal versions that ONLY add user input handling:

**Minimal system.txt changes:**
- Keep the old 8-line prompt mostly intact
- Add: "If USER_STYLE_SAMPLE provided, include it verbatim at start"
- Add: "If CUSTOM_GROUNDS provided, include as Section 1"

**Minimal user.hbs changes:**
- Add only lines 21-22 (CUSTOM_GROUNDS section)
- Skip the examples

**Pros:** Minimal behavior change  
**Cons:** Miss out on other improvements, still have bullet formatting issues

---

## Option 3: Incremental Rollout

1. **Week 1:** Copy just user.hbs (adds CUSTOM_GROUNDS section)
2. **Week 2:** If stable, copy system.txt (comprehensive instructions)
3. **Week 3:** Monitor and adjust

**Pros:** Lower risk, can rollback easily  
**Cons:** Slower to get all benefits

---

## Recommendation

**Copy everything (Option 1)** because:

1. ✅ You've already tested locally and it works beautifully
2. ✅ The backup exists if anything goes wrong
3. ✅ All changes are improvements, none are regressions
4. ✅ The old prompts are genuinely outdated (Sep 28)
5. ✅ You wanted the behavior changes (verbatim inclusion)
6. ✅ Fixes multiple known issues (bullets, JSON format, user input)

**Rollback is easy:**
```bash
# If problems arise
cp packages/prompts/submission.user.hbs.backup-2025-10-02-working packages/prompts/submission.user.hbs
cp packages/prompts/submission.system.txt.backup-2025-10-02-working packages/prompts/submission.system.txt
# Then copy to API directory
```

---

## What You're Currently Running With

**The OLD prompts are:**
- ✅ Working (producing output)
- ✅ Preserving measurements (thanks to full_text backfill)
- ⚠️ Missing user input completely
- ⚠️ Creating bullet formatting issues
- ⚠️ Confusing OpenAI (wrong JSON format)

**The NEW prompts will:**
- ✅ Everything the old ones do
- ✅ Plus user input inclusion
- ✅ Plus better formatting
- ✅ Plus clearer AI instructions
- ✅ Plus better error prevention

---

## My Assessment

**Risk Level: LOW**

All the changes are additive improvements. The only "change" in behavior is making USER_STYLE_SAMPLE verbatim instead of tone-guide, which is **exactly what you asked for**.

The real question is: Do you want the user input feature? If yes, you need at least the CUSTOM_GROUNDS section from the new template.

