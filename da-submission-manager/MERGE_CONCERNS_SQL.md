# Merge Duplicate Concerns - SQL Script

This SQL merges duplicate concern versions into comprehensive single concerns.

---

## Bulk Excavation Concerns - MERGED

**Current State:**
- `bulk_excavation`: Has specific measurements (12,600 m³, 2,400 m³, 7,000 m³)
- `bulk_excavation_and_earthworks`: Has descriptive context but no measurements

**Merged Version:**
Combines BOTH into one comprehensive concern with measurements AND context.

---

## SQL TO RUN:

```sql
-- Update bulk_excavation_and_earthworks to be the comprehensive version
-- (This is the key users are currently selecting)
UPDATE concern_templates
SET 
  label = 'Bulk Excavation and Earthworks',
  body = 'The revised design involves extensive earthworks that significantly exceed the original proposal. The proposal includes approximately 12,600 m³ of cut, 2,400 m³ of fill, and 7,000 m³ of soil export, with steep batters and extensive retaining walls. This will increase construction impacts, including truck movements, and result in long-term visual scarring of the rural landscape, which is unacceptable for our community.'
WHERE 
  key = 'bulk_excavation_and_earthworks' 
  AND version = 'v1';

-- Deactivate the duplicate bulk_excavation concern (no longer needed)
UPDATE concern_templates
SET is_active = false
WHERE 
  key = 'bulk_excavation' 
  AND version = 'v1';

-- Check other potential duplicates:

-- Traffic Safety concerns (2 duplicates found earlier)
-- Keep the most comprehensive one or merge them

SELECT key, label, LEFT(body, 100) as body_preview
FROM concern_templates
WHERE version = 'v1' 
  AND is_active = true
  AND key LIKE '%traffic%'
ORDER BY key;

-- Amenity concerns (2 duplicates found earlier)
SELECT key, label, LEFT(body, 100) as body_preview
FROM concern_templates
WHERE version = 'v1' 
  AND is_active = true
  AND key LIKE '%amenity%'
ORDER BY key;
```

---

## COMBINED CONCERN BREAKDOWN:

**From `bulk_excavation` (specific data):**
- ✓ "12,600 m³ of cut"
- ✓ "2,400 m³ of fill"
- ✓ "7,000 m³ of soil export"
- ✓ "steep batters"
- ✓ "extensive retaining walls"
- ✓ "significant construction impacts"
- ✓ "permanent visual scarring"

**From `bulk_excavation_and_earthworks` (context):**
- ✓ "revised design"
- ✓ "exceeds the original proposal"
- ✓ "increase construction impacts, including truck movements"
- ✓ "unacceptable for our community"

**MERGED = Best of Both** ✅

---

## After Running SQL:

Users selecting "Bulk Excavation and Earthworks" will get:
- ✅ All specific measurements
- ✅ All descriptive context
- ✅ Comprehensive ~80 word concern (vs 30-36 words separate)

**Then `hasMeasurements: true` will show in logs!**

---

## Other Duplicates To Check:

From your earlier diagnostic, you also have duplicates for:
- `traffic_safety` (2 versions)
- `amenity_*` concerns (2-3 versions)

The SELECT queries above will show these. We can merge those too if needed.

