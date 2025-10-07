# Implementation Plan - Client Requirements Phase 2
**Created:** 2025-10-07
**Status:** Planning Complete - Ready for Development

---

## EXECUTIVE SUMMARY

This plan implements the client's requested time card enhancements in **9 sequential phases**, building upon the existing robust time entry system. The system already has sophisticated overtime calculations, approval workflows, photo uploads, and audit trails - we're enhancing it with hour categories, mandatory descriptions, materials integration, and improved UX.

**Total Estimated Time:** 70 hours (9 business days)

---

## PHASE 1: HOUR CATEGORIES DROPDOWN (Priority: CRITICAL)

### Objective
Replace automatic OT calculation with manual category selection

### Current State Analysis
- **File:** `/src/components/time/MultiJobTimeEntry.tsx` (609 lines)
- **Current Logic:** Hours input → automatic OT/DT calculation via `calculateWeeklyHours()`
- **Problem:** Client wants manual selection (OT starts after 3:30 PM, not 8 hours)

### Changes Required

#### 1.1 Database Schema Changes
**File:** `/src/lib/db-migrations/2025-10-07-hour-categories.sql` (NEW)

```sql
-- Add hourCategory field to TimeEntry
ALTER TABLE "TimeEntry"
  ADD COLUMN "hourCategory" VARCHAR(30);

-- Add categoryHours JSON to store breakdown
ALTER TABLE "TimeEntry"
  ADD COLUMN "categoryHours" JSONB DEFAULT '{}';

-- Valid categories
-- STRAIGHT_TIME, STRAIGHT_TIME_TRAVEL, OVERTIME, OVERTIME_TRAVEL,
-- DOUBLE_TIME, DOUBLE_TIME_TRAVEL

-- Update existing entries to STRAIGHT_TIME
UPDATE "TimeEntry"
SET "hourCategory" = 'STRAIGHT_TIME'
WHERE "hourCategory" IS NULL;
```

**Estimated Time:** 1 hour

---

#### 1.2 UI Component Updates
**File:** `/src/components/time/MultiJobTimeEntry.tsx`

**Changes:**
1. Add category dropdown per job entry
2. Remove automatic OT display (keep for reporting)
3. Add validation: ensure category selected

**Insertion Point:** Line ~200 (after job selection, before hours input)

```typescript
// NEW: Add to entry interface
interface JobEntry {
  id: string
  jobId: string
  hours: number
  description: string
  hourCategory: 'STRAIGHT_TIME' | 'STRAIGHT_TIME_TRAVEL' | 'OVERTIME' |
                'OVERTIME_TRAVEL' | 'DOUBLE_TIME' | 'DOUBLE_TIME_TRAVEL'
}

// NEW: Category dropdown component
<FormControl fullWidth sx={{ mb: 2 }}>
  <InputLabel>Hour Category *</InputLabel>
  <Select
    value={entry.hourCategory || ''}
    onChange={(e) => updateEntry(entry.id, 'hourCategory', e.target.value)}
    required
  >
    <MenuItem value="STRAIGHT_TIME">Straight Time</MenuItem>
    <MenuItem value="STRAIGHT_TIME_TRAVEL">Straight Time Travel</MenuItem>
    <MenuItem value="OVERTIME">Overtime</MenuItem>
    <MenuItem value="OVERTIME_TRAVEL">Overtime Travel</MenuItem>
    <MenuItem value="DOUBLE_TIME">Double Time</MenuItem>
    <MenuItem value="DOUBLE_TIME_TRAVEL">Double Time Travel</MenuItem>
  </Select>
</FormControl>
```

**Validation Update:**
```typescript
const validateEntries = () => {
  for (const entry of entries) {
    if (!entry.hourCategory) {
      setError('Please select hour category for all entries')
      return false
    }
  }
  return true
}
```

**Estimated Time:** 3 hours

---

#### 1.3 API Updates
**File:** `/src/app/api/time-entries/bulk/route.ts`

**Changes:**
1. Accept hourCategory in request
2. Store category with each entry
3. Calculate pay based on category (not automatic OT)
4. Update categoryHours JSONB

**Insertion Point:** Line ~50 (entry creation loop)

```typescript
// Calculate pay based on category
const calculatePayByCategory = (hours: number, category: string, rates: any) => {
  switch (category) {
    case 'STRAIGHT_TIME':
    case 'STRAIGHT_TIME_TRAVEL':
      return hours * rates.regularRate
    case 'OVERTIME':
    case 'OVERTIME_TRAVEL':
      return hours * rates.overtimeRate
    case 'DOUBLE_TIME':
    case 'DOUBLE_TIME_TRAVEL':
      return hours * rates.doubleTimeRate
    default:
      return hours * rates.regularRate
  }
}

// In entry creation
const estimatedPay = calculatePayByCategory(
  entry.hours,
  entry.hourCategory,
  { regularRate, overtimeRate, doubleTimeRate }
)

// Store categoryHours
const categoryHours = {
  [entry.hourCategory]: entry.hours
}

await query(`
  INSERT INTO "TimeEntry" (
    "userId", "jobId", date, hours, description,
    "hourCategory", "categoryHours", "estimatedPay", ...
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ...)
`, [userId, jobId, date, hours, description, hourCategory, JSON.stringify(categoryHours), estimatedPay, ...])
```

**Estimated Time:** 2 hours

---

#### 1.4 Reporting Updates
**File:** `/src/app/api/time-entries/weekly-summary/route.ts`

**Changes:**
1. Aggregate by category instead of automatic OT
2. Return category breakdown

```typescript
// Calculate category totals
const categoryTotals = entries.reduce((acc, entry) => {
  const category = entry.hourCategory || 'STRAIGHT_TIME'
  acc[category] = (acc[category] || 0) + parseFloat(entry.hours || 0)
  return acc
}, {})

return {
  weekStart,
  weekEnd,
  categoryBreakdown: {
    straightTime: categoryTotals.STRAIGHT_TIME || 0,
    straightTimeTravel: categoryTotals.STRAIGHT_TIME_TRAVEL || 0,
    overtime: categoryTotals.OVERTIME || 0,
    overtimeTravel: categoryTotals.OVERTIME_TRAVEL || 0,
    doubleTime: categoryTotals.DOUBLE_TIME || 0,
    doubleTimeTravel: categoryTotals.DOUBLE_TIME_TRAVEL || 0
  },
  ...
}
```

**Estimated Time:** 2 hours

---

**PHASE 1 TOTAL:** 8 hours

**Testing Checklist:**
- [ ] Category dropdown appears for each job
- [ ] All 6 categories selectable
- [ ] Validation prevents submission without category
- [ ] Pay calculated correctly per category
- [ ] Weekly summary shows category breakdown
- [ ] Travel hours tracked separately

---

## PHASE 2: MANDATORY DESCRIPTION WITH PRESETS (Priority: HIGH)

### Objective
Make description mandatory with structured preset fields

### Current State Analysis
- **File:** `/src/components/time/MultiJobTimeEntry.tsx`
- **Current:** Description is optional TextField
- **Line:** ~220

### Changes Required

#### 2.1 UI Component Updates
**File:** `/src/components/time/MultiJobTimeEntry.tsx`

**Replace single description field with three fields:**

```typescript
// NEW: Structured description interface
interface StructuredDescription {
  location: string
  job: string
  workDescription: string
}

// Update entry interface
interface JobEntry {
  ...existing fields,
  structuredDescription: StructuredDescription
}

// REPLACE TextField at line ~220 with:
<Box sx={{ mb: 2 }}>
  <Typography variant="subtitle2" gutterBottom>
    Work Details * (All fields required)
  </Typography>

  <TextField
    label="Location *"
    fullWidth
    value={entry.structuredDescription?.location || ''}
    onChange={(e) => updateEntry(entry.id, 'structuredDescription', {
      ...entry.structuredDescription,
      location: e.target.value
    })}
    placeholder="e.g., Pawnee City"
    required
    sx={{ mb: 1 }}
  />

  <TextField
    label="Job/Area *"
    fullWidth
    value={entry.structuredDescription?.job || ''}
    onChange={(e) => updateEntry(entry.id, 'structuredDescription', {
      ...entry.structuredDescription,
      job: e.target.value
    })}
    placeholder="e.g., Bin 21"
    required
    sx={{ mb: 1 }}
  />

  <TextField
    label="Work Description *"
    fullWidth
    multiline
    rows={2}
    value={entry.structuredDescription?.workDescription || ''}
    onChange={(e) => updateEntry(entry.id, 'structuredDescription', {
      ...entry.structuredDescription,
      workDescription: e.target.value
    })}
    placeholder="Describe work performed..."
    required
  />
</Box>
```

**Validation Update:**
```typescript
const validateEntries = () => {
  for (const entry of entries) {
    const desc = entry.structuredDescription
    if (!desc?.location || !desc?.job || !desc?.workDescription) {
      setError('All description fields are required (Location, Job, Work Description)')
      return false
    }
    if (desc.workDescription.length < 10) {
      setError('Work description must be at least 10 characters')
      return false
    }
  }
  return true
}
```

