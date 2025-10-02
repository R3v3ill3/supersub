# DIAGNOSTIC REPORT: Duplicate Prompts - Root Cause of Missing User Input

## Executive Summary

**ROOT CAUSE IDENTIFIED:** The API server is loading **OLD versions** of the prompt files from `apps/api/packages/prompts/` instead of the updated versions in `packages/prompts/`.

**User input is saved correctly** but never reaches the AI because the old template doesn't ask for it.

---

## The Duplicate Files Problem

### File 1: submission.system.txt

| Location | Size | Lines | Last Modified | Status |
|----------|------|-------|---------------|--------|
| `packages/prompts/` | 9.2KB | 136 | Oct 3, 2025 | ✅ NEW (with all updates) |
| `apps/api/packages/prompts/` | 672 bytes | **8** | Sep 28, 2025 | ❌ OLD (ancient version) |

**What the OLD version contains:**
```
You are drafting a plain-text council submission letter. You must strictly follow these rules:
• Use only the information provided in APPROVED_FACTS and SELECTED_CONCERNS 
  and the tone cues from USER_STYLE_SAMPLE.
• Do not add any fact, link, statistic, claim, date, or source not present in the inputs.
• No emojis. No em dashes. No rhetorical devices.
• Write in clear Australian English. Short, direct sentences.
• Keep to {{MAX_WORDS}} words or fewer.
• Output only valid JSON matching the provided schema.
```

**Missing from OLD version:**
- ❌ Full_text comprehensiveness instructions
- ❌ CUSTOM_GROUNDS handling instructions
- ❌ USER_STYLE_SAMPLE verbatim inclusion
- ❌ Bullet formatting guidance (no blank lines)
- ❌ Data preservation requirements (measurements, codes)
- ❌ Structure guidance (introduction, main body, conclusion)
- ❌ Output format clarification (final_text vs metadata)

---

### File 2: submission.user.hbs

| Location | Size | Lines | Last Modified | Status |
|----------|------|-------|---------------|--------|
| `packages/prompts/` | 1.8KB | 51 | Oct 3, 2025 | ✅ NEW (with CUSTOM_GROUNDS) |
| `apps/api/packages/prompts/` | Smaller | **21** | Sep 28, 2025 | ❌ OLD (no CUSTOM_GROUNDS) |

**What the OLD version contains:**
```handlebars
RECIPIENT_NAME: {{recipient_name}}
SUBJECT: {{subject}}
APPLICANT_NAME: {{applicant_name}}
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
{{{user_style_sample}}}

[FILE ENDS HERE - LINE 21]
```

**Missing from OLD version:**
- ❌ CUSTOM_GROUNDS section (lines 21-22)
- ❌ All the examples (lines 26-51)
- ❌ Correct reproduction guidance

**Also has obsolete field:**
- ⚠️ APPLICANT_NAME (should be removed)

---

## Why This Happened

### Code Path Resolution

**File:** `apps/api/src/services/llm.ts` lines 230-237

```typescript
const base = process.cwd();  
// ↑ On Railway: /app/apps/api
// ↑ Locally when running from api dir: .../apps/api

const systemPath = path.resolve(base, 'packages/prompts/submission.system.txt');
// ↑ Resolves to: apps/api/packages/prompts/submission.system.txt (OLD VERSION)

const userTplPath = path.resolve(base, 'packages/prompts/submission.user.hbs');
// ↑ Resolves to: apps/api/packages/prompts/submission.user.hbs (OLD VERSION)
```

**What we updated:**
- ✅ `packages/prompts/submission.system.txt` (root)
- ✅ `packages/prompts/submission.user.hbs` (root)

**What the API loads:**
- ❌ `apps/api/packages/prompts/submission.system.txt` (never updated)
- ❌ `apps/api/packages/prompts/submission.user.hbs` (never updated)

---

## Complete User Input Trace

### ✅ WORKS: Database Storage

**user_style_sample:**
```
Stored: "As a neighbour across the road, I strongly oppose this inappropriate 
         and unnecessary development proposal"
Length: 106 characters
Confirmed: ✅ Present in survey_responses table
```

**custom_grounds:**
```
Stored: (empty in this test)
Confirmed: ✅ Field exists, can store data
```

---

### ✅ WORKS: Retrieval & Passing

**File:** `apps/api/src/routes/generate.ts` line 169-170

