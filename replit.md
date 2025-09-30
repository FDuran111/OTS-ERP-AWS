# Overview

This is the Ortmeier Technical Service Job Management Platform - a comprehensive Next.js 15 application designed for electrical subcontractors. The platform handles job scheduling, time tracking, material management, invoicing, and customer portal functionality. The project is currently in an AWS migration phase, transitioning from Supabase/Coolify infrastructure to AWS-only services.

## Recent Updates (September 30, 2025)

### Advanced Purchase Order & Forecasting System
Implemented comprehensive PO creation and forecasting with ABC inventory analysis:

**Purchase Order Automation:**
- **Smart PO Creation**: Create purchase orders directly from reorder suggestions with vendor selection and delivery dates
- **Material Selection**: Multi-select materials with ABC classification badges, on-order quantities, and stockout predictions
- **Automated Receiving**: Comprehensive receiving dialog with location selection, quantity validation, and over-receipt prevention
- **Receipt Tracking**: Unique receipt numbers with idempotent operations and concurrent receipt handling via row-level locking
- **Database Integrity**: PostgreSQL triggers auto-update stock levels, sequences ensure unique PO/receipt numbers

**Inventory Forecasting & Analytics:**
- **ABC Classification**: Automatic classification based on cumulative value contribution (A=80%, B=15%, C=5%)
- **Stockout Predictions**: Calculate stockout probability and estimated dates based on usage patterns and lead times
- **Economic Order Quantity**: EOQ calculation with optimal reorder points considering usage trends and holding costs
- **Usage Trend Analysis**: Detect increasing/decreasing demand with trend factors and confidence scores
- **Low-Stock Notifications**: Real-time alerts with urgency levels (CRITICAL/URGENT/MEDIUM) and bell icon in navigation

**Technical Implementation:**
- Dedicated API endpoints: `/api/purchase-orders/from-reorder`, `/api/purchase-orders/[id]/receive`, `/api/materials/forecast`, `/api/materials/on-order`, `/api/notifications/low-stock`
- Database migrations: Fixed ABC classification, added receipt idempotency constraints, over-receipt prevention
- UI Components: ReorderSuggestions with PO creation dialog, PurchaseOrderReceivingDialog, NotificationBell with toast alerts
- Performance: Efficient SQL aggregations, auto-refresh intervals, session-based toast deduplication

## Recent Updates (September 29, 2025)

### Mobile-Responsive UI Implementation
Transformed the platform from a desktop-only ERP to a fully responsive application:
- **Responsive Layout System**: Leverages ResponsiveLayout and ResponsiveContainer components for consistent mobile/desktop experiences
- **Mobile Card Views**: Implemented touch-friendly card layouts for Invoicing and Purchase Orders pages with conditional rendering
- **Adaptive Display**: Pages automatically switch between table view (desktop) and card view (mobile) using MUI breakpoints
- **Existing Mobile Support**: Verified Customers, Time Tracking, Service Calls, and Billing pages already had mobile-optimized interfaces
- **Consistent Patterns**: All mobile cards follow unified design: header with status chips, key metrics, action buttons, and proper spacing

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