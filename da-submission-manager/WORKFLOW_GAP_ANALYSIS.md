# Workflow Gap Analysis: Intended vs Current Implementation

## Executive Summary

**CRITICAL GAP IDENTIFIED:** The comprehensive template document is analyzed and converted to SHORT summaries, but those summaries are used for BOTH user selection AND AI generation. The full detailed text from the comprehensive template is **never retrieved or passed to the AI agent** during generation.

---

## Intended Workflow (As Described)

### Phase 1: Template Analysis & Codification
1. **Input:** Comprehensive document (e.g., `currumbin-original-grounds.md` - 186 lines, ~10KB)
2. **Process:** AI analysis extracts concerns with:
   - **Key:** `bulk_excavation` (for database lookup)
   - **Label:** "Excessive bulk excavation and earthworks" (for UI display)
   - **Summary:** Short 1-3 sentence summary (for user selection UI)
   - **Full Text:** Complete section from template with ALL measurements, code references, etc.
3. **Storage:** Database stores BOTH summary AND full text
4. **Purpose:** Summary for fast user scanning, full text for AI generation

### Phase 2: User Selection & Prioritization
1. User sees SHORT summaries in UI
2. User can:
   - Select which concerns matter to them
   - Re-order concerns by priority (drag & drop)
   - Fast-track (select all in default order)
3. User enters TWO text fields:
   - **Field 1:** "In your own words, describe your thoughts" (`user_style_sample`)
   - **Field 2:** "Add any additional grounds" (`custom_grounds`)

### Phase 3: Generation
1. **System retrieves:**
   - FULL TEXT for each selected concern (not the summary)
   - User's style sample
   - User's custom grounds
   - Prioritization order
2. **Prompt construction:**
   ```
   SELECTED_CONCERNS (in priority order):
   1. [CONCERN_KEY] - [FULL COMPREHENSIVE TEXT with measurements, codes, etc.]
   2. [CONCERN_KEY] - [FULL COMPREHENSIVE TEXT...]
   
   USER_STYLE_SAMPLE: [user's text from field 1]
   
   CUSTOM_GROUNDS: [user's text from field 2]
   ```
3. **AI generates** using full detailed source material

---

## Current Implementation (Actual)

### Phase 1: Template Analysis (PARTIALLY CORRECT)
**File:** `apps/api/src/services/aiGrounds.ts` lines 10-41

```typescript
export async function extractConcernsFromText(groundsText: string): Promise<ExtractedConcern[]> {
  const system = `You extract a concise list of concerns from a "Grounds for Submission" document.
  Rules:
  - Output JSON only: {"concerns":[{"key":"...","label":"...","body":"..."}, ...]}
  - 5–15 items. key: lowercase snake_case; label: short title; 
    body: 1–3 sentences concise, factual.  // <-- PROBLEM: Only extracts summary
  - Do not invent content. Only summarise from the provided text.`;
}
```

**What it extracts:**
```json
{
  "key": "bulk_excavation_and_earthworks",
  "label": "Bulk Excavation and Earthworks",
  "body": "The extensive earthworks required for the development will lead to significant construction impacts and long-term visual scarring of the rural landscape." 
  // <-- SHORT SUMMARY ONLY, no measurements
}
```

**What it SHOULD extract:**
```json
{
  "key": "bulk_excavation_and_earthworks",
  "label": "Bulk Excavation and Earthworks",
  "summary": "The extensive earthworks required...",  // For UI
  "full_text": "The design requires approximately 12,600 m³ of cut, 2,400 m³ of fill, and 7,000 m³ of soil to be exported off-site, with steep batters as tight as 1:1 and extensive retaining walls. This scale of earthworks significantly increases construction impacts, truck movements, and long-term visual scarring of the rural landscape. The proposed infrastructure is inadequate to support the development: With only 13 spaces for 25 staff, this violates the GCCC Transport Code 2016 (PO25/AO25.1, Condition 9.4.13-3)..." // Full section text for AI
}
```

**Database Schema - MISSING FIELD:**

Current schema (`0002_ai.sql`):
```sql
CREATE TABLE concern_templates (
  id UUID PRIMARY KEY,
  version TEXT NOT NULL DEFAULT 'v1',
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  body TEXT NOT NULL,          -- Currently stores SHORT summary
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  track TEXT,                  -- Added in 0021
  metadata JSONB,              -- Added in 0021
  UNIQUE (version, key)
);
```

