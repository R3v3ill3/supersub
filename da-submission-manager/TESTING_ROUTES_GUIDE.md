# Testing Routes Guide - IMPORTANT

## ⚠️ CRITICAL: Use the Right Generation Route!

Your app has **TWO different generation systems**. Make sure you're testing with the **production route**, not the dev route.

---

## ✅ **PRODUCTION ROUTE** (Use This!)

**Endpoint:** `POST /api/generate/:submissionId`  
**Function:** `generateSubmission()` from `llm.ts`  
**Prompt:** ✓ Enhanced comprehensive prompt with data preservation  
**Used by:** Web app production flow

### How to Test:

#### **Option 1: Via Web App**
```
1. Go to http://localhost:5173 (or your production URL)
2. Create a new submission
3. Fill out form → Step 2: Select concerns
4. Select 7+ concerns
5. Step 3: Click "Generate Submission"
6. Review the generated text
```

#### **Option 2: Via API Directly**
```bash
# 1. Create a test submission
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "YOUR_PROJECT_ID",
    "applicant_first_name": "Test",
    "applicant_last_name": "Resident",
    "site_address": "940 Currumbin Creek Road",
    "application_number": "COM/2025/271",
    "applicant_email": "test@example.com"
  }'

# 2. Save survey response with selected concerns
curl -X POST http://localhost:3000/api/survey/SUBMISSION_ID \
  -H "Content-Type: application/json" \
  -d '{
    "version": "v1",
    "selected_keys": ["bulk_excavation", "seqrp_non_compliance", "traffic_safety", "planning_non_compliance"],
    "ordered_keys": ["bulk_excavation", "seqrp_non_compliance", "traffic_safety", "planning_non_compliance"]
  }'

# 3. Generate using PRODUCTION route
curl -X POST http://localhost:3000/api/generate/SUBMISSION_ID \
  -H "Content-Type: application/json"
```

---

## ❌ **DEV ROUTE** (Don't Use for Testing Enhanced Prompts)

**Endpoint:** `POST /api/dev/submissions/:submissionId/generate-grounds`  
**Function:** `generateGroundsText()` from `aiGrounds.ts`  
**Prompt:** ✓ **NOW UPDATED** with enhanced prompt (as of today)  
**Used by:** Dev/testing scripts only

### How to Test (if needed):

```bash
curl -X POST http://localhost:3000/api/dev/submissions/SUBMISSION_ID/generate-grounds \
  -H "Content-Type: application/json" \
  -d '{
    "ordered_keys": ["bulk_excavation", "seqrp_non_compliance"],
    "extra": ""
  }'
```

**Note:** This route now has the enhanced prompt too, but the main production route is the one that matters.

---

## 🧪 **Test Script** (Recommended)

**File:** `scripts/test-prompt-generation.mjs`  
**Uses:** Production `generateSubmission()` function ✓  
**Prompt:** Enhanced comprehensive prompt ✓

```bash
cd da-submission-manager/apps/api
node scripts/test-prompt-generation.mjs
```

This is the **best way to test** because it:
- Uses the same function as production
- Has our enhanced prompts
- Validates output automatically
- Saves results for review

---

## 🔍 **Check Your Concern Data First**

Before testing generation, verify your concern templates have the measurements:

```bash
cd da-submission-manager/apps/api
node scripts/check-concern-data.mjs
```

This will show you:
- ✓ All concern templates in database
- ✓ Whether they contain specific measurements
- ✓ Which data points are present/missing

**Expected output for bulk_excavation concern:**
```
Body: Approximately 12,600 m³ of cut, 2,400 m³ of fill, and 7,000 m³ 
of soil export, with steep batters and extensive retaining walls causing 
significant construction impacts and permanent visual scarring.
```

If measurements are **missing from your database**, the AI can't include them!

---

## 🎯 **Step-by-Step Testing Workflow**

### Step 1: Check Database

```bash
cd da-submission-manager/apps/api
node scripts/check-concern-data.mjs
```

**Expected:** All 5 critical data points found ✓

### Step 2: Test AI Generation

```bash
node scripts/test-prompt-generation.mjs
```

**Expected output:**
```
✓ Found: "12,600 m³"
✓ Found: "2,400 m³"
✓ Found: "7,000 m³"
✓ Found: "steep batters"
✓ Found: "retaining walls"

✅ TEST PASSED - All data preserved!
```

### Step 3: Test Via Web App

1. Open web app
2. Create submission
3. Select concerns including "Bulk Excavation and Earthworks"
4. Generate
5. Search output for "12,600 m³" - should be present!

---

## 🐛 **If Measurements Are Still Missing**

### Issue 1: Database Concerns Don't Have Measurements

**Check:**
```bash
node scripts/check-concern-data.mjs
```

**If missing, you need to update your database:**

```sql
-- Update the bulk_excavation concern to include measurements
UPDATE concern_templates
SET body = 'Approximately 12,600 m³ of cut, 2,400 m³ of fill, and 7,000 m³ of soil export, with steep batters and extensive retaining walls causing significant construction impacts and permanent visual scarring.'
WHERE key = 'bulk_excavation' AND version = 'v1';
```

Or re-run your seed script with correct data.

### Issue 2: Testing Wrong Route

**Make sure you're using:**
- ✅ `POST /api/generate/:submissionId` (production)
- ✅ `node scripts/test-prompt-generation.mjs` (uses production function)

**NOT:**
- ❌ `POST /api/dev/submissions/:submissionId/generate-grounds` (old dev route)

### Issue 3: Changes Not Deployed

**If testing production (Railway.app):**
1. Commit and push your changes
2. Wait for Railway to rebuild and deploy
3. Test again after deployment completes

**If testing locally:**
1. Restart your API server
2. Clear any caches
3. Test again

---

## 📊 **What Success Looks Like**

When testing the **bulk_excavation** concern, your output should include:

### ✅ CORRECT:
```
## Bulk Excavation and Earthworks

The extensive earthworks required for the development will lead to 
significant construction impacts. Approximately 12,600 m³ of cut, 
2,400 m³ of fill, and 7,000 m³ of soil export are planned, with 
steep batters and extensive retaining walls causing significant 
construction impacts and permanent visual scarring of the rural 
landscape.
```

### ❌ INCORRECT (What you got before):
```
## Bulk Excavation and Earthworks

The extensive earthworks required for the development will lead to 
significant construction impacts. They will also cause long-term 
visual scarring of the rural landscape. The proposal includes 
large-scale excavation, steep batters, and retaining walls that 
are inappropriate for the area.
```

Notice: Second version lost **all** the specific measurements!

---

## 🚀 **Quick Reference**

| Task | Command |
|------|---------|
| Check database concerns | `node scripts/check-concern-data.mjs` |
| Test AI generation | `node scripts/test-prompt-generation.mjs` |
| Run unit tests | `npm run test` |
| Start API server | `npm run dev` |
| Test via web app | Open `http://localhost:5173` |

---

## 📞 **Still Having Issues?**

1. Run the diagnostic: `node scripts/check-concern-data.mjs`
2. Share the output
3. Share which route/method you used to test
4. Share the generated output

This will help identify whether the issue is:
- ✓ Source data (concerns missing measurements)
- ✓ Wrong route being tested
- ✓ Prompt not being followed
- ✓ Deployment/caching issue

