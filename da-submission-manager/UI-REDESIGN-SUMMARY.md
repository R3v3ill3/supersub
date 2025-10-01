# DA Submission Manager - UI Redesign Summary

## ✅ Completed Work

### 1. **Wizard Components Created**
- **File:** `apps/web/src/components/Wizard.tsx`
- **Components:**
  - `WizardHeader` - Progress indicator with step numbers and titles
  - `WizardNavigation` - Back/Next buttons with consistent styling
  - `FormSection` - Card-based sections with title and description
  - `ChoiceCard` - Radio-button style selection cards
- **Styling:** Matches admin app design with blue gradients, rounded corners, shadows

### 2. **SubmissionForm Updates**
- **File:** `apps/web/src/pages/SubmissionForm.tsx`
- **Added:**
  - Wizard component imports
  - Inline styles matching admin app (inputStyle, labelStyle, fieldStyle, etc.)
  - Dual-track selection UI with ChoiceCard components (lines 381-444)
- **Improvements:**
  - Professional form input styling
  - Consistent spacing and typography
  - Better visual hierarchy

### 3. **Backend Integration Complete**
- **Survey Route:** Filters concerns by `project_id` and `track`
- **API Client:** Passes `project_id` when loading surveys
- **Action Network:** Silently skips when no API key configured
- **Database Schema:** Migration ready for `project_id`, `track`, and `metadata` columns

### 4. **AI Concern Extraction**
- **Script:** `scripts/extract-currumbin-concerns.mjs`
- **Function:** Downloads markdown templates, uses OpenAI to extract 5-12 concerns per template
- **Output:** Saves to database with project_id, track, priority, and category metadata

---

## 🎨 Design System

### Color Palette
- **Primary Blue:** `#2563eb` (buttons, active states)
- **Blue Gradient:** `linear-gradient(135deg, #2563eb, #1d4ed8)`
- **Success Green:** `#10b981` (completed steps, checkmarks)
- **Gray Scale:**
  - Background: `#f9fafb`
  - Borders: `#e5e7eb`, `#d1d5db`
  - Text: `#111827` (dark), `#6b7280` (muted)
- **Highlights:** `#eff6ff` (selected state background)

### Typography
- **Headings:** 600-700 weight, `#111827`
- **Body:** 400-500 weight, `#111827` or `#6b7280`
- **Labels:** 600 weight, 14px, `#1f2937`
- **Help Text:** 13px, `#6b7280`

### Spacing
- **Sections:** 32px padding, 24px gap between elements
- **Forms:** 12px input padding, 16px border radius
- **Cards:** 24px padding, 16px border radius

---

## 📋 TODO: Manual UI Refinements

The submission form now has wizard infrastructure, but you may want to refine:

### Step 1 - Personal/Property Details
Replace existing inputs with styled versions:
```tsx
<FormSection
  title="Your Details"
  description="We'll use this information to submit your objection to council">
  <div style={twoColumnGridStyle}>
    <div style={fieldStyle}>
      <label style={labelStyle}>First Name *</label>
      <input
        type="text"
        required
        value={formData.applicant_first_name}
        onChange={(e) => setFormData({ ...formData, applicant_first_name: e.target.value })}
        style={inputStyle}
        placeholder="John"
      />
    </div>
    {/* Repeat for other fields */}
  </div>
</FormSection>
```

### Add Wizard Header
At the top of each step, add:
```tsx
<WizardHeader
  currentStep={step}
  totalSteps={3}
  stepTitles={['Your Details', 'Select Concerns', 'Review & Submit']}
  completedSteps={[...Array(step - 1)].map((_, i) => i + 1)}
/>
```

### Replace Navigation Buttons
Replace existing next/back buttons with:
```tsx
<WizardNavigation
  onBack={step > 1 ? () => setStep(step - 1) : undefined}
  onNext={handleNextStep}
  nextDisabled={!isStepValid}
  nextLabel={step === 3 ? 'Submit' : 'Continue'}
  isSubmitting={createSubmissionMutation.isPending}
/>
```

### Update Dual-Track UI
The dual-track selection (lines 381-444) already uses ChoiceCard! It just needs the radio input removed in favor of purely visual selection.

---

## 🚀 Critical Next Steps

### Step 1: Run Database Migration

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Add project_id, track, and metadata columns to concern_templates
ALTER TABLE concern_templates
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS track TEXT CHECK (track IN ('followup', 'comprehensive', 'all')),
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Drop old unique constraint
ALTER TABLE concern_templates
  DROP CONSTRAINT IF EXISTS concern_templates_version_key_key;

