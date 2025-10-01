# Top 10 Critical Improvements - Implementation Plan
**Detailed Technical Implementation Guide**
*OTS-ERP-AWS Project*

---

## 📊 Overview

This document provides **step-by-step implementation instructions** for the Top 10 critical improvements identified in the comprehensive analysis.

**Total Estimated Time:** 25-30 days (5-6 weeks)
**Total Estimated Cost:** $30,000 - $40,000
**Expected ROI:** 300%+ in Year 1

---

# 1️⃣ COMPLETE OVERTIME CALCULATIONS

## 🎯 Goal
Implement accurate overtime calculations with rules: >8hrs/day = 1.5x, >40hrs/week = 1.5x, Sunday = 2x

## 📋 Current State Analysis
- ✅ OvertimeSettings table exists with configuration
- ✅ TimeEntry table has overtimeHours, doubleTimeHours columns
- ✅ Basic UI exists: `/src/components/admin/OvertimeSettings.tsx`
- ❌ Calculation logic incomplete in `/src/lib/timeCalculations.ts`
- ❌ Not applied automatically on time entry submission

## 🛠️ Implementation Steps

### Step 1: Enhance Time Calculation Library (4 hours)
**File:** `/src/lib/timeCalculations.ts`

```typescript
// Add comprehensive overtime calculation function

interface OvertimeRules {
  dailyOTThreshold: number      // 8 hours
  weeklyOTThreshold: number     // 40 hours
  otMultiplier: number          // 1.5x
  dtMultiplier: number          // 2.0x
  seventhDayOT: boolean         // true
}

interface TimeEntryInput {
  startTime: Date
  endTime: Date
  regularRate: number
  date: Date
  userId: string
  weekNumber: number
  dayOfWeek: number
  consecutiveDay: number
}

interface CalculatedTime {
  totalHours: number
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  regularPay: number
  overtimePay: number
  doubleTimePay: number
  totalPay: number
  breakdown: string
}

export async function calculateOvertimeHours(
  entry: TimeEntryInput,
  rules: OvertimeRules,
  weeklyHoursWorked: number
): Promise<CalculatedTime> {
  const totalHours = calculateHoursBetween(entry.startTime, entry.endTime)

  let regularHours = 0
  let overtimeHours = 0
  let doubleTimeHours = 0

  // Priority 1: Sunday/7th Consecutive Day = Double Time
  if (entry.dayOfWeek === 0 && rules.seventhDayOT) {
    doubleTimeHours = totalHours
  }
  // Priority 2: Daily Overtime (>8 hours in a day)
  else if (totalHours > rules.dailyOTThreshold) {
    regularHours = rules.dailyOTThreshold
    const excessHours = totalHours - rules.dailyOTThreshold

    // Check if over 12 hours = double time
    if (totalHours > 12) {
      overtimeHours = 12 - rules.dailyOTThreshold // Hours 8-12
      doubleTimeHours = totalHours - 12            // Hours >12
    } else {
      overtimeHours = excessHours
    }
  }
  // Priority 3: Weekly Overtime (>40 hours in week)
  else if (weeklyHoursWorked + totalHours > rules.weeklyOTThreshold) {
    const regularUpToWeekly = Math.max(0, rules.weeklyOTThreshold - weeklyHoursWorked)
    regularHours = regularUpToWeekly
    overtimeHours = totalHours - regularUpToWeekly
  }
  // Regular hours
  else {
    regularHours = totalHours
  }

  // Calculate pay
  const regularPay = regularHours * entry.regularRate
  const overtimePay = overtimeHours * entry.regularRate * rules.otMultiplier
  const doubleTimePay = doubleTimeHours * entry.regularRate * rules.dtMultiplier
  const totalPay = regularPay + overtimePay + doubleTimePay

  return {
    totalHours,
    regularHours: round(regularHours, 2),
    overtimeHours: round(overtimeHours, 2),
    doubleTimeHours: round(doubleTimeHours, 2),
    regularPay: round(regularPay, 2),
    overtimePay: round(overtimePay, 2),
    doubleTimePay: round(doubleTimePay, 2),
    totalPay: round(totalPay, 2),
    breakdown: generateBreakdown(regularHours, overtimeHours, doubleTimeHours)
  }
}

function generateBreakdown(regular: number, overtime: number, doubletime: number): string {
  const parts = []
  if (regular > 0) parts.push(`${regular}h regular`)
  if (overtime > 0) parts.push(`${overtime}h OT (1.5x)`)
  if (doubletime > 0) parts.push(`${doubletime}h DT (2x)`)
  return parts.join(', ')
}

function round(num: number, decimals: number): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

// Helper to get weekly hours worked so far
export async function getWeeklyHoursForUser(
  userId: string,
  weekNumber: number,
  year: number
): Promise<number> {
  const result = await query(
    `SELECT COALESCE(SUM("hoursWorked"), 0) as total
     FROM "TimeEntry"
     WHERE "userId" = $1
       AND "weekNumber" = $2
       AND EXTRACT(YEAR FROM date) = $3
       AND "endTime" IS NOT NULL`,
    [userId, weekNumber, year]
  )
  return parseFloat(result.rows[0].total)
}
```

---

### Step 2: Update Time Entry API to Auto-Calculate (3 hours)
**File:** `/src/app/api/time-entries/[id]/route.ts` (clock-out endpoint)

