# Testing Prompt Strengthening Changes

This guide provides **three methods** to test the enhanced AI prompt system and validate that facts, measurements, and technical details are preserved.

---

## 🎯 What We're Testing

The prompt strengthening changes should ensure:

1. ✅ **Exact measurements preserved**: "12,600 m³ of cut, 2,400 m³ of fill, 7,000 m³ of soil export"
2. ✅ **Technical terms intact**: "steep batters", "retaining walls", "Regional Landscape and Rural Production Area"
3. ✅ **No hallucinations**: AI doesn't invent facts, statistics, or external research
4. ✅ **No aggressive summarization**: All concern content included in full
5. ✅ **Comprehensive coverage**: Uses full 2500-word limit for multiple concerns

---

## Method 1: Unit Tests (Fastest, No API Calls)

### **Run the Test Suite**

```bash
cd da-submission-manager/apps/api

# Run all tests
npm run test

# Or run just the prompt validation tests
npm run test src/services/prompt-validation.test.ts
```

### **What It Tests**
- ✅ Measurement preservation (mock mode)
- ✅ Technical terminology preservation
- ✅ Detection of hallucinated facts
- ✅ Sentence count fidelity
- ✅ Word limit compliance
- ✅ Multi-concern handling

### **Advantages**
- ⚡ Fast (no API calls)
- 💰 Free (no API usage)
- 🔄 Can run repeatedly during development

### **Limitations**
- Uses `generateSubmissionMock` (simplified concatenation)
- Doesn't test actual AI prompt following behavior

---

## Method 2: AI Generation Test Script (Comprehensive)

### **Setup**

Make sure your environment has API credentials:

```bash
# In da-submission-manager/apps/api/.env
OPENAI_ENABLED=true
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.05
OPENAI_MAX_TOKENS=4000
WORD_LIMIT=2500
```

### **Run the Test**

```bash
cd da-submission-manager/apps/api

# Run AI generation test
node scripts/test-prompt-generation.mjs
```

### **What It Tests**

The script generates a full submission with 7 Currumbin concerns and validates:

1. **Required Data Points** (must be present):
   - ✓ 12,600 m³
   - ✓ 2,400 m³
   - ✓ 7,000 m³
   - ✓ steep batters
   - ✓ retaining walls
   - ✓ Regional Landscape and Rural Production Area
   - ✓ Gold Coast City Plan
   - ✓ (and more...)

2. **Forbidden Phrases** (hallucination detection):
   - ✗ "substantial excavation" (without measurements)
   - ✗ "studies show" (external research)
   - ✗ "research indicates"
   - ✗ "experts suggest"

3. **Structural Integrity**:
   - Sentence count matches source (±tolerance)
   - Word count between 1000-2500 (comprehensive)
   - All 7 concerns represented

### **Output**

The script will:
- Print detailed validation results to console
- Save generated text to `test-output/test-generation-[timestamp].txt`
- Exit with code 0 (pass) or 1 (fail)

### **Example Output**

```
🧪 PROMPT STRENGTHENING TEST
============================================================

Test Configuration:
  - Word Limit: 2500
  - Temperature: 0.05
  - Max Tokens: 4000
  - Model: gpt-4o-mini
  - Provider: OpenAI
  - Test Concerns: 7

🤖 Generating submission with AI...

✓ Generation completed in 12.45s
  Provider: openai
  Model: gpt-4o-mini
  Temperature: 0.05
  Tokens: 1250 → 1850

💾 Output saved to: test-output/test-generation-1727812345678.txt

📊 VALIDATION RESULTS
============================================================

✓ Checking for required data preservation...
  ✓ 12,600 m³
  ✓ 2,400 m³
  ✓ 7,000 m³
  ✓ steep batters
  ✓ retaining walls
  ...

✓ Checking for hallucinations/generalizations...
  (no warnings)

✓ Checking for sentence count preservation...
  ✓ Sentence count: 45 (source had 42)

✓ Checking word count utilization...
  Word count: 1842 / 2500 (74%)

✓ Checking all concerns are represented...
  ✓ bulk_excavation
  ✓ seqrp_non_compliance
  ...

============================================================
📈 TEST SUMMARY

✓ Passed checks: 23
✗ Failed checks: 0
⚠ Warnings: 0

✅ TEST PASSED - Prompt strengthening is working correctly!
   All required data points preserved, no hallucinations detected.

📄 Review the full output at: test-output/test-generation-1727812345678.txt
============================================================
```

