# AI Prompt Source Material Analysis - Complete Trace

## Issue Discovered

The AI agent is **NOT receiving the comprehensive template text** from `currumbin-original-grounds.md`. Instead, it's receiving **summarized concern bodies** from the database, and there are **duplicate/conflicting concerns** with different levels of detail.

## Step-by-Step Flow Trace

### Step 1: Database Seeding (MULTIPLE SOURCES)

The `concern_templates` table has been populated from **three different sources**:

#### Source A: Generic concerns from `concerns.v1.json`
```json
{
  "key": "traffic_safety",
  "label": "Traffic safety and pedestrian access",
  "body": "Increased vehicle movements near the site will affect pedestrian safety..."
}
```
- Seeded by: `apps/api/scripts/seed-concerns.mjs`
- Character count: Very short (generic placeholders)

#### Source B: Detailed concerns from `setup-currumbin-project.mjs`
```javascript
{
  key: 'bulk_excavation',
  label: 'Excessive bulk excavation and earthworks',
  body: 'Approximately 12,600 m³ of cut, 2,400 m³ of fill, and 7,000 m³ of soil export...',
}
```
- Seeded by: `scripts/setup-currumbin-project.mjs`
- Character count: ~200 chars (contains specific measurements)
- Has specific data: ✓

#### Source C: AI-extracted concerns from Admin UI
```javascript
{
  key: 'bulk_excavation_and_earthworks',
  label: 'Bulk Excavation and Earthworks',
  body: 'The extensive earthworks required for the development will lead to...',
  track: 'comprehensive'
}
```
- Seeded by: Admin UI template analysis feature
- Character count: ~260 chars (summarized, no specific measurements)
- Has specific data: ✗

### Step 2: User Survey Selection

When users visit the web app, they see the survey at `/api/survey/templates`:

**Query:**
```sql
SELECT * FROM concern_templates 
WHERE version = 'v1' 
  AND is_active = true
  AND (track IS NULL OR track = 'all' OR track = 'comprehensive')
```

**Result:** 12 concerns are shown, including BOTH:
- `bulk_excavation` (has measurements ✓)
- `bulk_excavation_and_earthworks` (no measurements ✗)

**Problem:** Users might select the generic version without realizing there's a detailed version.

### Step 3: Generation Request

User clicks "Generate Submission" → POST to `/api/generate/:submissionId`

**Code path:** `apps/api/src/routes/generate.ts` lines 84-104

```typescript
const { data: cData, error: cErr } = await supabase
  .from('concern_templates')
  .select('key,body,is_active,version')
  .eq('version', version)
  .in('key', selectedKeys)  // <- User's selected concern keys
  .eq('is_active', true);

const concernMap = new Map(cData.map((r: any) => [r.key, r.body]));
concerns = selectedKeys
  .filter((k) => concernMap.has(k))
  .map((k) => ({ key: k, body: concernMap.get(k)! }));
```

**What gets loaded:**
- ONLY the `body` field from the selected concerns
- NOT the full comprehensive template
- NOT the original `currumbin-original-grounds.md` content

### Step 4: Prompt Construction

**Code path:** `apps/api/src/services/llm.ts` lines 234-246

```typescript
const userTpl = Handlebars.compile(userTplStr, { noEscape: true });
const user = userTpl({
  ...args.meta,
  approved_facts: args.approvedFacts,      // From facts.v1.md (9 lines)
  selected_concerns: args.selectedConcerns, // From database concern_templates.body
  user_style_sample: args.styleSample
});
```

**What gets sent to AI:**

1. **APPROVED_FACTS** (from `facts.v1.md`):
   - 9 lines of generic guidance
   - No specific project details
   
2. **SELECTED_CONCERNS** (from database):
   ```
   - KEY: bulk_excavation_and_earthworks
     BODY: The extensive earthworks required for the development will lead to 
           significant construction impacts and long-term visual scarring...
           (NO SPECIFIC MEASUREMENTS)
   ```
   
3. **USER_STYLE_SAMPLE**: User's writing sample

4. **METADATA**: Site address, DA number, etc.

### Step 5: AI Response

The AI can ONLY use what's in the prompt. If the concern body says:

> "The extensive earthworks required for the development will lead to significant construction impacts..."

Then the AI CANNOT add:

> "Approximately 12,600 m³ of cut, 2,400 m³ of fill, and 7,000 m³ of soil export"

Because that data was NEVER provided to the AI.