```typescript
styleSample: survey.user_style_sample || '',      // ✅ Retrieved and passed
customGrounds: survey.custom_grounds || '',        // ✅ Retrieved and passed
```

**Confirmed in logs:**
```
[generate] Survey response found { 
  hasStyleSample: true,      // ✅ Detected
  hasCustomGrounds: false    // (empty in this case)
}
```

---

### ✅ WORKS: LLM Service Receives Data

**File:** `apps/api/src/services/llm.ts` line 240-246

```typescript
const user = userTpl({
  ...args.meta,
  approved_facts: args.approvedFacts,
  selected_concerns: args.selectedConcerns,
  user_style_sample: args.styleSample,      // ✅ "As a neighbour across the road..."
  custom_grounds: args.customGrounds || ''  // ✅ Passed (empty in this case)
})
```

---

### ❌ FAILS: Template Doesn't Include It

**Old Template (apps/api/packages/prompts/submission.user.hbs):**

Line 19-21:
```handlebars
USER_STYLE_SAMPLE:
{{{user_style_sample}}}

[FILE ENDS]
```

**What's missing:**
- Line 21-22 should be: `CUSTOM_GROUNDS (user-provided additional concerns):\n{{{custom_grounds}}}`
- Lines 24-51 should be: Examples and guidance

**Result:** When Handlebars compiles this template:
```
USER_STYLE_SAMPLE:
As a neighbour across the road, I strongly oppose this inappropriate and unnecessary development proposal

[Prompt ends here - no CUSTOM_GROUNDS section]
```

---

### ❌ FAILS: AI Never Receives User Input

Because the compiled prompt doesn't have CUSTOM_GROUNDS section, the AI receives:
- ✅ APPROVED_FACTS
- ✅ SELECTED_CONCERNS (with full_text!)
- ✅ Label "USER_STYLE_SAMPLE:" but...
- ❌ No instructions on what to do with it

**Old system prompt says:**
> "Use tone cues from USER_STYLE_SAMPLE"

So AI interprets it as style guidance, not verbatim inclusion.

---

### ❌ FAILS: Output Missing User Text

AI generates without user input because:
1. Template doesn't ask for CUSTOM_GROUNDS
2. System prompt says "use tone cues" not "include verbatim"
3. No examples showing verbatim inclusion