```typescript
import { calculateOvertimeHours, getWeeklyHoursForUser } from '@/lib/timeCalculations'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // ... existing auth code ...

    const body = await request.json()
    const { endTime, hoursWorked } = body

    // Get time entry
    const entryResult = await query(
      'SELECT * FROM "TimeEntry" WHERE id = $1',
      [params.id]
    )
    const entry = entryResult.rows[0]

    // Get overtime settings
    const settingsResult = await query(
      'SELECT * FROM "OvertimeSettings" WHERE active = true LIMIT 1'
    )
    const rules = settingsResult.rows[0] || getDefaultRules()

    // Get user's pay rate
    const userResult = await query(
      'SELECT "regularRate", "overtimeRate", "doubleTimeRate" FROM "User" WHERE id = $1',
      [entry.userId]
    )
    const user = userResult.rows[0]

    // Get weekly hours worked (excluding current entry)
    const weeklyHours = await getWeeklyHoursForUser(
      entry.userId,
      entry.weekNumber,
      new Date(entry.date).getFullYear()
    )

    // Calculate overtime
    const calculated = await calculateOvertimeHours(
      {
        startTime: new Date(entry.startTime),
        endTime: new Date(endTime),
        regularRate: user.regularRate || 15.00,
        date: new Date(entry.date),
        userId: entry.userId,
        weekNumber: entry.weekNumber,
        dayOfWeek: new Date(entry.date).getDay(),
        consecutiveDay: entry.consecutiveDay || 1
      },
      rules,
      weeklyHours
    )

    // Update time entry with calculated values
    const updateResult = await query(
      `UPDATE "TimeEntry"
       SET "endTime" = $1,
           "hoursWorked" = $2,
           "regularHours" = $3,
           "overtimeHours" = $4,
           "doubleTimeHours" = $5,
           "regularPay" = $6,
           "overtimePay" = $7,
           "doubleTimePay" = $8,
           "totalPay" = $9,
           "autoCalculated" = true,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        endTime,
        calculated.totalHours,
        calculated.regularHours,
        calculated.overtimeHours,
        calculated.doubleTimeHours,
        calculated.regularPay,
        calculated.overtimePay,
        calculated.doubleTimePay,
        calculated.totalPay,
        params.id
      ]
    )

    return NextResponse.json({
      success: true,
      entry: updateResult.rows[0],
      breakdown: calculated.breakdown
    })
  } catch (error) {
    console.error('Error updating time entry:', error)
    return NextResponse.json({ error: 'Failed to update time entry' }, { status: 500 })
  }
}

function getDefaultRules() {
  return {
    dailyOTThreshold: 8,
    weeklyOTThreshold: 40,
    otMultiplier: 1.5,
    dtMultiplier: 2.0,
    seventhDayOT: true
  }
}
```

---

### Step 3: Add Database Columns if Missing (1 hour)
**File:** `/scripts/add-overtime-columns.sql`

```sql
-- Add overtime calculation columns to TimeEntry if missing

ALTER TABLE "TimeEntry"
ADD COLUMN IF NOT EXISTS "regularHours" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "regularPay" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "overtimePay" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "doubleTimePay" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalPay" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "autoCalculated" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "weekNumber" INTEGER,
ADD COLUMN IF NOT EXISTS "consecutiveDay" INTEGER DEFAULT 1;

-- Create index for weekly hours query
CREATE INDEX IF NOT EXISTS idx_timeentry_user_week
ON "TimeEntry"("userId", "weekNumber", date);

