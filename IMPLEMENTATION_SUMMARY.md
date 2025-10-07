# Implementation Summary - Client Requirements Phase 2

**Date:** 2025-10-07
**Status:** ✅ Planning Complete - Ready for Development

---

## Quick Overview

**Total Time:** 70 hours (9 business days)
**Phases:** 9 sequential phases
**New Files:** 23 files to create
**Modified Files:** 9 files to update

---

## Client Answers - CONFIRMED ✅

1. **Job Creation from Time Card:** ✅ YES - Employees can create jobs → Goes to "Pending New Job Entries" for admin approval

2. **Missed Auto-Submit:** ✅ Employee contacts admin → Admin can edit auto-submitted hours

3. **Reminder Notifications:** ✅ YES - Send reminder Sunday 8 PM (before 11:59 PM auto-submit)

4. **Material Pricing:** ✅ Admin only - Employee fields disabled/empty

5. **Estimated Hours Visibility:** ✅ Admin-only - Remove from employee view completely

6. **Over-Budget Alerts:** ✅ Admin-only - Employees do NOT see over-budget warnings

---

## Implementation Phases

### Phase 1: Hour Categories (8 hours) - CRITICAL
- Replace auto-OT with manual dropdown selection
- 6 categories: Straight Time, ST Travel, Overtime, OT Travel, Double Time, DT Travel
- Update pay calculation based on category

### Phase 2: Structured Description (4 hours) - HIGH
- Replace single description with 3 required fields:
  - Location (e.g., "Pawnee City")
  - Job/Area (e.g., "Bin 21")
  - Work Description (detailed text)

### Phase 3: Materials Integration (12 hours) - HIGH
- Add materials section to time card
- Quantity, description, price (admin only)
- "Off truck" checkbox updates inventory
- Upload packing slip photos
- Create TimeEntryMaterial table

### Phase 4: Additional Uploads (7 hours) - MEDIUM
- Support multiple file types:
  - Job photos
  - Fuel tickets (image/PDF)
  - Packing slips
  - Parts photos
- Tabbed upload interface

### Phase 5: Job Display Enhancement (2 hours) - MEDIUM
- Show: JOB-001 - Tree Removal (Farmers Co-op, Pawnee City)
- Add customerPO field to jobs
- Improve autocomplete display

### Phase 6: Employee Job Creation + Calendar (13 hours) - MEDIUM
- **NEW:** Employees can request new jobs from time card
- Jobs go to "Pending New Job Entries" for admin approval
- Admin approve/reject workflow
- Hide calendar from employees
- Show "Upcoming Jobs" page instead (Today/Tomorrow/This Week)

### Phase 7: Auto-Submit + Reminder + Admin Edit (9.5 hours) - HIGH
- **NEW:** Sunday 8 PM reminder notification
- Auto-submit timecards at 11:59 PM Sunday
- **NEW:** Admin can edit auto-submitted hours
- Submission verification system
- Error tracking and logging

### Phase 8: Payroll Summary Report (6.5 hours) - HIGH
- Weekly report by employee
- Category breakdown (ST, ST Travel, OT, OT Travel, DT, DT Travel)
- Total hours and pay
- Print and CSV export

### Phase 9: Admin Management + Estimated Hours (7.5 hours) - MEDIUM
- Job estimated hours by category (admin only)
- Actual vs estimated tracking with progress bars
- Over-budget warnings (admin only)
- Enhanced approval interface with bulk actions

---

## Key Features Added Beyond Original Requirements

1. **Employee Job Creation Workflow** - Employees can request jobs, admin approves
2. **Sunday 8 PM Reminder** - Proactive notification before auto-submit
3. **Admin Edit Auto-Submitted** - Admin can fix employee mistakes after auto-submit
4. **Pending Job Requests Dashboard** - Admin approval queue for employee job requests
5. **Material Inventory Integration** - "Off truck" checkbox updates stock levels
6. **Submission Verification** - Error tracking ensures no lost timecards

---

## Database Changes

### New Tables (8):
1. TimeEntryMaterial
2. TimeEntrySubmissionLog
3. PendingJobRequest
4. (TimeEntryPhoto renamed to TimeEntryAttachment)

### New Columns:
- TimeEntry: hourCategory, categoryHours, locationDescription, jobAreaDescription, workDescription
- Job: customerPO, estimatedStraightTime, estimatedOvertime, estimatedDoubleTime
- Material: (integration points)

### New Indexes (5):
- idx_timeentrymaterial_entry
- idx_timeentrymaterial_material
- idx_submission_log_user_week
- idx_job_customer_po
- (Additional performance indexes)

---

## Cron Jobs

**Sunday 8:00 PM** - Send weekly reminder to employees with draft entries
**Sunday 11:59 PM** - Auto-submit all draft entries for the week

---

## Files to Create (23 NEW)

### Migrations (8):
1. 2025-10-07-hour-categories.sql
2. 2025-10-07-structured-description.sql
3. 2025-10-07-time-entry-materials.sql
4. 2025-10-07-time-entry-attachments.sql
5. 2025-10-07-customer-po.sql
6. 2025-10-07-pending-job-requests.sql
7. 2025-10-07-submission-log.sql
8. 2025-10-07-job-estimated-categories.sql

