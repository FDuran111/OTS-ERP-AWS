# OTS-ERP-AWS

## Overview

OTS-ERP-AWS is a comprehensive Enterprise Resource Planning (ERP) system designed for Ortmeier Tree Service, focusing on electrical/tree service contractors. It manages core business operations including job tracking, time entry, employee and customer management, equipment tracking, and financial reporting. The system supports multiple user roles with granular permissions, enhancing operational efficiency and data security for field service operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with Next.js 15, React 19, and the App Router. It uses Material-UI (MUI) v7 for UI components and Tailwind CSS for styling, configured with a custom theme. State management is handled by React Query, and forms are managed with React Hook Form and Zod. Authentication is custom JWT-based using cookies. The design emphasizes mobile-first responsiveness, utilizing Server Components by default and Client Components for interactivity, with middleware for authentication and logging.

### Backend Architecture

The backend leverages Next.js API Routes for RESTful endpoints. It includes custom middleware for JWT authentication (cookie-based with Authorization header fallback) and robust error handling. A Role-Based Access Control (RBAC) system, defined in `/src/lib/permissions.ts`, provides fine-grained data access based on user roles, especially for financial information.

### Data Storage

The primary database is PostgreSQL 16 (AWS RDS in production, local for development), accessed directly via the `pg` client library (node-postgres) without an ORM. Connection pooling is managed by `pg Pool`. The schema includes over 153 tables, with materialized views for reporting and PostgreSQL stored procedures for complex calculations. File storage uses Supabase Storage in development and AWS S3 in production, managed by a unified driver interface.

### World-Class Audit System (Time Entry)

A comprehensive, immutable audit system tracks all time entry operations. It uses a shared audit helper service (`/src/lib/audit-helper.ts`) for centralized logging, JSONB-based change tracking, and correlation IDs for bulk operations. The `TimeEntryAudit` schema is append-only with database triggers preventing modifications, ensuring immutability. Audit events are integrated into all time entry CRUD, approval, and rejection APIs, linking to auto-generated job labor costs. An audit query API (`GET /api/audits/time-entries`) allows filtering and retrieving detailed audit trails, while an audit health API (`GET /api/admin/audit-health`) monitors compliance and data integrity. All audit operations are transaction-safe using PostgreSQL transactions.

## External Dependencies

**AWS Services (Production)**: RDS PostgreSQL, S3, ECS Fargate, Application Load Balancer, Secrets Manager, CloudWatch, Amplify.
**Third-Party Integrations**: QuickBooks (planned/partial), Supabase (development DB/storage), AWS SDK (@aws-sdk/client-s3), bcryptjs, jsonwebtoken.
**Key Libraries**: date-fns, dayjs, multer, csv-parse/stringify, jspdf, @dnd-kit, @mui/x-data-grid, @mui/icons-material, lucide-react.