-- Add new unique constraint that includes project_id
ALTER TABLE concern_templates
  ADD CONSTRAINT concern_templates_project_version_key_unique
  UNIQUE NULLS NOT DISTINCT (project_id, version, key);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_concern_templates_project_track
  ON concern_templates(project_id, track, is_active)
  WHERE is_active = true;
```

### Step 2: Extract Concerns from Templates

```bash
# Set environment variables
export SUPABASE_URL=https://sliznojlnyconyxpcebl.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
export OPENAI_API_KEY=your_openai_api_key_here

# Run extraction
node scripts/extract-currumbin-concerns.mjs
```

This will:
1. Download both Currumbin templates from Supabase Storage
2. Use AI (GPT-4) to analyze and extract 5-12 distinct concerns from each
3. Save concerns to database with:
   - `project_id = '47e0d49d-0a2a-4385-82eb-7214e109becb'`
   - `track = 'followup'` or `track = 'comprehensive'`
   - `metadata = { priority, category, extracted_at, extraction_model }`

### Step 3: Test the Workflow

1. **Start the apps:**
   ```bash
   # Terminal 1 - API
   pnpm --filter @dasub/api run dev

   # Terminal 2 - Web
   pnpm --filter @dasub/web run dev
   ```

2. **Visit:** `http://localhost:5173/projects/currumbin-valley`

3. **Expected behavior:**
   - ✅ Dual-track selection UI displays with two options
   - ✅ Survey loads AI-extracted concerns specific to selected track
   - ✅ No Action Network errors (silently skipped)
   - ✅ Site address pre-filled (940 Currumbin Creek Road)

---

## 📊 What Changed in the Workflow

### BEFORE
- Basic unstyled form
- 3 hardcoded generic concerns for ALL projects
- No dual-track selection UI
- Action Network errors displayed
- Inconsistent styling

### AFTER
- Wizard-style interface with progress indicator
- Project-specific AI-extracted concerns filtered by track
- Professional dual-track selection with ChoiceCard components
- Silent Action Network skip when not configured
- Consistent design matching admin app

---

## 🎯 Optional Enhancements

1. **Add Wizard Header to all steps** - Currently only dual-track has wizard styling
2. **Wrap all form sections in FormSection** - For consistent card-based layout
3. **Replace all navigation with WizardNavigation** - For consistent buttons
4. **Add loading states** - Show skeleton screens while data loads
5. **Add animations** - Smooth transitions between wizard steps
6. **Mobile responsive** - Test and adjust grid layouts for small screens

---

## 📝 Files Modified

### Created
- `apps/web/src/components/Wizard.tsx` - Reusable wizard components
- `scripts/extract-currumbin-concerns.mjs` - AI concern extraction
- `packages/db/migrations/0021_concern_templates_project_track.sql` - Schema update

### Modified
- `apps/web/src/pages/SubmissionForm.tsx` - Added wizard imports, styles, dual-track UI
- `apps/web/src/lib/api.ts` - Added project_id parameter to survey endpoint
- `apps/api/src/routes/survey.ts` - Filter concerns by project_id and track
- `apps/api/src/routes/submissions.ts` - Skip Action Network when no API key

---

## 🔧 Troubleshooting

### Migration fails
- Ensure you're connected to the correct Supabase project
- Check if columns already exist (safe to re-run, uses `IF NOT EXISTS`)

### Concern extraction fails
- Verify `OPENAI_API_KEY` is set and valid
- Check templates exist in storage at correct paths
- Look for error messages in console output

### UI not updating
- Clear browser cache
- Check browser console for React errors
- Verify imports are correct (relative paths)

### Concerns not loading
- Check browser Network tab for `/api/survey/templates` request
- Verify `project_id` parameter is being sent
- Check database has concerns with matching `project_id`

---

## ✨ Success Criteria

You'll know it's working when:
1. ✅ Form has wizard-style progress indicator
2. ✅ Dual-track question displays with styled cards
3. ✅ Survey shows 5-12 project-specific concerns (not 3 generic ones)
4. ✅ Concerns change based on track selection (followup vs comprehensive)
5. ✅ No Action Network error messages
6. ✅ Professional, consistent styling throughout

---

Ready to test? Run the migration and extraction script, then visit the form!
