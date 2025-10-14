# Auto-Submit System Setup Guide

**Date:** 2025-10-12
**Feature:** Sunday Time Card Auto-Submit with Reminders

## Overview

This system automatically submits employee time cards every Sunday at 11:59 PM, with a reminder notification sent at 8:00 PM. This ensures timely submission of time cards for payroll processing.

## Features Implemented

1. ✅ **Button Text Changed** - "Submit Time Card" (instead of "Create X Time Entries")
2. ✅ **Sunday 8 PM Reminder** - Notifies employees with unsubmitted time entries
3. ✅ **Sunday 11:59 PM Auto-Submit** - Automatically submits all draft time entries
4. ✅ **Notification System** - Employees receive in-app notifications for reminders and auto-submissions

## How It Works

### Weekly Timeline

**Monday - Saturday**: Employees enter their time throughout the week
- Time entries are saved with `status = 'draft'`
- Employees can edit/update entries anytime

**Sunday 8:00 PM**: Reminder Notification
- System checks for employees with unsubmitted (draft) time entries
- Sends in-app notification reminding them to submit
- Message: "You have X unsubmitted time entries for this week..."

**Sunday 11:59 PM**: Auto-Submit
- System automatically submits ALL draft time entries for the week
- Changes status from `'draft'` to `'submitted'`
- Records `submittedAt` timestamp and `submittedBy` (employee ID)
- Sends notification: "Your time card has been automatically submitted..."

**Monday Morning**: Ready for Approval
- All time entries are now `status = 'submitted'`
- Foreman/Admin can review and approve
- Payroll processing can begin

## Technical Implementation

### 1. API Endpoints Created

#### Sunday Reminder Endpoint
```
GET /api/cron/sunday-reminder
```
- Finds all employees with draft time entries for current week
- Creates notification for each employee
- Returns summary of reminders sent

#### Sunday Auto-Submit Endpoint
```
GET /api/cron/sunday-auto-submit
```
- Finds all draft time entries for current week
- Updates status to 'submitted'
- Creates notification for each affected employee
- Returns summary of auto-submissions

### 2. Database Changes

No database schema changes required. Uses existing fields:
- `TimeEntry.status` - Changed from 'draft' to 'submitted'
- `TimeEntry.submittedAt` - Timestamp of auto-submission
- `TimeEntry.submittedBy` - Employee ID (self-submitted)
- `NotificationLog` - New notifications created

### 3. Button Text Update

**File**: `src/components/time/MultiJobTimeEntry.tsx` (Line 1201)

**Before**:
```tsx
{submitting ? 'Creating Entries...' : `Create ${entries.length} Time Entries`}
```

**After**:
```tsx
{submitting ? 'Submitting Time Card...' : 'Submit Time Card'}
```

## Setup Instructions

### Option 1: Using Vercel Cron (Recommended for Vercel Deployments)

1. **Set Environment Variable**
   ```bash
   # Add to .env.local and Vercel environment variables
   CRON_SECRET=your-secret-key-here-generate-a-strong-random-string
   ```

2. **Create `vercel.json` in project root**
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/sunday-reminder",
         "schedule": "0 20 * * 0"
       },
       {
         "path": "/api/cron/sunday-auto-submit",
         "schedule": "59 23 * * 0"
       }
     ]
   }
   ```

3. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

   Vercel will automatically set up the cron jobs!

### Option 2: Using External Cron Service (EasyCron, cron-job.org)

1. **Set Environment Variable**
   ```bash
   # Add to .env.local
   CRON_SECRET=your-secret-key-here
   ```

2. **Set Up Cron Jobs at EasyCron or cron-job.org**

   **Sunday 8 PM Reminder**:
   - URL: `https://your-domain.com/api/cron/sunday-reminder`
   - Schedule: Every Sunday at 8:00 PM (20:00)
   - Cron Expression: `0 20 * * 0`
   - Method: GET
   - Header: `Authorization: Bearer your-secret-key-here`

   **Sunday 11:59 PM Auto-Submit**:
   - URL: `https://your-domain.com/api/cron/sunday-auto-submit`
   - Schedule: Every Sunday at 11:59 PM (23:59)
   - Cron Expression: `59 23 * * 0`
   - Method: GET
   - Header: `Authorization: Bearer your-secret-key-here`