-- Add trigger to auto-calculate week number
CREATE OR REPLACE FUNCTION set_week_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW."weekNumber" = EXTRACT(WEEK FROM NEW.date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_week_number
BEFORE INSERT OR UPDATE ON "TimeEntry"
FOR EACH ROW
EXECUTE FUNCTION set_week_number();
```

Run migration:
```bash
psql postgresql://localhost/ots_erp_local -f scripts/add-overtime-columns.sql
```

---

### Step 4: Update UI to Show Breakdown (2 hours)
**File:** `/src/components/time/WeeklyTimesheetDisplay.tsx`

```tsx
// Add overtime breakdown display

interface TimeEntryRow {
  // ... existing fields ...
  regularHours?: number
  overtimeHours?: number
  doubleTimeHours?: number
  regularPay?: number
  overtimePay?: number
  doubleTimePay?: number
  totalPay?: number
  autoCalculated?: boolean
}

// In the table, add new columns:
<TableCell align="right">
  {entry.regularHours ? entry.regularHours.toFixed(2) : '-'}h
</TableCell>
<TableCell align="right">
  {entry.overtimeHours ? (
    <Chip
      label={`${entry.overtimeHours.toFixed(2)}h OT`}
      size="small"
      color="warning"
    />
  ) : '-'}
</TableCell>
<TableCell align="right">
  {entry.doubleTimeHours ? (
    <Chip
      label={`${entry.doubleTimeHours.toFixed(2)}h DT`}
      size="small"
      color="error"
    />
  ) : '-'}
</TableCell>
<TableCell align="right">
  <Typography variant="body2" fontWeight="bold">
    ${entry.totalPay?.toFixed(2) || '0.00'}
  </Typography>
  {entry.autoCalculated && (
    <Typography variant="caption" color="text.secondary">
      Auto-calculated
    </Typography>
  )}
</TableCell>
```

---

### Step 5: Add Overtime Summary Widget (2 hours)
**File:** `/src/components/admin/OvertimeSummary.tsx` (NEW)

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, Typography, Grid, Chip, Box } from '@mui/material'

interface OvertimeSummary {
  totalRegularHours: number
  totalOvertimeHours: number
  totalDoubleTimeHours: number
  totalRegularPay: number
  totalOvertimePay: number
  totalDoubleTimePay: number
  totalPay: number
}

export default function OvertimeSummary({ weekNumber, year }: { weekNumber: number, year: number }) {
  const [summary, setSummary] = useState<OvertimeSummary | null>(null)

  useEffect(() => {
    fetchSummary()
  }, [weekNumber, year])

  const fetchSummary = async () => {
    const res = await fetch(`/api/overtime/summary?week=${weekNumber}&year=${year}`)
    const data = await res.json()
    setSummary(data)
  }

  if (!summary) return null

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Overtime Summary - Week {weekNumber}, {year}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">Regular Hours</Typography>
              <Typography variant="h4">{summary.totalRegularHours.toFixed(1)}h</Typography>
              <Typography variant="body2">${summary.totalRegularPay.toFixed(2)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">Overtime (1.5x)</Typography>
              <Typography variant="h4">{summary.totalOvertimeHours.toFixed(1)}h</Typography>
              <Typography variant="body2">${summary.totalOvertimePay.toFixed(2)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">Double Time (2x)</Typography>
              <Typography variant="h4">{summary.totalDoubleTimeHours.toFixed(1)}h</Typography>
              <Typography variant="body2">${summary.totalDoubleTimePay.toFixed(2)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Total Payroll</Typography>
              <Typography variant="h3">${summary.totalPay.toFixed(2)}</Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
```

---

### Step 6: Create Overtime Summary API (1 hour)
**File:** `/src/app/api/overtime/summary/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week') || new Date().getWeek()
    const year = searchParams.get('year') || new Date().getFullYear()

    const result = await query(
      `SELECT
        COALESCE(SUM("regularHours"), 0) as "totalRegularHours",
        COALESCE(SUM("overtimeHours"), 0) as "totalOvertimeHours",
        COALESCE(SUM("doubleTimeHours"), 0) as "totalDoubleTimeHours",
        COALESCE(SUM("regularPay"), 0) as "totalRegularPay",
        COALESCE(SUM("overtimePay"), 0) as "totalOvertimePay",
        COALESCE(SUM("doubleTimePay"), 0) as "totalDoubleTimePay",
        COALESCE(SUM("totalPay"), 0) as "totalPay"
       FROM "TimeEntry"
       WHERE "weekNumber" = $1
         AND EXTRACT(YEAR FROM date) = $2
         AND "endTime" IS NOT NULL`,
      [week, year]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching overtime summary:', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
```

---

### Step 7: Testing & Validation (2 hours)
**Create test scenarios:**

```typescript
// Test cases to verify:
1. Regular 8-hour day = 8h regular, 0h OT
2. 10-hour day = 8h regular, 2h OT (1.5x)
3. 13-hour day = 8h regular, 4h OT, 1h DT
4. Sunday work = all hours DT (2x)
5. Weekly total >40hrs = OT after 40
6. 7th consecutive day = DT
```

**Manual Testing Steps:**
1. Create test user with regularRate = $20/hour
2. Log 8-hour time entry → Verify: 8h regular, $160 total
3. Log 10-hour time entry → Verify: 8h regular, 2h OT, $160 + $60 = $220
4. Log 10-hour Sunday entry → Verify: 10h DT, $400 total
5. Log 5 days x 8 hours + 1 day x 5 hours → Verify: last day has OT

---

## ✅ Completion Checklist
- [ ] timeCalculations.ts updated with comprehensive logic
- [ ] Time entry API applies auto-calculation on clock-out
- [ ] Database columns added (run migration)
- [ ] UI shows overtime breakdown
- [ ] Overtime summary widget created
- [ ] Summary API endpoint created
- [ ] Test scenarios pass
- [ ] Derek approves accuracy

**Time Required:** 15 hours (2 days)
**Priority:** 🔥 CRITICAL

---

# 2️⃣ FIX TIME TRACKING SELECTION ISSUES

## 🎯 Goal
Make job selection faster, more intuitive, with visual feedback and recent jobs

## 📋 Current State
- Basic autocomplete exists
- No visual feedback
- No recent jobs quick selection
- Search only by job number

## 🛠️ Implementation Steps

### Step 1: Enhance Job Autocomplete Component (3 hours)
**File:** `/src/components/time/MultiJobTimeEntry.tsx`

```tsx
// Add enhanced autocomplete with rich display

import { Autocomplete, TextField, Box, Chip, Typography, Avatar } from '@mui/material'
import { Work as JobIcon, Person as PersonIcon, Schedule as ClockIcon } from '@mui/icons-material'

interface Job {
  id: string
  jobNumber: string
  description: string
  customerName: string
  status: string
  estimatedHours: number
  actualHours: number
  assignedCrew: string[]
}

// Add recent jobs to state
const [recentJobs, setRecentJobs] = useState<Job[]>([])

useEffect(() => {
  fetchRecentJobs()
}, [])

const fetchRecentJobs = async () => {
  const res = await fetch('/api/time-entries/recent-jobs')
  const data = await res.json()
  setRecentJobs(data)
}

// Enhanced autocomplete render
<Autocomplete
  options={jobs}
  value={selectedJob}
  onChange={(e, newValue) => setSelectedJob(newValue)}
  getOptionLabel={(option) => `${option.jobNumber} - ${option.description}`}
  filterOptions={(options, { inputValue }) => {
    // Search across multiple fields
    const filtered = options.filter(option =>
      option.jobNumber.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.description.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.customerName.toLowerCase().includes(inputValue.toLowerCase())
    )

    // Show recent jobs first if no input
    if (!inputValue && recentJobs.length > 0) {
      return [...recentJobs, ...filtered.filter(j => !recentJobs.find(r => r.id === j.id))]
    }

    return filtered
  }}
  renderOption={(props, option) => (
    <Box component="li" {...props} sx={{ display: 'flex', gap: 2, p: 1.5 }}>
      <Avatar sx={{ bgcolor: getStatusColor(option.status) }}>
        <JobIcon />
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="body1" fontWeight="bold">
            {option.jobNumber}
          </Typography>
          <Chip
            label={option.status}
            size="small"
            color={getStatusColor(option.status)}
          />
          {recentJobs.find(r => r.id === option.id) && (
            <Chip label="Recent" size="small" variant="outlined" />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {option.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PersonIcon fontSize="small" />
            {option.customerName}
          </Typography>
          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ClockIcon fontSize="small" />
            {option.estimatedHours}h est.
          </Typography>
        </Box>
      </Box>
    </Box>
  )}
  renderInput={(params) => (
    <TextField
      {...params}
      label="Select Job"
      placeholder="Search by job number, description, or customer..."
      helperText="Start typing to search, or select from recent jobs"
    />
  )}
  renderTags={(value, getTagProps) =>
    value.map((option, index) => (
      <Chip
        label={option.jobNumber}
        {...getTagProps({ index })}
        icon={<JobIcon />}
      />
    ))
  }
  groupBy={(option) => {
    if (recentJobs.find(r => r.id === option.id)) {
      return 'Recent Jobs'
    }
    return 'All Jobs'
  }}
/>

function getStatusColor(status: string) {
  switch (status) {
    case 'IN_PROGRESS': return 'primary'
    case 'PENDING': return 'warning'
    case 'COMPLETED': return 'success'
    default: return 'default'
  }
}
```

---

### Step 2: Create Recent Jobs API (1 hour)
**File:** `/src/app/api/time-entries/recent-jobs/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)

    // Get user's 5 most recent jobs (from time entries)
    const result = await query(
      `SELECT DISTINCT ON (j.id)
        j.id,
        j."jobNumber",
        j.description,
        CONCAT(c."firstName", ' ', c."lastName") as "customerName",
        j.status,
        j."estimatedHours",
        COALESCE(SUM(te."hoursWorked"), 0) as "actualHours"
       FROM "TimeEntry" te
       JOIN "Job" j ON te."jobId" = j.id
       LEFT JOIN "Customer" c ON j."customerId" = c.id
       WHERE te."userId" = $1
       GROUP BY j.id, c."firstName", c."lastName"
       ORDER BY j.id, MAX(te."createdAt") DESC
       LIMIT 5`,
      [user.id]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching recent jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch recent jobs' }, { status: 500 })
  }
}
```

---

### Step 3: Add Keyboard Shortcuts (2 hours)
**File:** `/src/components/time/MultiJobTimeEntry.tsx`

```tsx
import { useEffect } from 'react'

// Add keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+J or Cmd+J = Focus job search
    if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
      e.preventDefault()
      document.getElementById('job-search-input')?.focus()
    }

    // Ctrl+Enter = Quick clock in with selected job
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (selectedJob) {
        handleClockIn()
      }
    }

    // Numbers 1-5 = Quick select recent job
    if (e.key >= '1' && e.key <= '5' && !e.ctrlKey && !e.metaKey) {
      const index = parseInt(e.key) - 1
      if (recentJobs[index]) {
        setSelectedJob(recentJobs[index])
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [selectedJob, recentJobs])

// Add keyboard shortcuts help tooltip
<Tooltip title={
  <Box>
    <Typography variant="caption" display="block">Keyboard Shortcuts:</Typography>
    <Typography variant="caption" display="block">• Ctrl+J: Focus search</Typography>
    <Typography variant="caption" display="block">• 1-5: Select recent job</Typography>
    <Typography variant="caption" display="block">• Ctrl+Enter: Clock in</Typography>
  </Box>
}>
  <IconButton size="small">
    <HelpIcon />
  </IconButton>
</Tooltip>
```

---

### Step 4: Add Visual Feedback (1 hour)
**File:** `/src/components/time/MultiJobTimeEntry.tsx`

```tsx
// Add selection confirmation
const [showConfirmation, setShowConfirmation] = useState(false)

const handleJobSelect = (job: Job) => {
  setSelectedJob(job)
  setShowConfirmation(true)
  setTimeout(() => setShowConfirmation(false), 2000)
}

// Visual confirmation
{showConfirmation && (
  <Alert
    severity="success"
    icon={<CheckCircleIcon />}
    sx={{ mb: 2 }}
  >
    Job selected: <strong>{selectedJob.jobNumber}</strong> - {selectedJob.description}
  </Alert>
)}

// Add pulse animation on selection
<Box
  sx={{
    animation: showConfirmation ? 'pulse 0.5s ease-in-out' : 'none',
    '@keyframes pulse': {
      '0%, 100%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.05)' }
    }
  }}
>
  {/* Job selection UI */}
</Box>
```

---

## ✅ Completion Checklist
- [ ] Enhanced autocomplete with rich display
- [ ] Recent jobs API created
- [ ] Keyboard shortcuts implemented
- [ ] Visual feedback added
- [ ] Search across multiple fields works
- [ ] Recent jobs show first
- [ ] User testing confirms improvement

**Time Required:** 7 hours (1 day)
**Priority:** 🔥 CRITICAL

---

# 3️⃣ TIGHTEN EMPLOYEE PERMISSIONS

## 🎯 Goal
Hide all financial data from employees, restrict to time entry only

## 📋 What to Hide from Employees
- ❌ Job revenue/billing amounts
- ❌ Job phases (UG, RI, FN details)
- ❌ Customer pricing
- ❌ Labor rates
- ❌ Material costs
- ❌ Profit margins
- ❌ Invoice amounts
- ❌ Dashboard financial stats

## 🛠️ Implementation Steps

### Step 1: Create Permission Helper Functions (2 hours)
**File:** `/src/lib/permissions.ts` (NEW)

```typescript
import { UserPayload } from './auth'

export function canViewFinancials(user: UserPayload): boolean {
  return ['OWNER_ADMIN', 'FOREMAN'].includes(user.role)
}

export function canViewJobCosts(user: UserPayload): boolean {
  return ['OWNER_ADMIN', 'FOREMAN'].includes(user.role)
}

export function canViewCustomerPricing(user: UserPayload): boolean {
  return ['OWNER_ADMIN', 'FOREMAN'].includes(user.role)
}

export function canViewMaterialCosts(user: UserPayload): boolean {
  return ['OWNER_ADMIN', 'FOREMAN'].includes(user.role)
}

export function canViewLaborRates(user: UserPayload): boolean {
  return ['OWNER_ADMIN', 'FOREMAN'].includes(user.role)
}

export function canManageJobs(user: UserPayload): boolean {
  return ['OWNER_ADMIN', 'FOREMAN'].includes(user.role)
}

export function canViewAllJobs(user: UserPayload): boolean {
  return ['OWNER_ADMIN', 'FOREMAN'].includes(user.role)
}

export function isEmployee(user: UserPayload): boolean {
  return user.role === 'EMPLOYEE'
}

// Field-level filtering
export function filterJobFields(job: any, user: UserPayload) {
  if (canViewFinancials(user)) {
    return job
  }

  // Remove financial fields for employees
  const {
    billedAmount,
    estimatedAmount,
    actualCost,
    profitMargin,
    laborCost,
    materialCost,
    equipmentCost,
    ...safeFields
  } = job

  return safeFields
}

export function filterCustomerFields(customer: any, user: UserPayload) {
  if (canViewCustomerPricing(user)) {
    return customer
  }

  const {
    lifetimeValue,
    averageInvoiceAmount,
    outstandingBalance,
    ...safeFields
  } = customer

  return safeFields
}
```

---

### Step 2: Update Dashboard API (2 hours)
**File:** `/src/app/api/dashboard/stats/route.ts`

```typescript
import { filterJobFields, canViewFinancials, isEmployee } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)

    // For employees, return limited stats
    if (isEmployee(user)) {
      const employeeStats = await query(
        `SELECT
          COUNT(*) as "assignedJobs",
          COALESCE(SUM(te."hoursWorked"), 0) as "totalHoursThisWeek"
         FROM "Job" j
         LEFT JOIN "TimeEntry" te ON j.id = te."jobId"
           AND te."userId" = $1
           AND te.date >= date_trunc('week', CURRENT_DATE)
         WHERE j."assignedTo" = $1
           AND j.status IN ('IN_PROGRESS', 'PENDING')`,
        [user.id]
      )

      return NextResponse.json({
        assignedJobs: employeeStats.rows[0].assignedJobs,
        hoursThisWeek: employeeStats.rows[0].totalHoursThisWeek,
        // NO financial data for employees
      })
    }

    // For admin/foreman, return full stats
    if (canViewFinancials(user)) {
      const fullStats = await query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as "activeJobs",
          COUNT(*) FILTER (WHERE status = 'PENDING') as "pendingJobs",
          COALESCE(SUM("billedAmount"), 0) as "totalRevenue",
          COALESCE(SUM("actualCost"), 0) as "totalCosts"
         FROM "Job"
         WHERE "createdAt" >= date_trunc('month', CURRENT_DATE)`
      )

      return NextResponse.json(fullStats.rows[0])
    }

    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