**Estimated Time:** 2 hours

---

#### 2.2 Database Schema Changes
**File:** `/src/lib/db-migrations/2025-10-07-structured-description.sql` (NEW)

```sql
-- Add structured description fields
ALTER TABLE "TimeEntry"
  ADD COLUMN "locationDescription" TEXT,
  ADD COLUMN "jobAreaDescription" TEXT,
  ADD COLUMN "workDescription" TEXT;

-- Migrate existing descriptions to workDescription
UPDATE "TimeEntry"
SET "workDescription" = description
WHERE description IS NOT NULL AND "workDescription" IS NULL;

-- Keep description for backward compatibility but make it computed
-- description = location + ' - ' + jobArea + ' - ' + workDescription
```

**Estimated Time:** 1 hour

---

#### 2.3 API Updates
**File:** `/src/app/api/time-entries/bulk/route.ts`

```typescript
// Accept structured description
const { location, job, workDescription } = entry.structuredDescription

// Combine for legacy description field
const combinedDescription = `${location} - ${job} - ${workDescription}`

await query(`
  INSERT INTO "TimeEntry" (
    ...,
    "locationDescription", "jobAreaDescription", "workDescription", description
  ) VALUES (..., $1, $2, $3, $4)
`, [..., location, job, workDescription, combinedDescription])
```

**Estimated Time:** 1 hour

---

**PHASE 2 TOTAL:** 4 hours

**Testing Checklist:**
- [ ] Three description fields display
- [ ] All fields marked as required
- [ ] Validation prevents empty submissions
- [ ] Location, Job, Work Description saved separately
- [ ] Combined description generated for reports
- [ ] Existing entries migrated correctly

---

## PHASE 3: MATERIALS SECTION ON TIME CARD (Priority: HIGH)

### Objective
Allow employees to log materials used on time entries

### Current State Analysis
- **Material System:** Exists in `/src/components/materials/` but NOT linked to time entries
- **Gap:** No TimeEntryMaterial table or relationship

### Changes Required

#### 3.1 Database Schema Changes
**File:** `/src/lib/db-migrations/2025-10-07-time-entry-materials.sql` (NEW)

```sql
CREATE TABLE "TimeEntryMaterial" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "timeEntryId" UUID NOT NULL REFERENCES "TimeEntry"(id) ON DELETE CASCADE,
  "materialId" UUID REFERENCES "Material"(id),  -- NULL if custom material
  "materialName" TEXT NOT NULL,  -- For custom materials or cache
  quantity DECIMAL(10,2) NOT NULL,
  "unitPrice" DECIMAL(10,2),  -- Optional, admin fills later
  "totalCost" DECIMAL(10,2),  -- Auto-calculated
  "offTruck" BOOLEAN DEFAULT false,  -- Material taken from truck inventory
  "packingSlipUrl" TEXT,  -- Photo of packing slip
  notes TEXT,
  "addedBy" UUID REFERENCES "User"(id),
  "addedAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_timeentrymaterial_entry ON "TimeEntryMaterial"("timeEntryId");
CREATE INDEX idx_timeentrymaterial_material ON "TimeEntryMaterial"("materialId");
```

**Estimated Time:** 1 hour

---

#### 3.2 UI Component - Materials Section
**File:** `/src/components/time/TimeEntryMaterialsSection.tsx` (NEW - 200 lines)

```typescript
interface TimeEntryMaterial {
  id: string
  materialId?: string
  materialName: string
  quantity: number
  unitPrice?: number
  offTruck: boolean
  packingSlipUrl?: string
  notes?: string
}

export function TimeEntryMaterialsSection({
  materials,
  onAdd,
  onUpdate,
  onRemove
}: Props) {
  const [materialList, setMaterialList] = useState<TimeEntryMaterial[]>(materials)
  const [availableMaterials, setAvailableMaterials] = useState([])

  useEffect(() => {
    // Fetch materials from API
    fetch('/api/materials?inStock=true')
      .then(res => res.json())
      .then(data => setAvailableMaterials(data))
  }, [])

  const addMaterial = () => {
    const newMaterial: TimeEntryMaterial = {
      id: uuidv4(),
      materialName: '',
      quantity: 0,
      offTruck: false
    }
    setMaterialList([...materialList, newMaterial])
  }

  return (
    <Card sx={{ mt: 2, mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Materials Used
        </Typography>

        {materialList.map((material, index) => (
          <Box key={material.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <Autocomplete
                  options={availableMaterials}
                  getOptionLabel={(option) => option.name}
                  value={availableMaterials.find(m => m.id === material.materialId) || null}
                  onChange={(e, value) => {
                    onUpdate(index, 'materialId', value?.id)
                    onUpdate(index, 'materialName', value?.name)
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Material *"
                      placeholder="Select or type material name"
                    />
                  )}
                  freeSolo  // Allow custom entries
                />
              </Grid>

              <Grid item xs={6} md={2}>
                <TextField
                  label="Quantity *"
                  type="number"
                  value={material.quantity}
                  onChange={(e) => onUpdate(index, 'quantity', parseFloat(e.target.value))}
                  inputProps={{ min: 0, step: 0.01 }}
                  fullWidth
                />
              </Grid>

              <Grid item xs={6} md={2}>
                <TextField
                  label="Price (Admin Only)"
                  type="number"
                  value={material.unitPrice || ''}
                  onChange={(e) => onUpdate(index, 'unitPrice', parseFloat(e.target.value))}
                  inputProps={{ min: 0, step: 0.01 }}
                  fullWidth
                  disabled={!isAdmin}  // Only admins can edit price
                  helperText={!isAdmin ? "Admin will fill this" : ""}
                />
              </Grid>

              <Grid item xs={6} md={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={material.offTruck}
                      onChange={(e) => onUpdate(index, 'offTruck', e.target.checked)}
                    />
                  }
                  label="Off Truck"
                />
              </Grid>

              <Grid item xs={6} md={1}>
                <IconButton onClick={() => onRemove(index)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>

            <Box sx={{ mt: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PhotoCameraIcon />}
                component="label"
              >
                Upload Packing Slip
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => handlePackingSlipUpload(e, index)}
                />
              </Button>
              {material.packingSlipUrl && (
                <Chip
                  label="Slip attached"
                  color="success"
                  size="small"
                  sx={{ ml: 1 }}
                  onDelete={() => onUpdate(index, 'packingSlipUrl', null)}
                />
              )}
            </Box>
          </Box>
        ))}

        <Button
          variant="outlined"
          onClick={addMaterial}
          startIcon={<AddIcon />}
        >
          Add Material
        </Button>
      </CardContent>
    </Card>
  )
}
```

**Estimated Time:** 4 hours

---

#### 3.3 Integration into MultiJobTimeEntry
**File:** `/src/components/time/MultiJobTimeEntry.tsx`

**Insertion Point:** Line ~350 (after job entries, before submit button)

```typescript
import { TimeEntryMaterialsSection } from './TimeEntryMaterialsSection'

// Add to state
const [materials, setMaterials] = useState<TimeEntryMaterial[]>([])

// Add handlers
const handleAddMaterial = (material: TimeEntryMaterial) => {
  setMaterials([...materials, material])
}

const handleUpdateMaterial = (index: number, field: string, value: any) => {
  const updated = [...materials]
  updated[index] = { ...updated[index], [field]: value }
  setMaterials(updated)
}

const handleRemoveMaterial = (index: number) => {
  setMaterials(materials.filter((_, i) => i !== index))
}

// Insert component
<TimeEntryMaterialsSection
  materials={materials}
  onAdd={handleAddMaterial}
  onUpdate={handleUpdateMaterial}
  onRemove={handleRemoveMaterial}
/>
```

**Estimated Time:** 2 hours

---

#### 3.4 API - Save Materials with Time Entry
**File:** `/src/app/api/time-entries/bulk/route.ts`

