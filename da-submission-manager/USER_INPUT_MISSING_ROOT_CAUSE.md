# Root Cause Analysis: User Input Not Appearing

## CRITICAL FINDING: Duplicate Template Files

### The Problem

There are **TWO versions** of the prompt template:

1. **Root Location:** `packages/prompts/submission.user.hbs`
   - **Size:** 1.8KB, 51 lines
   - **Status:** ✅ Updated with CUSTOM_GROUNDS section
   - **Line 21-22:** Has CUSTOM_GROUNDS section
   - **Not being used by API**

2. **API Location:** `apps/api/packages/prompts/submission.user.hbs`
   - **Size:** Smaller, 21 lines  
   - **Status:** ❌ OLD VERSION, missing CUSTOM_GROUNDS
   - **Line 21:** File ends here
   - **This is what the API is actually loading**

---

## Why This Happened

### Code Path Resolution

**File:** `apps/api/src/services/llm.ts` line 231-232

```typescript
const base = process.cwd();  // When API runs, this is apps/api/
const userTplPath = path.resolve(base, 'packages/prompts/submission.user.hbs');
```

**Resolution:**
- `process.cwd()` returns `/app/apps/api` (on Railway) or local equivalent
- `packages/prompts/submission.user.hbs` resolves relative to cwd
- **Result:** `apps/api/packages/prompts/submission.user.hbs` (OLD VERSION)

**Expected:**
- Should load from root `packages/prompts/submission.user.hbs` (NEW VERSION)

---

## Evidence

### Test 1: Template Content Check
```bash
# Root version
grep -n "CUSTOM_GROUNDS" packages/prompts/submission.user.hbs
# Result: Line 21: CUSTOM_GROUNDS (user-provided additional concerns):

# API version  
grep -n "CUSTOM_GROUNDS" apps/api/packages/prompts/submission.user.hbs
# Result: (no matches found)
```

### Test 2: Handlebars Compilation
When running from `apps/api/` directory:
```javascript
const template = await fs.readFile('packages/prompts/submission.user.hbs', 'utf8');
// Loads: apps/api/packages/prompts/submission.user.hbs (21 lines)
// Missing: CUSTOM_GROUNDS section, all examples
```

### Test 3: Generated Output
AI-generated drafts (both OpenAI and Claude) do NOT contain:
- ❌ User's introductory text
- ❌ Custom grounds text
- ❌ References to CUSTOM_GROUNDS section

**Because the template never asked for them!**

---

## Complete Trace

### What We Updated (Root Location):
```
✅ packages/prompts/submission.system.txt - Updated instructions
✅ packages/prompts/submission.user.hbs - Added CUSTOM_GROUNDS section
✅ Created backups
```

### What The API Actually Uses (API Location):
```
❌ apps/api/packages/prompts/submission.system.txt - May be outdated
❌ apps/api/packages/prompts/submission.user.hbs - Definitely outdated (missing CUSTOM_GROUNDS)
```

---

## Why User Input Doesn't Appear

### Step-by-Step Flow:

1. ✅ **UI:** User enters text in both fields
2. ✅ **API:** Saves to database (confirmed: "As a neighbour across the road...")
3. ✅ **Generation:** Retrieves from database
4. ✅ **LLM Service:** Passes to Handlebars template compilation
5. ❌ **Template:** OLD VERSION without CUSTOM_GROUNDS section
6. ❌ **Compiled Prompt:** Does NOT include custom_grounds data
7. ❌ **AI:** Never sees user input, can't include it
8. ❌ **Output:** Missing user text

---

## Verification

### Check Both System Prompts:
```bash
# Root version
ls -lh packages/prompts/submission.system.txt

# API version
ls -lh apps/api/packages/prompts/submission.system.txt

# Compare
diff packages/prompts/submission.system.txt apps/api/packages/prompts/submission.system.txt
```

### Check Both User Templates:
```bash
# Root version (51 lines)
wc -l packages/prompts/submission.user.hbs

# API version (21 lines)  
wc -l apps/api/packages/prompts/submission.user.hbs

# Compare
diff packages/prompts/submission.user.hbs apps/api/packages/prompts/submission.user.hbs
```

---

## Solution Options

### Option 1: Copy Updated Files to API Directory (Quick Fix)
```bash
cp packages/prompts/submission.system.txt apps/api/packages/prompts/submission.system.txt
cp packages/prompts/submission.user.hbs apps/api/packages/prompts/submission.user.hbs
```

**Pros:** Immediate fix, minimal code change  
**Cons:** Need to remember to update both locations in future

### Option 2: Update Code to Use Root Location (Proper Fix)
Change `llm.ts` to load from root:
```typescript
const base = path.resolve(process.cwd(), '../..'); // Go up to root
// OR
const base = '/app';  // Absolute path on Railway
```

**Pros:** Single source of truth  
**Cons:** Need to ensure path resolution works on all environments

### Option 3: Symlink (Unix Approach)
```bash
rm -rf apps/api/packages/prompts
ln -s ../../packages/prompts apps/api/packages/prompts
```

**Pros:** Automatic sync  
**Cons:** May not work on all platforms, build complexity

### Option 4: Build Process Copy
Add to build or deployment:
```json
{
  "scripts": {
    "prebuild": "cp -r packages/prompts apps/api/packages/"
  }
}
```

**Pros:** Ensures sync on each build  
**Cons:** Adds build step

---

## Recommended Solution

**Option 1 + Option 4 Combined:**

1. **Immediate:** Copy files to apps/api/packages/prompts/
2. **Long-term:** Add to package.json build process to auto-copy

---

## Impact

**Before Fix:**
- User inputs saved to database ✅
- User inputs retrieved ✅
- User inputs passed to llm.ts ✅
- **User inputs NOT in template** ❌
- User inputs never reach AI ❌
- Output missing user text ❌

**After Fix:**
- All of above ✅
- Template includes CUSTOM_GROUNDS section ✅
- AI receives user text in prompt ✅
- Output includes user text ✅

---

## How to Verify After Fix

1. Copy files to API directory
2. Restart API server
3. Generate new submission with:
   - Intro: "TEST_USER_INTRO_12345"
   - Custom grounds: "TEST_CUSTOM_GROUNDS_67890"
4. Search output for "TEST_USER_INTRO" and "TEST_CUSTOM_GROUNDS"
5. Both should appear ✅

---

## Why This Wasn't Caught Earlier

1. Local development: May have been using root location
2. Railway deployment: Uses different working directory
3. No error thrown: Template loads successfully, just old version
4. Silent failure: Missing section doesn't cause errors, just missing output

---

## Files That Need Syncing

Check these files exist in BOTH locations and are identical:

1. `submission.system.txt`
2. `submission.user.hbs`

Both should have the latest changes:
- ✅ full_text support
- ✅ CUSTOM_GROUNDS section
- ✅ USER_STYLE_SAMPLE verbatim instructions
- ✅ Bullet formatting instructions

