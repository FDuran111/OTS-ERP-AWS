# P2 Request+ - Phase 2 Development Requirements

## 🔧 Fixes Required

### Security & Access
- **HTTPS Security Certificate** - Fix SSL cert error preventing login
- **Remove visible passwords** from initial user setup
- **Email domain/spam issue** - Branded domain to prevent spam flagging (GPT)

### Functional Bugs
- **Save/Schedule Function** - Schedule button not working
- **Calendar Display** - Change from dots to actual time blocks showing duration
- **Invoice Appearance** - Clean up white background, polish UI
- **Job name missing in invoice list** - Shows only ID, needs name too (GPT)
- **Invoice line items hardcoded** - Need material/labor selection from database (GPT)

### UI/Branding
- **Company Name** - Change "Orme Elect" to "OTS" in header
- **URL Simplification** - Replace complex URL with cleaner option (suggested: OTS.111app.com or ots.ofinc.com)
- **Better colors on lead stage UI** - Aesthetic improvements (GPT)

## 🆕 Additions Requested

### Core Features
- **Job Types** - Add "Service Call" and "Installation" options
- **Customer PO Field** - Reference customer's internal PO for billing
- **Job Classification** - Mark as "Bid" vs "Time & Materials" for billing
- **Drag & Drop Scheduling** - Enable for easy rescheduling

### Calendar & Scheduling
- **Dual Calendar System**:
  - Low voltage calendar (restricted access for Todd)
  - Line voltage calendar
  - Color-coded by division (GPT)
- **Man Loader/Crew View** - Show all crew schedules to identify gaps
- **Calendar time ranges** - Show actual hours (7AM-12PM), not just day markers (GPT)
- **Office Display Monitor** - TV showing weekly schedule (Monday-Friday, work hours, public view)

### User Management & Permissions
- **Three User Roles**:
  - **Admin** - Full access
  - **Foreman** - See material costs but not job bid amounts  
  - **Employee** - No pricing visibility
- **Remove 'office' role if unused** (GPT)
- **Login-based calendar filtering** - Show only relevant team calendar (GPT)
- **Employee Accounts** - Create actual accounts for time tracking

### Data Integration
- **QuickBooks Import** - Import existing customer database
- **QuickBooks Auto-sync** - Auto-create customers in QB when added to system (GPT)
- **Local Backup System** - Scheduled backups to USB/local storage

### Materials & Inventory
- **Material Price Tracking** - Flexible pricing per purchase (prices change daily)
- **Material reserve by location** - Track source/destination (warehouse/truck) (GPT)
- **Average price display** - Show historical average pricing (GPT)
- **Hide pricing from employees** - Cost visibility only for admin/foreman
- **Minimum Stock Alerts** - Already implemented, needs testing

### Job Management
- **Photo Upload** - Desktop first, mobile integration later
- **Job Portal** - Central storage for photos, specs, documents per job (GPT)
- **Email Notifications** - Send job assignments to crew

### Time & Billing
- **Manual Time Entry Only** - 15-minute (0.25 hour) increments
- **Rate Customization** - Different rates by skill level and location

### Business Intelligence
- **Pipeline Valuation** - Track total dollar value of jobs in pipeline
- **Production Rate Insights** - Show pace ($/quarter, $/year) (GPT)
- **Customer-based P&L** - Revenue/costs tied to specific customers
- **P&L Integration** - Pull from timecards + materials (GPT)

## 📊 Business Context & Long-term Goals

### 5-Year Succession Plan (C)
- Balancing Mom & Dad's retirement objectives
- Business cash flow planning
- Derek's ability to manage and maintain operations
- Pipeline valuation helps Derek understand business metrics
- Example: "$1M in pipeline = 3 months work = $4M/year pace"

### Implementation Timeline
- Currently 85% complete - mostly polish needed
- Plan to run parallel with current system before full transition
- Immediate goal: Start using for job codes
- Near-term: Full job management after one more round of tweaks

### Security & Infrastructure (C)
- Hosted on European data centers (stricter privacy laws)
- Comprehensive security documentation being provided
- Real customer data requires heightened security measures

### Key Business Needs
- Get information out of Tim's and Derek's heads into central system
- Track sales pipeline stages (cold → estimate → scheduled → lost)
- Handle daily price fluctuations (especially wire and pipe)
- Support different access levels for different teams
- Enable better business valuation for succession planning

## ✅ Already Working (Minimal Tweaks)
- Lead management system
- Material database structure  
- Manual time tracking (needs employees)
- Invoice calculations (just needs UI polish)
- Inventory warning system with emojis
- Job creation flow (needs job type options)

---
*Note: (GPT) indicates items identified by ChatGPT analysis, (C) indicates items identified by Claude analysis*
*This document represents Phase 2 requirements gathered from client meeting transcript*