```typescript
// Accept materials in request body
const { entries, userId, date, materials } = req.body

// After creating time entries
for (const entry of createdEntries) {
  // Save materials for this entry
  const entryMaterials = materials.filter(m => m.entryId === entry.tempId)

  for (const material of entryMaterials) {
    await query(`
      INSERT INTO "TimeEntryMaterial" (
        "timeEntryId", "materialId", "materialName", quantity,
        "unitPrice", "offTruck", "packingSlipUrl", "addedBy"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      entry.id,
      material.materialId,
      material.materialName,
      material.quantity,
      material.unitPrice,
      material.offTruck,
      material.packingSlipUrl,
      userId
    ])

    // If offTruck, update truck inventory
    if (material.offTruck && material.materialId) {
      await query(`
        UPDATE "Material"
        SET "inStock" = "inStock" - $1
        WHERE id = $2
      `, [material.quantity, material.materialId])

      // Log stock movement
      await query(`
        INSERT INTO "StockMovement" (
          "materialId", "movementType", quantity, reference, "userId"
        ) VALUES ($1, 'USED_ON_JOB', $2, $3, $4)
      `, [material.materialId, -material.quantity, `Time Entry ${entry.id}`, userId])
    }
  }
}
```

**Estimated Time:** 3 hours

---

#### 3.5 API - Get Materials for Entry
**File:** `/src/app/api/time-entries/[id]/materials/route.ts` (NEW)

```typescript
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params

  const result = await query(`
    SELECT
      tem.*,
      m.name as "materialName",
      m."unitCost",
      m."inStock"
    FROM "TimeEntryMaterial" tem
    LEFT JOIN "Material" m ON tem."materialId" = m.id
    WHERE tem."timeEntryId" = $1
    ORDER BY tem."addedAt"
  `, [id])

  return NextResponse.json(result.rows)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id: timeEntryId } = params
  const { materialId, materialName, quantity, offTruck, packingSlipUrl } = await req.json()

  // Validate time entry exists and user has access
  // ...

  const result = await query(`
    INSERT INTO "TimeEntryMaterial" (
      "timeEntryId", "materialId", "materialName", quantity,
      "offTruck", "packingSlipUrl", "addedBy"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [timeEntryId, materialId, materialName, quantity, offTruck, packingSlipUrl, userId])

  return NextResponse.json(result.rows[0])
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { materialId } = await req.json()

  await query(`DELETE FROM "TimeEntryMaterial" WHERE id = $1`, [materialId])

  return NextResponse.json({ success: true })
}
```

**Estimated Time:** 2 hours

---

**PHASE 3 TOTAL:** 12 hours

**Testing Checklist:**
- [ ] Materials section displays on time card
- [ ] Can search/select from existing materials
- [ ] Can add custom material names
- [ ] Quantity input works
- [ ] "Off truck" checkbox updates inventory
- [ ] Packing slip upload works
- [ ] Materials saved with time entry
- [ ] Materials display in time entry review

---

## PHASE 4: ADDITIONAL UPLOADS (Fuel, Job Photos, Parts) (Priority: MEDIUM)

### Objective
Allow multiple file types on time entries

### Current State Analysis
- **File:** `/src/app/api/time-entries/[id]/photos/route.ts` - Only handles photos
- **Table:** `TimeEntryPhoto` - Limited to photos

### Changes Required

#### 4.1 Database Schema Enhancement
**File:** `/src/lib/db-migrations/2025-10-07-time-entry-attachments.sql` (NEW)

```sql
-- Rename table for clarity
ALTER TABLE "TimeEntryPhoto" RENAME TO "TimeEntryAttachment";

-- Add attachment type
ALTER TABLE "TimeEntryAttachment"
  ADD COLUMN "attachmentType" VARCHAR(30) DEFAULT 'PHOTO';

-- Valid types: PHOTO, FUEL_TICKET, PACKING_SLIP, PARTS_PHOTO, OTHER

-- Add attachment metadata
ALTER TABLE "TimeEntryAttachment"
  ADD COLUMN "attachmentCategory" VARCHAR(30),  -- MATERIAL, FUEL, PARTS, JOB
  ADD COLUMN "attachmentNotes" TEXT;

-- Update existing records
UPDATE "TimeEntryAttachment"
SET "attachmentType" = 'PHOTO', "attachmentCategory" = 'JOB'
WHERE "attachmentType" IS NULL;
```

**Estimated Time:** 1 hour

---

#### 4.2 UI Component - Multi-Upload Section
**File:** `/src/components/time/TimeEntryAttachments.tsx` (NEW - 300 lines)

```typescript
interface Attachment {
  id: string
  type: 'PHOTO' | 'FUEL_TICKET' | 'PACKING_SLIP' | 'PARTS_PHOTO'
  category: 'MATERIAL' | 'FUEL' | 'PARTS' | 'JOB'
  url: string
  fileName: string
  uploadedAt: string
  notes?: string
}

export function TimeEntryAttachments({ timeEntryId, attachments, onUpload, onDelete }: Props) {
  const [activeTab, setActiveTab] = useState(0)
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (file: File, type: string, category: string) => {
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    formData.append('category', category)

    const res = await fetch(`/api/time-entries/${timeEntryId}/attachments`, {
      method: 'POST',
      body: formData
    })

    if (res.ok) {
      const attachment = await res.json()
      onUpload(attachment)
    }

    setUploading(false)
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Attachments
        </Typography>

        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Job Photos" />
          <Tab label="Fuel Tickets" />
          <Tab label="Material Slips" />
          <Tab label="Parts Photos" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {/* Job Photos */}
          <Button
            variant="outlined"
            component="label"
            startIcon={<PhotoCameraIcon />}
            disabled={uploading}
          >
            Upload Job Photo
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => handleFileUpload(e.target.files[0], 'PHOTO', 'JOB')}
            />
          </Button>

          <ImageList cols={3} gap={8} sx={{ mt: 2 }}>
            {attachments
              .filter(a => a.type === 'PHOTO' && a.category === 'JOB')
              .map(att => (
                <ImageListItem key={att.id}>
                  <img src={att.url} alt={att.fileName} loading="lazy" />
                  <ImageListItemBar
                    title={att.fileName}
                    actionIcon={
                      <IconButton onClick={() => onDelete(att.id)}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  />
                </ImageListItem>
              ))}
          </ImageList>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {/* Fuel Tickets */}
          <Button
            variant="outlined"
            component="label"
            startIcon={<LocalGasStationIcon />}
            disabled={uploading}
          >
            Upload Fuel Ticket
            <input
              type="file"
              hidden
              accept="image/*,.pdf"
              onChange={(e) => handleFileUpload(e.target.files[0], 'FUEL_TICKET', 'FUEL')}
            />
          </Button>

          <List>
            {attachments
              .filter(a => a.type === 'FUEL_TICKET')
              .map(att => (
                <ListItem key={att.id}>
                  <ListItemIcon>
                    <ReceiptIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={att.fileName}
                    secondary={new Date(att.uploadedAt).toLocaleString()}
                  />
                  <ListItemSecondaryAction>
                    <IconButton onClick={() => window.open(att.url)}>
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton onClick={() => onDelete(att.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
          </List>
        </TabPanel>

        {/* Similar for tabs 2 and 3 */}
      </CardContent>
    </Card>
  )
}
```

**Estimated Time:** 4 hours

---

#### 4.3 API Updates
**File:** `/src/app/api/time-entries/[id]/attachments/route.ts` (RENAME from photos)

```typescript
// Update to handle all attachment types
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const type = formData.get('type') as string  // NEW
  const category = formData.get('category') as string  // NEW

  // Validate file type based on attachment type
  const validTypes: Record<string, string[]> = {
    PHOTO: ['image/jpeg', 'image/png', 'image/webp'],
    FUEL_TICKET: ['image/jpeg', 'image/png', 'application/pdf'],
    PACKING_SLIP: ['image/jpeg', 'image/png', 'application/pdf'],
    PARTS_PHOTO: ['image/jpeg', 'image/png', 'image/webp']
  }

  if (!validTypes[type]?.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  // Save file
  const fileName = `${Date.now()}-${file.name}`
  const uploadPath = path.join(process.cwd(), 'public', 'uploads', 'time-entries', fileName)

  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(uploadPath, buffer)

  const fileUrl = `/uploads/time-entries/${fileName}`

  // Save to database
  const result = await query(`
    INSERT INTO "TimeEntryAttachment" (
      "timeEntryId", "attachmentType", "attachmentCategory",
      "photoUrl", "fileName", "fileSize", "mimeType", "uploadedBy"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    params.id, type, category, fileUrl,
    file.name, file.size, file.type, userId
  ])

  return NextResponse.json(result.rows[0])
}
```

**Estimated Time:** 2 hours

---

**PHASE 4 TOTAL:** 7 hours

**Testing Checklist:**
- [ ] Can upload job photos
- [ ] Can upload fuel tickets (image/PDF)
- [ ] Can upload packing slips
- [ ] Can upload parts photos
- [ ] Attachments display in correct tabs
- [ ] Can delete attachments
- [ ] File types validated correctly

---

## PHASE 5: JOB/PO TERMINOLOGY & DISPLAY (Priority: MEDIUM)

### Objective
Change "Purchase Order" → "Job Number" and add "Customer PO" field

### Current State Analysis
- **Jobs:** Use "jobNumber" field already (e.g., "25-001-001")
- **Display:** Shows job number in autocomplete
- **Gap:** No "Customer PO" field

### Changes Required

#### 5.1 Database Schema
**File:** `/src/lib/db-migrations/2025-10-07-customer-po.sql` (NEW)

```sql
ALTER TABLE "Job"
  ADD COLUMN "customerPO" TEXT;

