# Submission Editor Improvements

## Problem
Users could edit **too much** in the final draft submission interface:
- Could delete form elements and headers
- Could change the structure of the document
- Could modify declaration text and labels
- No visual indication of what should/shouldn't be edited

## Solution
Created a structured editor that:
- ✅ **Allows editing** of submitter/applicant details (name, address, email, etc.)
- ✅ **Allows editing** of grounds for submission content (the main submission text)
- ✅ **Allows editing** of declaration text and checkmarks
- ❌ **Prevents editing** of property details (lot number, plan number, property address, application number)
- ❌ **Prevents editing** of headers, labels, and structural elements
- 👁️ **Visual indication** - grey text for protected elements, white input fields for editable content

## Changes Made

### 1. New Component: `SubmissionEditor.tsx`
Created `/apps/web/src/components/SubmissionEditor.tsx` with:

**Features:**
- Parses markdown submission into structured sections
- Identifies editable vs non-editable regions
- Renders editable fields as input boxes (with blue border)
- Renders protected content as grey text
- Reconstructs full submission text when user makes changes

**Section Types:**
- `header` - Headers (# ## ###) - **Protected**
- `label` - Field labels like "**Lot Number:**" - **Protected**
- `value` - Field values (applicant details) - **Editable**
- `grounds` - Grounds for submission content - **Editable**
- `declaration` - Declaration text - **Protected**
- `text` - Other structural text - **Protected**

### 2. Updated: `SubmissionForm.tsx`
Modified the Step 4 (review submission) interface:

**Changes:**
- Added import for `SubmissionEditor`
- Replaced plain `textarea` with structured `SubmissionEditor` component in edit mode
- Updated instruction text to clarify what users can edit
- Changed label from "Submission Text (Markdown)" to "Edit Your Submission"
- Added `originalGeneratedText` state to store the initial draft
- Added `showResetConfirm` state for reset confirmation modal
- Added Reset button that appears when edits are made
- Added confirmation modal to prevent accidental resets

**User Experience:**
- Edit mode now shows structured fields instead of raw markdown
- Users can only edit specific fields (visually clear with white backgrounds)
- Protected content is greyed out and cannot be modified
- Preview mode remains unchanged (formatted markdown view)
- **NEW:** Reset button appears when user has made edits (orange button)
- **NEW:** Confirmation dialog prevents accidental loss of edits
- Reset restores the original AI-generated draft

## Visual Design

### Edit Mode
```
┌─────────────────────────────────────────────────────────────┐
│ Review Your Submission    [🔄 Reset] [✏️ Edit] [👁️ Preview] │
├─────────────────────────────────────────────────────────────┤
│ # Gold Coast Council - DA Submission        │ ← Grey (protected)
│ ## Property Details                         │ ← Grey (protected)
│ **Lot Number:** 123                         │ ← Grey (NOT editable)
│ **Plan Number:** SP456789                   │ ← Grey (NOT editable)
│ **Property Address:** 123 Main St           │ ← Grey (NOT editable)
│ **Application Number:** COM/2025/271        │ ← Grey (NOT editable)
│                                              │
│ ## Submitter Details                        │ ← Grey (protected)
│ **First Name:** [John          ]            │ ← Label grey, value editable
│ **Surname:** [Smith         ]               │ ← Label grey, value editable
│ **Email:** [john@example.com]               │ ← Label grey, value editable
│ **Residential Address:** [123 Main St]      │ ← Label grey, value editable
│                                              │
│ ## Grounds of Submission                    │ ← Grey (protected)
│ ┌─────────────────────────────────────────┐ │
│ │ [Large textarea for grounds content]    │ │ ← White (editable)
│ │ This is where the main submission       │ │
│ │ arguments and planning objections go... │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ## Declaration                               │ ← Grey (protected)
│ ┌─────────────────────────────────────────┐ │
│ │ [Textarea for declaration content]      │ │ ← White (editable)
│ │ ✓ I understand and acknowledge...       │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Reset Functionality
- **Reset button** (🔄 orange) appears **only when edits are detected**
- Clicking Reset shows confirmation modal with warning icon
- Confirmation required to prevent accidental data loss
- Resets all fields to original AI-generated draft

### Help Text
Blue info bar at the bottom explains:
- **Editable:** White fields with blue border
- **Protected:** Grey text (structure & labels)

## Technical Implementation

### Parsing Algorithm
1. Split markdown into lines
2. Identify headers (`#`, `##`, `###`)
3. Detect field patterns (`**Label:** value`)
4. Collect grounds section content (between "Grounds of Submission" header and declaration)
5. Mark declaration section as protected
6. Create structured sections array

### Reconstruction Algorithm
1. Iterate through sections
2. Combine labels + values on same line
3. Preserve headers and structure
4. Rebuild markdown with user's edits
5. Return complete submission text

## Benefits

1. **User Safety** - Can't accidentally delete important structure
2. **Clear UX** - Visual indication of what's editable (white fields vs grey text)
3. **Maintains Structure** - Form elements and labels stay intact
4. **Flexible Editing** - Users can still edit all important content (details + grounds)
5. **No Breaking Changes** - Preview mode unchanged, submission still works the same way

## Testing Checklist

- [ ] Test editing applicant details (name, address, email, etc.)
- [ ] Test editing grounds for submission content
- [ ] Verify headers remain grey and non-editable
- [ ] Verify declaration text is protected
- [ ] Switch between Edit and Preview modes
- [ ] **NEW:** Verify Reset button appears only when edits are made
- [ ] **NEW:** Test Reset button shows confirmation modal
- [ ] **NEW:** Verify Reset restores original draft
- [ ] **NEW:** Test Cancel button in reset confirmation
- [ ] Submit edited form and verify content is preserved
- [ ] Test with different screen sizes (responsive)
- [ ] Verify word count updates correctly

## Future Enhancements

Potential improvements:
1. Add rich text formatting for grounds section (bold, bullets)
2. Add character/word limits on individual fields
3. Add validation warnings (e.g., email format)
4. Add undo/redo functionality
5. Add auto-save draft functionality

