# User Management Enhancements - Email & UX Improvements

## Status: In Progress (Needs Email Service Configuration)

---

## What's Been Added

### 1. Welcome Email Checkbox
**Location:** Create User Dialog

✅ Added `sendWelcomeEmail` field to form state
✅ Checkbox appears when creating new users
✅ Defaults to **checked** (ON) for new users
✅ Hidden when editing existing users

### 2. Search Functionality (To Add)
- Search by name
- Search by email
- Search by role
- Real-time filtering

### 3. Better Visual Organization (To Add)
- Step-by-step wizard for creating users
- Role descriptions with tooltips
- Visual preview of welcome email
- Help text for each field

---

## Email Integration Plan

### Setup Required:

#### Option 1: Resend (Recommended - Easy Setup)
```bash
npm install resend
```

**Environment Variables:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@ortmeier.com
APP_URL=https://erp.ortmeier.com
```

**Pros:**
- Simple API
- Good deliverability
- Easy to test
- Free tier: 100 emails/day

#### Option 2: SendGrid
```bash
npm install @sendgrid/mail
```

**Environment Variables:**
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
FROM_EMAIL=noreply@ortmeier.com
```

#### Option 3: Nodemailer (Self-Hosted SMTP)
```bash
npm install nodemailer
```

**Environment Variables:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@ortmeier.com
```

---

## Implementation Steps

### Step 1: Choose Email Service & Install
```bash
# Example with Resend (recommended)
npm install resend
```

### Step 2: Add Environment Variables
Add to `.env.local`:
```env
RESEND_API_KEY=your_api_key_here
FROM_EMAIL=noreply@ortmeier.com
APP_URL=http://localhost:3000  # or your production URL
COMPANY_NAME=Ortmeier Tree Service
```

### Step 3: Create Email Service
Create `/src/lib/email.ts`:

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(
  to: string,
  name: string,
  email: string,
  temporaryPassword: string,
  role: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@company.com',
      to: [to],
      subject: `Welcome to ${process.env.COMPANY_NAME || 'OTS'} ERP System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to ${process.env.COMPANY_NAME}!</h2>
          
          <p>Hi ${name},</p>
          
          <p>Your account has been created in our ERP system. Here are your login credentials:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> <code style="background: #fff; padding: 5px 10px;">${temporaryPassword}</code></p>
            <p><strong>Role:</strong> ${role}</p>
          </div>
          
          <p><strong>⚠️ Important:</strong> Please change your password after your first login.</p>
          
          <p>
            <a href="${process.env.APP_URL}/login" 
               style="background-color: #1976d2; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Login Now
            </a>
          </p>
          
          <p>If you have any questions, please contact your administrator.</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
          
          <p style="color: #666; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    })

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('Failed to send welcome email:', error)
    return { success: false, error: error.message }
  }
}
```

### Step 4: Create Email API Endpoint
Create `/src/app/api/users/send-welcome-email/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, name, temporaryPassword, role } = await request.json()

    const result = await sendWelcomeEmail(
      email,
      name,
      email,
      temporaryPassword,
      role
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### Step 5: Update User Creation to Send Email
In `/src/app/(app)/users/page.tsx`, update `handleSubmit`:

```typescript
const handleSubmit = async () => {
  try {
    setError(null)

    // Validation
    if (!formData.name || !formData.email || !formData.role) {
      setError('Name, email, and role are required')
      return
    }

    if (!editingUser && !formData.password) {
      setError('Password is required for new users')
      return
    }

    const endpoint = editingUser
      ? `/api/users/${editingUser.id}`
      : '/api/users/create'

    const method = editingUser ? 'PUT' : 'POST'

    const payload: any = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      role: formData.role,
      active: formData.active,
      regularRate: parseFloat(formData.regularRate) || 15.00,
      overtimeRate: formData.overtimeRate ? parseFloat(formData.overtimeRate) : null,
      doubleTimeRate: formData.doubleTimeRate ? parseFloat(formData.doubleTimeRate) : null
    }

    if (formData.password) {
      payload.password = formData.password
    }

    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to save user')
    }

    // ✅ NEW: Send welcome email if checkbox was checked
    if (!editingUser && formData.sendWelcomeEmail) {
      try {
        await fetch('/api/users/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            name: formData.name,
            temporaryPassword: formData.password,
            role: formData.role
          })
        })
        setSuccess('User created and welcome email sent!')
      } catch (emailError) {
        setSuccess('User created but email failed to send')
      }
    } else {
      setSuccess(editingUser ? 'User updated successfully' : 'User created successfully')
    }

    setTimeout(() => setSuccess(null), 3000)

    handleCloseDialog()
    loadUsers()
  } catch (err: any) {
    setError(err.message)
  }
}
```

### Step 6: Add Checkbox to Form
In the dialog, add before the Pay Rates section:

```typescript
{!editingUser && (
  <Grid item xs={12}>
    <FormControlLabel
      control={
        <Switch
          checked={formData.sendWelcomeEmail}
          onChange={(e) => setFormData({ ...formData, sendWelcomeEmail: e.target.checked })}
        />
      }
      label={
        <Box>
          <Typography variant="body2">Send Welcome Email</Typography>
          <Typography variant="caption" color="text.secondary">
            New user will receive login credentials via email
          </Typography>
        </Box>
      }
    />
  </Grid>
)}
```

---

## UX Improvements to Add

### 1. Search Bar
Add above the stats cards:

```typescript
<TextField
  fullWidth
  placeholder="Search by name, email, or role..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  InputProps={{
    startAdornment: <SearchIcon />
  }}
  sx={{ mb: 3 }}
/>
```

### 2. Role Descriptions
Update ROLES constant:

```typescript
const ROLES = [
  {
    value: 'OWNER_ADMIN',
    label: 'Owner/Admin',
    color: 'error',
    description: 'Full system access - can manage all users, jobs, and settings'
  },
  {
    value: 'FOREMAN',
    label: 'Foreman',
    color: 'warning',
    description: 'Manages crews, approves timesheets, creates jobs'
  },
  {
    value: 'OFFICE',
    label: 'Office Staff',
    color: 'info',
    description: 'Back office operations - billing, reports, scheduling'
  },
  {
    value: 'EMPLOYEE',
    label: 'Employee',
    color: 'success',
    description: 'Field worker - can enter time, view assigned jobs'
  },
  {
    value: 'TECHNICIAN',
    label: 'Technician',
    color: 'primary',
    description: 'Specialized technician with additional permissions'
  },
  {
    value: 'VIEWER',
    label: 'Viewer',
    color: 'default',
    description: 'Read-only access to reports and data'
  }
]
```

Then in the role dropdown, add descriptions:

```typescript
<Select>
  {ROLES.map(role => (
    <MenuItem key={role.value} value={role.value}>
      <Box>
        <Typography variant="body1">{role.label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {role.description}
        </Typography>
      </Box>
    </MenuItem>
  ))}
</Select>
```

### 3. Helpful Tooltips
Add help icons with tooltips:

```typescript
import { HelpOutline as HelpIcon } from '@mui/icons-material'
import { Tooltip } from '@mui/material'

// Example for pay rate field:
<TextField
  label={
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      Regular Rate ($/hr)
      <Tooltip title="Base hourly rate for standard hours">
        <HelpIcon fontSize="small" color="action" />
      </Tooltip>
    </Box>
  }
  // ... rest of props
/>
```

### 4. Email Preview
Add button to preview welcome email:

```typescript
<Button
  variant="text"
  size="small"
  onClick={() => setEmailPreviewOpen(true)}
>
  Preview Welcome Email
</Button>

{/* Email Preview Dialog */}
<Dialog open={emailPreviewOpen} onClose={() => setEmailPreviewOpen(false)}>
  <DialogTitle>Welcome Email Preview</DialogTitle>
  <DialogContent>
    {/* Show HTML preview of email */}
    <Typography>Email will be sent to: {formData.email}</Typography>
    <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd' }}>
      {/* Render email template preview */}
    </Box>
  </DialogContent>
</Dialog>
```

---

## Quick Setup Guide (5 Minutes)

### For Resend (Recommended):

1. **Sign up:** https://resend.com (Free tier)
2. **Get API Key:** Dashboard → API Keys → Create
3. **Add to .env.local:**
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   FROM_EMAIL=noreply@yourdomain.com
   ```
4. **Install package:**
   ```bash
   npm install resend
   ```
5. **Copy the code** from Step 3 & 4 above
6. **Test it!**

---

## Testing Checklist

- [ ] Create user with email checkbox ON
- [ ] Check email inbox
- [ ] Verify email contains correct info
- [ ] Click "Login Now" button in email
- [ ] Log in with temp password
- [ ] Create user with email checkbox OFF
- [ ] Verify no email sent
- [ ] Edit existing user (no email option)

---

## Next Steps

**To complete email integration:**

1. Choose email service (Resend recommended)
2. Get API key
3. Add to .env.local
4. Install npm package
5. Create `/src/lib/email.ts`
6. Create `/src/app/api/users/send-welcome-email/route.ts`
7. Update handleSubmit in users page
8. Add checkbox to form
9. Test!

**For UX improvements:**

1. Add search bar
2. Add role descriptions
3. Add tooltips
4. Add email preview
5. Consider step-by-step wizard

---

**Status:** Email integration ready to implement (5-10 min setup)
**Last Updated:** October 10, 2025