CREATE INDEX idx_job_customer_po ON "Job"("customerPO");
```

**Estimated Time:** 30 minutes

---

#### 5.2 Job Display Enhancement
**File:** `/src/components/time/MultiJobTimeEntry.tsx`

**Update Autocomplete rendering (Line ~180):**

```typescript
<Autocomplete
  options={availableJobs}
  getOptionLabel={(job) => {
    // Show: JOB-001 - Tree Removal (Farmers Co-op, Pawnee City)
    return `${job.jobNumber} - ${job.title} (${job.customer}, ${job.location})`
  }}
  renderOption={(props, job) => (
    <li {...props}>
      <Box>
        <Typography variant="body1">
          <strong>{job.jobNumber}</strong> - {job.title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {job.customer} • {job.location} • {job.type}
        </Typography>
        {job.customerPO && (
          <Chip
            label={`Customer PO: ${job.customerPO}`}
            size="small"
            sx={{ ml: 1 }}
          />
        )}
      </Box>
    </li>
  )}
  // ...
/>
```

**Estimated Time:** 1 hour

---

#### 5.3 Update Job API Response
**File:** `/src/app/api/jobs/route.ts`

```typescript
// Include customerPO in response
SELECT
  j.id,
  j."jobNumber",
  j.title,
  j.type,
  j."customerPO",  -- NEW
  c.name as customer,
  j.location
FROM "Job" j
LEFT JOIN "Customer" c ON j."customerId" = c.id
WHERE j.status IN ('estimate', 'scheduled', 'dispatched', 'in_progress')
```

**Estimated Time:** 30 minutes

---

**PHASE 5 TOTAL:** 2 hours

**Testing Checklist:**
- [ ] Job display shows customer and location
- [ ] Customer PO displays if present
- [ ] Multiple jobs at same location distinguishable
- [ ] Job selection clear and informative

---

## PHASE 6: EMPLOYEE JOB CREATION & CALENDAR PERMISSIONS (Priority: MEDIUM)

### Objective
1. Allow employees to create jobs from time card (pending admin approval)
2. Hide calendar from employees, show "Upcoming Jobs" instead

### Current State Analysis
- **Calendar:** `/src/components/calendar/` components exist
- **Scheduling:** `/src/components/schedule/` components exist
- **Gap:** No role-based visibility

### Changes Required

#### 6.1 Employee Job Creation from Time Card
**File:** `/src/components/time/MultiJobTimeEntry.tsx`

**Add "Create New Job" option in job autocomplete:**

```typescript
<Autocomplete
  options={[...availableJobs, { id: 'CREATE_NEW', jobNumber: '+ Create New Job', isNewJob: true }]}
  getOptionLabel={(job) => job.jobNumber}
  onChange={(e, value) => {
    if (value?.isNewJob) {
      setShowCreateJobDialog(true)
    } else {
      handleJobSelect(value)
    }
  }}
  // ...
/>

{/* Create Job Dialog */}
<Dialog open={showCreateJobDialog} onClose={() => setShowCreateJobDialog(false)}>
  <DialogTitle>Request New Job</DialogTitle>
  <DialogContent>
    <TextField
      label="Job Title *"
      fullWidth
      value={newJob.title}
      onChange={(e) => setNewJob({...newJob, title: e.target.value})}
      sx={{ mb: 2 }}
    />
    <TextField
      label="Customer *"
      fullWidth
      value={newJob.customer}
      onChange={(e) => setNewJob({...newJob, customer: e.target.value})}
      sx={{ mb: 2 }}
    />
    <TextField
      label="Location *"
      fullWidth
      value={newJob.location}
      onChange={(e) => setNewJob({...newJob, location: e.target.value})}
      sx={{ mb: 2 }}
    />
    <TextField
      label="Description"
      fullWidth
      multiline
      rows={3}
      value={newJob.description}
      onChange={(e) => setNewJob({...newJob, description: e.target.value})}
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setShowCreateJobDialog(false)}>Cancel</Button>
    <Button onClick={handleCreateJobRequest} variant="contained">
      Submit for Approval
    </Button>
  </DialogActions>
</Dialog>
```

**Estimated Time:** 2 hours

---

#### 6.2 Pending Job Requests Table & API
**File:** `/src/lib/db-migrations/2025-10-07-pending-job-requests.sql` (NEW)

```sql
CREATE TABLE "PendingJobRequest" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "requestedBy" UUID REFERENCES "User"(id),
  title TEXT NOT NULL,
  customer TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
  "requestedAt" TIMESTAMP DEFAULT NOW(),
  "reviewedBy" UUID REFERENCES "User"(id),
  "reviewedAt" TIMESTAMP,
  "rejectionReason" TEXT,
  "createdJobId" UUID REFERENCES "Job"(id)  -- Set when approved
);
```

**File:** `/src/app/api/jobs/requests/route.ts` (NEW)

```typescript
// POST - Employee creates job request
export async function POST(req: Request) {
  const { title, customer, location, description } = await req.json()
  const { userId } = await verifyToken(req)

  const result = await query(`
    INSERT INTO "PendingJobRequest" (
      "requestedBy", title, customer, location, description, status
    ) VALUES ($1, $2, $3, $4, $5, 'PENDING')
    RETURNING *
  `, [userId, title, customer, location, description])

  // Notify admins
  await notifyAdmins('JOB_REQUEST_SUBMITTED', {
    requestId: result.rows[0].id,
    requestedBy: userId,
    title
  })

  return NextResponse.json(result.rows[0])
}

