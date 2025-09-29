# Overview

This is the Ortmeier Technical Service Job Management Platform - a comprehensive Next.js 15 application designed for electrical subcontractors. The platform handles job scheduling, time tracking, material management, invoicing, and customer portal functionality. The project is currently in an AWS migration phase, transitioning from Supabase/Coolify infrastructure to AWS-only services.

## Recent Updates (September 29, 2025)

### Enhanced Material Tracking System
Successfully implemented advanced material management features:
- **Per-Location Stock Tracking**: MaterialLocationStock table tracks inventory at each storage location with automatic Material.inStock synchronization
- **Inter-Location Transfers**: Full workflow for moving materials between locations with PENDING → IN_TRANSIT → COMPLETED states
- **Offline-Capable Operations**: StockMovement enhanced with clientRequestId for idempotency and offline sync support
- **Vendor Management**: MaterialVendorPrice table tracks vendor pricing, lead times, and price breaks for automated PO generation
- **Material Documentation**: MaterialDocument table links photos and spec sheets to materials via FileAttachment
- **CSV Import/Export**: Bulk material operations with robust validation, vendor lookup, and partial update support

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 15 with React and TypeScript
- **UI Libraries**: Material-UI (MUI) with Radix UI components for enhanced functionality
- **Styling**: Tailwind CSS with CSS modules for component styling
- **State Management**: TanStack React Query for server state, React hooks for client state
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **API Layer**: Next.js API routes with middleware-based authentication
- **Authentication**: JWT-based authentication with role-based access control (RBAC)
- **User Roles**: Owner/Admin (Level 100), Foreman (Level 60), Employee (Level 40) with granular permission system
- **Database Layer**: PostgreSQL with custom SQL functions and views for complex business logic
- **File Processing**: Multer for file uploads with support for multiple storage backends

### Data Storage Solutions
- **Database**: PostgreSQL (transitioning from Supabase to AWS RDS)
  - Advanced features: Custom enums, stored procedures, triggers, and materialized views
  - Performance optimization: Indexes, connection pooling, query optimization
- **File Storage**: Multi-provider architecture supporting both Supabase Storage and AWS S3
  - Local development uses file system storage
  - Production uses S3 with CloudFront CDN integration

### Authentication and Authorization
- **JWT Implementation**: Custom JWT handling with secure cookie storage
- **RBAC System**: Three-tier role hierarchy with permission inheritance
- **Customer Portal**: Separate authentication system for client access
- **Session Management**: Secure session handling with refresh token rotation

## External Dependencies

### Third-Party Services
- **QuickBooks Integration**: OAuth-based API integration for customer and invoice synchronization
- **Supabase**: Currently used for database and storage (being phased out)
- **AWS Services**: 
  - RDS PostgreSQL for production database
  - S3 for file storage and static assets
  - ECS/Fargate for container deployment
  - CloudFront for CDN

### Development Tools
- **Database Management**: Custom migration system with Prisma-style schema management
- **Testing**: Jest with custom test utilities for database and API testing
- **Build Tools**: Standard Next.js build pipeline with TypeScript compilation
- **Deployment**: Docker-based deployment with Coolify (transitioning to AWS ECS)

### Key Libraries
- **Database**: `pg` (PostgreSQL client) with connection pooling
- **File Handling**: `multer`, AWS SDK v3, Supabase client
- **PDF Generation**: `jspdf` with auto-table for invoices and reports
- **Date Handling**: `date-fns` and `dayjs` for comprehensive date operations
- **Encryption**: `bcryptjs` for password hashing, `jsonwebtoken` for JWT handling