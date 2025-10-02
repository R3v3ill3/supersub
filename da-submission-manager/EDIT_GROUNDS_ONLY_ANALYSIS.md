# Analysis: Restricting Editing to Grounds Content Only

## Executive Summary

**Current Issue**: Users can edit the entire formatted submission document, including protected legal declarations and metadata.

**Recommended Solution**: Split content approach - user edits only the grounds text, preview shows full formatted document.

**Impact**: ✅ No breaking changes to PDF generation, email workflow, or database. Minimal frontend changes.

**Feasibility**: ✅ **High** - The system is already architected for this pattern.

---

## Current Content Flow

### 1. Generation (`/apps/api/src/routes/generate.ts`)

```
LLM generates → finalText (grounds only)
                    ↓
        SubmissionFormatterService.formatGoldCoastSubmission()
                    ↓
        formattedSubmission = {
            header + metadata
            + "## Grounds of submission:"
            + finalText
            + footer + declaration
        }
                    ↓
        Returns: { preview: formattedSubmission }
```

### 2. User Review (`/apps/web/src/pages/SubmissionForm.tsx`)

```
Receives formattedSubmission as generatedText
        ↓
User can edit EVERYTHING in textarea
        ↓
Sends editedText back as finalText
```

### 3. Submission & PDF

```
Receives finalText (user's edit)
        ↓
Re-formats with SubmissionFormatterService
        ↓
Generates PDF from formatted markdown
```

---

## The Editable Section

**From templates** (`currumbin-original-grounds.md`):

```markdown
## Grounds of submission:

**To:** Mr Tim Baker
**Subject:** Objection to Development Application...
**From:** {{name}}
**Date:** {{date}}

┌─────────────────────────────────────┐
│  START EDITABLE (Grounds Content)   │
│                                     │
│ I strongly oppose the development...│
│                                     │
│ 1. Non-Compliance with...          │
│                                     │
│ ...all the objection grounds...    │
│                                     │
│ I urge the Council to refuse...    │
│                                     │
│  END EDITABLE                       │
└─────────────────────────────────────┘

---

## Declaration

I understand and acknowledge that:
- the information is true and correct
- this submission is NOT confidential
...
```

**What should be editable**: Only the grounds text between the metadata header (To/From/Date) and the Declaration section.

**What should NOT be editable**:
- Property details (auto-filled from form)
- Submitter details (auto-filled from form)
- Declaration text (legal compliance)
- Document structure (headers, separators)

---

## Recommended Solution: Split Content Approach

### Architecture

Store and edit **grounds separately** from full document:

```
State:
├── groundsText (editable) ← user edits this
└── fullPreview (computed) ← user sees this
```

### Backend Changes

**File**: `/apps/api/src/routes/generate.ts` (lines 248-253)

```typescript
// Current (line 248-253)
const response: any = {
  ok: true,
  preview: formattedSubmission,
  submissionId,
  status: 'READY_FOR_REVIEW'
};

// NEW - return both grounds and full preview
const response: any = {
  ok: true,
  groundsOnly: finalText,           // Just AI-generated grounds
  fullPreview: formattedSubmission, // Complete formatted document
  submissionId,
  status: 'READY_FOR_REVIEW'
};
```

**Impact**: ✅ No breaking changes - just adding fields

### Frontend Changes

**File**: `/apps/web/src/pages/SubmissionForm.tsx`

**1. Update State** (around line 201):

```typescript
// Current
const [generatedText, setGeneratedText] = useState<string>('');
const [originalGeneratedText, setOriginalGeneratedText] = useState<string>('');

// NEW - separate grounds from preview
const [groundsText, setGroundsText] = useState<string>('');
const [originalGroundsText, setOriginalGroundsText] = useState<string>('');
const [fullPreview, setFullPreview] = useState<string>(''); // For display only
```

**2. Update Generation Success Handler** (line 355-360):

```typescript
// Current
onSuccess: (data) => {
  const preview = data.preview || '';
  setGeneratedText(preview);
  setOriginalGeneratedText(preview);
  setStep(4);
}

// NEW
onSuccess: (data) => {
  setGroundsText(data.groundsOnly || '');
  setOriginalGroundsText(data.groundsOnly || '');
  setFullPreview(data.fullPreview || '');
  setStep(4);
}
```

**3. Update Edit UI** (lines 1329-1336):