### Option 3: Using AWS ECS Scheduled Tasks

1. **Create Environment Variable in ECS**
   - Add `CRON_SECRET` to task definition environment variables

2. **Create EventBridge Rules**

   **Sunday 8 PM Reminder**:
   - Rule name: `sunday-reminder-8pm`
   - Schedule: `cron(0 20 ? * SUN *)`
   - Target: ECS Task
   - Task Definition: Your OTS-ERP task
   - Command Override: Execute curl or invoke API

   **Sunday 11:59 PM Auto-Submit**:
   - Rule name: `sunday-auto-submit-11-59pm`
   - Schedule: `cron(59 23 ? * SUN *)`
   - Target: ECS Task

3. **Alternative: Use Lambda Functions**
   ```javascript
   // lambda-sunday-reminder.js
   const https = require('https')

   exports.handler = async (event) => {
     const options = {
       hostname: 'your-domain.com',
       path: '/api/cron/sunday-reminder',
       method: 'GET',
       headers: {
         'Authorization': `Bearer ${process.env.CRON_SECRET}`
       }
     }

     return new Promise((resolve, reject) => {
       const req = https.request(options, (res) => {
         resolve({ statusCode: res.statusCode })
       })
       req.on('error', reject)
       req.end()
     })
   }
   ```

### Option 4: Using Linux Crontab (Server Deployment)

1. **Edit crontab**
   ```bash
   crontab -e
   ```

2. **Add cron jobs**
   ```bash
   # Sunday 8 PM Reminder (20:00 on Sundays)
   0 20 * * 0 curl -H "Authorization: Bearer your-secret-key" https://your-domain.com/api/cron/sunday-reminder

   # Sunday 11:59 PM Auto-Submit (23:59 on Sundays)
   59 23 * * 0 curl -H "Authorization: Bearer your-secret-key" https://your-domain.com/api/cron/sunday-auto-submit
   ```

## Timezone Considerations

⚠️ **IMPORTANT**: Make sure your cron jobs run in the correct timezone for your business!

- **Server Timezone**: Check your server's timezone
  ```bash
  date
  timedatectl  # For Linux systems
  ```

- **Adjust Cron Times**: If server is in different timezone, adjust cron times accordingly
  - Example: If server is in UTC and business is in EST (UTC-5), use:
    - 8 PM EST = 1 AM UTC next day → `0 1 * * 1` (Monday 1 AM)
    - 11:59 PM EST = 4:59 AM UTC next day → `59 4 * * 1` (Monday 4:59 AM)

## Testing the System

### 1. Test Reminder Endpoint

```bash
# Local testing
curl -H "Authorization: Bearer your-secret-key" \
  http://localhost:3000/api/cron/sunday-reminder

# Production testing
curl -H "Authorization: Bearer your-secret-key" \
  https://your-domain.com/api/cron/sunday-reminder
```

**Expected Response**:
```json
{
  "success": true,
  "timestamp": "2025-10-12T20:00:00.000Z",
  "weekRange": {
    "start": "2025-10-07T00:00:00.000Z",
    "end": "2025-10-13T23:59:59.999Z"
  },
  "employeesChecked": 15,
  "employeesWithDraftEntries": 3,
  "remindersCreated": 3
}
```

### 2. Test Auto-Submit Endpoint

```bash
# Local testing
curl -H "Authorization: Bearer your-secret-key" \
  http://localhost:3000/api/cron/sunday-auto-submit

# Production testing
curl -H "Authorization: Bearer your-secret-key" \
  https://your-domain.com/api/cron/sunday-auto-submit
```

