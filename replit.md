# OTS-ERP-AWS

## Overview

OTS-ERP-AWS is a comprehensive Enterprise Resource Planning (ERP) system built for Ortmeier Tree Service. The application manages job tracking, time entry, employee management, customer relationships, equipment tracking, and financial reporting. It's designed for electrical/tree service contractors with features tailored for field service operations.

The system supports multiple user roles (Admin, Manager, Employee, Foreman, HR Manager, Accountant, Project Manager, Office Staff) with granular permission controls for data access and operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 15 with React 19 and App Router architecture
- **UI Library**: Material-UI (MUI) v7 for primary components
- **Styling**: Tailwind CSS with custom theme configuration
- **State Management**: React Query (@tanstack/react-query) for server state
- **Form Handling**: React Hook Form with Zod resolvers
- **Authentication**: Custom JWT-based auth with cookies (NOT next-auth)

**Key Design Patterns**:
- Server Components by default with Client Components ('use client') for interactivity
- Middleware for authentication and request logging
- Theme provider with dark mode support
- Mobile-first responsive design with PWA manifest

### Backend Architecture

**API Layer**: Next.js API Routes (App Router format)
- RESTful endpoints under `/src/app/api/`
- Custom middleware for auth token validation (cookie + Authorization header fallback)
- Request/response logging with structured JSON output
- Error handling with standardized response formats

**Authentication Flow**:
1. Login endpoint validates credentials against User table
2. JWT token generated with user ID and role
3. Token stored in httpOnly cookie (secure in production)
4. Middleware validates token on protected routes
5. Falls back to Authorization Bearer header for Replit compatibility

**Permission System**:
- Role-Based Access Control (RBAC) implemented
- Permission library at `/src/lib/permissions.ts`
- Fine-grained permissions for financial data visibility
- Backend API routes filter data based on user role

### Data Storage

**Database**: PostgreSQL 16 (AWS RDS in production, local PostgreSQL in development)
- **Client Library**: `pg` (node-postgres) - Direct SQL queries, NOT an ORM
- **Connection Pooling**: pg Pool with configurable driver (SUPABASE/RDS)
- **Schema**: 153+ tables covering jobs, customers, time tracking, equipment, invoicing, etc.
- **Views**: Materialized views for reporting and analytics
- **Functions**: PostgreSQL stored procedures for complex calculations

**Database Driver System**:
- Environment-based driver selection (DB_DRIVER=SUPABASE or RDS)
- SUPABASE: Uses DATABASE_URL connection string
- RDS: Uses RDS_PROXY_ENDPOINT with IAM authentication
- Runtime validation prevents wrong environment connections

**File Storage**:
- **Development**: Supabase Storage
- **Production**: AWS S3 with presigned URLs
- **Driver Pattern**: Unified storage interface switches based on STORAGE_DRIVER env var
- **File Organization**: Bucket structure with prefixes (jobs/, equipment/, invoices/)

### External Dependencies

**AWS Services** (Production):
- **RDS PostgreSQL**: Primary database with proxy for connection pooling
- **S3**: File storage with lifecycle policies
- **ECS Fargate**: Container hosting
- **Application Load Balancer**: Traffic distribution
- **Secrets Manager**: Credential storage
- **CloudWatch**: Logging and monitoring
- **Amplify**: Staging environment hosting

**Third-Party Integrations**:
- **QuickBooks**: Customer, job, and time entry synchronization (planned/partial)
- **Supabase**: Development environment database and storage only
- **AWS SDK**: S3 client (@aws-sdk/client-s3) and presigner
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token generation/validation

**Key Libraries**:
- **Date Handling**: date-fns and dayjs
- **File Processing**: multer, csv-parse/stringify
- **PDF Generation**: jspdf with jspdf-autotable
- **Drag & Drop**: @dnd-kit suite
- **Data Grid**: @mui/x-data-grid
- **Icons**: @mui/icons-material and lucide-react

**Development Tools**:
- TypeScript with strict mode
- ESLint (next/core-web-vitals) with relaxed rules for development
- Jest for testing (configured but minimal tests)
- tsx for TypeScript script execution
- Smoke tests for infrastructure validation

**Deployment Pipeline**:
- GitHub Actions for CI/CD
- Docker containerization
- Environment-specific builds (development/staging/production)
- Database migrations run via Lambda functions
- Health checks and uptime monitoring