```typescript
// Current - edits full document
<textarea
  value={generatedText}
  onChange={(e) => setGeneratedText(e.target.value)}
  ...
/>

// NEW - edit only grounds
<textarea
  value={groundsText}
  onChange={(e) => setGroundsText(e.target.value)}
  placeholder="Edit your grounds of objection here..."
  className="w-full border border-gray-300 rounded-md px-4 py-3 
             focus:outline-none focus:ring-2 focus:ring-blue-500 
             font-mono text-sm"
  rows={30}
  style={{ minHeight: '600px' }}
/>

<p className="text-sm text-gray-500 mt-2">
  💡 You can edit your objection grounds above. The full submission with 
  headers and declaration will be generated automatically when you submit.
</p>
```

**4. Update Preview** (lines 1338-1363):

Option A - Simple (show stored preview):
```typescript
<ReactMarkdown>
  {fullPreview}
</ReactMarkdown>
```

Option B - Live preview (requires API call to re-format):
```typescript
<ReactMarkdown>
  {useLivePreview(groundsText, submissionId)}
</ReactMarkdown>
```

**5. Update Submit Handler** (line 377-385):

```typescript
// Current
mutationFn: async () => {
  const response = await api.submissions.submit(submissionId, { 
    finalText: generatedText,  // Full document
    emailBody: emailBody 
  });
  return response.data;
}

// NEW - send only grounds
mutationFn: async () => {
  const response = await api.submissions.submit(submissionId, { 
    finalText: groundsText,   // Just the grounds
    emailBody: emailBody 
  });
  return response.data;
}
```

**Impact**: ✅ Minimal changes to existing component structure

### Submission Endpoint

**File**: `/apps/api/src/routes/generate.ts` (lines 200-210)

```typescript
// Already perfect! No changes needed.
// The formatter already takes grounds_content and wraps it:

const formattedSubmission = formatter.formatGoldCoastSubmission({
  ...allMetadata,
  grounds_content: finalText  // User's edited grounds
});

// This is then used for PDF and email - perfect!
```

**Impact**: ✅ Zero changes needed - already works correctly!

---

## Impact Assessment

### ✅ Components With NO Impact

1. **PDF Generation** (`pdfGenerator.ts`):
   - Still receives formatted markdown
   - No code changes

2. **Email Service** (`email.ts`):
   - Still uses formatted content
   - No code changes

3. **Document Workflow** (`documentWorkflow.ts`):
   - Still processes formatted submissions
   - No code changes

4. **Database Schema**:
   - Can optionally store `grounds_text_user_edited`
   - But not required - can reformat on-demand

5. **Submission Formatter** (`submissionFormatter.ts`):
   - Already designed for this pattern!
   - Takes `grounds_content` parameter
   - Wraps with structure automatically

### ⚠️ Required Changes

| File | Location | Change | Complexity |
|------|----------|--------|------------|
| `generate.ts` | Line 248-253 | Return `groundsOnly` + `fullPreview` | ⭐ Trivial |
| `SubmissionForm.tsx` | State (line 201) | Add `groundsText`, `fullPreview` | ⭐ Easy |
| `SubmissionForm.tsx` | Step 4 (line 1287) | Edit textarea, preview logic | ⭐⭐ Moderate |
| `SubmissionForm.tsx` | Submit (line 377) | Send `groundsText` as `finalText` | ⭐ Trivial |

**Total Complexity**: ⭐⭐ Low-to-Moderate

---

## Benefits

### ✅ User Experience

1. **Clear focus**: "Edit your objection grounds here"
2. **Can't break structure**: Headers/declarations auto-generated
3. **Live preview**: See formatted result in real-time
4. **Word count**: Shows grounds-only word count (more useful)

### ✅ Legal/Compliance

1. **Protected declarations**: Can't be modified by user
2. **Consistent structure**: Always matches template
3. **Metadata accuracy**: Always from database, not user edits

### ✅ Development

1. **Separation of concerns**: Content vs. structure
2. **Easy to validate**: Can validate grounds content specifically
3. **Template flexibility**: Easy to change wrapper without affecting user content
4. **Future-proof**: Can add multi-template support easily

---

## Alternative Approach: Parse & Extract

**How it would work**: Extract editable section from formatted document using regex/parsing.

