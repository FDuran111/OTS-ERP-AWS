# CLAUDE.md - Project Context for Claude

## Project Overview
This is the OTS-ERP-AWS project - a comprehensive ERP system for Ortmeier Tree Service with time tracking, job management, and AWS integration.

## Current Status (as of deployment)
- ✅ Successfully merged Replit integration (84 commits)
- ✅ Implemented Roles & Permissions system
- ✅ Integrated timesheet approval workflow
- ✅ Deployed to AWS (ECS, RDS, S3)
- ✅ Database synced between environments

## Key Technical Stack
- **Frontend**: Next.js 15, React 19, Material-UI
- **Backend**: Next.js API routes
- **Database**: PostgreSQL 16 (via pg library, NOT Prisma)
- **Authentication**: Custom JWT (NOT next-auth)
- **Storage**: AWS S3 (production), local filesystem (development)
- **Deployment**: AWS ECS, Docker containers

## Important Files & Locations

### Configuration
- `.env.local` - Local environment variables (gitignored)
- `package.json` - Dependencies and scripts

### Key Components
- `/src/components/settings/RolePermissions.tsx` - Complete RBAC system
- `/src/components/time/` - Time tracking components
- `/src/components/admin/` - Admin dashboard components

### API Routes
- `/src/app/api/auth/` - Authentication endpoints
- `/src/app/api/roles/` - Role management
- `/src/app/api/time-entries/` - Time tracking
- `/src/app/api/jobs/` - Job management

### Database
- `/scripts/` - SQL migration scripts
- `/src/lib/db.ts` - Database connection using pg

## Current Working Directory Structure
```
OTS-ERP/
├── src/
│   ├── app/
│   │   ├── (app)/        # All pages moved here per Replit structure
│   │   └── api/          # API routes
│   ├── components/       # React components
│   └── lib/             # Utilities and database
├── public/              # Static assets
├── scripts/             # Migration and utility scripts
└── infra/              # AWS infrastructure
```

## Client Requirements (From Recent Meeting)

### CRITICAL (Derek's Immediate Needs)
1. Fix time tracking selection issues
2. Remove "Residential" category
3. Set up Derek with employee access
4. Implement overtime calculations (>8hrs = 1.5x, Sunday = 2x)

### HIGH PRIORITY
1. Add Project Manager & Office Staff roles
2. Restrict employee permissions (time entry only)
3. Integrate job creation into clock-in process
4. Add "Mark as Done" functionality

### Key Features Needed
- Employee-initiated Purchase Orders
- Material attachments to timecards
- Monday-Sunday weekly dashboard
- Hide revenue/phases from employees

## Database Configuration
- Local: `postgresql://localhost/ots_erp_local`
- Tables use double quotes: `"User"`, `"Job"`, `"TimeEntry"`
- UUID primary keys with gen_random_uuid()

## AWS Resources
- **Region**: us-east-2
- **S3 Bucket**: ots-erp-prod-uploads
- **ECS Cluster**: Active
- **RDS**: PostgreSQL instance
- **Bastion Host**: For SSH tunneling

## Git Branches
- `main` - Production ready code
- `feature/timesheet-enhancements-part2` - Latest feature branch (merged)

## Testing Credentials
- Email: admin@admin.com
- Password: admin123

## Common Commands
```bash
# Development
npm run dev

# Build
npm run build

# Database migrations
psql $DATABASE_URL < scripts/migration.sql

# Git operations
git status
git add .
git commit -m "message"
git push origin main
```

## Known Issues & Solutions
1. **Grid2 Component Error**: Use `import { Grid }` instead of Grid2
2. **Supabase References**: All removed, using PostgreSQL directly
3. **Missing Columns**: Run migration scripts in /scripts/

## Recent Work Completed
- Merged User Management into Roles & Permissions
- Fixed production database schema mismatches
- Integrated Replit's 84 commits safely
- Created comprehensive gap analysis for client requirements

## Next Steps (Per Client Requirements)
1. Immediate fixes for Derek's access
2. Implement overtime calculations
3. Add new roles (Project Manager, Office Staff)
4. Build time reporting dashboard
5. Enable employee PO creation

## Important Notes
- NEVER send real data to production without explicit permission
- Always backup before major changes
- Test merged code thoroughly before deploying
- Client wants employees restricted to ONLY time entry

## Contact & Repository
- GitHub: https://github.com/Fduran111/OTS-ERP-AWS
- Current Environment: Development (local)