### **Advantages**
- 🎯 Tests actual AI behavior with real prompt
- 🔍 Comprehensive validation
- 💾 Saves output for manual review
- 📊 Detailed pass/fail reporting

### **Limitations**
- 💰 Uses API credits (small cost)
- ⏱️ Slower (~10-15 seconds per test)

---

## Method 3: Production-Like Test (Database + API)

Test with actual database concerns via the API endpoint.

### **Prerequisites**

1. API server running locally or on Railway
2. Database with concern templates loaded
3. Valid project and submission in database

### **Option A: Using curl**

```bash
# Create a test submission
curl -X POST http://localhost:3000/api/dev/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "applicant_first_name": "Test",
    "applicant_last_name": "Resident",
    "site_address": "940 Currumbin Creek Road",
    "application_number": "COM/2025/271"
  }'

# Response includes submission_id
# Use it to generate grounds

curl -X POST http://localhost:3000/api/generate/[submission_id] \
  -H "Content-Type: application/json"
```

### **Option B: Using the Web App**

1. Navigate to `http://localhost:5173` (web app)
2. Create a new submission
3. Select concerns from the survey
4. Click "Generate Submission"
5. Review the generated grounds

### **What to Check Manually**

Open the generated submission and verify:

1. **Measurements appear verbatim**:
   - [ ] "12,600 m³ of cut"
   - [ ] "2,400 m³ of fill"
   - [ ] "7,000 m³ of soil export"

2. **Technical terms preserved**:
   - [ ] "steep batters"
   - [ ] "extensive retaining walls"
   - [ ] Full planning code references

3. **All selected concerns present**:
   - [ ] Each concern appears as distinct section
   - [ ] Full content from each concern (not summarized)

4. **No hallucinated facts**:
   - [ ] No external research citations
   - [ ] No invented statistics
   - [ ] No generic replacements ("substantial" instead of measurements)

5. **Comprehensive coverage**:
   - [ ] Word count 1500-2500 for 7+ concerns
   - [ ] Introduction and conclusion present
   - [ ] Professional planning language

---

## 📊 Interpreting Results

### ✅ **GOOD Signs**

- All measurements appear exactly: "12,600 m³", not "approximately 12,000 m³"
- Technical terms intact: "Regional Landscape and Rural Production Area"
- Word count 1500-2500 for 7+ concerns (comprehensive)
- Each concern appears as separate section with full content
- No phrases like "studies show", "research indicates"

### ⚠️ **WARNING Signs**

- Word count < 1000 for 7 concerns (may be summarized)
- Measurements rounded or generalized: "substantial excavation"
- Concerns combined into fewer sections
- Generic language replacing specific terms

### ❌ **FAILURE Signs**

- Missing measurements entirely
- Phrases like "research shows" or "experts suggest" (hallucinated)
- Word count < 500 (severe over-summarization)
- Missing concerns entirely
- Invented facts not in source material

---

## 🔧 Troubleshooting

### **Test Script Fails to Run**

```bash
# Error: Cannot find module './llm.js'
# Solution: Build the TypeScript first
npm run build

# Error: OpenAI API key not found
# Solution: Check your .env file
cd da-submission-manager/apps/api
cat .env | grep OPENAI_API_KEY

# Error: EISDIR when importing
# Solution: Use .js extension in imports (already done in script)
```

### **Generated Output Lacks Detail**

If measurements are missing or content is summarized:

1. **Check environment variables** (Railway.app):
   ```
   WORD_LIMIT=2500 ✓
   OPENAI_MAX_TOKENS=4000 ✓
   OPENAI_TEMPERATURE=0.05 ✓
   ```

