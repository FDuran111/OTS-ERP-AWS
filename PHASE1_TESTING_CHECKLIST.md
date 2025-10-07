# Phase 1: Hour Categories - Manual Testing Checklist

## ✅ Automated Tests Passed

### Employee-Side Tests
- ✅ Calculation logic (10/10 tests passed)
- ✅ Database storage verified
- ✅ API responses correct
- ✅ Weekly summary includes categoryBreakdown

## 📋 Manual Testing Required

### 1. Employee Side Testing

**Navigate to:** `/time-entry` or Multi-job time entry page

#### Test: Create Entry with Categories
1. ✅ Select a job
2. ✅ Verify 6 category chips display:
   - ST (green) - Straight Time
   - STT (green outlined) - Straight Time Travel
   - OT (orange) - Overtime
   - OTT (orange outlined) - Overtime Travel
   - DT (red) - Double Time
   - DTT (red outlined) - Double Time Travel

3. ✅ Enter hours in multiple categories:
   - Example: ST=8, STT=0.5, OT=2
4. ✅ Verify total calculates automatically (should show 10.5 hours)
5. ✅ Submit entry
6. ✅ Check for success message

**Expected Result:**
- Entry created successfully
- Total hours = sum of all categories
- No validation errors

---

### 2. Admin Side Testing

#### Test A: View Entry Details

**Navigate to:** Employee timesheet or admin dashboard

1. ✅ Find the entry you just created
2. ✅ Click to view details
3. ✅ Verify categoryHours field is visible:
   ```json
   {
     "STRAIGHT_TIME": 8,
     "STRAIGHT_TIME_TRAVEL": 0.5,
     "OVERTIME": 2,
     "OVERTIME_TRAVEL": 0,
     "DOUBLE_TIME": 0,
     "DOUBLE_TIME_TRAVEL": 0
   }
   ```
4. ✅ Verify pay calculation is correct

**Expected Pay (example with $20/hr regular, $30/hr OT):**
- (8 × $20) + (0.5 × $20) + (2 × $30) = $230

---

#### Test B: Weekly Summary

**Navigate to:** Weekly timesheet view

1. ✅ Select the week containing your test entry
2. ✅ View weekly summary
3. ✅ Check that category breakdown is shown:
   - Total hours: 10.5
   - Category breakdown should show individual categories
4. ✅ Verify totals are accurate

**Check API Response (optional):**
```bash
# In browser console:
fetch('/api/time-entries/weekly-summary?week=2025-10-07&userId=YOUR_USER_ID')
  .then(r => r.json())
  .then(console.log)
```

Should include:
```json
{
  "categoryBreakdown": {
    "STRAIGHT_TIME": 8,
    "STRAIGHT_TIME_TRAVEL": 0.5,
    "OVERTIME": 2,
    ...
  }
}
```

---

#### Test C: Approval Workflow

**Navigate to:** Pending time entries (admin view)

1. ✅ Submit the entry for approval (as employee)
2. ✅ Switch to admin view
3. ✅ Find the pending entry
4. ✅ Verify category hours are visible
5. ✅ Approve the entry
6. ✅ Verify status changes to APPROVED
7. ✅ Check that categoryHours field is still present after approval

**Expected Result:**
- Entry approved successfully
- Category hours preserved in database
- No data loss during status change

---

#### Test D: Rejection Workflow

1. ✅ Create another test entry with categories
2. ✅ Submit for approval
3. ✅ As admin, reject the entry with a reason
4. ✅ Verify employee can see rejection
5. ✅ Verify category hours still visible
6. ✅ Employee can edit and resubmit

**Expected Result:**
- Rejection recorded
- Category hours preserved
- Employee can modify and resubmit

---

### 3. Edge Cases

#### Test E: Empty Categories
1. ✅ Try to submit entry without any category hours
2. ✅ Should show validation error: "Please enter hours in at least one category"

#### Test F: Partial Categories
1. ✅ Enter only OT hours (no ST)
2. ✅ Should allow submission
3. ✅ Total should equal OT hours only

#### Test G: Decimal Hours
1. ✅ Enter 7.75 ST, 0.25 OT
2. ✅ Total should be 8.0
3. ✅ Pay should calculate correctly

#### Test H: Large Day
1. ✅ Enter: ST=8, OT=4, DT=2 (14 hours total)
2. ✅ Should accept (no max validation)
3. ✅ Pay should reflect all categories

---

## 🔍 What to Look For

### UI/UX
- [ ] Category chips are color-coded correctly
- [ ] Input fields accept decimals (0.25, 0.5, etc.)
- [ ] Total updates in real-time
- [ ] Clear labels (ST, STT, OT, etc.)
- [ ] Responsive layout on mobile

### Data Integrity
- [ ] categoryHours stored as JSONB in database
- [ ] Pay calculation accurate for each category
- [ ] Data preserved through approval workflow
- [ ] Weekly summary aggregates correctly

### Admin View
- [ ] Admins can see detailed category breakdown
- [ ] Totals match employee submission
- [ ] Approve/reject doesn't lose data
- [ ] Reports show category information

---

## 🐛 Known Issues / Notes

1. **Server Startup:** If dev server hangs, restart with:
   ```bash
   lsof -ti:3000 | xargs kill -9
   npm run dev
   ```

2. **TypeScript Warnings:** Pre-existing TS errors in accounting pages (not related to this feature)

3. **UI Enhancement Opportunity:** `WeeklyTimesheetDisplay` currently shows aggregated Regular/OT/DT hours. Could enhance to show 6-category breakdown for admins.

---

## ✅ Sign-off

**Tested By:** ________________

**Date:** ________________

**Issues Found:**
- [ ] None
- [ ] Minor (list below)
- [ ] Major (list below)

**Notes:**
_______________________________________
_______________________________________
_______________________________________

**Approved for Production:**
- [ ] Yes
- [ ] No (needs fixes)

---

## 🚀 Next Steps After Approval

Once Phase 1 is manually tested and approved:
1. Mark Phase 1 as complete
2. Commit final changes
3. Proceed to **Phase 2: Structured Description** (4 hours)
   - 3 required fields: Location, Job/Area, Work Description
   - Migration and UI updates
   - Validation updates
