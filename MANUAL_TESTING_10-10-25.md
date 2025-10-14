# Manual Testing Guide - October 2025

## Overview
This guide covers testing for:
- **Phase 2 (Materials)** - Completed 10/10/25
- **Phase 3 (Photos)** - Completed 10/10/25
- **User Management** - Completed 10/10/25
- **Requirement #3 (Job Number & Customer PO)** - Completed 10/12/25
- **Requirement #4 (Auto-Submit System)** - Completed 10/12/25
- **Requirement #8 (Calendar Visibility)** - Completed 10/12/25

---

# PHASE 2: MATERIALS TRACKING

## Feature 1: Add Materials to Time Entry

### WHO CAN ACCESS
- ✅ **Employees** (when creating/editing their own time entries)
- ✅ **Foreman** (when creating/editing any time entry)
- ✅ **Admin** (when creating/editing any time entry)

### FLOW START → END

**START: Employee Time Entry Form**
- Location: `/time` page → Click "Add Time Entry" or edit existing entry
- File: `src/app/(app)/time/page.tsx` → Opens `MultiJobTimeEntry.tsx`

**MID: Materials Section**
- Look for: "Materials Used" section with grey paper cards
- Actions available:
  - Select material from dropdown (shows code, name, category, stock)
  - Enter quantity (decimal allowed, e.g., 10.5)
  - Add notes (optional)
  - Check "Off Truck" checkbox
  - Upload packing slip (PDF or image)
  - Click "+ Add Material" for multiple materials
  - Delete materials with trash icon

**END: Multiple Places Where Materials Appear**

1. **Timesheet View** (`/time` page)
   - Shows: Blue chip badge "X material(s)" on entries with materials
   - Who sees: Employee (own entries), Foreman/Admin (all entries)

2. **Job Material Usage Tab** (Job Details → Materials tab)
   - Shows: Combined list of ALL materials:
     - Materials from time entries (labeled "From Time Entry")
     - Manual material recordings (from MaterialUsage table)
   - Displays: Material code, name, quantity, unit, user, date, notes
   - Who sees: Foreman/Admin viewing job details

3. **Database**
   - Table: `TimeEntryMaterial`
   - Linked to: `TimeEntry.id` (CASCADE delete)

### TEST STEPS

#### Test 1.1: Create Time Entry with Materials (Employee)
1. Login as **Employee**
2. Go to `/time` page
3. Click "**Add Time Entry**"
4. Fill required fields:
   - Select employee (yourself)
   - Select date
   - Select job
   - Enter hours in category fields (e.g., 8 in Straight Time)
5. Scroll to "**Materials Used**" section
6. Click "**Add Material**"
7. In material dropdown, select any material (e.g., "KLK-001 - Killark 3/4 XP T")
8. Enter quantity: `10`
9. Enter notes: `Test material entry`
10. Check "**Off Truck**" checkbox
11. Click "**Submit Time Entries**"
12. ✅ **EXPECTED**: Success message, entry appears in timesheet with "1 material" badge

#### Test 1.2: Verify Material Shows in Timesheet
1. Stay on `/time` page
2. Find the entry you just created
3. ✅ **EXPECTED**: Blue chip shows "**1 material**"
4. Click "**Edit**" on the entry
5. ✅ **EXPECTED**: Material section shows your material with all data filled
6. ✅ **EXPECTED**: "Off Truck" checkbox is checked

#### Test 1.3: Add Multiple Materials
1. In edit mode, click "**+ Add Material**" again
2. Select different material
3. Enter quantity: `25`
4. **DO NOT** check off truck
5. Click "**Update Entry**"
6. ✅ **EXPECTED**: Entry now shows "**2 materials**" badge

#### Test 1.4: Verify in Job Material Usage (Admin/Foreman)
1. Login as **Admin** or **Foreman**
2. Go to **Jobs** page (`/jobs`)
3. Find the job from your time entry
4. Click to open job details
5. Click "**Materials**" tab
6. ✅ **EXPECTED**:
   - Your materials appear in the list
   - Shows "**From Time Entry**" badge
   - Shows correct quantities
   - Shows "OFF_TRUCK" or "TIME_ENTRY" usage type
   - Shows your name as user
   - Shows date of time entry

#### Test 1.5: Edit Materials
1. Go back to `/time` page (as employee)
2. Edit your entry
3. Change quantity on first material to `15`
4. Remove second material (trash icon)
5. Add new material
6. Update entry
7. ✅ **EXPECTED**: Changes save, badge updates to correct count

#### Test 1.6: Delete Time Entry Removes Materials
1. Delete your test time entry
2. Login as Admin
3. Go to job → Materials tab
4. ✅ **EXPECTED**: Your materials are gone (CASCADE delete worked)

---

## Feature 2: Packing Slip Upload

### WHO CAN ACCESS
- ✅ **Employees** (on their materials)
- ✅ **Foreman** (on any materials)
- ✅ **Admin** (on any materials)

### FLOW START → END

**START: Material Entry in Time Form**
- Location: Same as materials above, within each material card
- Look for: "Upload Packing Slip" button

**MID: File Upload**
- Click button → File picker opens
- Select PDF or image file
- File uploads immediately
- Shows: "📎 filename.pdf" link

**END: Viewable Packing Slip**
- Click filename link → Opens file in new tab
- Stored in: `public/uploads/packing-slips/` (dev) or S3 (prod)
- Database: `TimeEntryMaterial.packingSlipUrl` field

### TEST STEPS

#### Test 2.1: Upload Packing Slip (Employee)
1. Create/edit time entry with material (as employee)
2. In material card, find "**Upload Packing Slip**" button
3. Click button
4. Select a **PDF file** (e.g., any invoice or receipt)
5. ✅ **EXPECTED**:
   - Button changes to "Uploading..."
   - Success message appears
   - Button changes to "Change Packing Slip"
   - Shows "📎 {filename}.pdf" link

#### Test 2.2: View Packing Slip
1. Click the "📎 {filename}" link
2. ✅ **EXPECTED**:
   - File opens in new browser tab
   - PDF displays correctly
   - File is readable

#### Test 2.3: Replace Packing Slip
1. Click "**Change Packing Slip**"
2. Select a different file (image this time, e.g., JPG)
3. ✅ **EXPECTED**:
   - Old file replaced
   - New filename shows
   - Click to view works

#### Test 2.4: Packing Slip Persists
1. Save time entry
2. Close form
3. Edit entry again
4. ✅ **EXPECTED**: Packing slip still shows with link

#### Test 2.5: Image Upload
1. Upload an **image** (.jpg, .png) as packing slip
2. ✅ **EXPECTED**:
   - Upload succeeds
   - Click to view opens image in new tab

---

# PHASE 3: PHOTO UPLOADS

## Feature 3: Work Photos on Time Entries

### WHO CAN ACCESS
- ✅ **Employees** (on their own time entries)
- ✅ **Foreman** (on any time entry)
- ✅ **Admin** (on any time entry)

### FLOW START → END

**START: Edit Existing Time Entry**
- Location: `/time` page → Click "Edit" on saved entry
- **IMPORTANT**: Photos can ONLY be added to SAVED entries (not new ones)
- Look for: "📸 Work Photos" section below materials

**MID: Photo Upload & Gallery**
- Click "Add Photos" button
- Select one or multiple photos
- Photos upload with compression
- Gallery grid shows thumbnails (3 columns)
- Click photo to zoom/view full size
- Delete photos with trash icon

**END: Multiple Places Where Photos Appear**

1. **Photo Gallery** (in time entry form)
   - Shows: Grid of thumbnails with zoom/delete options
   - Who sees: Anyone editing the entry

2. **Timesheet View** (`/time` page)
   - Shows: Purple chip badge "📸 X photo(s)" on entries with photos
   - Who sees: Employee (own entries), Foreman/Admin (all entries)

3. **Database**
   - Table: `TimeEntryPhoto`
   - Linked to: `TimeEntry.id` (CASCADE delete)
   - Stores: Full image + thumbnail

### TEST STEPS