**Result:**
- Generated text: Professional planning language ✅
- User's intro: "As a neighbour across the road..." ❌ Not included
- Custom grounds: (none in this test, but wouldn't be included anyway)

---

## Why Quality Still Improved

**Despite using old prompts, quality is better because:**

1. ✅ **Data improved:** We backfilled `full_text` with measurements
2. ✅ **Retrieval improved:** Code now loads `full_text` instead of `body`
3. ✅ **AI receives better data:** Even with old prompt, the SELECTED_CONCERNS now have comprehensive text

**Example:**
```
Old data to AI: "Extensive earthworks will cause impacts" (137 chars)
New data to AI: "The design requires 12,600 m³ of cut, 2,400 m³ of fill..." (1008 chars)
```

So the AI is working with 7-8x more detail per concern, even though it's using the old 8-line system prompt!

---

## The Fix Required

### Step 1: Identify Which Prompts Are Being Used

**Current working directory check:**
```bash
# On Railway during build/run
echo $PWD
# Likely: /app/apps/api

# Code uses:
const base = process.cwd();  // /app/apps/api
```

### Step 2: Copy Updated Files to API Directory

**Two files need syncing:**

```bash
cd /Volumes/DataDrive/cursor_repos/supersub/da-submission-manager

# Copy system prompt (136 lines → 8 lines)
cp packages/prompts/submission.system.txt apps/api/packages/prompts/submission.system.txt

# Copy user template (51 lines → 21 lines)
cp packages/prompts/submission.user.hbs apps/api/packages/prompts/submission.user.hbs

echo "✅ Prompts synced"
```

### Step 3: Verify Sync

```bash
# Both should now be identical
diff packages/prompts/submission.system.txt apps/api/packages/prompts/submission.system.txt
diff packages/prompts/submission.user.hbs apps/api/packages/prompts/submission.user.hbs

# Should output: (no differences)
```

### Step 4: Deploy & Test

After sync:
1. Commit and push
2. Railway rebuilds
3. Test generation with user input
4. Verify user text appears in output

---

## Expected Changes After Fix

### Before Fix (Current State):

**System Prompt:** 8 lines, minimal instructions
```
- Use tone cues from USER_STYLE_SAMPLE (vague)
- No CUSTOM_GROUNDS instructions
- No full_text guidance
- No measurement preservation
```

**User Template:** 21 lines, no CUSTOM_GROUNDS
```
USER_STYLE_SAMPLE:
{{{user_style_sample}}}

[ends here]
```

**AI Receives:**
- Full_text data ✅ (from our backfill)
- User style sample (but no clear instructions)
- NO custom_grounds section

**Output:**
- Has measurements ✅ (from full_text data)
- Missing user intro ❌
- Missing custom grounds ❌

---

### After Fix (Once Synced):

**System Prompt:** 136 lines, comprehensive
```
- BEGIN with USER_STYLE_SAMPLE verbatim
- Present CUSTOM_GROUNDS first
- Preserve all measurements
- No blank lines between bullets
- Detailed structure guidance
```

**User Template:** 51 lines, with CUSTOM_GROUNDS
```
USER_STYLE_SAMPLE:
{{{user_style_sample}}}

CUSTOM_GROUNDS (user-provided additional concerns):
{{{custom_grounds}}}

[plus examples and guidance]
```

**AI Receives:**
- Full_text data ✅
- User style sample with clear instructions ✅
- Custom_grounds section ✅

**Output:**
- Has measurements ✅
- Has user intro verbatim ✅
- Has custom grounds first ✅

---

## How This Went Undetected

1. **No errors thrown:** Old prompts work, just produce different output
2. **Partial improvement:** full_text data made output better even with old prompts
3. **Local vs deployment:** May have worked locally if running from root directory
4. **Silent degradation:** Missing sections don't cause failures

---

## Prevention for Future

### Option 1: Eliminate Duplicate
Remove `apps/api/packages/prompts/` and update code to always use root:

```typescript
// In llm.ts
const projectRoot = path.resolve(process.cwd(), '../..');
const systemPath = path.resolve(projectRoot, 'packages/prompts/submission.system.txt');
```

### Option 2: Build-Time Copy
Add to `apps/api/package.json`:
```json
{
  "scripts": {
    "prebuild": "cp -r ../../packages/prompts packages/"
  }
}
```

### Option 3: Symlink (Unix only)
```bash
cd apps/api/packages
rm -rf prompts
ln -s ../../../packages/prompts prompts
```

### Option 4: Keep Both, But Document
Add to README:
```
⚠️ IMPORTANT: Prompts exist in TWO locations:
- packages/prompts/ (source of truth)
- apps/api/packages/prompts/ (used by API)

When updating prompts, update BOTH or run sync script.
```

---

## Immediate Action Required

**Copy the updated prompts to API directory:**

```bash
cp packages/prompts/submission.system.txt apps/api/packages/prompts/submission.system.txt
cp packages/prompts/submission.user.hbs apps/api/packages/prompts/submission.user.hbs
```

**Then commit and deploy** - user input will start appearing!

---

## Impact Assessment

**Why output has been good despite wrong prompts:**
1. ✅ full_text backfill gave AI comprehensive data
2. ✅ Retrieval code correctly loads full_text
3. ✅ AI received measurements and codes in SELECTED_CONCERNS
4. ⚠️ But system prompt had minimal guidance
5. ❌ User input sections completely missing from template

**After fix, expect:**
- 🎯 User introductions appearing verbatim
- 🎯 Custom grounds appearing first
- 🎯 Even better structure and consistency
- 🎯 More reliable bullet formatting
- 🎯 Better adherence to comprehensive instructions

---

## Testing After Fix

Generate submission with:
- **Intro:** "TEST_INTRO_ABC123 - I strongly oppose..."
- **Custom:** "TEST_CUSTOM_XYZ789 - I am concerned about..."

Search output for:
- ✅ "TEST_INTRO_ABC123" should appear at start
- ✅ "TEST_CUSTOM_XYZ789" should appear as section 1

---

## Timeline

**Sep 28:** Original prompts created (8 lines, 21 lines)  
**Oct 2-3:** We updated ROOT prompts (136 lines, 51 lines)  
**Oct 2-3:** Created backups of ROOT versions  
**Oct 3:** Discovered API still using Sep 28 versions  

**Action:** Sync files from root to API directory