### Components (7):
9. TimeEntryMaterialsSection.tsx
10. TimeEntryAttachments.tsx
11. SubmissionVerification.tsx
12. PayrollSummaryReport.tsx
13. JobHoursTracking.tsx
14. PendingJobRequests.tsx
15. upcoming-jobs/page.tsx

### API Routes (6):
16. time-entries/[id]/materials/route.ts
17. time-entries/[id]/attachments/route.ts
18. jobs/upcoming/route.ts
19. jobs/requests/route.ts
20. jobs/requests/[id]/approve/route.ts
21. jobs/[id]/actual-hours/route.ts
22. reports/payroll-summary/route.ts

### Cron (2):
23. cron/auto-submit-timecards.ts
24. cron/send-weekly-reminder.ts

---

## Files to Modify (9 EXISTING)

1. `/src/components/time/MultiJobTimeEntry.tsx` - Categories, description, materials, job creation
2. `/src/components/time/WeeklyTimesheetDisplay.tsx` - Verification, button text
3. `/src/components/layout/ResponsiveSidebar.tsx` - Navigation updates
4. `/src/app/api/time-entries/bulk/route.ts` - Accept new fields
5. `/src/app/api/time-entries/[id]/route.ts` - Category updates, admin edit
6. `/src/app/api/time-entries/weekly-summary/route.ts` - Category breakdown
7. `/src/app/api/jobs/route.ts` - Include customerPO
8. `/src/components/admin/PendingJobEntries.tsx` - Job hours tracking, bulk actions
9. `/src/app/(app)/admin/page.tsx` - Add PendingJobRequests component

---

## Testing Checklist (Per Phase)

### Phase 1:
- [ ] Category dropdown works
- [ ] All 6 categories selectable
- [ ] Pay calculated per category
- [ ] Weekly summary shows category breakdown

### Phase 2:
- [ ] 3 description fields display
- [ ] All fields required
- [ ] Combined description saved

### Phase 3:
- [ ] Materials section displays
- [ ] Can add/remove materials
- [ ] "Off truck" updates inventory
- [ ] Packing slip upload works

### Phase 4:
- [ ] Multiple file types upload
- [ ] Tabs work (Photos/Fuel/Materials/Parts)
- [ ] Can delete attachments

### Phase 5:
- [ ] Job display shows customer & location
- [ ] Customer PO displays if present

### Phase 6:
- [ ] Employees can request new jobs
- [ ] Admin sees pending requests
- [ ] Approve/reject workflow works
- [ ] Calendar hidden from employees
- [ ] Upcoming Jobs page displays

### Phase 7:
- [ ] Sunday 8 PM reminder sends
- [ ] Auto-submit runs at 11:59 PM
- [ ] Admin can edit auto-submitted entries
- [ ] Verification displays status

### Phase 8:
- [ ] Payroll report shows all employees
- [ ] Category totals accurate
- [ ] Print/export works

### Phase 9:
- [ ] Estimated hours by category saves
- [ ] Actual vs estimated displays
- [ ] Over-budget alerts (admin only)
- [ ] Bulk approve/reject works

---

## Deployment Strategy

**Week 1:**
- Days 1-2: Phase 1 (Categories)
- Days 2-3: Phase 2 (Description)
- Days 3-5: Phase 3 (Materials)

**Week 2:**
- Days 1-2: Phase 4 (Uploads)
- Day 2: Phase 5 (Job Display)
- Day 3: Phase 6 (Job Creation + Calendar)
- Days 4-5: Phase 7 (Auto-Submit)

**Week 3:**
- Days 1-2: Phase 8 (Payroll Report)
- Days 2-3: Phase 9 (Admin Features)
- Days 4-5: Testing, Bug Fixes, Deployment

**Rollout:**
1. Test with you (1-2 weeks with paper backup)
2. Test with Derek (1 week while you're on vacation)
3. Meeting after your return
4. Roll out to all employees

---

## Next Steps

1. ✅ Review this summary with team
2. ✅ Confirm all client answers are correct
3. ⬜ Begin Phase 1 implementation
4. ⬜ Set up cron jobs in staging
5. ⬜ Configure environment variables
6. ⬜ Run database migrations in order

---

## Environment Variables Needed

```bash
CRON_SECRET=<generate-random-secret>
```

## Vercel Configuration

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

---

## SUCCESS CRITERIA

✅ Employees can select hour categories manually
✅ Descriptions are structured and mandatory
✅ Materials can be logged on time cards
✅ Multiple file types supported
✅ Employees can request new jobs (pending admin approval)
✅ Calendar hidden from employees
✅ Sunday 8 PM reminder sends
✅ Auto-submit runs Sunday 11:59 PM
✅ Admin can edit auto-submitted hours
✅ Payroll report shows category breakdown
✅ Job estimated hours tracked (admin only)
✅ Over-budget alerts (admin only)

---

**Implementation plan is complete and ready for development!** 🚀
