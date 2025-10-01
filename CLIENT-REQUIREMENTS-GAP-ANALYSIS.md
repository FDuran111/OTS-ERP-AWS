# Client Requirements Gap Analysis

## Update: Additional Requirements from Latest Notes

### NEW REQUIREMENTS DISCOVERED:

1. **Derek Access & Employee Dashboard**
   - Give Derek specific employee view access
   - Show crew hours on dashboard (Monday-Sunday view)
   - Display daily hours for each employee
   - Overtime calculation: >8 hours/day = time and a half, Sundays = double time
   - Show hours by category
   - Show current job assignment

2. **Time Tracking Issues**
   - Fix issues with time tracking selection
   - Remove "Residential" from job categories

3. **Employee-Initiated Purchase Orders**
   - Allow employees to initiate PO on service calls
   - Send PO notifications to office

4. **Enhanced Job Creation in Time Entry**
   - Job creation must be built into clock-in process
   - Employee can either:
     - Create new job when clocking in
     - Select from existing jobs
   - Mark job as "Done" when complete

## Current State vs. Required Features

### 1. ROLE SYSTEM

**Current State:**
- ✅ Have RBAC system from Replit integration at `/api/rbac/`
- ✅ Database has Role, RoleAssignment, RolePermission tables
- ✅ Have roles: Admin, Manager, Employee, Foreman, HR Manager, Accountant, PROJECT_MANAGER, OFFICE_STAFF
- ❌ Missing: RolePermissions.tsx UI component to manage roles

**Required Changes:**
- Create RolePermissions.tsx component to integrate with `/api/rbac/` endpoints
- Verify Project Manager and Office Staff roles have correct permissions
- Update permission matrix UI

### 2. EMPLOYEE RESTRICTIONS

**Current State:**
- ✅ Employees can only view their own time entries (time.view_own)
- ✅ Employees can edit their own time entries (time.edit_own)
- ❌ Employees can currently see job phases
- ❌ Employees can see revenue/cost data
- ❌ Employees can see all jobs in the system

**Required Changes:**
- Remove job phases visibility from employee view
- Hide all revenue/cost/profit data from employees
- Restrict job list to only jobs they're assigned to
- Ensure employees can ONLY enter time, nothing else

### 3. TIME ENTRY WORKFLOW

**Current State:**
- ✅ Have time entry system with job selection
- ✅ Have SimpleTimeEntry and MultiJobTimeEntry components
- ❌ No "Create Job" button in time entry view
- ✅ Manual entry capabilities exist
- ❌ Time entries don't show job address by default

**Required Changes:**
- Add "Create Job" button to time entry interface
- Implement job creation workflow from time entry page
- Display job addresses in time entry selection

### 4. REPORTING & DASHBOARDS

**Current State:**
- ✅ Have reports section (/reports)
- ✅ Have weekly timesheet display (WeeklyTimesheetDisplay component)
- ✅ Have company-wide job summary (CompanyWeeklyJobsSummary)
- ❌ Missing dedicated time reporting dashboard
- ❌ Missing specific weekly summaries as requested
- ❌ No overtime calculation display (>8 hrs = 1.5x, Sunday = 2x)
- ❌ No Monday-Sunday weekly view format

**Required Changes:**
- Create new time reporting dashboard with:
  - Weekly summaries by employee (Monday-Sunday format)
  - Daily hours breakdown per employee
  - Automatic overtime calculation (>8 hrs/day = 1.5x pay)
  - Sunday double-time calculation
  - Hours by job category
  - Current job assignments display
  - Export capabilities

### 5. MATERIAL ATTACHMENTS

**Current State:**
- ✅ Have file attachment system (FileAttachment table)
- ✅ Can attach to jobs, customers, materials
- ❌ No direct attachment to time entries/timecards
- ✅ Have material tracking system

**Required Changes:**
- Add ability to attach materials directly to time entries
- Create UI for material attachment in timecard view
- Track material usage per time entry

### 6. VISIBILITY RESTRICTIONS

**Current State:**
- ❌ Job phases are visible to all roles
- ❌ Revenue data visible in multiple places
- ✅ Have permission controls but not fully enforced in UI
- ❌ "Residential" category still visible

**Required Changes:**
- Remove job phases from all non-admin views
- Hide revenue/profit data from employee views
- Enforce permission-based UI rendering
- Remove "Residential" from job categories

### 7. PURCHASE ORDER FUNCTIONALITY

**Current State:**
- ✅ Have purchase order system
- ❌ Employees cannot initiate POs
- ❌ No PO creation from service calls