2. **Verify deployment** - Changes need to be deployed to take effect

3. **Check concern source data** - Database concerns should have full detail:
   ```sql
   SELECT key, body FROM concern_templates WHERE version='v1' LIMIT 3;
   ```

4. **Test temperature** - Try lowering further to 0.0 if still getting creative variation

### **API Generation Times Out**

- Increase timeout in environment: `OPENAI_TIMEOUT=60000` (60 seconds)
- Or reduce word limit temporarily: `WORD_LIMIT=1500`
- Check API key has sufficient quota

---

## 📈 Recommended Testing Workflow

### **During Development**

```bash
# 1. Make prompt changes
# 2. Run quick unit tests
npm run test src/services/prompt-validation.test.ts

# 3. If tests pass, run AI generation test
node scripts/test-prompt-generation.mjs

# 4. Review saved output manually
cat test-output/test-generation-*.txt | less
```

### **Before Deployment**

```bash
# Full test suite
npm run test

# AI generation test
node scripts/test-prompt-generation.mjs

# Manual review of output file
# Verify all test concerns have full content
```

### **After Deployment (Production)**

1. Create a test submission via web app
2. Select 7-10 concerns
3. Generate submission
4. Download/review the PDF
5. Verify measurements and data are preserved

---

## 🎓 Understanding the Tests

### **Why These Specific Checks?**

1. **Measurements** (`12,600 m³`): Most likely to be lost/generalized by AI
2. **Technical Terms**: AI might simplify professional language
3. **Sentence Count**: Detects aggressive summarization
4. **Hallucination Phrases**: AI's tendency to add external "knowledge"
5. **Word Count**: Ensures full word limit is utilized for comprehensiveness

### **What's a Reasonable Pass Rate?**

- **Unit tests**: Should be 100% pass (mock mode, deterministic)
- **AI generation tests**: 
  - 90-100% = Excellent (all data preserved)
  - 75-90% = Good (minor issues, acceptable)
  - 50-75% = Needs improvement (significant data loss)
  - <50% = Failing (prompt not working as intended)

---

## 📝 Test Checklist

Use this checklist when testing manually:

```
Test Submission: COM/2025/271 - 940 Currumbin Creek Road

Data Preservation:
[ ] 12,600 m³ of cut appears verbatim
[ ] 2,400 m³ of fill appears verbatim  
[ ] 7,000 m³ of soil export appears verbatim
[ ] "steep batters" phrase preserved
[ ] "extensive retaining walls" phrase preserved

Technical Terms:
[ ] Regional Landscape and Rural Production Area (full name)
[ ] Gold Coast City Plan
[ ] South East Queensland Regional Plan
[ ] Rural Zone Code
[ ] Strategic Framework

Comprehensiveness:
[ ] All 7 selected concerns appear
[ ] Each concern has its own section
[ ] Word count > 1500
[ ] Introduction paragraph present
[ ] Conclusion paragraph present

No Hallucinations:
[ ] No "studies show" or "research indicates"
[ ] No invented percentages or statistics
[ ] No external sources cited (except GCCP, SEQRP)
[ ] No measurements not in source material

Overall Quality:
[ ] Professional planning language
[ ] Logical flow between sections
[ ] Bold formatting on key terms
[ ] Proper Australian English spelling
```

---

## 🚀 Next Steps After Testing

### **If Tests Pass:**
1. ✅ Deploy to production (Railway.app)
2. ✅ Monitor first few real submissions
3. ✅ Document any edge cases found

### **If Tests Fail:**
1. Review the output file to identify patterns
2. Check environment variables are correct
3. Consider further prompt adjustments:
   - Add more specific examples
   - Strengthen anti-summarization language
   - Increase word limit if needed
4. Re-run tests after adjustments

---

## 📞 Support

If tests fail consistently or you need help interpreting results:
- Review the saved output files in `test-output/`
- Check the console for specific failed validation checks
- Verify your environment variables match recommended settings
- Ensure latest code is deployed (changes only active after deployment)