// GET - Admin views pending requests
export async function GET(req: Request) {
  const result = await query(`
    SELECT
      pjr.*,
      u.name as "requestedByName"
    FROM "PendingJobRequest" pjr
    JOIN "User" u ON pjr."requestedBy" = u.id
    WHERE pjr.status = 'PENDING'
    ORDER BY pjr."requestedAt" DESC
  `)

  return NextResponse.json(result.rows)
}
```

**File:** `/src/app/api/jobs/requests/[id]/approve/route.ts` (NEW)

```typescript
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await verifyToken(req)
  const { id: requestId } = params

  // Get request details
  const request = await query(`
    SELECT * FROM "PendingJobRequest" WHERE id = $1
  `, [requestId])

  if (!request.rows[0]) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const { title, customer, location, description, requestedBy } = request.rows[0]

  // Create actual job
  const jobResult = await query(`
    INSERT INTO "Job" (
      title, "customerId", location, description, status, "createdBy"
    ) VALUES (
      $1,
      (SELECT id FROM "Customer" WHERE name ILIKE $2 LIMIT 1),  -- Try to find customer
      $3, $4, 'estimate', $5
    ) RETURNING *
  `, [title, customer, location, description, userId])

  const jobId = jobResult.rows[0].id

  // Update request
  await query(`
    UPDATE "PendingJobRequest"
    SET
      status = 'APPROVED',
      "reviewedBy" = $1,
      "reviewedAt" = NOW(),
      "createdJobId" = $2
    WHERE id = $3
  `, [userId, jobId, requestId])

  // Notify employee
  await notifyUser(requestedBy, 'JOB_REQUEST_APPROVED', {
    jobId,
    title
  })

  return NextResponse.json({ success: true, jobId })
}
```

**Estimated Time:** 3 hours

---

#### 6.3 Admin "Pending Job Requests" View
**File:** `/src/components/admin/PendingJobRequests.tsx` (NEW - 250 lines)

```typescript
export function PendingJobRequests() {
  const [requests, setRequests] = useState([])

  useEffect(() => {
    fetch('/api/jobs/requests')
      .then(res => res.json())
      .then(data => setRequests(data))
  }, [])

  const handleApprove = async (requestId: string) => {
    await fetch(`/api/jobs/requests/${requestId}/approve`, { method: 'POST' })
    // Refresh list
    fetchRequests()
  }

  const handleReject = async (requestId: string, reason: string) => {
    await fetch(`/api/jobs/requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    })
    fetchRequests()
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Pending New Job Requests
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Requested By</TableCell>
                <TableCell>Job Title</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map(req => (
                <TableRow key={req.id}>
                  <TableCell>{req.requestedByName}</TableCell>
                  <TableCell>{req.title}</TableCell>
                  <TableCell>{req.customer}</TableCell>
                  <TableCell>{req.location}</TableCell>
                  <TableCell>{formatDistanceToNow(new Date(req.requestedAt))} ago</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="success"
                      onClick={() => handleApprove(req.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleReject(req.id, '')}
                    >
                      Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}
```

**Add to Admin Dashboard:** `/src/app/(app)/admin/page.tsx`

**Estimated Time:** 2 hours

---

#### 6.4 Update Navigation
**File:** `/src/components/layout/ResponsiveSidebar.tsx`

**Find calendar/schedule menu items (approx line 100-150):**

```typescript
const menuItems = [
  {
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard',
    roles: ['ALL']
  },
  {
    label: 'Calendar',  // HIDE FROM EMPLOYEES
    icon: <CalendarIcon />,
    path: '/calendar',
    roles: ['OWNER_ADMIN', 'ADMIN', 'MANAGER', 'FOREMAN']  // NOT EMPLOYEE
  },
  {
    label: 'Upcoming Jobs',  // NEW - EMPLOYEE VIEW
    icon: <WorkIcon />,
    path: '/upcoming-jobs',
    roles: ['EMPLOYEE', 'FOREMAN']
  },
  // ...
]

// Filter by role
const visibleItems = menuItems.filter(item =>
  item.roles.includes('ALL') || item.roles.includes(currentUser.role)
)
```

**Estimated Time:** 1 hour

---

#### 6.2 Create Upcoming Jobs Page
**File:** `/src/app/(app)/upcoming-jobs/page.tsx` (NEW - 200 lines)

```typescript
export default function UpcomingJobsPage() {
  const [jobs, setJobs] = useState([])
  const { user } = useAuth()

  useEffect(() => {
    fetch(`/api/jobs/upcoming?userId=${user.id}`)
      .then(res => res.json())
      .then(data => setJobs(data))
  }, [user.id])

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Your Upcoming Jobs
      </Typography>

      <Tabs>
        <Tab label="Today" />
        <Tab label="Tomorrow" />
        <Tab label="This Week" />
      </Tabs>

      <List>
        {jobs.map(job => (
          <Card key={job.id} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6">
                {job.jobNumber} - {job.title}
              </Typography>
              <Typography color="text.secondary">
                {job.customer} • {job.location}
              </Typography>
              <Chip
                label={job.scheduledDate}
                icon={<CalendarIcon />}
                size="small"
              />
              <Chip
                label={job.estimatedHours + ' hrs'}
                size="small"
                sx={{ ml: 1 }}
              />
            </CardContent>
          </Card>
        ))}
      </List>
    </Container>
  )
}
```

**Estimated Time:** 3 hours

---

#### 6.3 Upcoming Jobs API
**File:** `/src/app/api/jobs/upcoming/route.ts` (NEW)

```typescript
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  const today = new Date()
  const tomorrow = addDays(today, 1)
  const weekEnd = addDays(today, 7)

  const result = await query(`
    SELECT
      j.*,
      c.name as customer,
      es."scheduledDate",
      es."estimatedHours"
    FROM "Job" j
    LEFT JOIN "Customer" c ON j."customerId" = c.id
    LEFT JOIN "EmployeeSchedule" es ON j.id = es."jobId"
    WHERE es."userId" = $1
      AND es."scheduledDate" BETWEEN $2 AND $3
      AND j.status IN ('scheduled', 'dispatched', 'in_progress')
    ORDER BY es."scheduledDate" ASC
  `, [userId, today, weekEnd])

  return NextResponse.json(result.rows)
}
```

**Estimated Time:** 2 hours

---

**PHASE 6 TOTAL:** 13 hours (was 6, added +7 for job creation feature)

**Testing Checklist:**
- [ ] Employees don't see calendar in navigation
- [ ] Employees see "Upcoming Jobs" option
- [ ] Today/Tomorrow/Week tabs work
- [ ] Jobs display with date and duration
- [ ] Admins still have calendar access

---

## PHASE 7: SUBMISSION PROCESS (Auto-Submit Sunday) (Priority: HIGH)

### Objective
Auto-submit timecards at 11:59 PM Sunday, with verification

### Current State Analysis
- **Submission:** Manual via "Submit Week" button
- **Gap:** No auto-submit, no verification system

### Changes Required

#### 7.1 Cron Job Setup
**File:** `/src/lib/cron/auto-submit-timecards.ts` (NEW)

```typescript
import { query } from '@/lib/db'
import { sendTimeEntrySubmittedNotification } from '@/lib/time-tracking-notifications'

export async function autoSubmitWeeklyTimecards() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const hour = now.getHours()
  const minute = now.getMinutes()

  // Only run on Sunday at 23:59
  if (dayOfWeek !== 0 || hour !== 23 || minute !== 59) {
    return
  }

  console.log('[AUTO-SUBMIT] Running weekly timecard auto-submit...')

  // Get all draft entries for the current week
  const weekStart = startOfWeek(now, { weekStartsOn: 0 })  // Sunday
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 })

  const draftEntries = await query(`
    SELECT
      te.*,
      u.name as "userName",
      u.email as "userEmail"
    FROM "TimeEntry" te
    JOIN "User" u ON te."userId" = u.id
    WHERE te.date BETWEEN $1 AND $2
      AND te.status = 'draft'
    ORDER BY te."userId", te.date
  `, [weekStart, weekEnd])

  // Group by user
  const entriesByUser = draftEntries.rows.reduce((acc, entry) => {
    if (!acc[entry.userId]) acc[entry.userId] = []
    acc[entry.userId].push(entry)
    return acc
  }, {})

  let totalSubmitted = 0

  for (const [userId, entries] of Object.entries(entriesByUser)) {
    try {
      // Submit all entries for this user
      for (const entry of entries) {
        await query(`
          UPDATE "TimeEntry"
          SET
            status = 'submitted',
            "submittedAt" = NOW(),
            "submittedBy" = $1
          WHERE id = $2
        `, [userId, entry.id])

        // Create audit log
        await query(`
          INSERT INTO "TimeEntryAudit" (
            id, entry_id, user_id, action, changed_by, changed_at,
            change_reason
          ) VALUES (
            gen_random_uuid(), $1, $2, 'AUTO_SUBMIT', $2, NOW(),
            'Automatically submitted at end of week'
          )
        `, [entry.id, userId])

        totalSubmitted++
      }

      // Send notification to admins
      await sendTimeEntrySubmittedNotification(
        userId,
        entries[0].userName,
        entries.length,
        weekStart.toISOString().split('T')[0]
      )

      // Create verification record
      await query(`
        INSERT INTO "TimeEntrySubmissionLog" (
          id, "userId", "weekStart", "weekEnd", "entryCount",
          "submittedAt", "submissionType", status
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, NOW(), 'AUTO', 'SUCCESS'
        )
      `, [userId, weekStart, weekEnd, entries.length])

    } catch (error) {
      console.error(`[AUTO-SUBMIT] Error submitting for user ${userId}:`, error)

      // Log failure
      await query(`
        INSERT INTO "TimeEntrySubmissionLog" (
          id, "userId", "weekStart", "weekEnd", "entryCount",
          "submittedAt", "submissionType", status, "errorMessage"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, NOW(), 'AUTO', 'FAILED', $5
        )
      `, [userId, weekStart, weekEnd, entries.length, error.message])
    }
  }

  console.log(`[AUTO-SUBMIT] Completed. Submitted ${totalSubmitted} entries.`)
}
```

**Estimated Time:** 3 hours

---

#### 7.2 Submission Log Table
**File:** `/src/lib/db-migrations/2025-10-07-submission-log.sql` (NEW)

```sql
CREATE TABLE "TimeEntrySubmissionLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES "User"(id),
  "weekStart" DATE NOT NULL,
  "weekEnd" DATE NOT NULL,
  "entryCount" INTEGER NOT NULL,
  "submittedAt" TIMESTAMP DEFAULT NOW(),
  "submissionType" VARCHAR(20) NOT NULL,  -- MANUAL, AUTO
  status VARCHAR(20) NOT NULL,  -- SUCCESS, FAILED, PENDING
  "errorMessage" TEXT,
  "verifiedAt" TIMESTAMP,
  "verifiedBy" UUID REFERENCES "User"(id)
);

CREATE INDEX idx_submission_log_user_week ON "TimeEntrySubmissionLog"("userId", "weekStart");
```

**Estimated Time:** 30 minutes

---

#### 7.3 Cron Job Registration
**File:** `/src/app/api/cron/auto-submit/route.ts` (NEW)

```typescript
import { autoSubmitWeeklyTimecards } from '@/lib/cron/auto-submit-timecards'

// Vercel Cron or Next.js cron job
export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  await autoSubmitWeeklyTimecards()

  return Response.json({ success: true })
}
```

**Vercel Configuration** - `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/reminder",
      "schedule": "0 20 * * 0"
    },
    {
      "path": "/api/cron/auto-submit",
      "schedule": "59 23 * * 0"
    }
  ]
}
```

**Estimated Time:** 1 hour

---

#### 7.4 Sunday 8 PM Reminder Cron
**File:** `/src/lib/cron/send-weekly-reminder.ts` (NEW)

```typescript
import { query } from '@/lib/db'
import { sendNotification } from '@/lib/notifications'

export async function sendWeeklyReminder() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const hour = now.getHours()

  // Only run on Sunday at 8 PM
  if (dayOfWeek !== 0 || hour !== 20) {
    return
  }

  console.log('[REMINDER] Sending weekly timecard reminder...')

  const weekStart = startOfWeek(now, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 })

  // Get all employees with draft entries for this week
  const employees = await query(`
    SELECT DISTINCT
      u.id,
      u.name,
      u.email,
      COUNT(te.id) as "draftCount"
    FROM "User" u
    JOIN "TimeEntry" te ON u.id = te."userId"
    WHERE te.date BETWEEN $1 AND $2
      AND te.status = 'draft'
      AND u.role = 'EMPLOYEE'
    GROUP BY u.id, u.name, u.email
  `, [weekStart, weekEnd])

  for (const employee of employees.rows) {
    await sendNotification({
      userId: employee.id,
      type: 'TIMECARD_REMINDER',
      subject: 'Reminder: Submit Your Timecard Tonight',
      message: `You have ${employee.draftCount} unsubmitted time entries for this week.
                Your timecard will be auto-submitted at 11:59 PM tonight.
                Please review and make any necessary changes before then.`,
      metadata: {
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        draftCount: employee.draftCount,
        autoSubmitTime: '11:59 PM'
      },
      channel: 'IN_APP'  // Could also be EMAIL or SMS
    })
  }

  console.log(`[REMINDER] Sent reminders to ${employees.rows.length} employees`)
}
```

**File:** `/src/app/api/cron/reminder/route.ts` (NEW)

```typescript
import { sendWeeklyReminder } from '@/lib/cron/send-weekly-reminder'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  await sendWeeklyReminder()

  return Response.json({ success: true })
}
```

**Estimated Time:** 1.5 hours

---

#### 7.5 Admin Can Edit Auto-Submitted Hours
**File:** `/src/app/api/time-entries/[id]/route.ts` (MODIFY)

**Update PATCH/PUT to allow admin editing of auto-submitted entries:**

```typescript
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId, role } = await verifyToken(req)
  const { id } = params
  const updates = await req.json()

  // Get entry
  const entry = await query(`SELECT * FROM "TimeEntry" WHERE id = $1`, [id])

  if (!entry.rows[0]) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  const isAdmin = ['OWNER_ADMIN', 'ADMIN', 'HR_MANAGER'].includes(role)
  const isAutoSubmitted = entry.rows[0].submittedBy === entry.rows[0].userId &&
                          entry.rows[0].status === 'submitted'

  // Allow admin to edit auto-submitted entries
  if (isAutoSubmitted && !isAdmin) {
    return NextResponse.json({
      error: 'This entry was auto-submitted. Please contact an admin to make changes.'
    }, { status: 403 })
  }

  // Rest of existing PATCH logic...
  // ...

  // Add audit note for admin edits on auto-submitted
  if (isAdmin && isAutoSubmitted) {
    await query(`
      INSERT INTO "TimeEntryAudit" (
        id, entry_id, user_id, action, changed_by, changed_at,
        change_reason
      ) VALUES (
        gen_random_uuid(), $1, $2, 'ADMIN_EDIT_AUTO_SUBMITTED', $3, NOW(),
        'Admin edited auto-submitted entry per employee request'
      )
    `, [id, entry.rows[0].userId, userId])
  }

  // ...rest of update logic
}
```

**Estimated Time:** 1 hour

---

#### 7.6 Submission Verification UI
**File:** `/src/components/time/SubmissionVerification.tsx` (NEW - 150 lines)

```typescript
export function SubmissionVerification({ userId, weekStart }: Props) {
  const [submissionLog, setSubmissionLog] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/time-entries/submission-log?userId=${userId}&weekStart=${weekStart}`)
      .then(res => res.json())
      .then(data => {
        setSubmissionLog(data)
        setLoading(false)
      })
  }, [userId, weekStart])

  if (loading) return <CircularProgress />

  if (!submissionLog) {
    return (
      <Alert severity="warning">
        No submission record found for this week.
      </Alert>
    )
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1}>
          {submissionLog.status === 'SUCCESS' ? (
            <>
              <CheckCircleIcon color="success" />
              <Typography variant="h6" color="success.main">
                Week Submitted Successfully
              </Typography>
            </>
          ) : (
            <>
              <ErrorIcon color="error" />
              <Typography variant="h6" color="error.main">
                Submission Failed
              </Typography>
            </>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Submission Type:
            </Typography>
            <Chip
              label={submissionLog.submissionType === 'AUTO' ? 'Auto-Submitted' : 'Manual'}
              size="small"
              color={submissionLog.submissionType === 'AUTO' ? 'primary' : 'default'}
            />
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Entries Submitted:
            </Typography>
            <Typography variant="body1">
              {submissionLog.entryCount} entries
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Submitted At:
            </Typography>
            <Typography variant="body1">
              {new Date(submissionLog.submittedAt).toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            {submissionLog.verifiedAt && (
              <>
                <Typography variant="body2" color="text.secondary">
                  Verified At:
                </Typography>
                <Typography variant="body1">
                  {new Date(submissionLog.verifiedAt).toLocaleString()}
                </Typography>
              </>
            )}
          </Grid>
        </Grid>

        {submissionLog.errorMessage && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Error: {submissionLog.errorMessage}
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
```

**Estimated Time:** 2 hours

---

#### 7.5 Update WeeklyTimesheetDisplay
**File:** `/src/components/time/WeeklyTimesheetDisplay.tsx`

**Add verification component (Line ~50):**

```typescript
import { SubmissionVerification } from './SubmissionVerification'

// In render, before timesheet grid:
<SubmissionVerification userId={userId} weekStart={weekStart} />

// Update submit button text
<Button
  variant="contained"
  onClick={handleSubmitWeek}
  disabled={!hasEntries || allSubmitted}
>
  Submit Time Card  {/* Changed from "Submit Week" */}
</Button>
```

**Estimated Time:** 30 minutes

---

**PHASE 7 TOTAL:** 9.5 hours (was 7, added +2.5 for reminder & admin edit features)

**Testing Checklist:**
- [ ] Cron job runs Sunday 11:59 PM
- [ ] Draft entries auto-submit
- [ ] Submission log created
- [ ] Admins notified of submissions
- [ ] Verification card displays status
- [ ] Manual submissions still work
- [ ] Error handling for failed submissions

---

## PHASE 8: PAYROLL SUMMARY REPORT (Priority: HIGH)

### Objective
Generate weekly payroll report by employee with category totals

### Current State Analysis
- **File:** `/src/app/api/time-entries/weekly-summary/route.ts` - Returns single user summary
- **Gap:** No company-wide payroll report

### Changes Required

#### 8.1 Payroll Report API
**File:** `/src/app/api/reports/payroll-summary/route.ts` (NEW)

```typescript
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('weekStart')
  const weekEnd = searchParams.get('weekEnd')

  // Get all submitted/approved entries for the week
  const result = await query(`
    SELECT
      u.id as "userId",
      u.name as "employeeName",
      u.email,
      te."hourCategory",
      SUM(te.hours) as "totalHours",
      SUM(te."estimatedPay") as "totalPay"
    FROM "TimeEntry" te
    JOIN "User" u ON te."userId" = u.id
    WHERE te.date BETWEEN $1 AND $2
      AND te.status IN ('submitted', 'approved')
    GROUP BY u.id, u.name, u.email, te."hourCategory"
    ORDER BY u.name, te."hourCategory"
  `, [weekStart, weekEnd])

  // Transform to employee-grouped structure
  const employeeData = result.rows.reduce((acc, row) => {
    if (!acc[row.userId]) {
      acc[row.userId] = {
        employeeId: row.userId,
        employeeName: row.employeeName,
        email: row.email,
        categories: {},
        totals: {
          totalHours: 0,
          totalPay: 0
        }
      }
    }

    const category = row.hourCategory || 'STRAIGHT_TIME'
    acc[row.userId].categories[category] = {
      hours: parseFloat(row.totalHours),
      pay: parseFloat(row.totalPay)
    }

    acc[row.userId].totals.totalHours += parseFloat(row.totalHours)
    acc[row.userId].totals.totalPay += parseFloat(row.totalPay)

    return acc
  }, {})

  return NextResponse.json({
    weekStart,
    weekEnd,
    employees: Object.values(employeeData),
    summary: {
      totalEmployees: Object.keys(employeeData).length,
      grandTotalHours: Object.values(employeeData).reduce((sum, emp) => sum + emp.totals.totalHours, 0),
      grandTotalPay: Object.values(employeeData).reduce((sum, emp) => sum + emp.totals.totalPay, 0)
    }
  })
}
```

**Estimated Time:** 2 hours

---

#### 8.2 Payroll Report UI
**File:** `/src/components/reports/PayrollSummaryReport.tsx` (NEW - 400 lines)

```typescript
export function PayrollSummaryReport() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchReport = async () => {
    setLoading(true)
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 })

    const res = await fetch(
      `/api/reports/payroll-summary?weekStart=${format(weekStart, 'yyyy-MM-dd')}&weekEnd=${format(weekEnd, 'yyyy-MM-dd')}`
    )
    const data = await res.json()
    setReportData(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchReport()
  }, [weekStart])

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    const rows = [
      ['Employee', 'Straight Time', 'Straight Travel', 'Overtime', 'OT Travel', 'Double Time', 'DT Travel', 'Total Hours', 'Total Pay'],
      ...reportData.employees.map(emp => [
        emp.employeeName,
        emp.categories.STRAIGHT_TIME?.hours || 0,
        emp.categories.STRAIGHT_TIME_TRAVEL?.hours || 0,
        emp.categories.OVERTIME?.hours || 0,
        emp.categories.OVERTIME_TRAVEL?.hours || 0,
        emp.categories.DOUBLE_TIME?.hours || 0,
        emp.categories.DOUBLE_TIME_TRAVEL?.hours || 0,
        emp.totals.totalHours,
        emp.totals.totalPay
      ])
    ]

    const csv = rows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll-summary-${format(weekStart, 'yyyy-MM-dd')}.csv`
    a.click()
  }

  if (loading) return <CircularProgress />

  return (
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Payroll Summary Report
        </Typography>

        <Box display="flex" gap={2}>
          <DatePicker
            label="Week Starting"
            value={weekStart}
            onChange={(date) => setWeekStart(startOfWeek(date, { weekStartsOn: 0 }))}
          />
          <Button variant="outlined" onClick={handlePrint} startIcon={<PrintIcon />}>
            Print
          </Button>
          <Button variant="outlined" onClick={handleExportCSV} startIcon={<DownloadIcon />}>
            Export CSV
          </Button>
        </Box>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Employee</strong></TableCell>
                <TableCell align="right">Straight Time</TableCell>
                <TableCell align="right">Straight Travel</TableCell>
                <TableCell align="right">Overtime</TableCell>
                <TableCell align="right">OT Travel</TableCell>
                <TableCell align="right">Double Time</TableCell>
                <TableCell align="right">DT Travel</TableCell>
                <TableCell align="right"><strong>Total Hours</strong></TableCell>
                <TableCell align="right"><strong>Total Pay</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportData?.employees.map(emp => (
                <TableRow key={emp.employeeId}>
                  <TableCell>{emp.employeeName}</TableCell>
                  <TableCell align="right">
                    {emp.categories.STRAIGHT_TIME?.hours.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell align="right">
                    {emp.categories.STRAIGHT_TIME_TRAVEL?.hours.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell align="right">
                    {emp.categories.OVERTIME?.hours.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell align="right">
                    {emp.categories.OVERTIME_TRAVEL?.hours.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell align="right">
                    {emp.categories.DOUBLE_TIME?.hours.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell align="right">
                    {emp.categories.DOUBLE_TIME_TRAVEL?.hours.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell align="right">
                    <strong>{emp.totals.totalHours.toFixed(2)}</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>${emp.totals.totalPay.toFixed(2)}</strong>
                  </TableCell>
                </TableRow>
              ))}

              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell colSpan={7}><strong>TOTALS</strong></TableCell>
                <TableCell align="right">
                  <strong>{reportData?.summary.grandTotalHours.toFixed(2)}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>${reportData?.summary.grandTotalPay.toFixed(2)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Alert severity="info" sx={{ mt: 2 }}>
        <strong>Note:</strong> Travel hours are tracked separately but do not affect pay rates.
        They are included for reporting purposes only.
      </Alert>
    </Container>
  )
}
```

**Estimated Time:** 4 hours

---

#### 8.3 Add to Navigation
**File:** `/src/components/layout/ResponsiveSidebar.tsx`

```typescript
{
  label: 'Payroll Summary',
  icon: <AssessmentIcon />,
  path: '/reports/payroll',
  roles: ['OWNER_ADMIN', 'ADMIN', 'HR_MANAGER']
}
```

**Estimated Time:** 30 minutes

---

**PHASE 8 TOTAL:** 6.5 hours

**Testing Checklist:**
- [ ] Report shows all employees for week
- [ ] Category hours calculated correctly
- [ ] Travel hours displayed separately
- [ ] Total hours and pay accurate
- [ ] Print functionality works
- [ ] CSV export includes all data
- [ ] Week navigation works

---

## PHASE 9: ADMIN TIME CARD MANAGEMENT & ESTIMATED HOURS (Priority: MEDIUM)

### Objective
Admin view/approve/reject entries + job estimated hours tracking

### Current State Analysis
- **Admin View:** `PendingJobEntries.tsx` exists but needs enhancement
- **Estimated Hours:** Job table has `estimatedHours` but not by hour type

### Changes Required

#### 9.1 Database Schema - Estimated Hours by Category
**File:** `/src/lib/db-migrations/2025-10-07-job-estimated-categories.sql` (NEW)

```sql
ALTER TABLE "Job"
  ADD COLUMN "estimatedStraightTime" DECIMAL(10,2),
  ADD COLUMN "estimatedOvertime" DECIMAL(10,2),
  ADD COLUMN "estimatedDoubleTime" DECIMAL(10,2);

-- Migrate existing estimatedHours to estimatedStraightTime
UPDATE "Job"
SET "estimatedStraightTime" = "estimatedHours"
WHERE "estimatedHours" IS NOT NULL;
```

**Estimated Time:** 30 minutes

---

#### 9.2 Job Hours Tracking View
**File:** `/src/components/admin/JobHoursTracking.tsx` (NEW - 300 lines)

```typescript
export function JobHoursTracking({ jobId }: Props) {
  const [job, setJob] = useState(null)
  const [actualHours, setActualHours] = useState(null)

  useEffect(() => {
    // Fetch job with estimated hours
    fetch(`/api/jobs/${jobId}`)
      .then(res => res.json())
      .then(data => setJob(data))

    // Fetch actual hours from time entries
    fetch(`/api/jobs/${jobId}/actual-hours`)
      .then(res => res.json())
      .then(data => setActualHours(data))
  }, [jobId])

  const calculateRemaining = (estimated, actual) => {
    return Math.max(0, (estimated || 0) - (actual || 0))
  }

  const calculateProgress = (estimated, actual) => {
    if (!estimated) return 0
    return Math.min(100, (actual / estimated) * 100)
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Job Hours Tracking
        </Typography>

        <Grid container spacing={3}>
          {/* Straight Time */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Straight Time
              </Typography>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6">
                  {actualHours?.straightTime.toFixed(1) || '0.0'} hrs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  / {job?.estimatedStraightTime?.toFixed(1) || '0.0'} est.
                </Typography>
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={calculateProgress(job?.estimatedStraightTime, actualHours?.straightTime)}
              color={actualHours?.straightTime > job?.estimatedStraightTime ? 'error' : 'primary'}
            />
            <Typography variant="caption" color="text.secondary">
              {calculateRemaining(job?.estimatedStraightTime, actualHours?.straightTime).toFixed(1)} hrs remaining
            </Typography>
          </Grid>

          {/* Overtime */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Overtime
              </Typography>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6">
                  {actualHours?.overtime.toFixed(1) || '0.0'} hrs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  / {job?.estimatedOvertime?.toFixed(1) || '0.0'} est.
                </Typography>
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={calculateProgress(job?.estimatedOvertime, actualHours?.overtime)}
              color={actualHours?.overtime > job?.estimatedOvertime ? 'error' : 'warning'}
            />
            <Typography variant="caption" color="text.secondary">
              {calculateRemaining(job?.estimatedOvertime, actualHours?.overtime).toFixed(1)} hrs remaining
            </Typography>
          </Grid>

          {/* Double Time */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Double Time
              </Typography>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6">
                  {actualHours?.doubleTime.toFixed(1) || '0.0'} hrs
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  / {job?.estimatedDoubleTime?.toFixed(1) || '0.0'} est.
                </Typography>
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={calculateProgress(job?.estimatedDoubleTime, actualHours?.doubleTime)}
              color={actualHours?.doubleTime > job?.estimatedDoubleTime ? 'error' : 'error'}
            />
            <Typography variant="caption" color="text.secondary">
              {calculateRemaining(job?.estimatedDoubleTime, actualHours?.doubleTime).toFixed(1)} hrs remaining
            </Typography>
          </Grid>
        </Grid>

        {/* Over Budget Warning */}
        {(actualHours?.straightTime > job?.estimatedStraightTime ||
          actualHours?.overtime > job?.estimatedOvertime ||
          actualHours?.doubleTime > job?.estimatedDoubleTime) && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Over Budget:</strong> This job has exceeded estimated hours in one or more categories.
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
```

**Estimated Time:** 3 hours

---

#### 9.3 API - Actual Hours by Job
**File:** `/src/app/api/jobs/[id]/actual-hours/route.ts` (NEW)

```typescript
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params

  const result = await query(`
    SELECT
      SUM(CASE WHEN "hourCategory" IN ('STRAIGHT_TIME', 'STRAIGHT_TIME_TRAVEL') THEN hours ELSE 0 END) as "straightTime",
      SUM(CASE WHEN "hourCategory" IN ('OVERTIME', 'OVERTIME_TRAVEL') THEN hours ELSE 0 END) as overtime,
      SUM(CASE WHEN "hourCategory" IN ('DOUBLE_TIME', 'DOUBLE_TIME_TRAVEL') THEN hours ELSE 0 END) as "doubleTime"
    FROM "TimeEntry"
    WHERE "jobId" = $1
      AND status IN ('submitted', 'approved')
  `, [id])

  return NextResponse.json({
    straightTime: parseFloat(result.rows[0]?.straightTime || 0),
    overtime: parseFloat(result.rows[0]?.overtime || 0),
    doubleTime: parseFloat(result.rows[0]?.doubleTime || 0)
  })
}
```

**Estimated Time:** 1 hour

---

#### 9.4 Enhanced Admin Approval View
**File:** `/src/components/admin/PendingJobEntries.tsx` (MODIFY)

**Add JobHoursTracking component and bulk actions:**

```typescript
import { JobHoursTracking } from './JobHoursTracking'

// In render, add filters and bulk actions
<Box display="flex" justifyContent="space-between" mb={2}>
  <TextField
    label="Filter by employee"
    value={employeeFilter}
    onChange={(e) => setEmployeeFilter(e.target.value)}
  />

  <Box display="flex" gap={2}>
    <Button
      variant="contained"
      color="success"
      onClick={handleBulkApprove}
      disabled={selectedEntries.length === 0}
    >
      Approve Selected ({selectedEntries.length})
    </Button>

    <Button
      variant="outlined"
      color="error"
      onClick={handleBulkReject}
      disabled={selectedEntries.length === 0}
    >
      Reject Selected
    </Button>
  </Box>
</Box>

// Add checkbox selection to table
<TableCell padding="checkbox">
  <Checkbox
    checked={selectedEntries.includes(entry.id)}
    onChange={() => toggleSelection(entry.id)}
  />
</TableCell>

// Show job hours tracking in expandable row
<TableRow>
  <TableCell colSpan={8}>
    <Collapse in={expandedJob === entry.jobId}>
      <JobHoursTracking jobId={entry.jobId} />
    </Collapse>
  </TableCell>
</TableRow>
```

**Estimated Time:** 3 hours

---

**PHASE 9 TOTAL:** 7.5 hours

**Testing Checklist:**
- [ ] Admin can view all pending entries
- [ ] Filter by employee works
- [ ] Bulk approve/reject functional
- [ ] Job hours tracking displays
- [ ] Estimated vs actual comparison accurate
- [ ] Over budget warnings show
- [ ] Edit approved entries (admin only) works

---

## FINAL IMPLEMENTATION SUMMARY

### Total Development Time by Phase

| Phase | Feature | Hours |
|-------|---------|-------|
| 1 | Hour Categories Dropdown | 8 |
| 2 | Mandatory Structured Description | 4 |
| 3 | Materials Section on Time Card | 12 |
| 4 | Additional Uploads (Fuel, Photos, Parts) | 7 |
| 5 | Job/PO Terminology & Display | 2 |
| 6 | Employee Job Creation & Calendar Permissions | 13 |
| 7 | Auto-Submit + Reminder + Admin Edit | 9.5 |
| 8 | Payroll Summary Report | 6.5 |
| 9 | Admin Management & Estimated Hours | 7.5 |
| **TOTAL** | | **69.5 hours** |

---

### Sequential Execution Order

**Week 1:**
- Day 1-2: Phase 1 (Hour Categories) - CRITICAL
- Day 2-3: Phase 2 (Description Fields) - HIGH
- Day 3-5: Phase 3 (Materials Integration) - HIGH

**Week 2:**
- Day 1-2: Phase 4 (Additional Uploads) - MEDIUM
- Day 2: Phase 5 (Job Display) - MEDIUM
- Day 3: Phase 6 (Calendar/Permissions) - MEDIUM
- Day 4-5: Phase 7 (Auto-Submit) - HIGH

**Week 3:**
- Day 1-2: Phase 8 (Payroll Report) - HIGH
- Day 2-3: Phase 9 (Admin Features) - MEDIUM
- Day 4-5: Testing, Bug Fixes, Documentation

---

### Files to Create (NEW)

**Database Migrations:**
1. `/src/lib/db-migrations/2025-10-07-hour-categories.sql`
2. `/src/lib/db-migrations/2025-10-07-structured-description.sql`
3. `/src/lib/db-migrations/2025-10-07-time-entry-materials.sql`
4. `/src/lib/db-migrations/2025-10-07-time-entry-attachments.sql`
5. `/src/lib/db-migrations/2025-10-07-customer-po.sql`
6. `/src/lib/db-migrations/2025-10-07-submission-log.sql`
7. `/src/lib/db-migrations/2025-10-07-job-estimated-categories.sql`

**Components:**
8. `/src/components/time/TimeEntryMaterialsSection.tsx`
9. `/src/components/time/TimeEntryAttachments.tsx`
10. `/src/components/time/SubmissionVerification.tsx`
11. `/src/components/reports/PayrollSummaryReport.tsx`
12. `/src/components/admin/JobHoursTracking.tsx`
13. `/src/app/(app)/upcoming-jobs/page.tsx`

**API Routes:**
14. `/src/app/api/time-entries/[id]/materials/route.ts`
15. `/src/app/api/time-entries/[id]/attachments/route.ts` (rename from photos)
16. `/src/app/api/jobs/upcoming/route.ts`
17. `/src/app/api/reports/payroll-summary/route.ts`
18. `/src/app/api/jobs/[id]/actual-hours/route.ts`
19. `/src/app/api/cron/auto-submit/route.ts`

**Libraries:**
20. `/src/lib/cron/auto-submit-timecards.ts`

---

### Files to Modify (EXISTING)

1. `/src/components/time/MultiJobTimeEntry.tsx` - Add categories, structured description, materials
2. `/src/components/time/WeeklyTimesheetDisplay.tsx` - Add verification, update button text
3. `/src/components/layout/ResponsiveSidebar.tsx` - Update navigation, hide calendar from employees
4. `/src/app/api/time-entries/bulk/route.ts` - Accept categories, structured desc, materials
5. `/src/app/api/time-entries/[id]/route.ts` - Handle category updates
6. `/src/app/api/time-entries/weekly-summary/route.ts` - Return category breakdown
7. `/src/app/api/jobs/route.ts` - Include customerPO in response
8. `/src/components/admin/PendingJobEntries.tsx` - Add job hours tracking, bulk actions

---

### Configuration Changes

**Vercel Cron (`vercel.json`):**
```json
{
  "crons": [{
    "path": "/api/cron/auto-submit",
    "schedule": "59 23 * * 0"
  }]
}
```

**Environment Variables (`.env.local`):**
```
CRON_SECRET=your-secret-here
```

---

### Testing Strategy

**Unit Tests:**
- [ ] Category pay calculation
- [ ] Structured description validation
- [ ] Material inventory updates
- [ ] Auto-submit logic

**Integration Tests:**
- [ ] Time entry creation with categories
- [ ] Materials attachment flow
- [ ] Submission verification
- [ ] Payroll report generation

**E2E Tests:**
- [ ] Employee creates entry with materials
- [ ] Employee submits week
- [ ] Admin approves/rejects
- [ ] Auto-submit Sunday night
- [ ] Payroll report accuracy

---

### Deployment Checklist

**Pre-Deployment:**
- [ ] Run all database migrations in order
- [ ] Test cron job locally
- [ ] Verify environment variables set
- [ ] Test file uploads (ensure storage configured)
- [ ] Verify email notifications working

**Deployment:**
- [ ] Deploy to staging first
- [ ] Test all 9 phases in staging
- [ ] Get client approval
- [ ] Deploy to production
- [ ] Monitor cron job execution
- [ ] Verify auto-submit works first Sunday

**Post-Deployment:**
- [ ] Train client on new features
- [ ] Document admin workflows
- [ ] Create employee quick guide
- [ ] Monitor for issues first week

---

### Client Answers - CONFIRMED ✅

1. **Job Creation:** ✅ Employees CAN create new jobs from time card → Goes to "Pending New Job Entries" for admin approval
2. **Missed Auto-Submit:** ✅ Employee contacts admin → Admin can edit auto-submitted hours
3. **Reminder Notifications:** ✅ YES - Send reminder Sunday at 8 PM (3h 59m before auto-submit)
4. **Material Pricing:** ✅ Admin only - Employee fields disabled/empty
5. **Estimated Hours:** ✅ Admin-only - Remove from employee view completely
6. **Over-Budget Alerts:** ✅ Admin-only - Employees do NOT see over-budget warnings

---

## CONCLUSION

This plan provides a comprehensive, sequential approach to implementing all client requirements. Each phase is self-contained with clear deliverables, insertion points, and testing criteria. The existing codebase provides a solid foundation - we're primarily enhancing rather than rebuilding.

**Recommended Approach:**
1. Review this plan with the client
2. Get clarification on outstanding questions
3. Start with Phase 1 (most critical)
4. Complete phases sequentially
5. Test thoroughly between phases
6. Deploy in stages (test with you, then Derek, then all employees)

The system will be significantly enhanced while maintaining backward compatibility and data integrity.