**Required Changes:**
- Allow employees to initiate PO on service calls
- Create PO notification system to office
- Add PO creation to employee permissions

### 8. TIME ENTRY ENHANCEMENTS

**Current State:**
- ✅ Basic clock-in/clock-out functionality
- ❌ No job creation during clock-in
- ❌ No "mark as complete" option
- ❌ Issues with time tracking selection

**Required Changes:**
- Integrate job creation into clock-in workflow
- Add option to create new job OR select existing during clock-in
- Add "Mark as Done" functionality for completed jobs
- Fix time tracking selection issues

## Priority Implementation Order

### CRITICAL (Derek's Immediate Needs)
1. Give Derek employee access view
2. Fix time tracking selection issues
3. Remove "Residential" category
4. Implement overtime calculation display

### HIGH PRIORITY (Core Requirements)
5. Create RolePermissions.tsx component for UI
6. Restrict employee permissions and views
7. Remove job phases and revenue visibility from employees
8. Integrate job creation into clock-in process
9. Add "Mark as Done" functionality

### MEDIUM PRIORITY (Workflow Improvements)
10. Create enhanced time reporting dashboard with:
    - Monday-Sunday weekly view
    - Daily hours per employee
    - Overtime calculations (>8hrs = 1.5x, Sunday = 2x)
    - Hours by category
11. Employee-initiated PO on service calls
12. Add job addresses to time entry
13. Implement material attachment to timecards

### LOW PRIORITY (Nice to Have)
14. Enhanced export capabilities
15. Additional reporting views
16. PO notification system

## Technical Implementation Notes

### Role Creation:
- Use existing `/api/rbac/roles` endpoints
- Database tables already exist
- Need UI component (RolePermissions.tsx)

### UI Restrictions:
- Implement permission checks in components
- Use user.role to conditionally render UI elements
- Create employee-specific views where needed

### New Features:
- CreateJobDialog can be reused for time entry job creation
- Material attachment uses existing attachment system
- Reporting dashboard can leverage existing data APIs

## Estimated Effort

### Critical Items (Derek's Needs):
- Fix time tracking issues: 1-2 hours
- Remove "Residential" category: 0.5 hours
- Derek's employee access: 1 hour
- Overtime calculation display: 3-4 hours

### Core Features:
- RolePermissions.tsx component: 4-6 hours
- Employee Restrictions: 3-4 hours
- Time Entry Workflow with job creation: 6-8 hours
- Enhanced Reporting Dashboard: 8-10 hours
- Purchase Order functionality: 4-5 hours
- Material Attachments: 4-5 hours
- Testing & Refinement: 4-5 hours

**Total Estimated: 36-48 hours**

## Next Steps (Revised Priority)

1. **Immediate Fixes for Derek:**
   - Fix time tracking selection issues
   - Remove "Residential" category
   - Set up Derek with employee access
   - Display overtime calculations

2. **Core Workflow Changes:**
   - Create RolePermissions.tsx UI component
   - Integrate job creation into clock-in process
   - Add "Mark as Done" for completed jobs
   - Enable employee-initiated POs

3. **Access Control:**
   - Implement strict employee restrictions
   - Hide revenue/phases from employees
   - Enforce permission-based rendering

4. **Enhanced Reporting:**
   - Build Monday-Sunday weekly dashboard
   - Add overtime calculations (>8hrs, Sunday 2x)
   - Show hours by category and job

5. **Additional Features:**
   - Material attachments to timecards
   - PO notification system
   - Export enhancements

## Key Insights from Requirements

1. **Derek is a specific user** who needs immediate access with employee view
2. **Overtime rules are specific:** >8 hours/day = 1.5x, Sundays = 2x pay
3. **Job creation must be seamless** - integrated directly into clock-in workflow
4. **"Residential" category** should be removed entirely
5. **Employees need more autonomy** - can initiate POs and create jobs
6. **Weekly view format** should be Monday-Sunday (not Sunday-Saturday)

## Backend Status

✅ **Complete RBAC Backend from Replit Integration:**
- `/api/rbac/roles` - Role CRUD operations
- `/api/rbac/permissions` - Permission management
- `/api/rbac/audit-logs` - Audit trail
- `/api/rbac/roles/[id]/permissions` - Role permission assignments
- `/api/users/[id]/role` - User role assignments

✅ **Database Tables:**
- Role, RoleAssignment, RolePermission, RoleHierarchy
- User, UserPermission, UserAuditLog
- All necessary tables for RBAC exist

❌ **Missing Frontend:**
- RolePermissions.tsx component to manage all of the above