```

---

### Step 3: Update Job API to Filter Fields (2 hours)
**File:** `/src/app/api/jobs/route.ts`

```typescript
import { filterJobFields, canViewAllJobs, isEmployee } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    const user = verifyToken(token)

    let query_sql = 'SELECT * FROM "Job"'
    let params = []

    // Employees only see assigned jobs
    if (isEmployee(user)) {
      query_sql += ' WHERE "assignedTo" = $1'
      params.push(user.id)
    }

    query_sql += ' ORDER BY "createdAt" DESC LIMIT 100'

    const result = await query(query_sql, params)

    // Filter fields based on permissions
    const filteredJobs = result.rows.map(job => filterJobFields(job, user))

    return NextResponse.json({ jobs: filteredJobs })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}
```

---

### Step 4: Update Job Details Component (2 hours)
**File:** `/src/app/(app)/jobs/[id]/page.tsx`

```tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { canViewFinancials, canViewJobCosts } from '@/lib/permissions'

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const [job, setJob] = useState<any>(null)

  // Fetch job (API will return filtered fields)
  useEffect(() => {
    fetchJob()
  }, [params.id])

  return (
    <Box>
      {/* Basic job info - visible to all */}
      <Typography variant="h4">{job.jobNumber}</Typography>
      <Typography>{job.description}</Typography>
      <Typography>Status: {job.status}</Typography>

      {/* Financial info - only for admin/foreman */}
      {canViewFinancials(user) && (
        <Card>
          <CardContent>
            <Typography variant="h6">Financial Details</Typography>
            <Typography>Estimated: ${job.estimatedAmount}</Typography>
            <Typography>Billed: ${job.billedAmount}</Typography>
            <Typography>Actual Cost: ${job.actualCost}</Typography>
            <Typography>Profit: ${job.profitMargin}</Typography>
          </CardContent>
        </Card>
      )}

      {/* Job phases - only for admin/foreman */}
      {canViewJobCosts(user) && (
        <Card>
          <CardContent>
            <Typography variant="h6">Phases</Typography>
            {/* Phase details with costs */}
          </CardContent>
        </Card>
      )}

      {/* Time entries - visible to all (own entries for employees) */}
      <Card>
        <CardContent>
          <Typography variant="h6">Time Entries</Typography>
          {/* Show time entries */}
        </CardContent>
      </Card>
    </Box>
  )
}
```

---

### Step 5: Update Materials Pages (1 hour)
**File:** `/src/app/(app)/materials/page.tsx`

```tsx
import { canViewMaterialCosts } from '@/lib/permissions'

