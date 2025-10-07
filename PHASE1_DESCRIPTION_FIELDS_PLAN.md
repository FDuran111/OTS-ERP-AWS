# Phase 1: Description Field Changes - Implementation Plan

**Date:** October 7, 2025
**Estimated Time:** 3-4 hours
**Priority:** HIGH - Start here first

## Objective
Replace the single optional "Description" field with 3 REQUIRED fields to prevent data entry errors and improve data quality.

## Current State

**Location:** `MultiJobTimeEntry.tsx` lines 706-715

```typescript
<TextField
  fullWidth
  label="Description (Optional)"
  value={entry.description}
  onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
  placeholder="Work performed..."
/>
```

**Interface:** `JobEntry` (line 58-65)
```typescript
interface JobEntry {
  id: string
  jobId: string | null
  job: Job | null
  hours: string
  categoryHours: CategoryHours
  description: string  // Single optional field
}
```

## New State

### 1. Updated Interface
```typescript
interface JobEntry {
  id: string
  jobId: string | null
  job: Job | null
  hours: string
  categoryHours: CategoryHours
  location: string      // NEW - REQUIRED
  jobDescription: string // NEW - REQUIRED (replaces generic "job" confusion)
  workDescription: string // NEW - REQUIRED (replaces old "description")
}
```

### 2. New UI Layout (Replace lines 706-715)
```tsx
{/* Location Field */}
<TextField
  fullWidth
  required
  label="Location"
  value={entry.location || ''}
  onChange={(e) => updateEntry(entry.id, 'location', e.target.value)}
  placeholder="e.g., Pawnee City, Lincoln, etc."
  error={!entry.location && showValidation}
  helperText={!entry.location && showValidation ? "Location is required" : ""}
/>

{/* Job Field */}
<TextField
  fullWidth
  required
  label="Job"
  value={entry.jobDescription || ''}
  onChange={(e) => updateEntry(entry.id, 'jobDescription', e.target.value)}
  placeholder="e.g., Bin 21, North Field, etc."
  error={!entry.jobDescription && showValidation}
  helperText={!entry.jobDescription && showValidation ? "Job is required" : ""}
/>

{/* Work Description Field */}
<TextField
  fullWidth
  required
  multiline
  rows={3}
  label="Work Description"
  value={entry.workDescription || ''}
  onChange={(e) => updateEntry(entry.id, 'workDescription', e.target.value)}
  placeholder="Describe the work performed in detail..."
  error={!entry.workDescription && showValidation}
  helperText={!entry.workDescription && showValidation ? "Work description is required" : ""}
/>
```

### 3. Validation Logic
```typescript
const validateEntries = () => {
  for (const entry of entries) {
    if (!entry.location?.trim()) {
      setError('Location is required for all entries')
      return false
    }
    if (!entry.jobDescription?.trim()) {
      setError('Job is required for all entries')
      return false
    }
    if (!entry.workDescription?.trim()) {
      setError('Work description is required for all entries')
      return false
    }
    // ... existing validation
  }
  return true
}
```

## Database Changes

### Migration SQL
```sql
-- Add new columns to TimeEntry table
ALTER TABLE "TimeEntry"
ADD COLUMN "location" TEXT,
ADD COLUMN "jobDescription" TEXT,
ADD COLUMN "workDescription" TEXT;

-- Keep old description column for backward compatibility
-- Don't drop it yet - will migrate data in next step

-- Optional: Migrate existing data
UPDATE "TimeEntry"
SET "workDescription" = description
WHERE description IS NOT NULL AND "workDescription" IS NULL;

COMMIT;
```

## API Changes

### `/api/time-entries/bulk/route.ts`
Update request schema:
```typescript
const timeEntrySchema = z.object({
  jobId: z.string(),
  hours: z.number(),
  categoryHours: z.object({ ... }),
  location: z.string().min(1, 'Location is required'),           // NEW
  jobDescription: z.string().min(1, 'Job is required'),          // NEW
  workDescription: z.string().min(1, 'Work description is required'), // NEW
  description: z.string().optional() // Keep for backward compat
})
```

Update INSERT statement to include new fields.

## Display Changes

### `WeeklyTimesheetDisplay.tsx`
Update to show structured breakdown:

**Before:**
```
Description: "Bin 21 at Pawnee City - welding repairs"
```

**After:**
```
📍 Pawnee City
🏗️  Bin 21
📝 Welding repairs on north side panels
```

## Benefits

1. **Prevents Errors:** Employee can't click "Pawnee City" job but type "Lincoln" in description
2. **Better Data Quality:** Structured data easier to search/filter
3. **Clearer Reporting:** Can filter by location, job type, etc.
4. **Forces Thoughtful Entry:** Three separate fields makes employee think about each aspect

## Testing Checklist

- [ ] Create new entry with all 3 fields filled - should save successfully
- [ ] Try to save with empty location - should show validation error
- [ ] Try to save with empty job - should show validation error
- [ ] Try to save with empty work description - should show validation error
- [ ] Edit existing entry - should preserve all 3 fields
- [ ] Display in WeeklyTimesheetDisplay - should show structured format
- [ ] Admin view - should see all 3 fields clearly
- [ ] Mobile responsive - fields should stack vertically

## Files to Modify

1. ✅ `/src/components/time/MultiJobTimeEntry.tsx` - UI changes
2. ✅ `/src/lib/db-migrations/2025-10-07-description-fields.sql` - Database migration
3. ✅ `/src/app/api/time-entries/bulk/route.ts` - API validation and storage
4. ✅ `/src/app/api/time-entries/route.ts` - GET response transformation
5. ✅ `/src/components/time/WeeklyTimesheetDisplay.tsx` - Display changes
6. ⚠️  `/src/app/(app)/time/page.tsx` - Update preselectedJob to pass new fields

## Backward Compatibility

- Keep old `description` column in database
- If new fields are empty, fall back to old description for display
- Old entries without new fields will still display correctly
- Gradual migration: new entries use new fields, old entries stay as-is

## Next Steps After Phase 1

Once this is tested and working:
- Phase 2: Materials Section (12h)
- Phase 3: Photo Uploads (8h)
- Phase 4: Job Number/PO Changes (3h)
- etc.