```typescript
function extractGrounds(fullDoc: string): string {
  const start = fullDoc.indexOf('## Grounds of submission:');
  const end = fullDoc.indexOf('## Declaration');
  const section = fullDoc.slice(start, end);
  
  // Remove metadata lines (To:, From:, Subject:, Date:)
  const lines = section.split('\n');
  const grounds = lines.filter(line => 
    !line.match(/^\*\*(To|From|Subject|Date):\*\*/)
  );
  
  return grounds.join('\n');
}

function reconstructDoc(original: string, editedGrounds: string): string {
  const before = original.split('## Grounds of submission:')[0];
  const after = original.split('## Declaration')[1];
  return `${before}## Grounds of submission:\n\n${editedGrounds}\n\n## Declaration${after}`;
}
```

### Why NOT Recommended

- ❌ Fragile parsing logic
- ❌ Depends on exact markdown structure
- ❌ Edge cases (what if user adds "Declaration" in grounds?)
- ❌ Doesn't solve fundamental architecture issue
- ❌ Harder to maintain

**Verdict**: Only use if backend changes are absolutely impossible.

---

## Implementation Plan

### Phase 1: Backend (30 minutes)

1. Update `generate.ts` API response
2. Test: Verify both fields returned correctly
3. Commit: "feat: return separate grounds and preview in generate endpoint"

### Phase 2: Frontend (2-3 hours)

1. Add new state variables
2. Update generation success handler
3. Update Step 4 UI with edit/preview panels
4. Update submit handler
5. Test: Full flow from generation → edit → submit
6. Commit: "feat: restrict editing to grounds content only"

### Phase 3: Polish (1-2 hours)

1. Add help text explaining editable section
2. Add live preview updates (if desired)
3. Add download preview button
4. Update word count to show grounds-only
5. Update reset button logic
6. Commit: "polish: improve UX for grounds editing"

### Phase 4: Testing (1-2 hours)

- [ ] Generate submission
- [ ] Edit grounds text
- [ ] Verify preview shows full formatted doc
- [ ] Submit and check PDF has correct structure
- [ ] Verify declaration text is unchanged
- [ ] Verify metadata comes from form data
- [ ] Test reset functionality
- [ ] Test word count accuracy
- [ ] Test email body formatting

**Total Estimate**: 4-8 hours

---

## Testing Checklist

### Functional Tests

- [ ] User can edit grounds text
- [ ] User CANNOT edit declaration (not shown in edit mode)
- [ ] Preview shows full formatted document
- [ ] Preview updates when grounds edited
- [ ] Word count shows grounds-only count
- [ ] Reset button restores original grounds
- [ ] Submitted PDF has correct full structure
- [ ] PDF contains edited grounds content
- [ ] Email body is correctly formatted
- [ ] Metadata (names, addresses) from form, not edits

### Edge Cases

- [ ] Very long grounds text (>10,000 words)
- [ ] Empty grounds text (show error)
- [ ] Special characters in grounds (quotes, asterisks)
- [ ] Markdown formatting in grounds (bold, lists)
- [ ] Copy/paste from Word (strip formatting)

### Regression Tests

- [ ] PDF generation still works
- [ ] Email sending still works
- [ ] Document workflow unchanged
- [ ] Database saves correctly
- [ ] Previous submissions still viewable

---

## FAQ

### Q: Can we let users edit the greeting/salutation?

**A**: Yes, easy to include in editable section. Just extend `groundsOnly` to include "Dear Council..." through "...refuse this application."

### Q: What if user pastes a full document into the grounds field?

**A**: Validation - check for presence of "## Declaration" or other structural markers, show warning if detected.

### Q: Can we show a side-by-side edit/preview?

**A**: Yes! Use a two-column layout on desktop. Left = edit textarea, Right = live preview.

### Q: What about mobile users?

**A**: Keep current tab approach (Edit/Preview buttons). Side-by-side only on desktop.

### Q: Can users download the formatted preview?

**A**: Yes, add "Download Preview" button that calls PDF generation endpoint with current grounds.

### Q: What about the email body editing (Step 5)?

**A**: Keep as-is. Email body is separate from grounds/submission document. No changes needed.

---

## Conclusion

**Recommended**: Implement the **Split Content Approach**

**Why**: 
- ✅ Achieves the goal (restrict editing to grounds only)
- ✅ Minimal code changes
- ✅ No impact on PDF/email generation
- ✅ Future-proof architecture
- ✅ Better UX with clear edit/preview separation
- ✅ System already architected for this pattern

**Estimated Effort**: 4-8 hours

**Risk Level**: ⭐ Low - well-contained changes with no breaking impacts

The key insight is that **the backend already works this way** - it generates grounds (`finalText`) and formats them separately. We just need to expose both to the frontend and bind the UI correctly.

---

## Next Steps

1. Review this analysis with team
2. Decide on exact UX (tabs vs. side-by-side)
3. Implement backend changes (30 min)
4. Implement frontend changes (2-3 hrs)
5. Test thoroughly (1-2 hrs)
6. Deploy to staging
7. User acceptance testing
8. Deploy to production

**Ready to proceed?** The implementation is straightforward and low-risk.