#### Test 3.1: Create Time Entry First
1. Login as **Employee**
2. Create a new time entry (job, hours, etc.)
3. **Save the entry** (Submit Time Entries)
4. ✅ **EXPECTED**: Entry appears in timesheet

#### Test 3.2: Add Photos to Saved Entry
1. Click "**Edit**" on the entry you just created
2. Scroll down to "**📸 Work Photos**" section
3. Click "**Add Photos**" button
4. Select **1 photo** from your computer (JPG, PNG, or any image)
5. ✅ **EXPECTED**:
   - Button shows "Uploading..."
   - After ~2-5 seconds, success
   - Photo appears in gallery grid
   - Thumbnail is visible (300px size)

#### Test 3.3: Upload Multiple Photos
1. Click "**Add Photos**" again
2. This time, select **multiple photos** at once (2-3 photos)
3. ✅ **EXPECTED**:
   - All photos upload sequentially
   - All appear in gallery
   - Gallery shows 3 photos total in grid

#### Test 3.4: View Full-Size Photo (Lightbox)
1. Click on any **thumbnail** in the gallery
2. ✅ **EXPECTED**:
   - Lightbox opens with black background
   - Full-size image displays (1920px max)
   - X button in top-right corner
   - Can close by clicking X or outside image

#### Test 3.5: Delete Photo
1. In gallery, find **trash icon** on a photo
2. Click trash icon
3. ✅ **EXPECTED**:
   - Confirmation dialog appears: "Delete this photo?"
   - Click OK
   - Photo disappears from gallery
   - Gallery updates to show remaining photos

#### Test 3.6: Verify Photo Count Badge
1. Close the edit form (click Cancel or save)
2. Go back to `/time` page
3. Find your time entry
4. ✅ **EXPECTED**: Shows purple badge "**📸 2 photos**" (or whatever count remains)

#### Test 3.7: Photos Persist Across Edits
1. Edit the entry again
2. ✅ **EXPECTED**: All photos still visible in gallery
3. Add one more photo
4. Save
5. Edit again
6. ✅ **EXPECTED**: All 3 photos show

#### Test 3.8: Mobile Camera Test (if on phone/tablet)
1. Open app on mobile device
2. Edit time entry
3. Click "**Add Photos**"
4. ✅ **EXPECTED**:
   - Option to "Take Photo" or "Choose from Gallery"
   - Take photo with camera
   - Photo uploads and appears in gallery

#### Test 3.9: Large File Test
1. Try uploading a **very large photo** (>5MB if you have one)
2. ✅ **EXPECTED**:
   - Upload succeeds
   - Photo compresses to smaller size
   - Displays correctly

#### Test 3.10: Delete Entry Removes Photos
1. Delete the time entry with photos
2. Check database or try to access photos
3. ✅ **EXPECTED**: Photos deleted from storage (CASCADE delete)

---

# INTEGRATION TESTS

## Test 4: Complete Workflow (Employee → Admin)

### Scenario: Employee Creates Complete Time Entry

**EMPLOYEE SIDE:**

1. Login as **Employee**
2. Create new time entry:
   - Job: Any active job
   - Hours: 8 in Straight Time
   - Location: Auto-filled from job
   - Job Description: Auto-filled
   - Work Description: "Replaced broken panel"
3. Add 2 materials:
   - Material 1: "KLK-001", Qty: 5, Off Truck: YES
   - Material 2: "WIRE-250", Qty: 100, Upload packing slip PDF
4. **Save entry**
5. **Edit entry**
6. Add 3 work photos showing completed work
7. Save again

**VERIFICATION POINTS:**

On **Timesheet** (`/time` page):
- ✅ Entry shows 8 hours
- ✅ Shows "**2 materials**" badge (blue)
- ✅ Shows "**📸 3 photos**" badge (purple)

**ADMIN/FOREMAN SIDE:**

1. Login as **Admin** or **Foreman**
2. Go to **Jobs** page
3. Find the job from employee's entry
4. Open job details
5. Click "**Materials**" tab

**VERIFICATION POINTS:**

- ✅ Both materials appear in list
- ✅ Material 1 shows "**OFF_TRUCK**" badge
- ✅ Material 2 shows "**TIME_ENTRY**" badge
- ✅ Both show employee name
- ✅ Both show correct quantities
- ✅ Packing slip link visible and clickable (for Material 2)

6. Click "**Time Entries**" or "**Activity**" tab

**VERIFICATION POINTS:**

- ✅ Employee's time entry appears
- ✅ Shows 8 hours
- ✅ Shows materials indicator
- ✅ Shows photos indicator

---

# DATABASE VERIFICATION

## Check Database Directly

If you want to verify data is actually being saved:

```sql
-- Check materials for a time entry
SELECT * FROM "TimeEntryMaterial"
WHERE "timeEntryId" = 'YOUR-ENTRY-ID'
ORDER BY "createdAt";

-- Check photos for a time entry
SELECT * FROM "TimeEntryPhoto"
WHERE "timeEntryId" = 'YOUR-ENTRY-ID'
ORDER BY "uploadedAt";

-- Check photo counts
SELECT te.id, te."jobId",
       COUNT(tep.id) as photo_count
FROM "TimeEntry" te
LEFT JOIN "TimeEntryPhoto" tep ON te.id = tep."timeEntryId"
GROUP BY te.id
HAVING COUNT(tep.id) > 0;

-- Check materials with off-truck flag
SELECT tem.*, m.code, m.name
FROM "TimeEntryMaterial" tem
LEFT JOIN "Material" m ON tem."materialId" = m.id
WHERE tem."offTruck" = true;
```

---

# FILE SYSTEM VERIFICATION

## Check Files Are Actually Stored

**Development (Local):**

```bash
# Check packing slips
ls -lh public/uploads/packing-slips/

# Check photos
ls -lh public/uploads/time-entry-photos/

# See file sizes to verify compression
ls -lhS public/uploads/time-entry-photos/*/*.jpg
```

**Expected:**
- Packing slips: Original size (PDFs not compressed)
- Photos: Compressed size (typically 100-500KB for full size, <50KB for thumbnails)
- Thumbnails: Named `thumb-{timestamp}-{filename}.jpg`

---

# ERROR SCENARIOS TO TEST

## Test 5: Error Handling

### Test 5.1: Invalid Material Quantity
1. Add material with quantity: `abc` (letters)
2. ✅ **EXPECTED**: Validation error or auto-corrects to 0

### Test 5.2: Upload Wrong File Type
1. Try uploading .txt or .doc as packing slip
2. ✅ **EXPECTED**: Error "Invalid file type"

### Test 5.3: Upload Oversized File
1. Try uploading file >10MB
2. ✅ **EXPECTED**: Error "File too large"