// Hide cost/price columns for employees
<TableHead>
  <TableRow>
    <TableCell>Code</TableCell>
    <TableCell>Name</TableCell>
    <TableCell>Category</TableCell>
    <TableCell>In Stock</TableCell>
    {canViewMaterialCosts(user) && (
      <>
        <TableCell align="right">Cost</TableCell>
        <TableCell align="right">Price</TableCell>
      </>
    )}
    <TableCell align="right">Actions</TableCell>
  </TableRow>
</TableHead>
```

---

### Step 6: Update Dashboard Component (1 hour)
**File:** `/src/app/(app)/dashboard/page.tsx`

```tsx
import { canViewFinancials, isEmployee } from '@/lib/permissions'

// Show different dashboard for employees vs admin
{isEmployee(user) ? (
  // Employee dashboard
  <Grid container spacing={3}>
    <Grid item xs={12} md={6}>
      <Card>
        <CardContent>
          <Typography variant="h6">My Assigned Jobs</Typography>
          <Typography variant="h3">{stats.assignedJobs}</Typography>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} md={6}>
      <Card>
        <CardContent>
          <Typography variant="h6">Hours This Week</Typography>
          <Typography variant="h3">{stats.hoursThisWeek}</Typography>
        </CardContent>
      </Card>
    </Grid>
    {/* NO revenue, profit, costs */}
  </Grid>
) : (
  // Admin/Foreman dashboard with full stats
  <Grid container spacing={3}>
    {/* Revenue, profit, costs, all jobs, etc. */}
  </Grid>
)}
```

---

## ✅ Completion Checklist
- [ ] Permission helper functions created
- [ ] Dashboard API filters employee data
- [ ] Job API returns only assigned jobs for employees
- [ ] Job details hide financial info
- [ ] Materials page hides costs
- [ ] Dashboard shows different views
- [ ] Test with employee account
- [ ] Verify no financial data leaks

**Time Required:** 10 hours (1.5 days)
**Priority:** 🔥 CRITICAL

---

# 4️⃣ ADD "MARK AS DONE" WORKFLOW

## 🎯 Goal
Simple job completion workflow with checklist, photos, and admin notification

## 🛠️ Implementation Steps

### Step 1: Create Mark Done Dialog Component (3 hours)
**File:** `/src/components/jobs/MarkJobDoneDialog.tsx` (NEW)

```tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  TextField,
  Alert,
  LinearProgress,
  Chip,
  Stack
} from '@mui/material'
import { CheckCircle, Upload, Camera } from '@mui/icons-material'