**Expected Response**:
```json
{
  "success": true,
  "timestamp": "2025-10-13T23:59:00.000Z",
  "weekRange": {
    "start": "2025-10-07T00:00:00.000Z",
    "end": "2025-10-13T23:59:59.999Z"
  },
  "employeesChecked": 15,
  "employeesAffected": 3,
  "totalEntriesSubmitted": 12,
  "submissionDetails": [
    {
      "employeeId": "...",
      "employeeName": "John Doe",
      "entriesSubmitted": 5,
      "totalHours": "42.50"
    }
  ]
}
```

### 3. Verify in Database

```sql
-- Check notifications created
SELECT *
FROM "NotificationLog"
WHERE type IN ('TIME_CARD_REMINDER', 'TIME_CARD_AUTO_SUBMITTED')
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check time entries that were auto-submitted
SELECT te.id, u.name, te.date, te.hours, te.status, te."submittedAt"
FROM "TimeEntry" te
JOIN "User" u ON te."userId" = u.id
WHERE te.status = 'submitted'
  AND te."submittedAt" >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY te."submittedAt" DESC;

-- Check draft entries (should be minimal on Monday morning)
SELECT COUNT(*), u.name
FROM "TimeEntry" te
JOIN "User" u ON te."userId" = u.id
WHERE te.status = 'draft'
GROUP BY u.name;
```

## Monitoring & Logs

### Check Cron Job Execution

**Vercel**: View logs in Vercel Dashboard → Functions → Cron Logs

**AWS**: View CloudWatch Logs for ECS tasks or Lambda functions

**Server**: Check system logs
```bash
grep CRON /var/log/syslog
# or
journalctl -u cron
```

### Application Logs

Check Next.js logs for cron job execution:
```bash
# Look for [CRON] prefixed logs
grep "\[CRON\]" logs/app.log
```

## Troubleshooting

### Issue: Cron jobs not executing

**Check**:
1. Verify CRON_SECRET is set correctly
2. Check cron job configuration (schedule, URL, headers)
3. Test endpoints manually with curl
4. Check server/service logs

### Issue: Reminders not sent

**Check**:
1. Verify NotificationLog table exists
2. Check employees have active = true
3. Verify employees have draft entries
4. Check notification display in UI

### Issue: Entries not auto-submitting

**Check**:
1. Verify TimeEntry table has status column
2. Check draft entries exist for the week
3. Verify date range calculation is correct
4. Check timezone settings

### Issue: Wrong timezone

**Solution**:
- Adjust cron schedule times based on server timezone
- Or set server timezone to match business timezone
- Or use UTC and calculate offset in code

## Files Modified/Created

### Created Files:
1. `src/app/api/cron/sunday-reminder/route.ts` - 8 PM reminder endpoint
2. `src/app/api/cron/sunday-auto-submit/route.ts` - 11:59 PM auto-submit endpoint
3. `AUTO_SUBMIT_SETUP_GUIDE.md` - This documentation file

### Modified Files:
1. `src/components/time/MultiJobTimeEntry.tsx` - Button text changed to "Submit Time Card"

## Environment Variables Required

```bash
# Add to .env.local
CRON_SECRET=your-strong-random-secret-key-here

# Generate a secure secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Next Steps

1. ✅ Choose a cron job setup method (Vercel Cron recommended)
2. ✅ Set CRON_SECRET environment variable
3. ✅ Configure cron jobs using chosen method
4. ✅ Test both endpoints manually
5. ✅ Verify notifications appear in UI
6. ✅ Monitor first Sunday execution
7. ✅ Add to manual testing guide

## Benefits

- **Employees**: No more forgotten time card submissions
- **Foreman/Admin**: All time cards ready for review Monday morning
- **Payroll**: Consistent submission timing every week
- **Accountability**: Auto-submit provides deadline enforcement
- **Reminders**: 8 PM reminder gives employees time to review before auto-submit

## Future Enhancements

Possible improvements:
- Allow employees to opt-out of reminders
- Configurable reminder time (not just 8 PM)
- Multiple reminders (Friday, Saturday, Sunday)
- Email notifications in addition to in-app
- SMS notifications for critical reminders
- Weekly report email to foreman with submission stats
- Configurable auto-submit time per employee or company-wide