### Test 5.4: Add Photos Before Saving Entry
1. Create new entry (don't save yet)
2. Look for photos section
3. ✅ **EXPECTED**: Message "Save the time entry first to add photos"

### Test 5.5: Delete Photo Confirmation
1. Click delete on photo
2. ✅ **EXPECTED**: Confirmation dialog appears
3. Click Cancel
4. ✅ **EXPECTED**: Photo NOT deleted

---

# PERFORMANCE TESTS

## Test 6: Speed & Responsiveness

### Test 6.1: Upload Multiple Large Photos
1. Select 5+ photos at once (each 2-5MB)
2. ✅ **EXPECTED**:
   - Uploads complete in <30 seconds total
   - UI doesn't freeze
   - Can still scroll/interact during upload

### Test 6.2: Gallery with Many Photos
1. Add 10+ photos to one entry
2. ✅ **EXPECTED**:
   - Gallery loads quickly
   - Thumbnails display without lag
   - Smooth scrolling

### Test 6.3: Timesheet with Many Entries
1. Create 10+ time entries with materials/photos
2. View timesheet page
3. ✅ **EXPECTED**:
   - Page loads in <3 seconds
   - All badges display correctly
   - No performance issues

---

# SUMMARY CHECKLIST

## Phase 2: Materials ✅
- [ ] Add single material to time entry
- [ ] Add multiple materials to time entry
- [ ] Edit material quantities
- [ ] Delete materials
- [ ] Check/uncheck "Off Truck"
- [ ] Materials show in timesheet (badge)
- [ ] Materials show in Job Materials tab
- [ ] Materials combine with manual entries
- [ ] Upload packing slip (PDF)
- [ ] Upload packing slip (image)
- [ ] View packing slip (click link)
- [ ] Replace packing slip
- [ ] Packing slip persists after save

## Phase 3: Photos ✅
- [ ] Cannot add photos to unsaved entry
- [ ] Add single photo to saved entry
- [ ] Add multiple photos at once
- [ ] Photos compress automatically
- [ ] Thumbnails generate
- [ ] View photo in lightbox (click to zoom)
- [ ] Delete photo
- [ ] Photos show in timesheet (badge)
- [ ] Photo count accurate
- [ ] Photos persist across edits
- [ ] Mobile camera upload works

## Integration ✅
- [ ] Employee creates entry with materials + photos
- [ ] Admin sees materials in Job Materials tab
- [ ] Admin sees materials from time entries
- [ ] Badges show correct counts
- [ ] Database CASCADE delete works
- [ ] Files stored correctly
- [ ] No errors in console
- [ ] Performance is acceptable

---

# USER MANAGEMENT

## Feature 7: Create and Manage Users/Employees

### WHO CAN ACCESS
- ✅ **Owner/Admin Only** (OWNER_ADMIN role)

### FLOW START → END

**START: User Management Page**
- Location: `/users` page (Admin navigation)
- File: `src/app/(app)/users/page.tsx`

**MID: User CRUD Operations**
- Create new users (employees, foremen, admins)
- Edit existing user profiles
- Activate/deactivate users
- Set pay rates

**END: Users Can Log In and Work**
- New employee receives credentials
- Can log into system
- Has appropriate permissions based on role
- Pay rates used in timesheet calculations

### TEST STEPS

#### Test 7.1: Create New Employee (Admin)
1. Login as **Admin** (owner/admin role)
2. Navigate to `/users` page
3. ✅ **EXPECTED**: See "User Management" page with stats cards
4. Click "**Add User**" button
5. Dialog opens with form
6. Fill in form:
   - **Full Name**: "Derek Johnson"
   - **Email**: "derek@test.com"
   - **Phone**: "(555) 123-4567"
   - **Role**: Select "Employee" from dropdown
   - **Password**: "welcome123"
   - **Active**: Keep checked ✓
   - **Regular Rate**: "20.00"
   - **Overtime Rate**: Leave blank (auto-calculates 1.5x = $30)
   - **Double Time Rate**: Leave blank (auto-calculates 2x = $40)
7. Click "**Create User**"
8. ✅ **EXPECTED**:
   - Success message appears
   - Dialog closes
   - Derek appears in user table
   - Shows in "Active Users" tab
   - Avatar shows "D"
   - Role badge shows "Employee" (green)
   - Pay rates display correctly

#### Test 7.2: Verify New User Can Log In
1. **Log out** from admin account
2. Go to login page
3. Enter:
   - Email: derek@test.com
   - Password: welcome123
4. Click "Login"
5. ✅ **EXPECTED**:
   - Login succeeds
   - Redirects to employee dashboard
   - Can access time entry features
   - Cannot access admin features

#### Test 7.3: Edit User Information (Admin)
1. Login as **Admin**
2. Go to `/users` page
3. Find Derek in the table
4. Click **✏️ Edit** icon
5. Dialog opens with Derek's info pre-filled
6. Change:
   - **Phone**: "(555) 999-8888"
   - **Regular Rate**: "22.00"
7. Leave password blank (don't change)
8. Click "**Update User**"
9. ✅ **EXPECTED**:
   - Success message
   - Table updates with new phone
   - Pay rate now shows $22/hr

#### Test 7.4: Change User Role (Promotion)
1. Edit Derek's profile
2. Change:
   - **Role**: Employee → **Foreman**
   - **Regular Rate**: $22 → **$28/hr**
3. Update
4. ✅ **EXPECTED**:
   - Role badge changes to "Foreman" (orange)
   - Pay rate updates
   - Log in as Derek again
   - Has foreman permissions now

#### Test 7.5: Deactivate User (Admin)
1. As Admin, go to `/users`
2. Find Derek
3. Click **🔖 Badge** icon (activate/deactivate toggle)
4. ✅ **EXPECTED**:
   - Status changes to "Inactive"
   - Derek moves to "Inactive Users" tab
   - Success message shows
5. Log out and try to log in as Derek
6. ✅ **EXPECTED**: Login fails (user inactive)

#### Test 7.6: Reactivate User
1. As Admin, go to `/users`
2. Click "**Inactive Users**" tab
3. Find Derek
4. Click **🔖 Badge** icon
5. ✅ **EXPECTED**:
   - Derek moves back to "Active Users" tab
   - Can log in again

#### Test 7.7: Create Admin User
1. As Admin, create new user:
   - Name: "Jane Smith"
   - Email: "jane@test.com"
   - Role: **Owner/Admin**
   - Password: "admin123"
2. ✅ **EXPECTED**:
   - User created with red "Owner/Admin" badge
   - Log in as Jane
   - Has full admin access
   - Can see `/users` page
   - Can create/edit other users

#### Test 7.8: Create Office Staff
1. Create new user:
   - Name: "Sarah Office"
   - Email: "sarah@test.com"
   - Role: **Office Staff**
   - No pay rate needed (salaried)
2. ✅ **EXPECTED**:
   - User created with blue "Office Staff" badge
   - Can access back office features
   - Cannot enter field time

#### Test 7.9: Stats Cards Update
1. Create multiple users (2 employees, 1 foreman)
2. ✅ **EXPECTED**:
   - "Total Users" increases
   - "Active Users" increases
   - "Employees" count correct
   - "Admins" count includes foremen

#### Test 7.10: Search/Filter Users (Future Feature)
- Currently: Manual scrolling through table
- Future: Search by name/email

#### Test 7.11: Pay Rates in Timesheet
1. Create employee with custom pay rates
2. Employee enters time entry with 8 hours
3. Admin views timesheet
4. ✅ **EXPECTED**:
   - Estimated pay calculated using employee's rates
   - Regular hours × regular rate
   - Overtime hours × OT rate (if applicable)

---

# INTEGRATION TESTS - USER MANAGEMENT

## Test 8: Complete User Lifecycle (Admin → Employee → Admin)

### Scenario: Onboard New Employee, Work Week, Review

**ADMIN CREATES EMPLOYEE:**
1. Admin goes to `/users`
2. Creates new employee: "Derek Johnson"
   - Role: Employee
   - Pay: $20/hr regular
   - Email: derek@test.com
   - Password: welcome123

**EMPLOYEE WORKS:**
3. Derek logs in
4. Creates time entry:
   - Monday, 8 hours, Job #1001
   - Adds 2 materials
   - Uploads 3 photos
5. Repeats for Tuesday-Friday
6. Submits week for approval

**ADMIN REVIEWS:**
7. Admin logs in
8. Views Derek's timesheet
9. Sees all entries with materials and photos
10. Calculates pay: 40 hours × $20 = $800
11. Approves timesheet

**VERIFICATION POINTS:**
- ✅ User created successfully
- ✅ Login works with provided credentials
- ✅ Employee can enter time
- ✅ Materials and photos save
- ✅ Admin can see all Derek's work
- ✅ Pay calculated with Derek's rates
- ✅ Complete audit trail

---

# DATABASE VERIFICATION - USER MANAGEMENT

## Check Users in Database

```sql
-- View all users
SELECT id, name, email, role, active, "regularRate", "createdAt"
FROM "User"
ORDER BY "createdAt" DESC;

-- Check specific user
SELECT *
FROM "User"
WHERE email = 'derek@test.com';

-- Count by role
SELECT role, COUNT(*) as count
FROM "User"
GROUP BY role;

-- Active vs inactive
SELECT active, COUNT(*) as count
FROM "User"
GROUP BY active;
```

---

# ERROR SCENARIOS - USER MANAGEMENT

## Test 9: Validation and Error Handling

### Test 9.1: Duplicate Email
1. Create user: john@test.com
2. Try to create another user: john@test.com
3. ✅ **EXPECTED**: Error "Email already exists"

### Test 9.2: Missing Required Fields
1. Try to create user without name
2. ✅ **EXPECTED**: Error "Name is required"
3. Try without email
4. ✅ **EXPECTED**: Error "Email is required"
5. Try without password (new user)
6. ✅ **EXPECTED**: Error "Password is required"

### Test 9.3: Invalid Email Format
1. Enter email: "notanemail"
2. ✅ **EXPECTED**: Validation error

### Test 9.4: Edit Without Changing Password
1. Edit existing user
2. Leave password field blank
3. Update other info
4. ✅ **EXPECTED**:
   - User updates successfully
   - Can still log in with old password

### Test 9.5: Invalid Pay Rate
1. Enter negative pay rate: -5
2. ✅ **EXPECTED**: Validation prevents or auto-corrects

---

# SUMMARY CHECKLIST - USER MANAGEMENT

## User Creation ✅
- [ ] Create employee
- [ ] Create foreman
- [ ] Create admin
- [ ] Create office staff
- [ ] All roles display correctly
- [ ] Pay rates save correctly
- [ ] User appears in table
- [ ] Stats update

## User Editing ✅
- [ ] Edit name
- [ ] Edit email
- [ ] Edit phone
- [ ] Change role
- [ ] Update pay rates
- [ ] Change password
- [ ] Keep password (leave blank)
- [ ] Changes persist

## User Status ✅
- [ ] Deactivate user
- [ ] User cannot log in when inactive
- [ ] User moves to inactive tab
- [ ] Reactivate user
- [ ] User can log in again
- [ ] User moves to active tab

## Permissions ✅
- [ ] Employee can only access employee features
- [ ] Foreman has crew management access
- [ ] Admin has full access
- [ ] Office staff has back-office access
- [ ] Roles enforce permissions correctly

## Integration with Time Entries ✅
- [ ] New employee can log in
- [ ] Can create time entries
- [ ] Pay rates used in calculations
- [ ] Time entries link to user correctly
- [ ] User info shows in reports

## UI/UX ✅
- [ ] Stats cards accurate
- [ ] Active/inactive tabs work
- [ ] Table displays all info
- [ ] Avatars show initials
- [ ] Role badges color-coded
- [ ] Forms validate input
- [ ] Success/error messages clear
- [ ] Dialog opens/closes smoothly

---

# REQUIREMENT #3: JOB NUMBER & CUSTOMER PO

## Overview
Completed: **October 12, 2025**
- Changed "Job ID" label to "Job Number" in UI
- Added new "Customer PO" field to Job records
- Customer PO is optional and stores the PO number provided by the customer

## Feature: Job Number & Customer PO Display

### WHO CAN ACCESS
- ✅ **All users** (OWNER_ADMIN, FOREMAN, OFFICE, EMPLOYEE)
- Everyone can see Job Number and Customer PO in jobs list
- Everyone can add Customer PO when creating/editing jobs (if they have job creation permissions)

### FLOW START → END

**START: Jobs List Page**
- Location: `/jobs` page
- File: `src/app/(app)/jobs/page.tsx`

**MID: View Jobs Table**
- Column Headers:
  - "Job Number" (was "Job ID") - shows auto-generated number like "25-001-A1B"
  - "Customer PO" - shows customer's PO number or "-" if empty
  - Title, Customer, Status, Priority, Due Date, Crew, Actions
- All jobs display in table with both fields

**END: Create/Edit/View Job**

1. **Create New Job**
   - Click "Create Job" button
   - Fill customer, type, description
   - Optional: Enter "Customer PO Number" field
   - Save job
   - Verify Customer PO appears in jobs list

2. **Edit Existing Job**
   - Click job row or Edit action
   - Update "Customer PO Number" field
   - Save changes
   - Verify Customer PO updated in list

3. **Job Detail View**
   - Click on any job to view details
   - See: Job Number in page title
   - See: Customer PO displayed under description (if set)
   - Format: "📋 **Customer PO:** [value]"

---

## Test 9.1: View Jobs List with Job Number & Customer PO

### STEPS
1. Go to `/jobs` page
2. Look at the table headers
3. Look at job rows

### EXPECTED
- ✅ Table header shows "Job Number" (not "Job ID")
- ✅ Table has "Customer PO" column
- ✅ Jobs with Customer PO show the value
- ✅ Jobs without Customer PO show "-"
- ✅ Both columns are visible and readable

### DATABASE CHECK
```sql
-- Verify customerPO column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Job' AND column_name = 'customerPO';

-- Expected: customerPO | text | YES

-- View existing jobs with their PO numbers
SELECT "jobNumber", "customerPO", description
FROM "Job"
ORDER BY "createdAt" DESC
LIMIT 10;
```

---

## Test 9.2: Create Job with Customer PO

### STEPS
1. Go to `/jobs` page
2. Click "Create Job" button
3. Fill in:
   - Customer: Select any customer
   - Job Type: Select SERVICE_CALL or INSTALLATION
   - Description: "Testing Customer PO field"
   - Customer PO Number: "CUST-2025-001"
4. Click "Create Job"
5. Find the new job in the jobs list

### EXPECTED
- ✅ "Customer PO Number" field visible in create form
- ✅ Field is optional (not required)
- ✅ Job created successfully
- ✅ Customer PO "CUST-2025-001" shows in jobs list
- ✅ Customer PO shows in job detail page

### DATABASE CHECK
```sql
-- Find the job we just created
SELECT id, "jobNumber", "customerPO", description
FROM "Job"
WHERE description = 'Testing Customer PO field';

-- Expected: customerPO = 'CUST-2025-001'
```

---

## Test 9.3: Create Job WITHOUT Customer PO (Optional Field)

### STEPS
1. Click "Create Job" button
2. Fill in required fields ONLY:
   - Customer
   - Job Type
   - Description: "Testing NO Customer PO"
3. Leave "Customer PO Number" EMPTY
4. Click "Create Job"
5. Find the job in the list

### EXPECTED
- ✅ Job created successfully without Customer PO
- ✅ Jobs list shows "-" in Customer PO column
- ✅ Job detail page does NOT show Customer PO line

### DATABASE CHECK
```sql
SELECT "jobNumber", "customerPO", description
FROM "Job"
WHERE description = 'Testing NO Customer PO';

-- Expected: customerPO = NULL
```

---

## Test 9.4: Edit Existing Job - Add Customer PO

### STEPS
1. Find any job without a Customer PO (shows "-")
2. Click the job row to open details
3. Click "Edit Job" button
4. In the edit form, enter Customer PO: "RETRO-PO-123"
5. Click "Save Changes"
6. Return to jobs list

### EXPECTED
- ✅ Edit form shows "Customer PO Number" field
- ✅ Field can be edited
- ✅ Job saved successfully
- ✅ Jobs list now shows "RETRO-PO-123"
- ✅ Job detail page shows Customer PO

### DATABASE CHECK
```sql
-- Verify the update
SELECT "jobNumber", "customerPO"
FROM "Job"
WHERE "customerPO" = 'RETRO-PO-123';
```

---

## Test 9.5: Edit Existing Job - Change Customer PO

### STEPS
1. Find a job with an existing Customer PO
2. Click Edit
3. Change Customer PO to new value: "UPDATED-PO-456"
4. Save changes

### EXPECTED
- ✅ Old value loads in edit form
- ✅ Can update to new value
- ✅ New value shows in list
- ✅ New value shows in detail view

---

## Test 9.6: Edit Existing Job - Remove Customer PO

### STEPS
1. Find a job with a Customer PO
2. Click Edit
3. Clear the Customer PO field (delete all text)
4. Save changes

### EXPECTED
- ✅ Field can be cleared
- ✅ Jobs list shows "-" again
- ✅ Detail page doesn't show Customer PO line
- ✅ Database has NULL value

---

## Test 9.7: Search Jobs by Customer PO (Future Feature)

### STEPS
1. Go to `/jobs` page
2. Use the search box
3. Type a Customer PO number you created

### CURRENT BEHAVIOR
- Search works on Job Number, Title, and Customer name
- Customer PO search not yet implemented

### FUTURE ENHANCEMENT
- Could add Customer PO to search query if needed

---

## Test 9.8: Job Number vs Customer PO Clarity

### VERIFY UNDERSTANDING
- **Job Number**: Auto-generated by system (format: YY-###-SSS)
  - Example: "25-001-A1B"
  - Always present, unique, system-controlled

- **Customer PO**: Provided by customer, optional
  - Example: "CUSTOMER-2025-001"
  - User-entered, may or may not exist

### CHECK UI LABELS
- ✅ Jobs list clearly shows both columns
- ✅ Create/Edit forms label as "Customer PO Number"
- ✅ No confusion between the two fields

---

## SUMMARY CHECKLIST: Job Number & Customer PO ✅

### Database ✅
- [ ] customerPO column exists in Job table
- [ ] Column is TEXT type, nullable
- [ ] Index exists on customerPO
- [ ] Can store NULL values
- [ ] Can store text values

### API Endpoints ✅
- [ ] GET /api/jobs returns customerPO
- [ ] POST /api/jobs accepts customerPO
- [ ] PATCH /api/jobs/[id] updates customerPO
- [ ] GET /api/jobs/[id] returns customerPO

### UI - Jobs List ✅
- [ ] Table header shows "Job Number" (not "Job ID")
- [ ] Table has "Customer PO" column
- [ ] Shows actual PO values
- [ ] Shows "-" when no PO
- [ ] Columns properly aligned

### UI - Create Job ✅
- [ ] Form has "Customer PO Number" field
- [ ] Field is optional
- [ ] Can create job with PO
- [ ] Can create job without PO
- [ ] Value saves to database

### UI - Edit Job ✅
- [ ] Form shows existing PO value
- [ ] Can update PO value
- [ ] Can add PO to job without one
- [ ] Can remove PO from job
- [ ] Changes save correctly

### UI - Job Details ✅
- [ ] Job Number in page title
- [ ] Customer PO shows under description (if set)
- [ ] No Customer PO line if empty
- [ ] Formatting clear with icon

### Data Integrity ✅
- [ ] Creating job with PO saves correctly
- [ ] Creating job without PO saves as NULL
- [ ] Updating PO updates database
- [ ] Removing PO sets to NULL
- [ ] No data corruption

---

# REQUIREMENT #4: AUTO-SUBMIT SYSTEM

## Overview
Completed: **October 12, 2025**
- Button text changed to "Submit Time Card"
- Sunday 8 PM reminder notification system
- Sunday 11:59 PM automatic time card submission
- Notifications for reminders and auto-submissions

## Feature: Auto-Submit & Reminders

### WHO CAN ACCESS
- ✅ **All Employees** - Receive reminders and auto-submit
- ✅ **Foreman/Admin** - See submitted time cards Monday morning

### SYSTEM FLOW

**Throughout the Week (Mon-Sat)**:
- Employees create time entries with status = 'draft'
- Can edit/update anytime

**Sunday 8:00 PM**:
- System checks for employees with unsubmitted entries
- Sends in-app notification: "You have X unsubmitted time entries..."
- Reminder to submit before 11:59 PM

**Sunday 11:59 PM**:
- System auto-submits ALL draft entries
- Changes status from 'draft' to 'submitted'
- Records submittedAt timestamp
- Sends notification: "Your time card has been auto-submitted..."

**Monday Morning**:
- All entries ready for foreman/admin approval
- Status = 'submitted', ready for payroll

---

## Test 10.1: Button Text Changed to "Submit Time Card"

### STEPS
1. Go to `/time` page
2. Click "Add Time Entry"
3. Fill in job, hours, work description
4. Look at the submit button

### EXPECTED
- ✅ Button says "Submit Time Card" (not "Create X Time Entries")
- ✅ When clicking, says "Submitting Time Card..."
- ✅ Button is green (#00bf9a color)

### FILE LOCATION
- `src/components/time/MultiJobTimeEntry.tsx` line 1201

---

## Test 10.2: Test Sunday Reminder Endpoint (Manual)

### PREREQUISITE
- Need to set up CRON_SECRET environment variable
- At least one employee with draft time entry

### STEPS
```bash
# 1. Set CRON_SECRET if not set
echo "CRON_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env.local

# 2. Restart server to load new env var

# 3. Create a draft time entry for an employee
# (Use the UI or insert directly into database)

# 4. Test the reminder endpoint
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/sunday-reminder
```

### EXPECTED
```json
{
  "success": true,
  "timestamp": "2025-10-12T...",
  "weekRange": { "start": "...", "end": "..." },
  "employeesChecked": 1+,
  "employeesWithDraftEntries": 1+,
  "remindersCreated": 1+
}
```

### DATABASE CHECK
```sql
-- Verify reminder notification created
SELECT *
FROM "NotificationLog"
WHERE type = 'TIME_CARD_REMINDER'
ORDER BY "createdAt" DESC
LIMIT 5;

-- Expected: Recent notification with subject "Reminder: Submit Your Time Card"
```

---

## Test 10.3: Test Auto-Submit Endpoint (Manual)

### PREREQUISITE
- Need CRON_SECRET environment variable
- At least one employee with draft time entry

### STEPS
```bash
# 1. Create a draft time entry for current week
# (Use the UI)

# 2. Verify entry is draft
# Check in database or UI

# 3. Test the auto-submit endpoint
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/sunday-auto-submit
```

### EXPECTED
```json
{
  "success": true,
  "timestamp": "2025-10-12T...",
  "employeesAffected": 1+,
  "totalEntriesSubmitted": 1+,
  "submissionDetails": [...]
}
```

### DATABASE CHECK
```sql
-- Verify time entries were submitted
SELECT te.id, u.name, te.date, te.hours, te.status, te."submittedAt"
FROM "TimeEntry" te
JOIN "User" u ON te."userId" = u.id
WHERE te.status = 'submitted'
  AND te."submittedAt" >= NOW() - INTERVAL '5 minutes'
ORDER BY te."submittedAt" DESC;

-- Expected: Recently submitted entries

-- Verify notification created
SELECT *
FROM "NotificationLog"
WHERE type = 'TIME_CARD_AUTO_SUBMITTED'
ORDER BY "createdAt" DESC
LIMIT 5;

-- Expected: Notification saying "Your time card has been automatically submitted"
```

---

## Test 10.4: Verify Notifications Show in UI

### STEPS
1. Log in as employee who received reminder/auto-submit notification
2. Look at notification icon/dropdown in header
3. Click to view notifications

### EXPECTED
- ✅ Notification icon shows unread count
- ✅ Notifications appear in dropdown/list
- ✅ Reminder notification shows correctly
- ✅ Auto-submit notification shows correctly
- ✅ Can mark as read
- ✅ Can see notification timestamp

---

## Test 10.5: Week Range Calculation

### PURPOSE
Verify the system correctly identifies the current week (Monday-Sunday)

### STEPS
Run these queries on different days of the week:

```sql
-- Check what the system considers "current week"
-- Run this query on Monday, Wednesday, Friday, Sunday

SELECT
  CURRENT_DATE as today,
  EXTRACT(DOW FROM CURRENT_DATE) as day_of_week,
  CURRENT_DATE - INTERVAL '1 day' * EXTRACT(DOW FROM CURRENT_DATE) + INTERVAL '1 day' as monday,
  CURRENT_DATE - INTERVAL '1 day' * EXTRACT(DOW FROM CURRENT_DATE) + INTERVAL '7 days' as sunday;
```

### EXPECTED
- ✅ Monday = First day of current week
- ✅ Sunday = Last day of current week
- ✅ Works correctly regardless of which day you test

---

## Test 10.6: Multiple Employees with Mixed Status

### PREREQUISITE
- Have 3+ employee accounts
- Mix of draft and already-submitted entries

### SETUP
```sql
-- Employee 1: Has 5 draft entries
-- Employee 2: Has 0 draft entries (already submitted all)
-- Employee 3: Has 2 draft entries
```

### STEPS
1. Run reminder endpoint
2. Check which employees got reminders
3. Run auto-submit endpoint
4. Check which entries were submitted

### EXPECTED
- ✅ Only employees with draft entries get reminders
- ✅ Only draft entries get auto-submitted
- ✅ Already-submitted entries remain unchanged
- ✅ Correct count reported in API response

---

## Test 10.7: Cron Job Security

### STEPS
1. Try calling reminder endpoint WITHOUT Authorization header:
```bash
curl http://localhost:3000/api/cron/sunday-reminder
```

2. Try with wrong secret:
```bash
curl -H "Authorization: Bearer wrong-secret" \
  http://localhost:3000/api/cron/sunday-reminder
```

3. Try with correct secret:
```bash
curl -H "Authorization: Bearer correct-secret" \
  http://localhost:3000/api/cron/sunday-reminder
```

### EXPECTED
- ✅ Without auth header: 401 Unauthorized (if CRON_SECRET is set)
- ✅ With wrong secret: 401 Unauthorized
- ✅ With correct secret: 200 Success with data
- ✅ Endpoints protected from unauthorized access

---

## Test 10.8: Timezone Handling (Important!)

### STEPS
1. Check server timezone:
```bash
date
# or
timedatectl
```

2. Compare to business timezone
3. Adjust cron schedule if needed

### EXPECTED
- ✅ Understand server timezone
- ✅ Adjust cron times for correct local time
- ✅ Document timezone in setup guide

### EXAMPLE
If server is UTC and business is EST (UTC-5):
- 8 PM EST = 1 AM UTC next day
- 11:59 PM EST = 4:59 AM UTC next day
- Cron needs to run Monday 1 AM and 4:59 AM UTC

---

## SUMMARY CHECKLIST: Auto-Submit System ✅

### Button Text ✅
- [ ] Button says "Submit Time Card"
- [ ] Submitting state says "Submitting Time Card..."
- [ ] Button color and style correct

### API Endpoints ✅
- [ ] Sunday reminder endpoint works
- [ ] Sunday auto-submit endpoint works
- [ ] Proper authorization/security
- [ ] Correct JSON responses
- [ ] Error handling works

### Database Integration ✅
- [ ] Reminders create NotificationLog entries
- [ ] Auto-submit updates status to 'submitted'
- [ ] submittedAt timestamp recorded
- [ ] submittedBy field set correctly
- [ ] Only draft entries affected

### Notifications ✅
- [ ] Reminders show in UI
- [ ] Auto-submit notifications show in UI
- [ ] Notification count updates
- [ ] Can mark as read
- [ ] Messages are clear and helpful

### Week Range Logic ✅
- [ ] Correctly identifies Monday-Sunday week
- [ ] Works on any day of week
- [ ] Date calculations accurate

### Cron Setup ✅
- [ ] CRON_SECRET environment variable set
- [ ] Choose cron method (Vercel/AWS/cron-job.org)
- [ ] Configure Sunday 8 PM reminder
- [ ] Configure Sunday 11:59 PM auto-submit
- [ ] Test manual execution
- [ ] Verify logs/monitoring

### Documentation ✅
- [ ] Setup guide created (AUTO_SUBMIT_SETUP_GUIDE.md)
- [ ] Environment variables documented
- [ ] Cron options explained
- [ ] Testing steps provided
- [ ] Troubleshooting guide included

---

# REQUIREMENT #8: CALENDAR VISIBILITY

## Overview
Completed: **October 12, 2025**
- Removed Schedule/Calendar from employee view
- Schedule page now admin-only (OWNER_ADMIN and FOREMAN)
- Employees redirected to dashboard if they try to access /schedule

## Feature: Admin-Only Calendar Access

### WHO CAN ACCESS
- ✅ **OWNER_ADMIN** - Full calendar access
- ✅ **FOREMAN** - Full calendar access
- ❌ **EMPLOYEE** - Cannot access calendar/schedule

### FLOW START → END

**ADMIN/FOREMAN FLOW**:
- Can see "Schedule" navigation item in sidebar
- Can see "Schedule" in mobile bottom navigation
- Can access `/schedule` page with job scheduling calendar
- Can view crew availability widget
- Can manage job assignments and scheduling

**EMPLOYEE FLOW**:
- Does NOT see "Schedule" navigation item
- If attempts to navigate to `/schedule` directly (URL), redirected to dashboard
- Employees use "My Jobs" from mobile navigation instead
- Employees can still see their assigned jobs on dashboard

---

## Test 11.1: Admin Can Access Schedule (Desktop)

### STEPS
1. Login as **Admin** (admin@admin.com)
2. Look at left sidebar navigation
3. Find "Schedule" menu item
4. Click "Schedule"

### EXPECTED
- ✅ "Schedule" menu item visible in sidebar
- ✅ Clicking navigates to `/schedule` page
- ✅ Calendar view loads with job scheduling interface
- ✅ Can see crew availability widget
- ✅ Can manage job schedules

### FILE LOCATION
- Navigation: `src/components/layout/ResponsiveSidebar.tsx` line 90-94

---

## Test 11.2: Foreman Can Access Schedule (Desktop)

### STEPS
1. Create a FOREMAN user if needed (or login as existing foreman)
2. Look at left sidebar navigation
3. Find "Schedule" menu item
4. Click "Schedule"

### EXPECTED
- ✅ "Schedule" menu item visible in sidebar
- ✅ Can access `/schedule` page
- ✅ Calendar and crew widgets visible
- ✅ Can manage schedules

---

## Test 11.3: Employee CANNOT See Schedule (Desktop)

### STEPS
1. Login as **Employee** (EMP@test.com)
2. Look at left sidebar navigation
3. Scroll through all menu items

### EXPECTED
- ✅ "Schedule" menu item NOT visible
- ✅ Employee sees: Dashboard, Time Card, Materials, Purchase Orders, Settings
- ✅ Employee does NOT see Schedule option

### FILE LOCATION
- Navigation: `src/components/layout/ResponsiveSidebar.tsx` line 93 (roles array)

---

## Test 11.4: Employee Redirect on Direct URL Access

### STEPS
1. Stay logged in as **Employee**
2. Manually type in browser URL bar: `http://localhost:3000/schedule`
3. Press Enter

### EXPECTED
- ✅ Page attempts to load
- ✅ Employee is immediately redirected to `/dashboard`
- ✅ Does NOT see calendar page
- ✅ Remains on dashboard

### FILE LOCATION
- Page protection: `src/app/(app)/schedule/page.tsx` lines 65-69

### DATABASE CHECK
```sql
-- Verify employee role
SELECT id, name, email, role
FROM "User"
WHERE email = 'emp@test.com';

-- Expected: role = 'EMPLOYEE'
```

---

## Test 11.5: Admin Can Access Schedule (Mobile)

### STEPS
1. Login as **Admin**
2. View on mobile device or narrow browser window (<600px)
3. Look at bottom navigation bar
4. Find "Schedule" icon

### EXPECTED
- ✅ Schedule icon visible in mobile bottom nav
- ✅ Clicking navigates to `/schedule` page
- ✅ Calendar view is mobile-responsive

### FILE LOCATION
- Mobile nav: `src/components/layout/MobileBottomNav.tsx` line 65-69

---

## Test 11.6: Employee CANNOT See Schedule (Mobile)

### STEPS
1. Login as **Employee**
2. View on mobile device or narrow browser window
3. Look at bottom navigation bar
4. Count visible navigation items

### EXPECTED
- ✅ Schedule icon NOT visible
- ✅ Employee sees: Dashboard, My Jobs, Customers (if applicable)
- ✅ Schedule is hidden from bottom nav

---

## Test 11.7: Multiple Role Tests

### STEPS
Test with all user roles:

**OWNER_ADMIN**:
1. Login as admin@admin.com
2. ✅ Can see Schedule nav item
3. ✅ Can access `/schedule` page

**FOREMAN**:
1. Login as foreman user
2. ✅ Can see Schedule nav item
3. ✅ Can access `/schedule` page

**EMPLOYEE**:
1. Login as employee user
2. ✅ Cannot see Schedule nav item
3. ✅ Redirected from `/schedule` to `/dashboard`

**OFFICE_STAFF** (if applicable):
1. Login as office staff user
2. Verify expected behavior (likely no access similar to employee)

---

## Test 11.8: Schedule Page Components Still Work

### PURPOSE
Verify removing employee access didn't break the page for admins/foremen

### STEPS
1. Login as **Admin**
2. Go to `/schedule` page
3. Test all functionality:
   - View calendar grid
   - Click on dates
   - Assign jobs to crew
   - View crew availability
   - Create/edit schedules

### EXPECTED
- ✅ All features work normally
- ✅ No console errors
- ✅ Calendar renders correctly
- ✅ Crew assignments function
- ✅ No broken components

---

## SUMMARY CHECKLIST: Calendar Visibility ✅

### Desktop Navigation ✅
- [ ] Admin sees "Schedule" in sidebar
- [ ] Foreman sees "Schedule" in sidebar
- [ ] Employee does NOT see "Schedule" in sidebar
- [ ] Navigation filtering works correctly

### Mobile Navigation ✅
- [ ] Admin sees Schedule in bottom nav
- [ ] Foreman sees Schedule in bottom nav
- [ ] Employee does NOT see Schedule in bottom nav
- [ ] Mobile nav renders correctly

### Page Access Control ✅
- [ ] Admin can access `/schedule` page
- [ ] Foreman can access `/schedule` page
- [ ] Employee redirected from `/schedule` to `/dashboard`
- [ ] Direct URL access blocked for employees

### Schedule Functionality ✅
- [ ] Calendar loads for admin/foreman
- [ ] Job scheduling works
- [ ] Crew availability widget displays
- [ ] No errors in console
- [ ] All features intact

### Code Changes ✅
- [ ] ResponsiveSidebar.tsx updated (line 93)
- [ ] MobileBottomNav.tsx updated (line 68)
- [ ] schedule/page.tsx has role check (lines 65-69)
- [ ] All changes committed

---

# KNOWN ISSUES TO WATCH FOR

1. **iCloud Desktop Sync**: If files disappear, check if iCloud evicted them
2. **TypeScript Errors**: Some non-blocking TS errors exist (Authorization headers)
3. **Off-Truck Checkbox**: Was fixed recently, verify it stays checked
4. **Timezone**: Make sure cron jobs run in correct timezone for your business!

---

# TESTING PRIORITY

**HIGH PRIORITY (Test First):**
1. ✅ Create time entry with materials
2. ✅ Upload packing slip
3. ✅ Add photos to saved entry
4. ✅ Verify badges show in timesheet
5. ✅ Admin can see materials in Job tab
6. ✅ **Create new employee user**
7. ✅ **New employee can log in**
8. ✅ **Edit user and change role**
9. ✅ **View jobs list - Check Job Number & Customer PO columns**
10. ✅ **Create job with Customer PO**
11. ✅ **Edit job to add/update Customer PO**
12. ✅ **Verify "Submit Time Card" button text**
13. ✅ **Test Sunday reminder endpoint manually**
14. ✅ **Test Sunday auto-submit endpoint manually**
15. ✅ **Login as employee - verify NO Schedule in navigation**
16. ✅ **Login as admin - verify Schedule IS in navigation**
17. ✅ **Employee tries to access /schedule - should redirect**

**MEDIUM PRIORITY:**
18. ✅ Edit materials
19. ✅ Delete materials/photos
20. ✅ Multiple materials/photos
21. ✅ Off-truck checkbox persists
22. ✅ **Deactivate/reactivate users**
23. ✅ **User pay rates in timesheet**
24. ✅ **Create job without Customer PO (optional field)**
25. ✅ **Remove Customer PO from existing job**
26. ✅ **Set up CRON_SECRET environment variable**
27. ✅ **Verify notifications show in UI**
28. ✅ **Foreman can access Schedule page**
29. ✅ **Test schedule page on mobile (admin/employee)**

**LOW PRIORITY (Nice to Have):**
30. ✅ Mobile camera upload
31. ✅ Large file handling
32. ✅ Error scenarios
33. ✅ **Create all user role types**
34. ✅ **Verify Customer PO in job detail page**
35. ✅ **Test cron job security (unauthorized access)**
36. ✅ **Set up actual cron jobs (Vercel/AWS/cron-job.org)**
37. ✅ **Verify schedule page functionality intact for admins**

---

# REQUIREMENT #7: EMPLOYEE JOB CREATION

## Overview
Completed: **October 12, 2025**
- Employees can request new jobs through time entry
- "New Job Entry" button visible only to employees
- Admin approval workflow for new job requests
- Admin links pending entries to existing jobs or creates new jobs

## Feature: Employee-Initiated Job Creation

### WHO CAN ACCESS
- ✅ **EMPLOYEE** - Can submit new job requests through time entry
- ✅ **OWNER_ADMIN & FOREMAN** - Can review and approve/reject requests

### FLOW START → END

**EMPLOYEE FLOW**:
1. Go to `/time` page → Click "Add Time Entry"
2. See "New Job Entry" button (employees only)
3. Click "New Job Entry" to switch to request mode
4. Fill in:
   - Job Number (proposed, e.g., "25-123-A")
   - Customer Name
   - Job Description
   - Date, Hours, Work Description
5. Submit → Creates pending request (status: PENDING)
6. Notification: "Your new job request has been submitted for approval"

**ADMIN FLOW**:
1. Go to `/time/new-job-review` page
2. See list of pending employee job requests
3. Review each request details:
   - Employee name
   - Proposed job number
   - Customer name
   - Hours worked
   - Work description
4. **Option A - Approve**:
   - Select existing job to link time entry to
   - Approve → Creates time entry for selected job
   - Employee notified of approval
5. **Option B - Reject**:
   - Enter rejection reason
   - Reject → Employee notified with reason

---

## Test 12.1: Employee Can See "New Job Entry" Button

### STEPS
1. Login as **Employee** (e.g., EMP@test.com)
2. Go to `/time` page
3. Click "**Add Time Entry**"
4. Look at "Entry Method" section

### EXPECTED
- ✅ See three buttons: "Existing Job", "New Job Entry"
- ✅ "New Job Entry" button visible to employees
- ✅ Button has Add icon
- ✅ Button switches to contained style when selected

### FILE LOCATION
- Component: `src/components/time/SimpleTimeEntry.tsx` line 400-409

---

## Test 12.2: Admin/Foreman Do NOT See "New Job Entry"

### STEPS
1. Login as **Admin** (admin@admin.com)
2. Go to `/time` page
3. Click "**Add Time Entry**"
4. Look at "Entry Method" section

### EXPECTED
- ✅ "New Job Entry" button NOT visible
- ✅ Admin sees: "From Schedule", "Existing Job"
- ✅ Admin workflow unchanged

---

## Test 12.3: Employee Submits New Job Request

### STEPS
1. Login as **Employee**
2. Go to `/time` page → Click "Add Time Entry"
3. Click "**New Job Entry**" button
4. Form changes to new job entry mode
5. Fill in fields:
   - **Job Number**: "25-999-TEST"
   - **Customer Name**: "John Smith"
   - **Job Description**: "Panel upgrade at 123 Main St"
   - **Date**: Select today
   - **Hours**: 8
   - **Work Description**: "Replaced main panel and ran new circuits"
6. Click "**Create Time Entry**"

### EXPECTED
- ✅ Form shows new job fields instead of job selector
- ✅ All fields accept input
- ✅ Submit button says "Create Time Entry"
- ✅ Success message appears
- ✅ Form resets after submit

### DATABASE CHECK
```sql
-- Verify pending entry created
SELECT *
FROM "NewJobEntry"
WHERE "jobNumber" = '25-999-TEST'
  AND status = 'PENDING';

-- Expected: One row with all data filled
-- Expected: userId matches logged-in employee
-- Expected: createdAt is recent
```

---

## Test 12.4: Admin Reviews Pending Job Requests

### STEPS
1. Login as **Admin**
2. Navigate to `/time/new-job-review`
3. View pending requests table

### EXPECTED
- ✅ Page loads successfully
- ✅ See "Employee New Job Requests" heading
- ✅ Warning chip shows count: "X Pending"
- ✅ Info alert explains the process
- ✅ Table shows all pending requests with:
  - Employee name & email
  - Job number
  - Customer name
  - Date
  - Hours
  - Submitted date
  - Actions: Approve / Reject buttons

### FILE LOCATION
- Page: `src/app/(app)/time/new-job-review/page.tsx`

---

## Test 12.5: Admin Approves New Job Request

### STEPS
1. As Admin on `/time/new-job-review` page
2. Find the request from Test 12.3 (Job# 25-999-TEST)
3. Click "**Approve**" button
4. Dialog opens showing request details
5. In "Select Existing Job" dropdown:
   - Search for existing job (or create one first in `/jobs`)
   - Select a matching job from the list
6. Click "**Approve & Create Time Entry**"

### EXPECTED
- ✅ Dialog shows complete request details in card format
- ✅ Employee name, job number, customer, date, hours all visible
- ✅ Autocomplete dropdown shows all active jobs
- ✅ Can search jobs by number or customer
- ✅ Selected job appears in dropdown
- ✅ Success message: "Time entry approved and created for [JOB-NUMBER]"
- ✅ Dialog closes
- ✅ Request removed from pending list

### DATABASE CHECK
```sql
-- Verify entry approved
SELECT *
FROM "NewJobEntry"
WHERE "jobNumber" = '25-999-TEST';

-- Expected:
--   status = 'APPROVED'
--   reviewedAt is set
--   approvedBy = admin's user ID
--   approvedJobId = selected job ID

-- Verify time entry created
SELECT te.*, j."jobNumber"
FROM "TimeEntry" te
JOIN "Job" j ON te."jobId" = j.id
WHERE te."userId" = (SELECT "userId" FROM "NewJobEntry" WHERE "jobNumber" = '25-999-TEST')
  AND te.date = (SELECT date FROM "NewJobEntry" WHERE "jobNumber" = '25-999-TEST')
ORDER BY te."createdAt" DESC
LIMIT 1;

-- Expected: Time entry with correct hours, job, description
```

---

## Test 12.6: Admin Rejects New Job Request

### STEPS
1. Employee creates another new job request:
   - Job Number: "25-888-REJECT"
   - Customer: "Jane Doe"
2. Admin goes to `/time/new-job-review`
3. Click "**Reject**" button for this request
4. Dialog opens
5. Enter rejection reason:
   - "Job number already exists. Please check with office before creating."
6. Click "**Reject Request**"

### EXPECTED
- ✅ Reject dialog opens
- ✅ Shows request summary
- ✅ Info alert explains employee will be notified
- ✅ Text field for rejection reason (required)
- ✅ Cannot submit without reason
- ✅ Success message: "Entry rejected and employee will be notified"
- ✅ Request removed from pending list

### DATABASE CHECK
```sql
-- Verify entry rejected
SELECT *
FROM "NewJobEntry"
WHERE "jobNumber" = '25-888-REJECT';

-- Expected:
--   status = 'REJECTED'
--   reviewedAt is set
--   approvedBy = admin's user ID
--   rejectionReason = text entered
```

---

## Test 12.7: Multiple Pending Requests

### STEPS
1. Create 3+ new job requests as different employees:
   - Employee 1: Job 25-111-A
   - Employee 2: Job 25-222-B
   - Employee 3: Job 25-333-C
2. Admin views `/time/new-job-review`

### EXPECTED
- ✅ All 3+ requests appear in table
- ✅ Badge shows correct count
- ✅ Each row shows correct employee
- ✅ Can approve/reject individually
- ✅ List updates after each action

---

## Test 12.8: No Pending Requests (Empty State)

### STEPS
1. Approve or reject all pending requests
2. View `/time/new-job-review` page with no pending items

### EXPECTED
- ✅ Shows empty state card with icon
- ✅ Message: "No Pending New Job Requests"
- ✅ "All employee requests have been reviewed"
- ✅ "Back to Time Tracking" button
- ✅ No table visible

---

## Test 12.9: Security - Employee Cannot Access Review Page

### STEPS
1. Login as **Employee**
2. Try to access `/time/new-job-review` directly in URL

### EXPECTED
- ✅ Employee redirected to `/dashboard`
- ✅ Cannot view pending requests page
- ✅ Only admins/foremen can review

---

## Test 12.10: Integration Test (End-to-End)

### FULL WORKFLOW TEST

**Part 1: Employee Submits**
1. Employee logs in
2. Needs to track time for a job not in system yet
3. Goes to Add Time Entry
4. Clicks "New Job Entry"
5. Fills in: Job# 25-555-INT, Customer "Test Customer", 6 hours
6. Submits request

**Part 2: Admin Reviews**
7. Admin logs in
8. Sees notification or goes to review page
9. Views pending request details
10. Recognizes this is a real job that needs to be added
11. Creates the job in system first at `/jobs`
12. Returns to review page
13. Approves request, linking to newly created job

**Part 3: Verification**
14. Time entry now appears in employee's timesheet
15. Time entry linked to correct job
16. Admin can see entry in job's time entries tab
17. Employee can edit time entry normally

### EXPECTED
- ✅ Complete workflow executes smoothly
- ✅ No data loss
- ✅ Time entry appears in all expected places
- ✅ Hours count toward job totals
- ✅ Employee can work with time entry normally

---

## SUMMARY CHECKLIST: Employee Job Creation ✅

### Database ✅
- [ ] NewJobEntry table exists
- [ ] All columns present (userId, jobNumber, customer, description, date, hours, workDescription, status, approvedBy, rejectionReason, reviewedAt, approvedJobId, createdAt)
- [ ] Indexes created for performance
- [ ] Foreign key constraints work

### API Endpoints ✅
- [ ] POST /api/time-entries/new-job creates pending entry
- [ ] GET /api/time-entries/new-job?status=PENDING fetches list
- [ ] PATCH /api/time-entries/new-job approves/rejects entries
- [ ] Approval creates TimeEntry record
- [ ] ApprovedBy tracking works
- [ ] Rejection reason saves

### UI - Employee Side ✅
- [ ] "New Job Entry" button visible (employees only)
- [ ] Button not visible to admin/foreman
- [ ] Form fields show when selected
- [ ] Job number input accepts text
- [ ] Customer name input works
- [ ] Job description textarea works
- [ ] Can submit request
- [ ] Success message appears
- [ ] Form resets after submit

### UI - Admin Review Page ✅
- [ ] Page loads at /time/new-job-review
- [ ] Only admin/foreman can access
- [ ] Employee redirected if tries to access
- [ ] Pending requests table displays
- [ ] Badge shows correct count
- [ ] All request details visible
- [ ] Empty state when no requests

### Approval Workflow ✅
- [ ] Approve dialog opens
- [ ] Shows complete request details
- [ ] Job selector autocomplete works
- [ ] Can search and select jobs
- [ ] Approve button disabled without job selection
- [ ] Creates time entry on approval
- [ ] Updates NewJobEntry status
- [ ] Records approvedBy and reviewedAt
- [ ] Success message shows
- [ ] List updates after approval

### Rejection Workflow ✅
- [ ] Reject dialog opens
- [ ] Shows request summary
- [ ] Rejection reason field required
- [ ] Cannot submit without reason
- [ ] Updates NewJobEntry status
- [ ] Records approvedBy, reviewedAt, rejectionReason
- [ ] Success message shows
- [ ] List updates after rejection

### Integration ✅
- [ ] End-to-end workflow completes
- [ ] Time entry appears in timesheet after approval
- [ ] Time entry linked to correct job
- [ ] Employee can view/edit approved entry
- [ ] No duplicate entries created
- [ ] Data integrity maintained

### Documentation ✅
- [ ] Manual testing guide updated
- [ ] Test scenarios documented
- [ ] Database schema documented
- [ ] API endpoints explained
- [ ] Testing checklist complete

---

**Last Updated**: October 12, 2025
**Phases Covered**:
- Phase 2 (Materials)
- Phase 3 (Photos)
- User Management
- Requirement #3 (Job Number & Customer PO)
- Requirement #4 (Auto-Submit System)
- Requirement #7 (Employee Job Creation)
- Requirement #8 (Calendar Visibility)

**Ready for Testing**: ✅ YES