interface MarkJobDoneDialogProps {
  open: boolean
  onClose: () => void
  job: any
  onComplete: () => void
}

export default function MarkJobDoneDialog({
  open,
  onClose,
  job,
  onComplete
}: MarkJobDoneDialogProps) {
  const [checklist, setChecklist] = useState({
    photosUploaded: false,
    materialsLogged: false,
    customerSignature: false,
    notesAdded: false
  })
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)

  const allComplete = Object.values(checklist).every(v => v)

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files))
      setChecklist(prev => ({ ...prev, photosUploaded: true }))
    }
  }

  const handleMarkDone = async () => {
    if (!allComplete) {
      alert('Please complete all checklist items')
      return
    }

    setLoading(true)
    try {
      // Upload photos first
      const formData = new FormData()
      photos.forEach(photo => formData.append('photos', photo))
      formData.append('jobId', job.id)

      await fetch('/api/jobs/complete-photos', {
        method: 'POST',
        body: formData
      })

      // Mark job as done
      await fetch(`/api/jobs/${job.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes,
          completionChecklist: checklist,
          completedAt: new Date().toISOString()
        })
      })

      onComplete()
      onClose()
    } catch (error) {
      console.error('Error marking job done:', error)
      alert('Failed to mark job as done')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle color="success" />
          <Typography variant="h6">Mark Job as Done</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Job: <strong>{job.jobNumber}</strong> - {job.description}
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          Complete all checklist items before marking job as done
        </Alert>

        {/* Completion Checklist */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Completion Checklist:
          </Typography>

          <FormControlLabel
            control={
              <Checkbox
                checked={checklist.photosUploaded}
                onChange={(e) => setChecklist(prev => ({
                  ...prev,
                  photosUploaded: e.target.checked
                }))}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Photos Uploaded</Typography>
                <Typography variant="caption" color="text.secondary">
                  Upload before/after photos of completed work
                </Typography>
              </Box>
            }
          />

          {/* Photo upload */}
          <Box sx={{ ml: 4, mb: 2 }}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<Camera />}
              size="small"
            >
              Upload Photos
              <input
                type="file"
                hidden
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
              />
            </Button>
            {photos.length > 0 && (
              <Chip
                label={`${photos.length} photos selected`}
                size="small"
                color="success"
                sx={{ ml: 1 }}
              />
            )}
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={checklist.materialsLogged}
                onChange={(e) => setChecklist(prev => ({
                  ...prev,
                  materialsLogged: e.target.checked
                }))}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Materials Logged</Typography>
                <Typography variant="caption" color="text.secondary">
                  All materials used have been logged
                </Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={checklist.customerSignature}
                onChange={(e) => setChecklist(prev => ({
                  ...prev,
                  customerSignature: e.target.checked
                }))}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Customer Signature Obtained</Typography>
                <Typography variant="caption" color="text.secondary">
                  Customer has signed off on completed work
                </Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={checklist.notesAdded}
                onChange={(e) => setChecklist(prev => ({
                  ...prev,
                  notesAdded: e.target.checked
                }))}
              />
            }
            label={
              <Box>
                <Typography variant="body2">Completion Notes Added</Typography>
                <Typography variant="caption" color="text.secondary">
                  Add any final notes about the job
                </Typography>
              </Box>
            }
          />
        </Box>

        {/* Completion Notes */}
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Completion Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any final notes, issues encountered, or follow-up needed..."
        />

        {/* Progress indicator */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Checklist: {Object.values(checklist).filter(Boolean).length}/4 complete
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(Object.values(checklist).filter(Boolean).length / 4) * 100}
            sx={{ mt: 0.5 }}
          />
        </Box>

        {loading && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Uploading photos and marking job as done...
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleMarkDone}
          variant="contained"
          color="success"
          disabled={!allComplete || loading}
          startIcon={<CheckCircle />}
        >
          Mark as Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}
```

---

### Step 2: Add Mark Done API Endpoint (2 hours)
**File:** `/src/app/api/jobs/[id]/complete/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = verifyToken(token)
    const body = await request.json()
    const { notes, completionChecklist, completedAt } = body

    // Update job status
    const result = await query(
      `UPDATE "Job"
       SET status = 'COMPLETED',
           "completedDate" = $1,
           "completedBy" = $2,
           "completionNotes" = $3,
           "completionChecklist" = $4,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [
        completedAt,
        user.id,
        notes,
        JSON.stringify(completionChecklist),
        params.id
      ]
    )

    // Create notification for admin
    await query(
      `INSERT INTO "NotificationLog" ("userId", type, title, message, "relatedJobId", "createdAt")
       VALUES (
         (SELECT id FROM "User" WHERE role = 'OWNER_ADMIN' LIMIT 1),
         'JOB_COMPLETED',
         'Job Marked as Done',
         $1,
         $2,
         CURRENT_TIMESTAMP
       )`,
      [
        `${user.name} marked job ${result.rows[0].jobNumber} as done`,
        params.id
      ]
    )

    // TODO: Send email/SMS notification to admin

    return NextResponse.json({
      success: true,
      job: result.rows[0]
    })
  } catch (error) {
    console.error('Error marking job complete:', error)
    return NextResponse.json({ error: 'Failed to mark job complete' }, { status: 500 })
  }
}
```

---

### Step 3: Add Database Columns (1 hour)
**File:** `/scripts/add-job-completion-fields.sql`

```sql
-- Add job completion tracking fields

