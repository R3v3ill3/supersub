# Diagnostic Results - AI Generation Issue

**Date:** October 2, 2025  
**Issue:** Measurements (12,600 m³, etc.) missing from generated submissions  
**Status:** ✅ ROOT CAUSE IDENTIFIED

---

## ✅ What We Found

### **Database Check Results:**

```
✓ Cut volume (12,600 m³) - PRESENT
✓ Fill volume (2,400 m³) - PRESENT  
✓ Soil export (7,000 m³) - PRESENT
✓ Technical term: steep batters - PRESENT
✓ Technical term: retaining walls - PRESENT

✅ All critical data points are present in concern templates!
```

**Key Finding:** There are **TWO concerns** with the key `bulk_excavation`:

1. **Version WITHOUT measurements** (line 31-34):
   ```
   Label: Bulk excavation and earthworks
   Body: The revised design involves extensive earthworks, including a large 
   volume of cut and fill, which exceeds the original proposal...
   Length: 43 words
   ```

2. **Version WITH measurements** (line 36-40):
   ```
   Label: Excessive bulk excavation and earthworks
   Body: Approximately 12,600 m³ of cut, 2,400 m³ of fill, and 7,000 m³ 
   of soil export, with steep batters and extensive retaining walls...
   Length: 30 words
   Measurements found: 12,600 m³, 2,400 m³, 7,000 m³  ✓
   ```

---

## 🎯 The Problem

You have **duplicate concerns** with the same key `bulk_excavation`:
- One is generic (no measurements)
- One has specific measurements

When users select "bulk_excavation", the system might be loading the **wrong one**.

Additionally, even when the correct concern is loaded, the AI might still be:
- Paraphrasing instead of copying verbatim
- Summarizing multi-sentence concerns into single sentences
- Generalizing specific measurements

---

## 💡 Solutions

### **Solution 1: Clean Up Database Duplicates (RECOMMENDED)**

```sql
-- Check which bulk_excavation concerns exist
SELECT id, key, label, body, is_active 
FROM concern_templates 
WHERE key = 'bulk_excavation' AND version = 'v1';

-- Keep the one WITH measurements, deactivate the one without
UPDATE concern_templates
SET is_active = false
WHERE key = 'bulk_excavation' 
  AND version = 'v1'
  AND body NOT LIKE '%12,600%';

-- Or give the one without measurements a different key
UPDATE concern_templates
SET key = 'bulk_excavation_generic'
WHERE key = 'bulk_excavation' 
  AND version = 'v1'
  AND body NOT LIKE '%12,600%';
```

### **Solution 2: Test with the Correct Concern**

When testing, explicitly select the concern with measurements:

```javascript
// Make sure you're selecting THIS one:
{
  key: 'bulk_excavation',  // The one with label "Excessive bulk excavation and earthworks"
  body: 'Approximately 12,600 m³ of cut, 2,400 m³ of fill...'
}
```

### **Solution 3: Further Prompt Strengthening**

If measurements are still being lost even with correct data, we can:

1. **Lower temperature to 0.0** (completely deterministic)
2. **Add explicit few-shot examples** showing exact reproduction
3. **Add validation layer** that checks output against input
4. **Use structured output** with separate fields for each measurement

---

## 🧪 Testing Instructions

### **Method 1: Simple Shell Script (EASIEST)**

```bash
# Start your API server first
cd da-submission-manager/apps/api
npm run dev

# In another terminal:
cd da-submission-manager
./test-generation-simple.sh
```

This will:
1. Create a test submission
2. Select 7 concerns (including bulk_excavation)
3. Generate with AI
4. Check if measurements appear
5. Save output to file

### **Method 2: Web App Test**

1. Go to `http://localhost:5173`
2. Create new submission
3. Select concerns - **IMPORTANT: Make sure you see "Excessive bulk excavation and earthworks"**
4. Generate submission
5. Search output for "12,600 m³"

### **Method 3: Direct API Call**

```bash
# Assuming you have SUBMISSION_ID and survey saved
curl -X POST http://localhost:3000/api/generate/YOUR_SUBMISSION_ID \
  -H "Content-Type: application/json"
```

---

## 📊 Expected vs Actual Output

### ✅ **CORRECT Output (What We Want):**

```markdown
## Bulk Excavation and Earthworks

Approximately 12,600 m³ of cut, 2,400 m³ of fill, and 7,000 m³ of soil 
export, with steep batters and extensive retaining walls causing significant 
construction impacts and permanent visual scarring.
```

**Key features:**
- All three measurements present verbatim
- Technical terms preserved
- ~30 words (matches source)

### ❌ **INCORRECT Output (What You Got):**

```
## Bulk Excavation and Earthworks

The extensive earthworks required for the development will lead to significant 
construction impacts. They will also cause long-term visual scarring of the 
rural landscape. The proposal includes large-scale excavation, steep batters, 
and retaining walls that are inappropriate for the area.
```

**Problems:**
- ALL measurements missing
- "large-scale excavation" instead of specific volumes
- Paraphrased/summarized

---

## 🔍 Root Cause Analysis

**Most Likely Cause:** The system is loading the wrong `bulk_excavation` concern (the one without measurements).

**Why This Happens:**
- Database has two concerns with same key
- Query returns one randomly (or first alphabetically by label)
- The generic one might be returned instead of the detailed one

**Secondary Issue:** Even with correct data, AI might summarize due to:
- Temperature too high (creative variation)
- Prompt not strong enough about verbatim reproduction
- Token limit constraints

---

## ✅ Action Items

### **Immediate Actions:**

1. **Clean up duplicate concerns:**
   ```bash
   # Connect to your database and run:
   UPDATE concern_templates
   SET is_active = false
   WHERE key = 'bulk_excavation' 
     AND version = 'v1'
     AND body NOT LIKE '%12,600%';
   ```

2. **Verify in admin app:**
   - Go to Templates → Survey Concerns
   - Check that only ONE "bulk_excavation" is active
   - Verify it has the measurements

3. **Test generation:**
   ```bash
   ./test-generation-simple.sh
   ```

4. **Check output** for "12,600 m³"

### **If Still Failing After Database Fix:**

1. Lower temperature to 0.0:
   ```bash
   OPENAI_TEMPERATURE=0.0
   ```

2. Add explicit validation to code (I can help with this)

3. Consider using Claude or GPT-4 (better instruction following)

---

## 📝 Notes

- Your enhanced prompts ARE deployed ✅
- Source data IS in database ✅  
- Duplicate concern keys are causing confusion ⚠️
- Need to ensure correct concern is selected

---

## 🚀 Next Steps

**Priority 1:** Clean up database duplicates  
**Priority 2:** Test with `./test-generation-simple.sh`  
**Priority 3:** If still failing, further prompt adjustments

Once duplicates are cleaned up and you can select the correct concern with measurements, the AI should preserve them based on our enhanced prompts.


