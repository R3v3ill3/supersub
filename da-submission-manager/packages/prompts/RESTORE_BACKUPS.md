# Prompt Backup & Restore Guide

## Working Backup Created: October 2, 2025

These backup files contain the **tested and working** prompt configuration that generates high-quality submissions with:
- ✅ Full text with specific measurements (12,600 m³, etc.)
- ✅ Planning code references (GCCC Transport Code 2016, AS2890.3.2015, etc.)
- ✅ Custom grounds included first
- ✅ User introduction included verbatim
- ✅ Proper bullet formatting (no line breaks between items)

---

## Backup Files

1. **submission.system.txt.backup-2025-10-02-working** (9.2KB)
   - System instructions for AI
   - Includes full_text support
   - Proper CUSTOM_GROUNDS placement (first)
   - USER_STYLE_SAMPLE verbatim inclusion
   - Correct bullet list formatting instructions

2. **submission.user.hbs.backup-2025-10-02-working** (1.8KB)
   - User prompt template
   - Includes custom_grounds section
   - Includes user_style_sample section
   - Correct example formatting

---

## How to Restore

### Option 1: Restore Both Files
```bash
cd /Volumes/DataDrive/cursor_repos/supersub/da-submission-manager/packages/prompts

# Restore system prompt
cp submission.system.txt.backup-2025-10-02-working submission.system.txt

# Restore user template
cp submission.user.hbs.backup-2025-10-02-working submission.user.hbs

echo "✅ Prompts restored to working backup"
```

### Option 2: Restore Individual Files
```bash
cd /Volumes/DataDrive/cursor_repos/supersub/da-submission-manager/packages/prompts

# Restore only system prompt
cp submission.system.txt.backup-2025-10-02-working submission.system.txt

# OR restore only user template
cp submission.user.hbs.backup-2025-10-02-working submission.user.hbs
```

### Option 3: Compare Before Restoring
```bash
cd /Volumes/DataDrive/cursor_repos/supersub/da-submission-manager/packages/prompts

# See what changed
diff submission.system.txt.backup-2025-10-02-working submission.system.txt
diff submission.user.hbs.backup-2025-10-02-working submission.user.hbs
```

---

## What These Prompts Do

### System Prompt Features:
- Full_text support (uses comprehensive sections, not summaries)
- Custom grounds appear FIRST (before selected concerns)
- User introduction included VERBATIM at start
- Prevents blank lines between bullet items (fixes rendering)
- Explicit JSON output format instructions
- Preserves all measurements, codes, technical terms

### User Template Features:
- Includes CUSTOM_GROUNDS section
- Includes USER_STYLE_SAMPLE section
- Shows example of correct concern reproduction
- Proper Handlebars formatting

---

## Testing After Restore

After restoring, test that:
1. ✅ Generate a submission with custom grounds
2. ✅ Check custom grounds appear first
3. ✅ Check user introduction appears verbatim
4. ✅ Check specific measurements appear (12,600 m³, etc.)
5. ✅ Check bullet points render without line breaks
6. ✅ Check planning codes appear (AS2890.3.2015, etc.)

---

## Related Changes (Also Part of This Working Version)

These database and code changes work with this prompt version:

1. **Database Schema:**
   - Migration 0028: Added `full_text` column to concern_templates
   - Backfill script: Populated full_text with comprehensive content

2. **Code Changes:**
   - `aiGrounds.ts`: Extracts full_text during analysis
   - `documentAnalysis.ts`: Stores full_text in database
   - `generate.ts`: Retrieves and uses full_text for generation
   - `llm.ts`: Passes custom_grounds to prompt template

3. **UI Changes:**
   - Field labels updated to be clearer
   - user_style_sample made optional
   - Help text added explaining verbatim inclusion

---

## Version History

**2025-10-02: Initial Working Backup**
- Full_text support implemented
- Custom grounds placement fixed
- User introduction verbatim inclusion
- Bullet formatting corrected
- All tests passing ✅

---

## Emergency Rollback

If the entire system breaks, restore the working version:

```bash
cd /Volumes/DataDrive/cursor_repos/supersub/da-submission-manager

# Restore prompts
cp packages/prompts/submission.system.txt.backup-2025-10-02-working packages/prompts/submission.system.txt
cp packages/prompts/submission.user.hbs.backup-2025-10-02-working packages/prompts/submission.user.hbs

# Restart API server
cd apps/api
# Kill and restart your dev server

echo "✅ System restored to working backup"
```

No code changes needed - prompts are loaded dynamically at runtime.

---

## Future Improvements

When making changes to prompts:

1. **Test thoroughly** with multiple generations
2. **Check terminal logs** for errors
3. **Verify output** contains expected elements
4. **Create new backup** if changes are successful
5. **Keep this backup** as a known-good fallback

---

## Backup Naming Convention

Format: `filename.backup-YYYY-MM-DD-description`

Examples:
- `submission.system.txt.backup-2025-10-02-working` - Known good
- `submission.system.txt.backup-2025-10-05-experimental` - Testing new features
- `submission.system.txt.backup-2025-10-10-before-major-refactor` - Safety backup

---

**Created:** October 2, 2025  
**Status:** ✅ Tested and Working  
**Safe to Use:** Yes - Restore anytime