**Missing:**
- `summary TEXT` - For UI display (what's currently in `body`)
- `full_text TEXT` - For AI generation (complete section from template)

OR alternatively:
- `body_display TEXT` - For UI
- `body_generation TEXT` - For AI

### Phase 2: User Selection (CORRECT)
**File:** `apps/web/src/pages/SubmissionForm.tsx` lines 1000-1164

✅ **Working correctly:**
- Displays concern labels and summaries
- Allows selection via checkboxes
- Drag & drop prioritization (lines 1035-1134)
- Two text entry fields:
  - `user_style_sample` (line 1146, required)
  - `custom_grounds` (line 1159, optional)

### Phase 3: Generation (BROKEN - USES SUMMARIES, NOT FULL TEXT)
**File:** `apps/api/src/routes/generate.ts` lines 84-104

```typescript
// Load concern bodies for selected keys
let concerns: Array<{ key: string; body: string }> = [];
const { data: cData, error: cErr } = await supabase
  .from('concern_templates')
  .select('key,body,is_active,version')  // <-- Only loads 'body' field
  .eq('version', version)
  .in('key', selectedKeys)
  .eq('is_active', true);

const concernMap = new Map(cData.map((r: any) => [r.key, r.body]));
concerns = selectedKeys
  .filter((k) => concernMap.has(k))
  .map((k) => ({ key: k, body: concernMap.get(k)! }));
```

**Problem:** Loads `body` which contains SHORT SUMMARY, not full text.

**What gets sent to AI** (`apps/api/src/services/llm.ts` lines 240-245):
```typescript
const user = userTpl({
  ...args.meta,
  approved_facts: args.approvedFacts,      // 9 lines from facts.v1.md
  selected_concerns: args.selectedConcerns, // SHORT SUMMARIES (200-300 chars)
  user_style_sample: args.styleSample,     // User's text ✓
  // custom_grounds NOT PASSED! ✗
});
```

**Additional Problem:** `custom_grounds` is saved to database but NOT passed to AI!

**Checking if custom_grounds is used:**
```bash
grep -n "custom_grounds" apps/api/src/routes/generate.ts
# Result: custom_grounds is in survey table but never loaded or used!
```

---

## Gap Analysis Table

| Workflow Step | Intended | Current | Status |
|--------------|----------|---------|--------|
| **Extract concerns from template** | Extract key, label, summary (UI), full_text (AI) | Extract key, label, body (summary only) | ❌ Missing full_text |
| **Store in database** | Store both summary and full_text | Store only body (summary) | ❌ Missing field |
| **Display to user** | Show summary | Show body (summary) | ✅ Works |
| **User prioritization** | Drag & drop ordering | Drag & drop ordering | ✅ Works |
| **User text field 1** | user_style_sample captured | user_style_sample captured | ✅ Works |
| **User text field 2** | custom_grounds captured | custom_grounds captured | ✅ Works |
| **Retrieve for generation** | Load full_text for each concern | Load body (summary) | ❌ Wrong field |
| **Pass user_style_sample to AI** | Included in prompt | Included in prompt | ✅ Works |
| **Pass custom_grounds to AI** | Included in prompt | NOT included in prompt | ❌ Missing |
| **AI receives comprehensive data** | Full template sections | Short summaries | ❌ Insufficient data |

---

## Evidence of the Problem

### Database Reality Check
Running query on current database shows:

```
concern: bulk_excavation_and_earthworks
body length: 263 chars
body content: "The extensive earthworks required for the development will lead to 
               significant construction impacts and long-term visual scarring..."
```

### Original Template Contains (currumbin-original-grounds.md lines 131-142)
```markdown
**4.3. Bulk Excavation and Earthworks**

The design requires approximately **12,600 m³ of cut, 2,400 m³ of fill, and 
7,000 m³ of soil to be exported off-site**, with steep batters as tight as 1:1 
and extensive retaining walls. This scale of earthworks significantly increases 
construction impacts, truck movements, and long-term visual scarring of the rural 
landscape.
```

**Character count:** ~550 chars (more than 2x what's in database)
**Data points lost:**
- Specific measurements: 12,600 m³, 2,400 m³, 7,000 m³
- Technical details: "1:1 batters", "retaining walls"
- Impact specifics: "truck movements", "visual scarring"

### Generation Output Problem
When AI receives:
> "The extensive earthworks required for the development will lead to significant 
> construction impacts..."

AI CANNOT output:
> "The design requires approximately 12,600 m³ of cut, 2,400 m³ of fill..."

Because that data was never provided!

---

## Implementation Plan

### Required Changes

#### 1. Database Schema Update
**File:** New migration `0028_concern_full_text.sql`

```sql
-- Add full_text column for comprehensive content used by AI
ALTER TABLE concern_templates
  ADD COLUMN IF NOT EXISTS full_text TEXT;

-- Rename body to summary for clarity (optional, backward compatible approach)
COMMENT ON COLUMN concern_templates.body IS 
  'Short summary (1-3 sentences) displayed in user selection UI';
COMMENT ON COLUMN concern_templates.full_text IS 
  'Complete text from comprehensive template, passed to AI for generation. 
   May contain multiple paragraphs, measurements, code references, etc.';

-- For backward compatibility, full_text can be NULL and system will fall back to body
```

**Alternative approach (requires more refactoring):**
```sql
-- Rename fields for clarity
ALTER TABLE concern_templates 
  RENAME COLUMN body TO body_summary;
ALTER TABLE concern_templates 
  ADD COLUMN body_full_text TEXT;
```

#### 2. Extraction Logic Update
**File:** `apps/api/src/services/aiGrounds.ts`

**Current:**
```typescript
const system = `You extract a concise list of concerns...
- body: 1–3 sentences concise, factual.`;
```

**Should be:**
```typescript
export type ExtractedConcern = {
  key: string;
  label: string;
  summary: string;      // NEW: 1-3 sentences for UI
  full_text: string;    // NEW: Complete section text for AI
  priority?: number;
  category?: string;
};

const system = `You extract concerns from a "Grounds for Submission" document.

For each concern, provide:
1. key: lowercase_snake_case identifier
2. label: Short title (5-10 words)
3. summary: 1-3 sentence summary for user selection interface
4. full_text: COMPLETE text from the original section including:
   - ALL specific measurements, quantities, statistics
   - ALL planning code references and section numbers
   - ALL technical terms and standards references
   - EVERY fact and argument from that concern's section
   - Preserve formatting, lists, sub-sections

CRITICAL: full_text must be COMPREHENSIVE, not summarized. Include everything 
from the source document that relates to this concern.`;
```

#### 3. Template Analysis Method Update
**File:** `apps/api/src/services/documentAnalysis.ts`

Add logic to:
1. First identify concern boundaries in the document
2. Extract full section text between headings
3. Create summary from full text
4. Store both

**Approach:** Use heading markers and section structure:
```typescript
async analyzeGroundsTemplate(googleDocId: string): Promise<DocumentAnalysisResult> {
  // 1. Get full document text
  const documentText = await this.googleDocs.exportToText(googleDocId);
  
  // 2. Ask AI to identify sections and create structured extraction
  const analysis = await this.performStructuredAnalysis(documentText);
  
  // 3. For each concern, extract FULL section text (not summary)
  const concerns = analysis.concerns.map(c => ({
    ...c,
    full_text: this.extractSectionText(documentText, c.section_markers),
    summary: c.summary || this.createSummary(c.full_text)
  }));
  
  return { extractedConcerns: concerns, ... };
}
```

#### 4. Database Storage Update
**File:** `apps/api/src/routes/templates.ts`

When saving analyzed concerns:
```typescript
const { data, error } = await supabase
  .from('concern_templates')
  .upsert(concernTemplates.map(template => ({
    version: template.version,
    key: template.key,
    label: template.label,
    body: template.summary,        // UI display
    full_text: template.full_text, // AI generation
    is_active: template.is_active,
    metadata: template.metadata
  })), {
    onConflict: 'version,key'
  });
```

#### 5. Generation Retrieval Update
**File:** `apps/api/src/routes/generate.ts` lines 84-104

**Current:**
```typescript
const { data: cData, error: cErr } = await supabase
  .from('concern_templates')
  .select('key,body,is_active,version')
  .eq('version', version)
  .in('key', selectedKeys)
  .eq('is_active', true);
```

**Should be:**
```typescript
const { data: cData, error: cErr } = await supabase
  .from('concern_templates')
  .select('key,body,full_text,is_active,version')  // Add full_text
  .eq('version', version)
  .in('key', selectedKeys)
  .eq('is_active', true);

// Use full_text if available, fall back to body for backward compatibility
const concernMap = new Map(
  cData.map((r: any) => [r.key, r.full_text || r.body])
);
```

#### 6. Add custom_grounds to AI Prompt
**File:** `apps/api/src/routes/generate.ts` lines 152-158

**Current:**
```typescript
const gen = enabled
  ? await generateSubmission({
      meta,
      approvedFacts,
      selectedConcerns: concerns,
      styleSample: survey.user_style_sample || '',
      customGrounds: survey.custom_grounds || '',  // Passed but ignored!
      allowedLinks
    })
```

**File:** `apps/api/src/services/llm.ts` lines 234-246

**Current prompt template usage:**
```typescript
const user = userTpl({
  ...args.meta,
  approved_facts: args.approvedFacts,
  selected_concerns: args.selectedConcerns,
  user_style_sample: args.styleSample
  // customGrounds NOT included!
});
```

**Should be:**
```typescript
const user = userTpl({
  ...args.meta,
  approved_facts: args.approvedFacts,
  selected_concerns: args.selectedConcerns,
  user_style_sample: args.styleSample,
  custom_grounds: args.customGrounds || ''  // ADD THIS
});
```

**File:** `packages/prompts/submission.user.hbs` - Add custom_grounds section

**Current (lines 18-20):**
```handlebars
USER_STYLE_SAMPLE:
{{{user_style_sample}}}

---
```

**Should be:**
```handlebars
USER_STYLE_SAMPLE:
{{{user_style_sample}}}

CUSTOM_GROUNDS (user-provided additional concerns):
{{{custom_grounds}}}

---
```

**File:** `packages/prompts/submission.system.txt` - Document custom_grounds usage

Add to instructions:
```
If CUSTOM_GROUNDS is provided:
- Include this user-provided text as an additional section
- Do NOT modify or rephrase user's custom concerns
- Place after all SELECTED_CONCERNS but before conclusion
- Treat with same fidelity as SELECTED_CONCERNS
```

---

## Testing & Validation Plan

### Test 1: Verify Full Text Extraction
```javascript
// After implementing extraction updates
const result = await documentAnalysis.analyzeGroundsTemplate(docId);
const bulkExcavation = result.extractedConcerns.find(c => 
  c.key.includes('bulk_excavation')
);

assert(bulkExcavation.summary.length < 500, 'Summary should be brief');
assert(bulkExcavation.full_text.length > 500, 'Full text should be comprehensive');
assert(bulkExcavation.full_text.includes('12,600'), 'Must include measurements');
assert(bulkExcavation.full_text.includes('m³'), 'Must include units');
```

### Test 2: Verify Database Storage
```sql
SELECT 
  key,
  label,
  LENGTH(body) as summary_length,
  LENGTH(full_text) as full_text_length,
  full_text LIKE '%12,600%' as has_measurements
FROM concern_templates
WHERE key = 'bulk_excavation_and_earthworks';

-- Expected:
-- summary_length: 200-400
-- full_text_length: 500-2000
-- has_measurements: true
```

### Test 3: Verify Generation Receives Full Text
Add logging to `generate.ts`:
```typescript
console.log('=== CONCERNS SENT TO AI ===');
concerns.forEach(c => {
  console.log(`${c.key}: ${c.body.length} chars`);
  console.log(`Has measurements: ${/\d+,?\d*\s*m³/.test(c.body)}`);
  console.log(`Preview: ${c.body.substring(0, 200)}...`);
});
```

### Test 4: Verify custom_grounds Reaches AI
```typescript
// In llm.ts after prompt construction
console.log('=== USER PROMPT ===');
console.log('Has custom_grounds:', user.includes('CUSTOM_GROUNDS'));
console.log('Custom grounds preview:', 
  user.match(/CUSTOM_GROUNDS:[\s\S]{0,200}/)?.[0]);
```

### Test 5: End-to-End Generation Test
```javascript
// Create test submission with:
// 1. Select bulk_excavation concern
// 2. Add custom_grounds: "I am concerned about drainage impacts."
// 3. Generate

// Verify output includes:
assert(output.includes('12,600 m³'), 'Should include measurements from full_text');
assert(output.includes('drainage impacts'), 'Should include custom_grounds');
```

---

## Migration Strategy

### Phase 1: Add Schema (Non-Breaking)
- Add `full_text` column (nullable)
- Existing `body` continues to work
- No code changes yet

### Phase 2: Backfill Data (Manual/Scripted)
- For Currumbin project: manually populate `full_text` from `currumbin-original-grounds.md`
- Extract sections 1.1-1.2 → `strategic_framework_non_compliance.full_text`
- Extract section 3 → `traffic_and_parking_issues.full_text`
- Extract section 4.3 → `bulk_excavation_and_earthworks.full_text`
- etc.

### Phase 3: Update Code
- Modify extraction logic
- Update retrieval queries
- Add custom_grounds to prompt
- Update prompt template

### Phase 4: Test & Validate
- Run test suite
- Generate sample submissions
- Compare output quality

### Phase 5: Deploy
- Deploy schema changes
- Deploy code changes
- Monitor generation quality

---

## Success Metrics

### Before Implementation
- Generated submissions lack specific data (measurements, codes)
- AI output is generic and vague
- custom_grounds ignored

### After Implementation
- Generated submissions include all measurements verbatim
- Planning code references present (GCCC Transport Code 2016, AS2890.3.2015)
- Specific quantities appear (12,600 m³, 2,400 m³, etc.)
- User's custom_grounds integrated into output
- Output matches tone and detail level of original comprehensive template

---

## File Changes Summary

### New Files:
- `packages/db/migrations/0028_concern_full_text.sql`

### Modified Files:
- `apps/api/src/services/aiGrounds.ts` (extraction logic)
- `apps/api/src/services/documentAnalysis.ts` (analysis method)
- `apps/api/src/routes/templates.ts` (storage)
- `apps/api/src/routes/generate.ts` (retrieval)
- `apps/api/src/services/llm.ts` (prompt construction)
- `packages/prompts/submission.user.hbs` (add custom_grounds)
- `packages/prompts/submission.system.txt` (document custom_grounds usage)

### No Changes Needed:
- `apps/web/src/pages/SubmissionForm.tsx` (UI already correct)
- Database survey storage (already captures both fields)

---

## Risks & Mitigation

### Risk 1: Token Limit Exceeded
**Issue:** Full text for 10+ concerns might exceed AI context window
**Mitigation:** 
- Set reasonable limits (max 10 concerns, or 8000 tokens total)
- Truncate gracefully if needed
- Use gpt-4o (128K context) instead of gpt-4o-mini if budget allows

### Risk 2: Backward Compatibility
**Issue:** Existing concerns only have `body`, not `full_text`
**Mitigation:**
- Make `full_text` nullable
- Fall back to `body` if `full_text` is null
- Gradually backfill over time

### Risk 3: Extraction Quality
**Issue:** AI might still summarize instead of extracting full sections
**Mitigation:**
- Clear prompts emphasizing "COMPLETE text, do not summarize"
- Validate extraction output (check length, presence of measurements)
- Manual review and correction for first few projects

### Risk 4: Storage Size
**Issue:** full_text could be 10x larger than body
**Mitigation:**
- TEXT column can handle it (up to 1GB in PostgreSQL)
- Monitor database size
- Consider compression if needed (unlikely)

---

## Conclusion

The current system has a **fundamental architectural gap**: it extracts summaries but uses those summaries for generation, losing all the detailed data. The intended workflow requires storing and using the full comprehensive text from the template.

**Key Changes Required:**
1. ✅ Add `full_text` column to `concern_templates`
2. ✅ Update extraction to capture full sections (not summaries)
3. ✅ Update retrieval to use `full_text` for generation
4. ✅ Pass `custom_grounds` to AI (currently captured but ignored)
5. ✅ Update prompts to handle both full_text and custom_grounds

**Estimated Effort:**
- Database migration: 1 hour
- Extraction logic update: 4 hours
- Generation retrieval update: 2 hours
- Prompt updates: 1 hour
- Testing & validation: 4 hours
- **Total: ~12 hours**

**Priority: HIGH** - This is a critical gap preventing the system from generating high-quality, specific submissions.