ALTER TABLE "Job"
ADD COLUMN IF NOT EXISTS "completedBy" TEXT REFERENCES "User"(id),
ADD COLUMN IF NOT EXISTS "completionNotes" TEXT,
ADD COLUMN IF NOT EXISTS "completionChecklist" JSONB,
ADD COLUMN IF NOT EXISTS "completionPhotoCount" INTEGER DEFAULT 0;

-- Create index for completed jobs
CREATE INDEX IF NOT EXISTS idx_job_completed
ON "Job"("completedDate", status)
WHERE status = 'COMPLETED';
```

---

### Step 4: Integrate into Job Page (1 hour)
**File:** `/src/app/(app)/jobs/[id]/page.tsx`

```tsx
import MarkJobDoneDialog from '@/components/jobs/MarkJobDoneDialog'

const [markDoneOpen, setMarkDoneOpen] = useState(false)

// Add button prominently
<Button
  variant="contained"
  color="success"
  size="large"
  startIcon={<CheckCircle />}
  onClick={() => setMarkDoneOpen(true)}
  disabled={job.status === 'COMPLETED'}
>
  Mark Job as Done
</Button>

<MarkJobDoneDialog
  open={markDoneOpen}
  onClose={() => setMarkDoneOpen(false)}
  job={job}
  onComplete={() => {
    // Refresh job data
    fetchJob()
  }}
/>
```

---

## ✅ Completion Checklist
- [ ] Mark Done dialog created
- [ ] Complete API endpoint created
- [ ] Database columns added
- [ ] Integrated into job page
- [ ] Admin notification works
- [ ] Photo upload works
- [ ] Test complete workflow
- [ ] Mobile-friendly

**Time Required:** 7 hours (1 day)
**Priority:** 🔥 HIGH

---

# 5️⃣ ENHANCED DASHBOARD VISUALIZATIONS

## 🎯 Goal
Add interactive charts, trends, and KPIs to dashboard

## 🛠️ Implementation Steps

### Step 1: Install Chart Library (15 minutes)
```bash
npm install recharts
```

---

### Step 2: Create Revenue Chart Component (2 hours)
**File:** `/src/components/dashboard/RevenueChart.tsx` (NEW)

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, Typography, Box } from '@mui/material'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface RevenueData {
  month: string
  revenue: number
  costs: number
  profit: number
}

export default function RevenueChart() {
  const [data, setData] = useState<RevenueData[]>([])

  useEffect(() => {
    fetchRevenueData()
  }, [])

  const fetchRevenueData = async () => {
    const res = await fetch('/api/analytics/revenue-trend')
    const data = await res.json()
    setData(data)
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Revenue Trend (Last 6 Months)
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#8884d8"
              strokeWidth={2}
              name="Revenue"
            />
            <Line
              type="monotone"
              dataKey="costs"
              stroke="#82ca9d"
              strokeWidth={2}
              name="Costs"
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="#ffc658"
              strokeWidth={2}
              name="Profit"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

---

### Step 3: Create Job Status Pie Chart (1.5 hours)
**File:** `/src/components/dashboard/JobStatusChart.tsx` (NEW)

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, Typography } from '@mui/material'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const COLORS = {
  PENDING: '#FFA726',
  IN_PROGRESS: '#42A5F5',
  COMPLETED: '#66BB6A',
  CANCELLED: '#EF5350'
}

export default function JobStatusChart() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    fetchJobStats()
  }, [])

  const fetchJobStats = async () => {
    const res = await fetch('/api/analytics/job-status')
    const data = await res.json()
    setData(data)
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Jobs by Status
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

---

### Step 4: Create Hours Worked Bar Chart (1.5 hours)
**File:** `/src/components/dashboard/HoursWorkedChart.tsx` (NEW)

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, Typography } from '@mui/material'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function HoursWorkedChart() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    fetchHoursData()
  }, [])

  const fetchHoursData = async () => {
    const res = await fetch('/api/analytics/hours-by-day')
    const data = await res.json()
    setData(data)
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Hours Worked by Day of Week
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="regularHours" fill="#8884d8" name="Regular" stackId="a" />
            <Bar dataKey="overtimeHours" fill="#FFA726" name="Overtime" stackId="a" />
            <Bar dataKey="doubleTimeHours" fill="#EF5350" name="Double Time" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

---

### Step 5: Create Analytics API Endpoints (3 hours)
**Files:** `/src/app/api/analytics/*.ts` (NEW)

```typescript
// revenue-trend/route.ts
export async function GET() {
  const result = await query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') as month,
      COALESCE(SUM("billedAmount"), 0) as revenue,
      COALESCE(SUM("actualCost"), 0) as costs,
      COALESCE(SUM("billedAmount" - "actualCost"), 0) as profit
    FROM "Job"
    WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      AND status = 'COMPLETED'
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY DATE_TRUNC('month', "createdAt")
  `)
  return NextResponse.json(result.rows)
}

// job-status/route.ts
export async function GET() {
  const result = await query(`
    SELECT
      status as name,
      COUNT(*)::INTEGER as value
    FROM "Job"
    WHERE "createdAt" >= NOW() - INTERVAL '3 months'
    GROUP BY status
  `)
  return NextResponse.json(result.rows)
}

// hours-by-day/route.ts
export async function GET() {
  const result = await query(`
    SELECT
      TO_CHAR(date, 'Dy') as day,
      COALESCE(SUM("regularHours"), 0) as "regularHours",
      COALESCE(SUM("overtimeHours"), 0) as "overtimeHours",
      COALESCE(SUM("doubleTimeHours"), 0) as "doubleTimeHours"
    FROM "TimeEntry"
    WHERE date >= NOW() - INTERVAL '30 days'
    GROUP BY EXTRACT(DOW FROM date), TO_CHAR(date, 'Dy')
    ORDER BY EXTRACT(DOW FROM date)
  `)
  return NextResponse.json(result.rows)
}
```

---

### Step 6: Update Dashboard Page (1 hour)
**File:** `/src/app/(app)/dashboard/page.tsx`

```tsx
import RevenueChart from '@/components/dashboard/RevenueChart'
import JobStatusChart from '@/components/dashboard/JobStatusChart'
import HoursWorkedChart from '@/components/dashboard/HoursWorkedChart'

// Add charts to dashboard
<Grid container spacing={3}>
  {/* Existing KPI cards */}

  <Grid item xs={12} lg={8}>
    <RevenueChart />
  </Grid>

  <Grid item xs={12} lg={4}>
    <JobStatusChart />
  </Grid>

  <Grid item xs={12}>
    <HoursWorkedChart />
  </Grid>