## Current Database State

**Comprehensive Track Concerns (12 total):**

| Key | Has Specific Data? | Body Length |
|-----|-------------------|-------------|
| planning_non_compliance | ✗ | 217 chars |
| traffic_safety | ✗ | 213 chars |
| amenity_environmental | ✗ | 183 chars |
| **bulk_excavation** | **✓ (12,600 m³)** | **199 chars** |
| community_need | ✗ | 168 chars |
| strategic_framework_non_compliance | ✗ | 292 chars |
| rural_zone_code_non_compliance | ✗ | 291 chars |
| seqrp_non_compliance | ✗ | 281 chars |
| traffic_and_parking_issues | ✗ | 281 chars |
| amenity_and_environmental_concerns | ✗ | 287 chars |
| **bulk_excavation_and_earthworks** | **✗ (duplicate, generic)** | **263 chars** |
| community_needs_and_infrastructure | ✗ | 328 chars |

**Finding:** Only 1 out of 12 concerns has the specific measurements from the original template.

## What's Missing

The system is **NOT** using the full comprehensive template (`currumbin-original-grounds.md` - 186 lines) as source material. That document contains:

- Detailed planning code references
- Specific measurements (12,600 m³, 2,400 m³, 7,000 m³)
- Australian Standards references (AS2890.3.2015)
- Specific section numbers (Part 3, Section 3.7.2.1)
- Gold Coast City Plan Strategic Framework Map references
- Detailed traffic analysis
- Comprehensive environmental impact data

**None of this detail is being passed to the AI.**

## Solution Options

### Option 1: Use Full Template as APPROVED_FACTS
Replace `facts.v1.md` (9 lines) with the full `currumbin-original-grounds.md` (186 lines) for the Currumbin project.

**Pros:** AI has access to all specific data
**Cons:** Very long prompt, expensive, might hit token limits

### Option 2: Enhance Concern Bodies
Update the concern bodies in the database to include ALL specific measurements and references from each section of the comprehensive template.

**Current:**
```
"The extensive earthworks required for the development will lead to significant construction impacts..."
```

**Enhanced:**
```
"The design requires approximately 12,600 m³ of cut, 2,400 m³ of fill, and 7,000 m³ of soil to be exported off-site, with steep batters as tight as 1:1 and extensive retaining walls. This scale of earthworks significantly increases construction impacts, truck movements, and long-term visual scarring of the rural landscape."
```

**Pros:** Maintains current architecture, surgical fix
**Cons:** Need to update all concern bodies

### Option 3: Hybrid Approach
- Keep short concern summaries for survey selection
- Store full detailed bodies in a separate field (`body_detailed`)
- Pass `body_detailed` to AI during generation

**Pros:** Best of both worlds
**Cons:** Requires schema change

### Option 4: Project-Specific Facts File
Create `facts.currumbin.md` or `facts.v1.currumbin.md` that contains the comprehensive template content, and load it based on project_id.

**Pros:** Clean separation, maintainable
**Cons:** Need to refactor facts loading logic

## Recommended Solution

**Option 2 + 4 Combined:**

1. **Immediate fix:** Update existing concern bodies with specific data
2. **Long-term:** Implement project-specific facts files

**Implementation:**
```sql
-- Update bulk_excavation_and_earthworks to include measurements
UPDATE concern_templates 
SET body = 'The revised design requires approximately 12,600 m³ of cut, 2,400 m³ of fill, and 7,000 m³ of soil to be exported off-site, with steep batters (1:1) and extensive retaining walls. This scale far exceeds the original proposal and will cause significant construction impacts, truck movements, and permanent visual scarring. Council has previously indicated that retaining structures within the public road reserve are not supported, yet the application relies heavily on such works.'
WHERE key = 'bulk_excavation_and_earthworks' AND version = 'v1';

-- Deactivate duplicate
UPDATE concern_templates 
SET is_active = false
WHERE key = 'bulk_excavation' AND track IS NULL AND version = 'v1';
```

## Verification Script

To verify what's actually being sent to the AI for a specific submission:

```javascript
// Add logging to apps/api/src/services/llm.ts line 246
console.log('=== PROMPT SENT TO AI ===');
console.log('SELECTED_CONCERNS:');
args.selectedConcerns.forEach(c => {
  console.log(`  ${c.key}:`, c.body);
});
console.log('APPROVED_FACTS:', args.approvedFacts.substring(0, 200));
console.log('========================');
```

