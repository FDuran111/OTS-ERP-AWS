# Phase 2: Materials Section - COMPLETE ✅

**Date:** October 8, 2025
**Status:** Implementation Complete & Tested

## Overview

Phase 2 adds materials tracking to time entries, allowing employees to record materials used during work, including quantities, material selection from database, optional notes, and off-truck tracking.

## What Was Implemented

### 1. Database Schema
- **Updated `TimeEntryMaterial` table** with new structure:
  - `materialId` (foreign key to Material table)
  - `quantity` (decimal)
  - `notes` (optional text field, renamed from description)
  - `offTruck` (boolean flag)
  - `packingSlipUrl` (for future file uploads)
  - Removed `price` field (employees don't see prices)
  - Added index on materialId for fast lookups
  - CASCADE delete when TimeEntry is deleted

### 2. UI Components

**Time Entry Form (`MultiJobTimeEntry.tsx`):**
- Materials section with dropdown selection from Material database
- Add/remove material functionality
- Fields for each material:
  - **Material Selector** - Autocomplete dropdown showing material code, name, category, unit, and stock
  - **Quantity** - Decimal input
  - **Notes** - Optional text area for additional details
  - **Off Truck** - Checkbox to indicate if material came from truck inventory
  - **Packing Slip** - File upload button (stored as filename for now)
- Material entries displayed in grey Paper cards
- "+ Add Material" button to add more materials
- **Edit Support** - Materials are loaded and editable when editing time entries

### 3. Backend API

**Time Entry Creation (`/api/time-entries/bulk`):**
- Accepts `materials` array in entry objects
- Validates materialId and quantity are present
- Inserts materials after time entry creation
- Stores packing slip file names (full S3 upload in Phase 3)
- Graceful error handling - material failures don't fail entire submission

**Time Entry Update (`/api/time-entries/[id]` - PUT endpoint):**
- Accepts `materials` array in update request
- Deletes existing materials for the entry
- Inserts new materials with updated data
- Supports adding, removing, and modifying materials during edits

**Time Entry Retrieval (`/api/time-entries`):**
- Fetches all materials for returned time entries
- Joins with Material table to get material details
- Groups materials by timeEntryId
- Returns full material information (code, name, unit, category)

**Job Material Usage (`/api/jobs/[id]/materials`):**
- **Enhanced to show both sources:**
  - Manual material recordings (from MaterialUsage table)
  - Time entry materials (from TimeEntryMaterial table)
- Combines and sorts by date
- Shows source indicator ("From Time Entry" badge)
- Calculates totals and summaries across both sources

### 4. Display Components

**Weekly Timesheet (`WeeklyTimesheetDisplay.tsx`):**
- Added Material interface with new schema
- Shows materials count badge on entries with materials
- Badge displays "1 material" or "X materials" in blue chip

**Job Material Usage Tracker (`MaterialUsageTracker.tsx`):**
- Shows all materials used on a job from both sources:
  - Manual recordings (CONSUMED, WASTED, RETURNED, TRANSFERRED)
  - Time entry materials (TIME_ENTRY, OFF_TRUCK)
- Line items show:
  - Date and time
  - Material code and name
  - Quantity and unit
  - Usage type (color-coded chips)
  - Total cost
  - User who recorded it
  - Notes
  - Source indicator badge
- Summary cards show totals by material
- Supports manual material recording alongside time entry materials

## Files Modified/Created

### Database Migrations
✅ `/src/lib/db-migrations/2025-10-08-update-materials-table.sql`
- Added materialId column with foreign key
- Renamed description to notes
- Removed price column
- Added materialId index

### Components
✅ `/src/components/time/MultiJobTimeEntry.tsx`
- Added Material and MaterialOption interfaces
- Updated JobEntry interface with materials array
- Added material state management (add, remove, update)
- Added materials UI with Autocomplete dropdown
- Transform materials when loading for edit
- Include materials in both create and update submissions

✅ `/src/components/time/WeeklyTimesheetDisplay.tsx`
- Updated Material interface to match new schema
- Shows materials count indicator

✅ `/src/components/jobs/MaterialUsageTracker.tsx`
- Updated to handle materials from both sources
- Added usage type labels and colors for time entry materials
- Added source indicator badges

### API Routes
✅ `/src/app/api/time-entries/bulk/route.ts`
- Materials insertion with new schema
- Validation and error handling

✅ `/src/app/api/time-entries/[id]/route.ts`
- Added materials update support to PUT endpoint
- Delete existing materials, insert new ones

✅ `/src/app/api/time-entries/route.ts`
- Enhanced materials fetch with Material table join
- Returns full material details

✅ `/src/app/api/jobs/[id]/materials/route.ts`
- Query both MaterialUsage and TimeEntryMaterial tables
- Combine and sort results
- Add source indicators

## Data Flow

### Creating Time Entry with Materials
```typescript
// Frontend sends
{
  entries: [{
    jobId: "uuid",
    hours: 8,
    categoryHours: { ... },
    location: "Pawnee City",
    jobDescription: "Bin 21 Repairs",
    workDescription: "Welded panels",
    materials: [
      {
        materialId: "material-uuid",
        quantity: "10",
        notes: "Extra material needed",
        offTruck: false,
        packingSlip: File
      }
    ]
  }]
}

// Backend processes
1. Creates TimeEntry record
2. For each material:
   - Validates materialId and quantity exist
   - Inserts into TimeEntryMaterial table
   - Links via timeEntryId foreign key
3. Returns success
```

### Editing Time Entry with Materials
```typescript
// Frontend sends (PUT)
{
  jobId: "uuid",
  hours: 8,
  materials: [
    { materialId: "...", quantity: "10", notes: "...", offTruck: false },
    { materialId: "...", quantity: "250", notes: "...", offTruck: false }
  ]
}

// Backend processes
1. Updates TimeEntry record
2. Deletes existing materials for this entry
3. Inserts new materials array
4. Returns success
```

### Retrieving Time Entries
```typescript
// Backend returns
[{
  id: "entry-uuid",
  jobNumber: "00-11-02",
  hours: 8,
  materials: [
    {
      id: "material-entry-uuid",
      materialId: "material-uuid",
      quantity: 10,
      notes: "Extra material needed",
      offTruck: false,
      packingSlipUrl: "packing-slip.pdf",
      materialCode: "KLK-001",
      materialName: "Killark 3/4 XP T",
      materialUnit: "EA",
      materialCategory: "Electrical"
    }
  ]
}]
```

### Viewing Job Material Usage
```typescript
// Backend returns (combined from both sources)
{
  usage: [
    {
      materialCode: "KLK-001",
      materialName: "Killark 3/4 XP T",
      quantity: 50,
      usageType: "TIME_ENTRY",
      source: "time_entry",
      userName: "John Doe",
      usedAt: "2025-10-08",
      notes: "test 4"
    },
    {
      materialCode: "WIRE-250",
      materialName: "Wire 12/2",
      quantity: 250,
      usageType: "OFF_TRUCK",
      source: "time_entry",
      userName: "John Doe",
      usedAt: "2025-10-08",
      notes: "test 5"
    }
  ],
  summary: [
    {
      materialCode: "KLK-001",
      totalQuantity: 50,
      totalCost: 125.00,
      usageCount: 1
    }
  ]
}
```

## Testing Results

✅ **Create time entry with materials** - Working
✅ **Edit time entry and modify materials** - Working
✅ **Add multiple materials** - Working
✅ **Remove materials** - Working
✅ **Materials persist after save** - Working
✅ **Materials show in timesheet** - Working
✅ **Materials appear in Job Material Usage tab** - Working
✅ **Source indicators display correctly** - Working

### Terminal Logs Showing Success
```
[MATERIALS UPDATE] Processing materials for time entry: 5ef62e7b-3105-4eaf-b2b9-d433a4fb4eb8
DELETE FROM "TimeEntryMaterial" WHERE "timeEntryId" = $1 (1 row deleted)
[MATERIALS UPDATE] Inserting material: { materialId: '8fc...', quantity: '50', notes: 'test 4', offTruck: false }
INSERT successful
[MATERIALS UPDATE] Inserting material: { materialId: '0f2...', quantity: '250', notes: 'test 5', offTruck: false }
INSERT successful
[MATERIALS UPDATE] Successfully updated materials
```

## Validation Rules

**Required Fields:**
- Material selection (must select from dropdown)
- Quantity (must be > 0)

**Optional Fields:**
- Notes (can add context about usage)
- Off Truck (defaults to false)
- Packing Slip (file upload)

**Business Logic:**
- Materials are optional - time entries can be saved without materials
- Empty material entries (no materialId or quantity) are skipped during save
- Material deletion doesn't require confirmation (can re-add)
- Materials are deleted and recreated on update (simpler than complex diff logic)
- Packing slip files currently stored as file names (Phase 3 will add S3 upload)

## Benefits

✅ **Track material usage per job** - Clear record of what was used where
✅ **Material database integration** - Select from existing materials, ensure consistency
✅ **Off Truck tracking** - Know what came from truck inventory vs purchased
✅ **Flexible notes** - Add context about material usage
✅ **Job-level visibility** - See all materials used on a job in one place
✅ **Visual indicators** - Timesheet shows which entries have materials
✅ **Easy management** - Simple add/remove interface
✅ **Edit support** - Can update materials when editing time entries
✅ **Combined reporting** - See both manual and time entry materials together

## Known Limitations (To Address in Phase 3)

⚠️ **File Storage:** Packing slip files currently store file name only, not actual upload
⚠️ **Material Photos:** No photo upload capability yet (coming in Phase 3)
⚠️ **Cost Visibility:** Employees don't see material costs (intentional)
⚠️ **Stock Updates:** Materials don't automatically reduce stock (manual MaterialUsage does)

## Next Phase

Ready to move to **Phase 3: Photo Uploads (8h)** when client approves!

Phase 3 will add:
- S3 upload for packing slip files
- Photo attachments to time entries
- Photo gallery view
- Image compression and optimization

---

## Technical Implementation Details

### Database Schema (Final)

```sql
-- TimeEntryMaterial table structure
CREATE TABLE "TimeEntryMaterial" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "timeEntryId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  notes TEXT, -- Optional, renamed from description
  "offTruck" BOOLEAN DEFAULT false,
  "packingSlipUrl" TEXT, -- File name for now, S3 URL in Phase 3
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TimeEntryMaterial_timeEntryId_fkey"
    FOREIGN KEY ("timeEntryId")
    REFERENCES "TimeEntry"(id)
    ON DELETE CASCADE,

  CONSTRAINT "TimeEntryMaterial_materialId_fkey"
    FOREIGN KEY ("materialId")
    REFERENCES "Material"(id)
    ON DELETE SET NULL
);

CREATE INDEX "idx_material_timeentry"
  ON "TimeEntryMaterial"("timeEntryId");

CREATE INDEX "idx_material_materialId"
  ON "TimeEntryMaterial"("materialId");
```

### TypeScript Interfaces

```typescript
// Material option from database
interface MaterialOption {
  id: string
  code: string
  name: string
  description: string
  unit: string
  category: string
  inStock: number
}

// Material in UI (temporary ID for state management)
interface Material {
  id: string // Temporary UI ID
  materialId: string | null // Selected material from database
  material: MaterialOption | null // Full material object
  quantity: string
  notes: string // Optional description/notes
  offTruck: boolean
  packingSlip: File | null
}

// Material in database (returned from API)
interface MaterialFromDB {
  id: string
  materialId: string
  quantity: number
  notes: string | null
  offTruck: boolean
  packingSlipUrl: string | null
  materialCode: string
  materialName: string
  materialUnit: string
  materialCategory: string
}

// Job entry with materials
interface JobEntry {
  // ... existing fields
  materials: Material[]
}
```

### State Management

Materials are managed as part of the JobEntry state:
- `addMaterial(entryId)` - Adds new empty material to entry
- `removeMaterial(entryId, materialId)` - Removes material by ID
- `updateMaterial(entryId, materialId, field, value)` - Updates specific field
- Special handling for material selection to update both `material` and `materialId`

### API Integration

**Create:**
```typescript
POST /api/time-entries/bulk
{
  entries: [{
    jobId: "...",
    hours: 8,
    materials: [{
      materialId: "uuid",
      quantity: "10",
      notes: "Extra needed",
      offTruck: false
    }]
  }]
}
```

**Update:**
```typescript
PUT /api/time-entries/[id]
{
  jobId: "...",
  hours: 8,
  materials: [{
    materialId: "uuid",
    quantity: "10",
    notes: "Updated notes",
    offTruck: true
  }]
}
```

**Retrieve:**
```typescript
GET /api/time-entries?userId=xxx&startDate=xxx&endDate=xxx
// Returns entries with materials array populated
// Each material includes full details from Material table join
```

**Job Usage:**
```typescript
GET /api/jobs/[jobId]/materials
// Returns combined materials from:
// 1. MaterialUsage table (manual recordings)
// 2. TimeEntryMaterial table (time entry materials)
// Both sorted by date with source indicators
```

## Phase 2 Complete! 🎉

All features working as designed:
- ✅ Material selection from database
- ✅ Quantity tracking
- ✅ Optional notes
- ✅ Off truck indicator
- ✅ Create with materials
- ✅ Edit and update materials
- ✅ View in timesheet
- ✅ View in job material usage
- ✅ Combined reporting with manual materials
