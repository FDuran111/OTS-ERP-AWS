# Client Requirements - Next Phase Implementation
**Meeting Date:** 2025-10-07
**Status:** Ready for Development

---

## TIME CARD FEATURES

### 1. Hour Categories (Major Change)
**Create dropdown menu with these categories:**
- Straight Time
- Straight Time Travel
- Overtime
- Overtime Travel
- Double Time
- Double Time Travel

**Important Notes:**
- Overtime starts after 3:30 PM (not automatically after 8 hours)
- Shift pay is separate (not counted as overtime)
- Need all categories in one dropdown so employees can "add it all up" without doing math

### 2. Description Field
**Changes:**
- Remove "optional" - make it **mandatory**
- Add three preset fields:
  1. Location
  2. Job
  3. Work Description

**Reason:** This prevents errors (e.g., clicking Pawnee City but typing Lincoln in description)

### 3. Materials Section
**Add materials directly on the time card (below work description):**
- Quantity
- Description
- Price field (empty for now - employees won't fill this)
- Option to upload picture of packing slip
- Checkbox for "off truck" materials

### 4. Additional Uploads
- Fuel tickets
- Job pictures
- Photos for needed parts

---

## JOB/PO MANAGEMENT

### 1. Terminology Changes
- Change "Purchase Order" → "Job Number" (your internal number)
- Add separate field for "Customer PO" (when customer provides one)

### 2. Job Details Display
**When selecting a job, show:**
- Categories
- Customer
- Location
- Job name

**Example:** Farmers Co-op, Pawnee City, Bin 21
**Reason:** Helps when multiple jobs exist at one location (you mentioned 5+ jobs at Tamora)

---

## CALENDAR/SCHEDULING

### Changes:
- **Admin only** - remove from employee view
- Schedules change too frequently (rain days, service calls, etc.)
- Employees will just see "Upcoming Jobs" for today/tomorrow
- Derek and you will use calendar for planning, but it won't drive actual work assignments

---

## SUBMISSION PROCESS

### 1. Daily Entry, Weekly Submission
- Employees enter time daily
- System auto-submits at 11:59 PM on Sundays
- Button should say "Submit Time Card" not "Submit Week"
- Forces employees to keep up (no more Monday morning 2-hour time card sessions)

### 2. Verification System
- Error tracking to ensure no time cards get lost in transmission
- Notification when submission is received
- Employees can see submission was sent successfully

---

## REPORTING

### 1. Payroll Summary Report
**Generate weekly report showing per employee:**
- Total Straight Time hours
- Total Overtime hours
- Total Double Time hours
- (Travel hours don't affect pay rate - just tracked separately)

### 2. Printable Time Cards
- Need ability to print individual time cards
- Include descriptions
- For filing until QuickBooks integration is complete

---

## ADMIN FEATURES

### 1. Time Card Management
- View all submitted time cards
- Approve/reject individual entries
- Send rejection notes back to employee
- Edit approved entries if needed

### 2. Estimated Hours (on admin side only)
**Add fields to jobs:**
- Estimated Straight Time hours
- Estimated Overtime hours
- Estimated Double Time hours
- Shows remaining hours on jobs (e.g., "estimated 1000, used 780, 220 remaining")

---

## IMPLEMENTATION PLAN

### Phase 1: You testing (1-2 weeks)
- Submit paper time cards as backup
- Use app to verify functionality
- Test notification system

### Phase 2: Derek testing (1 week)
- Both paper and app
- While you're on vacation

### Phase 3: Next meeting after your return
- Review how time cards transfer to billing
- Set up QuickBooks integration process
- Work on pulling data for invoicing

### Phase 4: Roll out to all employees

---

## QUESTIONS - ANSWERED ✅

1. **Job Creation from Time Card:** ✅ YES - Employees can create new jobs from time card. These go to "Pending New Job Entries" for admin approval.

2. **Missed Auto-Submit:** ✅ Employee must contact admin. Admin can edit auto-submitted hours.

3. **Reminder Notifications:** ✅ YES - Send reminder Sunday at 8 PM before 11:59 PM auto-submit.

---

## ADDITIONAL CLARIFICATIONS ✅

4. **Material Pricing:** Admin only for now. Employee fields remain empty/disabled.

5. **Estimated Hours Visibility:** Remove from employee view. Admin-only feature.

6. **Over-Budget Alerts:** Admin-only. Employees should NOT see over-budget warnings.

---

## TECHNICAL TASKS

### Database Investigation
- [ ] Identify and document the 1 extra trigger in RDS vs Local (trigger_log_role_changes_user_update)
- [ ] Identify and document the 2 extra functions in RDS vs Local (calculate_pay, get_week_start)
- [ ] Verify if they are duplicates or serve different purposes
- [ ] Document why they exist and what they do
- [ ] Determine if they should be synced to local or removed from RDS

**Note:** SSH tunnel required to complete this investigation