</Grid>
```

---

## ✅ Completion Checklist
- [ ] Recharts installed
- [ ] Revenue trend chart created
- [ ] Job status pie chart created
- [ ] Hours worked bar chart created
- [ ] Analytics API endpoints created
- [ ] Dashboard updated with charts
- [ ] Charts responsive on mobile
- [ ] Data refreshes properly

**Time Required:** 9 hours (1-1.5 days)
**Priority:** 🎯 HIGH

---

## 📝 SUMMARY OF REMAINING 5 ITEMS

Due to length constraints, I'll provide abbreviated implementation plans for items 6-10:

### 6️⃣ Loading States & User Feedback (Simple - 2 days)
- Create SkeletonLoader components
- Create Toast notification system
- Add loading overlays
- Apply to all data tables and forms

### 7️⃣ Bulk Operations (Medium - 3 days)
- Create BulkActionBar component
- Add multi-select checkboxes to tables
- Implement bulk approve/assign/export
- Add confirmation dialogs

### 8️⃣ Advanced Search & Filtering (Medium - 3 days)
- Create AdvancedSearch component
- Add multi-field search
- Implement saved searches (localStorage)
- Add filter builder with date ranges

### 9️⃣ API Response Caching (Medium - 2-3 days)
- Enhance /src/lib/cache.ts
- Add Redis integration (optional)
- Implement cache-aside pattern
- Add cache invalidation on mutations

### 🔟 Enhanced Job Details Page (Medium - 4-5 days)
- Create tabbed interface
- Add timeline component
- Create photo gallery
- Add activity feed
- Integrate materials/time tabs

---

## 📊 TOTAL IMPLEMENTATION ESTIMATE

| Item | Priority | Complexity | Time |
|------|----------|------------|------|
| 1. Overtime Calculations | 🔥 CRITICAL | Medium | 2 days |
| 2. Time Tracking Fixes | 🔥 CRITICAL | Simple | 1 day |
| 3. Employee Permissions | 🔥 CRITICAL | Simple | 1.5 days |
| 4. Mark as Done Workflow | 🔥 HIGH | Medium | 1 day |
| 5. Dashboard Visualizations | 🎯 HIGH | Medium | 1.5 days |
| 6. Loading States | 🎯 HIGH | Simple | 2 days |
| 7. Bulk Operations | 🎯 HIGH | Medium | 3 days |
| 8. Advanced Search | 🎯 HIGH | Medium | 3 days |
| 9. API Caching | 🚀 HIGH | Medium | 2.5 days |
| 10. Enhanced Job Details | 🎯 HIGH | Medium | 4.5 days |
| **TOTAL** | - | - | **22 days (4.5 weeks)** |

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### Week 1: Critical Client Needs
- Day 1-2: Overtime Calculations
- Day 3: Time Tracking Fixes
- Day 4-5: Employee Permissions

### Week 2: Polish & Core Features
- Day 1-2: Loading States
- Day 3: Mark as Done Workflow
- Day 4-5: Dashboard Visualizations

### Week 3: Efficiency Improvements
- Day 1-3: Bulk Operations
- Day 4-5: Advanced Search (partial)

### Week 4: Performance & Enhancement
- Day 1: Advanced Search (complete)
- Day 2-4: Enhanced Job Details
- Day 5: API Caching

---

## ✅ NEXT STEPS

1. **Review this plan** with Derek
2. **Get approval** for budget/timeline
3. **Set up development environment**
4. **Begin with Item #1** (Overtime Calculations)
5. **Track progress** daily
6. **Test each feature** before moving to next
7. **Gather feedback** from users
8. **Adjust priorities** as needed

**Ready to start implementation?** Let me know which item to begin with! 🚀
