-- Supabase Public Schema Recreation for RDS
-- Generated: 2025-09-03
-- This script creates all tables from Supabase in RDS

BEGIN;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing objects if needed (optional - comment out if preserving data)
-- DROP SCHEMA IF EXISTS public CASCADE;
-- CREATE SCHEMA public;

-- =====================================
-- TABLE 1: AssetAssignment
-- =====================================
CREATE TABLE IF NOT EXISTS public."AssetAssignment" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "assetId" uuid NOT NULL,
  "userId" text NOT NULL,
  "assignedDate" date NOT NULL DEFAULT CURRENT_DATE,
  "returnedDate" date NULL,
  purpose character varying(200) NULL,
  notes text NULL,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT AssetAssignment_pkey PRIMARY KEY (id),
  CONSTRAINT AssetAssignment_assetId_userId_assignedDate_key UNIQUE ("assetId", "userId", "assignedDate")
  -- Foreign keys will be added after all tables are created
);

CREATE INDEX IF NOT EXISTS idx_asset_assignment_user 
  ON public."AssetAssignment" USING btree ("userId", "returnedDate");

CREATE INDEX IF NOT EXISTS idx_asset_assignment_asset 
  ON public."AssetAssignment" USING btree ("assetId", "assignedDate");

-- =====================================
-- TABLE 2: AuditLog
-- =====================================
CREATE TABLE IF NOT EXISTS public."AuditLog" (
  id text NOT NULL DEFAULT encode(gen_random_bytes(12), 'base64'::text),
  "tableName" character varying(100) NOT NULL,
  "recordId" character varying(100) NOT NULL,
  action character varying(20) NOT NULL,
  "userId" text NULL,
  "oldData" jsonb NULL,
  "newData" jsonb NULL,
  "ipAddress" character varying(45) NULL,
  "userAgent" text NULL,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT AuditLog_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record 
  ON public."AuditLog" USING btree ("tableName", "recordId");

CREATE INDEX IF NOT EXISTS idx_audit_log_user 
  ON public."AuditLog" USING btree ("userId");

CREATE INDEX IF NOT EXISTS idx_audit_log_created 
  ON public."AuditLog" USING btree ("createdAt");

-- =====================================
-- TABLE 4: ChangeOrder
-- =====================================
-- Note: Requires ChangeOrderStatus enum type
CREATE TYPE IF NOT EXISTS public."ChangeOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED');

CREATE TABLE IF NOT EXISTS public."ChangeOrder" (
  id text NOT NULL,
  "jobId" text NOT NULL,
  "requestedBy" text NOT NULL,
  description text NOT NULL,
  "estimatedCost" double precision NOT NULL,
  "actualCost" double precision NULL,
  status public."ChangeOrderStatus" NOT NULL DEFAULT 'PENDING'::"ChangeOrderStatus",
  "approvedBy" text NULL,
  "approvedAt" timestamp without time zone NULL,
  "customerApproved" boolean NOT NULL DEFAULT false,
  photos text[] NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT ChangeOrder_pkey PRIMARY KEY (id)
);

-- =====================================
-- TABLE 5: CompanyAsset
-- =====================================
CREATE TABLE IF NOT EXISTS public."CompanyAsset" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "assetNumber" character varying(50) NOT NULL,
  "assetType" character varying(50) NOT NULL,
  category character varying(50) NOT NULL,
  name character varying(200) NOT NULL,
  description text NULL,
  make character varying(100) NULL,
  model character varying(100) NULL,
  year integer NULL,
  "serialNumber" character varying(200) NULL,
  "purchaseDate" date NULL,
  "purchasePrice" numeric(12, 2) NULL,
  "currentValue" numeric(12, 2) NULL,
  "depreciationMethod" character varying(50) NULL DEFAULT 'STRAIGHT_LINE'::character varying,
  "usefulLife" integer NULL DEFAULT 5,
  "annualDepreciation" numeric(10, 2) NULL DEFAULT 0,
  "maintenanceCost" numeric(10, 2) NULL DEFAULT 0,
  "insuranceCost" numeric(10, 2) NULL DEFAULT 0,
  "totalAnnualCost" numeric(12, 2) NULL DEFAULT 0,
  status character varying(30) NOT NULL DEFAULT 'ACTIVE'::character varying,
  location character varying(200) NULL,
  notes text NULL,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT CompanyAsset_pkey PRIMARY KEY (id),
  CONSTRAINT CompanyAsset_assetNumber_key UNIQUE ("assetNumber")
);

CREATE INDEX IF NOT EXISTS idx_company_asset_status 
  ON public."CompanyAsset" USING btree (status, "assetType");

-- =====================================
-- TABLE 6: CompanySettings
-- =====================================
CREATE TABLE IF NOT EXISTS public."CompanySettings" (
  id serial NOT NULL,
  company_name character varying(255) NOT NULL DEFAULT 'Ortmeier Technicians'::character varying,
  business_address text NULL,
  phone_number character varying(50) NULL,
  email character varying(255) NULL,
  license_number character varying(100) NULL,
  tax_id character varying(50) NULL,
  default_hourly_rate numeric(10, 2) NULL DEFAULT 125.00,
  invoice_terms character varying(100) NULL DEFAULT 'Net 30'::character varying,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT CompanySettings_pkey PRIMARY KEY (id)
);

-- =====================================
-- TABLE 7: Crew
-- =====================================
CREATE TABLE IF NOT EXISTS public."Crew" (
  id text NOT NULL,
  name text NOT NULL,
  description text NULL,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT Crew_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "Crew_name_key" 
  ON public."Crew" USING btree (name);

-- =====================================
-- TABLE 8: CrewAssignment
-- =====================================
CREATE TABLE IF NOT EXISTS public."CrewAssignment" (
  id text NOT NULL DEFAULT encode(gen_random_bytes(12), 'base64'::text),
  "scheduleId" text NOT NULL,
  "userId" text NOT NULL,
  "jobId" text NOT NULL,
  role character varying(20) NULL DEFAULT 'TECHNICIAN'::character varying,
  "assignedAt" timestamp with time zone NULL DEFAULT now(),
  "assignedBy" text NULL,
  status character varying(20) NOT NULL DEFAULT 'ASSIGNED'::character varying,
  "respondedAt" timestamp with time zone NULL,
  "checkedInAt" timestamp with time zone NULL,
  "checkedOutAt" timestamp with time zone NULL,
  notes text NULL,
  "createdAt" timestamp with time zone NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT CrewAssignment_pkey PRIMARY KEY (id),
  CONSTRAINT CrewAssignment_scheduleId_userId_key UNIQUE ("scheduleId", "userId"),
  CONSTRAINT CrewAssignment_status_check CHECK (
    status::text = ANY (ARRAY['ASSIGNED', 'ACCEPTED', 'DECLINED', 'REMOVED']::text[])
  ),
  CONSTRAINT CrewAssignment_check CHECK (
    "checkedOutAt" IS NULL OR "checkedInAt" IS NOT NULL
  ),
  CONSTRAINT CrewAssignment_check1 CHECK (
    "checkedOutAt" IS NULL OR "checkedOutAt" >= "checkedInAt"
  ),
  CONSTRAINT CrewAssignment_role_check CHECK (
    role::text = ANY (ARRAY['LEAD', 'TECHNICIAN', 'APPRENTICE', 'HELPER']::text[])
  )
);

CREATE INDEX IF NOT EXISTS idx_crew_assignment_schedule 
  ON public."CrewAssignment" USING btree ("scheduleId");
CREATE INDEX IF NOT EXISTS idx_crew_assignment_user 
  ON public."CrewAssignment" USING btree ("userId");
CREATE INDEX IF NOT EXISTS idx_crew_assignment_job 
  ON public."CrewAssignment" USING btree ("jobId");

-- =====================================
-- TABLE 9: CrewMember
-- =====================================
CREATE TABLE IF NOT EXISTS public."CrewMember" (
  id text NOT NULL,
  "crewId" text NOT NULL,
  name text NOT NULL,
  role text NULL,
  "hourlyRate" double precision NULL,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT CrewMember_pkey PRIMARY KEY (id)
);

-- =====================================
-- TABLE 10: Customer
-- =====================================
CREATE TABLE IF NOT EXISTS public."Customer" (
  id text NOT NULL,
  "companyName" text NULL,
  "firstName" text NOT NULL,
  "lastName" text NOT NULL,
  email text NULL,
  phone text NULL,
  street text NULL,
  address text NULL,
  city text NULL,
  state text NULL,
  zip text NULL,
  "quickbooksId" text NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  "createdBy" text NULL,
  "updatedBy" text NULL,
  "deletedAt" timestamp without time zone NULL,
  CONSTRAINT Customer_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_quickbooksId_key" 
  ON public."Customer" USING btree ("quickbooksId");

-- =====================================
-- TABLE 11: CustomerActivity
-- =====================================
CREATE TABLE IF NOT EXISTS public."CustomerActivity" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "customerId" text NOT NULL,
  "jobId" text NULL,
  "activityType" character varying(50) NOT NULL,
  description text NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  "ipAddress" inet NULL,
  "userAgent" text NULL,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT CustomerActivity_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_customer_activity_customer 
  ON public."CustomerActivity" USING btree ("customerId");
CREATE INDEX IF NOT EXISTS idx_customer_activity_type 
  ON public."CustomerActivity" USING btree ("activityType");

-- =====================================
-- TABLE 12: CustomerAttachment
-- =====================================
CREATE TABLE IF NOT EXISTS public."CustomerAttachment" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "customerId" text NOT NULL,
  "fileId" uuid NOT NULL,
  "attachmentType" character varying(50) NOT NULL DEFAULT 'GENERAL'::character varying,
  description text NULL,
  "isPrimary" boolean NULL DEFAULT false,
  "attachedBy" uuid NULL,
  "attachedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT CustomerAttachment_pkey PRIMARY KEY (id),
  CONSTRAINT CustomerAttachment_customerId_fileId_key UNIQUE ("customerId", "fileId")
);

CREATE INDEX IF NOT EXISTS idx_customer_attachment_customer_id 
  ON public."CustomerAttachment" USING btree ("customerId");
CREATE INDEX IF NOT EXISTS idx_customer_attachment_file_id 
  ON public."CustomerAttachment" USING btree ("fileId");

-- =====================================
-- TABLE 13: CustomerAuth
-- =====================================
CREATE TABLE IF NOT EXISTS public."CustomerAuth" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "customerId" text NOT NULL,
  email character varying(255) NOT NULL,
  "passwordHash" character varying(255) NOT NULL,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "emailVerificationToken" character varying(255) NULL,
  "passwordResetToken" character varying(255) NULL,
  "passwordResetExpires" timestamp without time zone NULL,
  "lastLogin" timestamp without time zone NULL,
  "loginAttempts" integer NULL DEFAULT 0,
  "lockedUntil" timestamp without time zone NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  preferences jsonb NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT CustomerAuth_pkey PRIMARY KEY (id),
  CONSTRAINT CustomerAuth_email_key UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_customer_auth_email 
  ON public."CustomerAuth" USING btree (email);
CREATE INDEX IF NOT EXISTS idx_customer_auth_customer 
  ON public."CustomerAuth" USING btree ("customerId");

-- =====================================
-- TABLE 14: CustomerFeedback
-- =====================================
CREATE TABLE IF NOT EXISTS public."CustomerFeedback" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "customerId" text NOT NULL,
  "jobId" text NOT NULL,
  rating integer NULL,
  "serviceQuality" integer NULL,
  timeliness integer NULL,
  communication integer NULL,
  "overallSatisfaction" integer NULL,
  comments text NULL,
  "wouldRecommend" boolean NULL,
  "isPublic" boolean NOT NULL DEFAULT false,
  "feedbackDate" timestamp without time zone NULL DEFAULT now(),
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT CustomerFeedback_pkey PRIMARY KEY (id),
  CONSTRAINT CustomerFeedback_rating_check CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT CustomerFeedback_serviceQuality_check CHECK ("serviceQuality" >= 1 AND "serviceQuality" <= 5),
  CONSTRAINT CustomerFeedback_timeliness_check CHECK (timeliness >= 1 AND timeliness <= 5),
  CONSTRAINT CustomerFeedback_communication_check CHECK (communication >= 1 AND communication <= 5),
  CONSTRAINT CustomerFeedback_overallSatisfaction_check CHECK ("overallSatisfaction" >= 1 AND "overallSatisfaction" <= 5)
);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer 
  ON public."CustomerFeedback" USING btree ("customerId");
CREATE INDEX IF NOT EXISTS idx_customer_feedback_job 
  ON public."CustomerFeedback" USING btree ("jobId");

-- =====================================
-- TABLE 15: CustomerMessage
-- =====================================
CREATE TABLE IF NOT EXISTS public."CustomerMessage" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "customerId" text NOT NULL,
  "jobId" text NULL,
  "senderId" text NULL,
  "senderType" character varying(20) NOT NULL,
  "recipientId" text NULL,
  "recipientType" character varying(20) NOT NULL,
  subject character varying(200) NULL,
  message text NOT NULL,
  "messageType" character varying(50) NULL DEFAULT 'GENERAL'::character varying,
  attachments jsonb NULL DEFAULT '[]'::jsonb,
  "isRead" boolean NOT NULL DEFAULT false,
  "readAt" timestamp without time zone NULL,
  "replyToId" uuid NULL,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT CustomerMessage_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_customer_message_customer 
  ON public."CustomerMessage" USING btree ("customerId");
CREATE INDEX IF NOT EXISTS idx_customer_message_job 
  ON public."CustomerMessage" USING btree ("jobId");
CREATE INDEX IF NOT EXISTS idx_customer_message_thread 
  ON public."CustomerMessage" USING btree ("replyToId");

-- =====================================
-- TABLE 16: CustomerNotification
-- =====================================
CREATE TABLE IF NOT EXISTS public."CustomerNotification" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "customerId" text NOT NULL,
  "jobId" text NULL,
  type character varying(50) NOT NULL,
  title character varying(200) NOT NULL,
  message text NOT NULL,
  "isRead" boolean NOT NULL DEFAULT false,
  "sentAt" timestamp without time zone NULL DEFAULT now(),
  "readAt" timestamp without time zone NULL,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT CustomerNotification_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_customer_notification_customer 
  ON public."CustomerNotification" USING btree ("customerId");
CREATE INDEX IF NOT EXISTS idx_customer_notification_job 
  ON public."CustomerNotification" USING btree ("jobId");
CREATE INDEX IF NOT EXISTS idx_customer_notification_unread 
  ON public."CustomerNotification" USING btree ("customerId", "isRead")
  WHERE "isRead" = false;

-- =====================================
-- TABLE 17: CustomerPortalUser (must come before CustomerPortalPreferences)
-- =====================================
CREATE TABLE IF NOT EXISTS public."CustomerPortalUser" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "customerId" text NOT NULL,
  email character varying(255) NOT NULL,
  password character varying(255) NOT NULL,
  "firstName" character varying(100) NULL,
  "lastName" character varying(100) NULL,
  "phoneNumber" character varying(20) NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "isEmailVerified" boolean NOT NULL DEFAULT false,
  "emailVerificationToken" character varying(255) NULL,
  "emailVerificationExpires" timestamp with time zone NULL,
  "passwordResetToken" character varying(255) NULL,
  "passwordResetExpires" timestamp with time zone NULL,
  "lastLoginAt" timestamp with time zone NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT CustomerPortalUser_pkey PRIMARY KEY (id),
  CONSTRAINT CustomerPortalUser_email_key UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_customer_portal_user_customer_id 
  ON public."CustomerPortalUser" USING btree ("customerId");
CREATE INDEX IF NOT EXISTS idx_customer_portal_user_email 
  ON public."CustomerPortalUser" USING btree (email);

-- =====================================
-- TABLE 18: CustomerPortalPreferences
-- =====================================
CREATE TABLE IF NOT EXISTS public."CustomerPortalPreferences" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "emailNotifications" boolean NOT NULL DEFAULT true,
  "smsNotifications" boolean NOT NULL DEFAULT false,
  theme character varying(20) NOT NULL DEFAULT 'light'::character varying,
  language character varying(10) NOT NULL DEFAULT 'en'::character varying,
  timezone character varying(50) NOT NULL DEFAULT 'UTC'::character varying,
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT CustomerPortalPreferences_pkey PRIMARY KEY (id),
  CONSTRAINT CustomerPortalPreferences_userId_key UNIQUE ("userId")
);

-- =====================================
-- TABLE 19: CustomerPortalSession
-- =====================================
CREATE TABLE IF NOT EXISTS public."CustomerPortalSession" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "sessionToken" character varying(500) NOT NULL,
  "ipAddress" inet NULL,
  "userAgent" text NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "expiresAt" timestamp with time zone NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAccessedAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT CustomerPortalSession_pkey PRIMARY KEY (id),
  CONSTRAINT CustomerPortalSession_sessionToken_key UNIQUE ("sessionToken")
);

CREATE INDEX IF NOT EXISTS idx_customer_portal_session_user_id 
  ON public."CustomerPortalSession" USING btree ("userId");
CREATE INDEX IF NOT EXISTS idx_customer_portal_session_token 
  ON public."CustomerPortalSession" USING btree ("sessionToken");
CREATE INDEX IF NOT EXISTS idx_customer_portal_session_active 
  ON public."CustomerPortalSession" USING btree ("isActive");

-- =====================================
-- TABLE 20: CustomerPortalSettings
-- =====================================
CREATE TABLE IF NOT EXISTS public."CustomerPortalSettings" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "customerId" text NOT NULL,
  "emailNotifications" boolean NULL DEFAULT true,
  "smsNotifications" boolean NULL DEFAULT false,
  "jobStatusUpdates" boolean NULL DEFAULT true,
  "marketingEmails" boolean NULL DEFAULT false,
  "schedulingReminders" boolean NULL DEFAULT true,
  "paymentReminders" boolean NULL DEFAULT true,
  "notificationFrequency" character varying(20) NULL DEFAULT 'IMMEDIATE'::character varying,
  "preferredContactMethod" character varying(20) NULL DEFAULT 'EMAIL'::character varying,
  timezone character varying(50) NULL DEFAULT 'America/Chicago'::character varying,
  language character varying(10) NULL DEFAULT 'en'::character varying,
  "themePreference" character varying(20) NULL DEFAULT 'LIGHT'::character varying,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT CustomerPortalSettings_pkey PRIMARY KEY (id),
  CONSTRAINT CustomerPortalSettings_customerId_key UNIQUE ("customerId")
);

-- =====================================
-- TABLE 23: CustomerSession
-- =====================================
CREATE TABLE IF NOT EXISTS public."CustomerSession" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "customerId" text NOT NULL,
  "sessionToken" character varying(255) NOT NULL,
  "ipAddress" inet NULL,
  "userAgent" text NULL,
  "expiresAt" timestamp without time zone NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT CustomerSession_pkey PRIMARY KEY (id),
  CONSTRAINT CustomerSession_sessionToken_key UNIQUE ("sessionToken")
);

CREATE INDEX IF NOT EXISTS idx_customer_session_token 
  ON public."CustomerSession" USING btree ("sessionToken");
CREATE INDEX IF NOT EXISTS idx_customer_session_customer 
  ON public."CustomerSession" USING btree ("customerId");

-- =====================================
-- TABLE 26: EmployeeOverhead
-- =====================================
CREATE TABLE IF NOT EXISTS public."EmployeeOverhead" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" text NOT NULL,
  "overheadType" character varying(50) NOT NULL,
  "overheadCategory" character varying(50) NOT NULL,
  "annualCost" numeric(12, 2) NOT NULL DEFAULT 0,
  "monthlyCost" numeric(10, 2) NOT NULL DEFAULT 0,
  "dailyCost" numeric(8, 2) NOT NULL DEFAULT 0,
  "hourlyCost" numeric(6, 2) NOT NULL DEFAULT 0,
  description text NULL,
  "effectiveDate" date NOT NULL DEFAULT CURRENT_DATE,
  "expiryDate" date NULL,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT EmployeeOverhead_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_employee_overhead_user 
  ON public."EmployeeOverhead" USING btree ("userId", active, "effectiveDate");

-- =====================================
-- TABLE 27: EmployeeSchedule
-- =====================================
CREATE TABLE IF NOT EXISTS public."EmployeeSchedule" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" text NOT NULL,
  "effectiveDate" date NOT NULL,
  "endDate" date NULL,
  "isActive" boolean NULL DEFAULT true,
  "weeklySchedule" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "regularRate" numeric(10, 2) NOT NULL,
  "overtimeRate" numeric(10, 2) NULL,
  "doubleTimeRate" numeric(10, 2) NULL,
  "isExempt" boolean NULL DEFAULT false,
  "isPieceWork" boolean NULL DEFAULT false,
  "isContractor" boolean NULL DEFAULT false,
  notes text NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT EmployeeSchedule_pkey PRIMARY KEY (id)
);

-- =====================================
-- TABLE 29: EquipmentMaintenance
-- =====================================
CREATE TABLE IF NOT EXISTS public."EquipmentMaintenance" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "assetId" uuid NOT NULL,
  "maintenanceDate" date NOT NULL,
  "maintenanceType" character varying(100) NOT NULL,
  description text NOT NULL,
  "hoursOutOfService" numeric(8, 2) NULL DEFAULT 0,
  cost numeric(10, 2) NULL DEFAULT 0,
  "performedBy" character varying(255) NULL,
  "vendorId" text NULL,
  "affectsBilling" boolean NULL DEFAULT false,
  "billingNotes" text NULL,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT EquipmentMaintenance_pkey PRIMARY KEY (id)
);

-- =====================================
-- TABLE 31: EquipmentRate
-- =====================================
CREATE TABLE IF NOT EXISTS public."EquipmentRate" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "equipmentType" character varying(100) NOT NULL,
  "equipmentClass" character varying(50) NOT NULL,
  "rateName" character varying(200) NOT NULL,
  description text NULL,
  "hourlyRate" numeric(10, 2) NOT NULL,
  "halfDayRate" numeric(10, 2) NULL,
  "fullDayRate" numeric(10, 2) NULL,
  "weeklyRate" numeric(10, 2) NULL,
  "monthlyRate" numeric(10, 2) NULL,
  "minimumBillableHours" numeric(4, 2) NULL DEFAULT 1.0,
  "roundingIncrement" numeric(4, 2) NULL DEFAULT 0.25,
  "travelTimeRate" numeric(10, 2) NULL,
  "setupTimeRate" numeric(10, 2) NULL,
  "minimumTravelTime" numeric(4, 2) NULL DEFAULT 0.5,
  "overtimeMultiplier" numeric(4, 2) NULL DEFAULT 1.5,
  "weekendMultiplier" numeric(4, 2) NULL DEFAULT 1.25,
  "holidayMultiplier" numeric(4, 2) NULL DEFAULT 2.0,
  "emergencyMultiplier" numeric(4, 2) NULL DEFAULT 2.5,
  "requiresOperator" boolean NULL DEFAULT true,
  "operatorIncluded" boolean NULL DEFAULT false,
  "operatorRate" numeric(10, 2) NULL,
  "effectiveDate" date NOT NULL DEFAULT CURRENT_DATE,
  "expiryDate" date NULL,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT EquipmentRate_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_equipment_rate_type 
  ON public."EquipmentRate" USING btree ("equipmentType", active);

-- =====================================
-- TABLE 32: EquipmentTimeLog
-- =====================================
CREATE TABLE IF NOT EXISTS public."EquipmentTimeLog" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "usageId" uuid NOT NULL,
  "startTime" timestamp without time zone NOT NULL,
  "endTime" timestamp without time zone NULL,
  duration numeric(8, 2) NULL,
  activity character varying(100) NOT NULL,
  description text NULL,
  "startLocation" character varying(255) NULL,
  "endLocation" character varying(255) NULL,
  "gpsCoordinates" character varying(100) NULL,
  billable boolean NULL DEFAULT true,
  "rateType" character varying(50) NULL DEFAULT 'STANDARD'::character varying,
  "recordedBy" text NULL,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT EquipmentTimeLog_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_equipment_time_log_usage 
  ON public."EquipmentTimeLog" USING btree ("usageId", "startTime");

-- =====================================
-- TABLE 33: EquipmentUsage
-- =====================================
CREATE TABLE IF NOT EXISTS public."EquipmentUsage" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL,
  "equipmentRateId" uuid NOT NULL,
  "assetId" uuid NULL,
  "equipmentName" character varying(255) NOT NULL,
  "equipmentType" character varying(100) NOT NULL,
  "operatorId" text NULL,
  "usageDate" date NOT NULL,
  "startTime" time without time zone NOT NULL,
  "endTime" time without time zone NULL,
  "totalHours" numeric(8, 2) NULL,
  "billableHours" numeric(8, 2) NULL,
  "workingHours" numeric(8, 2) NULL DEFAULT 0,
  "travelHours" numeric(8, 2) NULL DEFAULT 0,
  "setupHours" numeric(8, 2) NULL DEFAULT 0,
  "idleHours" numeric(8, 2) NULL DEFAULT 0,
  "hourlyRate" numeric(10, 2) NOT NULL,
  "travelRate" numeric(10, 2) NULL,
  "setupRate" numeric(10, 2) NULL,
  "appliedMultiplier" numeric(4, 2) NULL DEFAULT 1.0,
  "baseCost" numeric(12, 2) NULL DEFAULT 0,
  "travelCost" numeric(12, 2) NULL DEFAULT 0,
  "setupCost" numeric(12, 2) NULL DEFAULT 0,
  "operatorCost" numeric(12, 2) NULL DEFAULT 0,
  "totalCost" numeric(12, 2) NOT NULL,
  status character varying(30) NULL DEFAULT 'IN_PROGRESS'::character varying,
  notes text NULL,
  mileage numeric(8, 2) NULL,
  "fuelUsed" numeric(8, 2) NULL,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT EquipmentUsage_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_equipment_usage_job 
  ON public."EquipmentUsage" USING btree ("jobId", "usageDate");
CREATE INDEX IF NOT EXISTS idx_equipment_usage_operator 
  ON public."EquipmentUsage" USING btree ("operatorId", "usageDate");
CREATE INDEX IF NOT EXISTS idx_equipment_usage_status 
  ON public."EquipmentUsage" USING btree (status, "usageDate");
CREATE INDEX IF NOT EXISTS idx_equipment_usage_job_date 
  ON public."EquipmentUsage" USING btree ("jobId", "usageDate", status);
CREATE INDEX IF NOT EXISTS idx_equipment_usage_type_date 
  ON public."EquipmentUsage" USING btree ("equipmentType", "usageDate", status);

-- =====================================
-- TABLE 34: FileAttachment
-- =====================================
CREATE TABLE IF NOT EXISTS public."FileAttachment" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "fileName" character varying(255) NOT NULL,
  "originalName" character varying(255) NOT NULL,
  "mimeType" character varying(100) NOT NULL,
  "fileSize" bigint NOT NULL,
  "fileExtension" character varying(10) NOT NULL,
  "filePath" text NOT NULL,
  "fileUrl" text NULL,
  "uploadedBy" uuid NULL,
  "uploadedAt" timestamp without time zone NULL DEFAULT now(),
  "isImage" boolean NULL DEFAULT false,
  "imageWidth" integer NULL,
  "imageHeight" integer NULL,
  "thumbnailPath" text NULL,
  "thumbnailUrl" text NULL,
  description text NULL,
  tags text[] NULL,
  metadata jsonb NULL,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT FileAttachment_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_file_attachment_uploaded_by 
  ON public."FileAttachment" USING btree ("uploadedBy");
CREATE INDEX IF NOT EXISTS idx_file_attachment_mime_type 
  ON public."FileAttachment" USING btree ("mimeType");
CREATE INDEX IF NOT EXISTS idx_file_attachment_is_image 
  ON public."FileAttachment" USING btree ("isImage");
CREATE INDEX IF NOT EXISTS idx_file_attachment_uploaded_at 
  ON public."FileAttachment" USING btree ("uploadedAt");
CREATE INDEX IF NOT EXISTS idx_file_attachment_active 
  ON public."FileAttachment" USING btree (active);

-- =====================================
-- TABLE 35: Invoice (needs InvoiceStatus enum)
-- =====================================
CREATE TYPE IF NOT EXISTS public."InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIAL');

CREATE TABLE IF NOT EXISTS public."Invoice" (
  id text NOT NULL,
  "invoiceNumber" text NOT NULL,
  "jobId" text NOT NULL,
  "customerId" text NOT NULL,
  status public."InvoiceStatus" NOT NULL DEFAULT 'DRAFT'::"InvoiceStatus",
  "totalAmount" double precision NOT NULL,
  "taxAmount" double precision NOT NULL DEFAULT 0,
  "subtotalAmount" double precision NOT NULL,
  "dueDate" timestamp without time zone NOT NULL,
  "sentDate" timestamp without time zone NULL,
  "paidDate" timestamp without time zone NULL,
  notes text NULL,
  "quickbooksId" text NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT Invoice_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_key" 
  ON public."Invoice" USING btree ("invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_quickbooksId_key" 
  ON public."Invoice" USING btree ("quickbooksId");

-- =====================================
-- TABLE 36: InvoiceLineItem
-- =====================================
CREATE TABLE IF NOT EXISTS public."InvoiceLineItem" (
  id text NOT NULL,
  "invoiceId" text NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  quantity double precision NOT NULL,
  "unitPrice" double precision NOT NULL,
  "totalPrice" double precision NOT NULL,
  "materialId" text NULL,
  "laborRateId" text NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT InvoiceLineItem_pkey PRIMARY KEY (id)
);

-- =====================================
-- TABLE 38: Job (needs JobType and JobStatus enums)
-- =====================================
CREATE TYPE IF NOT EXISTS public."JobType" AS ENUM ('SERVICE', 'INSTALLATION', 'MAINTENANCE', 'EMERGENCY', 'PROJECT');
CREATE TYPE IF NOT EXISTS public."JobStatus" AS ENUM ('ESTIMATE', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'BILLED', 'CANCELLED', 'ON_HOLD');

CREATE TABLE IF NOT EXISTS public."Job" (
  id text NOT NULL,
  "jobNumber" text NOT NULL,
  "customerId" text NOT NULL,
  type public."JobType" NOT NULL,
  status public."JobStatus" NOT NULL DEFAULT 'ESTIMATE'::"JobStatus",
  description text NOT NULL,
  address text NULL,
  city text NULL,
  state text NULL,
  zip text NULL,
  "scheduledDate" timestamp without time zone NULL,
  "scheduledTime" text NULL,
  "startDate" timestamp without time zone NULL,
  "completedDate" timestamp without time zone NULL,
  "completedAt" timestamp without time zone NULL,
  "billedDate" timestamp without time zone NULL,
  "estimatedHours" double precision NULL,
  "actualHours" double precision NULL,
  "estimatedCost" double precision NULL,
  "actualCost" double precision NULL,
  "billedAmount" double precision NULL,
  priority text NULL,
  "jobType" text NULL,
  "assignedCrewId" text NULL,
  "quickbooksJobId" text NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  "categoryId" uuid NULL,
  "subCategoryId" uuid NULL,
  "serviceTypeId" uuid NULL,
  complexity character varying(20) NULL DEFAULT 'STANDARD'::character varying,
  sector character varying(50) NULL,
  division character varying(20) NULL DEFAULT 'LINE_VOLTAGE'::character varying,
  "createdBy" text NULL,
  "updatedBy" text NULL,
  "deletedAt" timestamp without time zone NULL,
  CONSTRAINT Job_pkey PRIMARY KEY (id),
  CONSTRAINT job_division_check CHECK (
    division::text = ANY (ARRAY['LOW_VOLTAGE', 'LINE_VOLTAGE']::text[])
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "Job_jobNumber_key" 
  ON public."Job" USING btree ("jobNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Job_quickbooksJobId_key" 
  ON public."Job" USING btree ("quickbooksJobId");
CREATE INDEX IF NOT EXISTS idx_job_category 
  ON public."Job" USING btree ("categoryId", status);
CREATE INDEX IF NOT EXISTS idx_job_subcategory 
  ON public."Job" USING btree ("subCategoryId", sector);
CREATE INDEX IF NOT EXISTS idx_job_service_type 
  ON public."Job" USING btree ("serviceTypeId");
CREATE INDEX IF NOT EXISTS idx_job_division 
  ON public."Job" USING btree (division, status);
CREATE INDEX IF NOT EXISTS idx_job_customer 
  ON public."Job" USING btree ("customerId");
CREATE INDEX IF NOT EXISTS idx_job_status 
  ON public."Job" USING btree (status);

-- =====================================
-- TABLE 39: JobAssignment
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobAssignment" (
  id text NOT NULL,
  "jobId" text NOT NULL,
  "userId" text NOT NULL,
  "assignedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedBy" text NOT NULL,
  "hoursWorked" double precision NULL DEFAULT 0,
  "overtimeHours" double precision NULL DEFAULT 0,
  "completedAt" timestamp without time zone NULL,
  CONSTRAINT JobAssignment_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobAssignment_jobId_userId_key" 
  ON public."JobAssignment" USING btree ("jobId", "userId");
CREATE INDEX IF NOT EXISTS "JobAssignment_assignedAt_idx" 
  ON public."JobAssignment" USING btree ("assignedAt");
CREATE INDEX IF NOT EXISTS "JobAssignment_userId_assignedAt_idx" 
  ON public."JobAssignment" USING btree ("userId", "assignedAt");

-- =====================================
-- TABLE 40: JobAttachment
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobAttachment" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL,
  "fileId" uuid NOT NULL,
  "attachmentType" character varying(50) NOT NULL DEFAULT 'GENERAL'::character varying,
  category character varying(50) NULL,
  phase character varying(50) NULL,
  description text NULL,
  "isPrimary" boolean NULL DEFAULT false,
  "sortOrder" integer NULL DEFAULT 0,
  "attachedBy" uuid NULL,
  "attachedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT JobAttachment_pkey PRIMARY KEY (id),
  CONSTRAINT JobAttachment_jobId_fileId_key UNIQUE ("jobId", "fileId")
);

CREATE INDEX IF NOT EXISTS idx_job_attachment_job_id 
  ON public."JobAttachment" USING btree ("jobId");
CREATE INDEX IF NOT EXISTS idx_job_attachment_file_id 
  ON public."JobAttachment" USING btree ("fileId");
CREATE INDEX IF NOT EXISTS idx_job_attachment_type 
  ON public."JobAttachment" USING btree ("attachmentType");
CREATE INDEX IF NOT EXISTS idx_job_attachment_category 
  ON public."JobAttachment" USING btree (category);
CREATE INDEX IF NOT EXISTS idx_job_attachment_phase 
  ON public."JobAttachment" USING btree (phase);

-- =====================================
-- TABLE 41: JobCategory
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobCategory" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "categoryCode" character varying(20) NOT NULL,
  "categoryName" character varying(100) NOT NULL,
  description text NULL,
  color character varying(7) NULL DEFAULT '#1976d2'::character varying,
  icon character varying(50) NULL DEFAULT 'work'::character varying,
  active boolean NOT NULL DEFAULT true,
  "sortOrder" integer NULL DEFAULT 0,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT JobCategory_pkey PRIMARY KEY (id),
  CONSTRAINT JobCategory_categoryCode_key UNIQUE ("categoryCode")
);

CREATE INDEX IF NOT EXISTS idx_job_category_active 
  ON public."JobCategory" USING btree (active, "sortOrder");

-- =====================================
-- TABLE 43: JobCost
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobCost" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL,
  "totalLaborHours" numeric(10, 2) NULL DEFAULT 0,
  "totalLaborCost" numeric(12, 2) NULL DEFAULT 0,
  "averageLaborRate" numeric(10, 2) NULL DEFAULT 0,
  "totalMaterialCost" numeric(12, 2) NULL DEFAULT 0,
  "materialMarkup" numeric(5, 2) NULL DEFAULT 0,
  "materialMarkupAmount" numeric(12, 2) NULL DEFAULT 0,
  "totalEquipmentCost" numeric(12, 2) NULL DEFAULT 0,
  "equipmentHours" numeric(10, 2) NULL DEFAULT 0,
  "overheadPercentage" numeric(5, 2) NULL DEFAULT 15.0,
  "overheadAmount" numeric(12, 2) NULL DEFAULT 0,
  "miscCosts" numeric(12, 2) NULL DEFAULT 0,
  "miscCostDescription" text NULL,
  "totalDirectCosts" numeric(12, 2) NULL DEFAULT 0,
  "totalIndirectCosts" numeric(12, 2) NULL DEFAULT 0,
  "totalJobCost" numeric(12, 2) NULL DEFAULT 0,
  "billedAmount" numeric(12, 2) NULL DEFAULT 0,
  "grossProfit" numeric(12, 2) NULL DEFAULT 0,
  "grossMargin" numeric(5, 2) NULL DEFAULT 0,
  "lastCalculated" timestamp with time zone NULL DEFAULT now(),
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "totalTrueLaborCost" numeric(12, 2) NULL DEFAULT 0,
  "averageTrueLaborRate" numeric(8, 2) NULL DEFAULT 0,
  "trueCostDifference" numeric(12, 2) NULL DEFAULT 0,
  CONSTRAINT JobCost_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_jobcost_job_id 
  ON public."JobCost" USING btree ("jobId");
CREATE INDEX IF NOT EXISTS idx_job_cost_true_cost 
  ON public."JobCost" USING btree ("jobId", "totalTrueLaborCost");

-- =====================================
-- TABLE 45: JobEquipmentCost
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobEquipmentCost" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL,
  "equipmentName" character varying(255) NOT NULL,
  "equipmentType" character varying(100) NOT NULL,
  "hourlyRate" numeric(10, 2) NOT NULL,
  "hoursUsed" numeric(10, 2) NOT NULL,
  "totalCost" numeric(12, 2) NOT NULL,
  "usageDate" date NOT NULL,
  "operatorId" text NULL,
  notes text NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT JobEquipmentCost_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_jobequipmentcost_job_id 
  ON public."JobEquipmentCost" USING btree ("jobId");
CREATE INDEX IF NOT EXISTS idx_job_equipment_cost_job_type 
  ON public."JobEquipmentCost" USING btree ("jobId", "equipmentType");

-- =====================================
-- TABLE 47: JobLaborActual
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobLaborActual" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL,
  "timeEntryId" uuid NOT NULL,
  "userId" text NOT NULL,
  "actualHours" numeric(8, 4) NOT NULL,
  "actualCost" numeric(12, 2) NOT NULL,
  "burdenedCost" numeric(12, 2) NULL,
  "billableHours" numeric(8, 4) NULL,
  "billableRate" numeric(10, 2) NULL,
  "workType" character varying(100) NULL,
  "skillLevel" character varying(50) NULL,
  "dateWorked" date NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT JobLaborActual_pkey PRIMARY KEY (id)
);

-- =====================================
-- TABLE 48: JobLaborCost
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobLaborCost" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL,
  "userId" text NOT NULL,
  "laborRateId" text NULL,
  "skillLevel" character varying(50) NOT NULL,
  "hourlyRate" numeric(10, 2) NOT NULL,
  "hoursWorked" numeric(10, 2) NOT NULL,
  "totalCost" numeric(12, 2) NOT NULL,
  "workDate" date NOT NULL,
  "timeEntryId" uuid NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "trueCostPerHour" numeric(8, 2) NULL DEFAULT 0,
  "totalTrueCost" numeric(10, 2) NULL DEFAULT 0,
  CONSTRAINT JobLaborCost_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_joblaborcost_job_id 
  ON public."JobLaborCost" USING btree ("jobId");
CREATE INDEX IF NOT EXISTS idx_joblaborcost_user_id 
  ON public."JobLaborCost" USING btree ("userId");
CREATE INDEX IF NOT EXISTS idx_joblaborcost_work_date 
  ON public."JobLaborCost" USING btree ("workDate");
CREATE INDEX IF NOT EXISTS idx_job_labor_cost_true_cost 
  ON public."JobLaborCost" USING btree ("jobId", "trueCostPerHour");

-- =====================================
-- TABLE 49: JobLaborRates
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobLaborRates" (
  id serial NOT NULL,
  job_id text NOT NULL,
  user_id text NOT NULL,
  overridden_rate numeric(10, 2) NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text NULL,
  notes text NULL,
  CONSTRAINT JobLaborRates_pkey PRIMARY KEY (id),
  CONSTRAINT JobLaborRates_job_id_user_id_key UNIQUE (job_id, user_id),
  CONSTRAINT JobLaborRates_overridden_rate_check CHECK (overridden_rate > 0::numeric)
);

CREATE INDEX IF NOT EXISTS idx_job_labor_rates_job_id 
  ON public."JobLaborRates" USING btree (job_id);
CREATE INDEX IF NOT EXISTS idx_job_labor_rates_user_id 
  ON public."JobLaborRates" USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_job_labor_rates_composite 
  ON public."JobLaborRates" USING btree (job_id, user_id);

-- =====================================
-- TABLE 51: JobMaterialCost
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobMaterialCost" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL,
  "materialId" text NOT NULL,
  "quantityUsed" numeric(10, 3) NOT NULL,
  "unitCost" numeric(10, 2) NOT NULL,
  "totalCost" numeric(12, 2) NOT NULL,
  markup numeric(5, 2) NULL DEFAULT 0,
  "markupAmount" numeric(12, 2) NULL DEFAULT 0,
  "billedAmount" numeric(12, 2) NULL DEFAULT 0,
  "usageDate" date NOT NULL,
  "reservationId" uuid NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT JobMaterialCost_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_jobmaterialcost_job_id 
  ON public."JobMaterialCost" USING btree ("jobId");
CREATE INDEX IF NOT EXISTS idx_jobmaterialcost_material_id 
  ON public."JobMaterialCost" USING btree ("materialId");

-- =====================================
-- TABLE 52: JobNote
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobNote" (
  id text NOT NULL,
  "jobId" text NOT NULL,
  note text NOT NULL,
  "createdBy" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT JobNote_pkey PRIMARY KEY (id)
);

-- =====================================
-- TABLE 53: JobPhase (needs enums)
-- =====================================
CREATE TYPE IF NOT EXISTS public."JobPhaseName" AS ENUM ('ESTIMATE', 'PLANNING', 'EXECUTION', 'COMPLETION', 'BILLING');
CREATE TYPE IF NOT EXISTS public."PhaseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

CREATE TABLE IF NOT EXISTS public."JobPhase" (
  id text NOT NULL,
  "jobId" text NOT NULL,
  name public."JobPhaseName" NOT NULL,
  description text NULL,
  "estimatedHours" double precision NULL,
  "actualHours" double precision NULL,
  "estimatedCost" double precision NULL,
  "actualCost" double precision NULL,
  status public."PhaseStatus" NOT NULL DEFAULT 'NOT_STARTED'::"PhaseStatus",
  "startDate" timestamp without time zone NULL,
  "completedDate" timestamp without time zone NULL,
  notes text NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT JobPhase_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobPhase_jobId_name_key" 
  ON public."JobPhase" USING btree ("jobId", name);

-- =====================================
-- TABLE 54: JobPhaseDetail
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobPhaseDetail" (
  id text NOT NULL,
  "jobId" text NOT NULL,
  phase public."JobPhaseName" NOT NULL,
  "jobNumber" text NOT NULL,
  status public."JobStatus" NOT NULL DEFAULT 'SCHEDULED'::"JobStatus",
  "estimatedHours" double precision NULL,
  "actualHours" double precision NULL,
  "estimatedCost" double precision NULL,
  "actualCost" double precision NULL,
  "startDate" timestamp without time zone NULL,
  "completedDate" timestamp without time zone NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT JobPhaseDetail_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobPhaseDetail_jobNumber_key" 
  ON public."JobPhaseDetail" USING btree ("jobNumber");

-- =====================================
-- TABLE 56: JobReminder
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobReminder" (
  id text NOT NULL DEFAULT encode(gen_random_bytes(12), 'base64'::text),
  "jobId" text NOT NULL,
  type character varying(50) NOT NULL,
  title character varying(255) NOT NULL,
  message text NULL,
  "reminderDate" timestamp with time zone NOT NULL,
  priority character varying(20) NOT NULL DEFAULT 'MEDIUM'::character varying,
  status character varying(20) NOT NULL DEFAULT 'ACTIVE'::character varying,
  "createdAt" timestamp with time zone NULL DEFAULT now(),
  "acknowledgedAt" timestamp with time zone NULL,
  "snoozedUntil" timestamp with time zone NULL,
  "phaseId" text NULL,
  metadata jsonb NULL,
  CONSTRAINT JobReminder_pkey PRIMARY KEY (id),
  CONSTRAINT JobReminder_type_check CHECK (
    type::text = ANY (ARRAY['JOB_START', 'PHASE_START', 'DEADLINE_WARNING', 'FOLLOW_UP', 'OVERDUE', 'CUSTOM']::text[])
  ),
  CONSTRAINT JobReminder_priority_check CHECK (
    priority::text = ANY (ARRAY['LOW', 'MEDIUM', 'HIGH', 'URGENT']::text[])
  ),
  CONSTRAINT JobReminder_status_check CHECK (
    status::text = ANY (ARRAY['ACTIVE', 'ACKNOWLEDGED', 'SNOOZED', 'DISMISSED']::text[])
  )
);

CREATE INDEX IF NOT EXISTS idx_job_reminder_job_id 
  ON public."JobReminder" USING btree ("jobId");
CREATE INDEX IF NOT EXISTS idx_job_reminder_date 
  ON public."JobReminder" USING btree ("reminderDate");
CREATE INDEX IF NOT EXISTS idx_job_reminder_status 
  ON public."JobReminder" USING btree (status);
CREATE INDEX IF NOT EXISTS idx_job_reminder_type 
  ON public."JobReminder" USING btree (type);
CREATE INDEX IF NOT EXISTS idx_job_reminder_priority 
  ON public."JobReminder" USING btree (priority);

-- =====================================
-- TABLE 57: JobSchedule
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobSchedule" (
  id text NOT NULL DEFAULT encode(gen_random_bytes(12), 'base64'::text),
  "jobId" text NOT NULL,
  "scheduledBy" text NULL,
  "startDate" timestamp with time zone NOT NULL,
  "endDate" timestamp with time zone NULL,
  "estimatedHours" numeric(5, 2) NOT NULL,
  "actualHours" numeric(5, 2) NULL DEFAULT 0,
  status character varying(20) NOT NULL DEFAULT 'SCHEDULED'::character varying,
  "startedAt" timestamp with time zone NULL,
  "completedAt" timestamp with time zone NULL,
  notes text NULL,
  "rescheduleReason" text NULL,
  "originalStartDate" timestamp with time zone NULL,
  "createdAt" timestamp with time zone NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT JobSchedule_pkey PRIMARY KEY (id),
  CONSTRAINT JobSchedule_jobId_key UNIQUE ("jobId"),
  CONSTRAINT JobSchedule_check CHECK ("endDate" IS NULL OR "endDate" >= "startDate"),
  CONSTRAINT JobSchedule_estimatedHours_check CHECK ("estimatedHours" > 0::numeric),
  CONSTRAINT JobSchedule_status_check CHECK (
    status::text = ANY (ARRAY['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']::text[])
  )
);

CREATE INDEX IF NOT EXISTS idx_job_schedule_start_date 
  ON public."JobSchedule" USING btree ("startDate");
CREATE INDEX IF NOT EXISTS idx_job_schedule_job 
  ON public."JobSchedule" USING btree ("jobId");
CREATE INDEX IF NOT EXISTS idx_job_schedule_status 
  ON public."JobSchedule" USING btree (status);
CREATE INDEX IF NOT EXISTS idx_schedule_job 
  ON public."JobSchedule" USING btree ("jobId");

-- =====================================
-- TABLE 58: JobSubCategory
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobSubCategory" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "categoryId" uuid NOT NULL,
  "subCategoryCode" character varying(20) NOT NULL,
  "subCategoryName" character varying(100) NOT NULL,
  description text NULL,
  "defaultLaborRate" numeric(10, 2) NULL,
  "estimatedHours" numeric(8, 2) NULL,
  "requiresCertification" boolean NULL DEFAULT false,
  "requiredSkillLevel" character varying(50) NULL,
  active boolean NOT NULL DEFAULT true,
  "sortOrder" integer NULL DEFAULT 0,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT JobSubCategory_pkey PRIMARY KEY (id),
  CONSTRAINT JobSubCategory_categoryId_subCategoryCode_key UNIQUE ("categoryId", "subCategoryCode")
);

CREATE INDEX IF NOT EXISTS idx_job_subcategory_category 
  ON public."JobSubCategory" USING btree ("categoryId", active);

-- =====================================
-- TABLE 59: JobTag
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobTag" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "tagName" character varying(50) NOT NULL,
  "tagType" character varying(30) NOT NULL DEFAULT 'GENERAL'::character varying,
  description text NULL,
  color character varying(7) NULL DEFAULT '#757575'::character varying,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT JobTag_pkey PRIMARY KEY (id),
  CONSTRAINT JobTag_tagName_key UNIQUE ("tagName")
);

-- =====================================
-- TABLE 60: JobTagAssignment
-- =====================================
CREATE TABLE IF NOT EXISTS public."JobTagAssignment" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL,
  "tagId" uuid NOT NULL,
  "assignedAt" timestamp without time zone NULL DEFAULT now(),
  "assignedBy" text NULL,
  CONSTRAINT JobTagAssignment_pkey PRIMARY KEY (id),
  CONSTRAINT JobTagAssignment_jobId_tagId_key UNIQUE ("jobId", "tagId")
);

CREATE INDEX IF NOT EXISTS idx_job_tag_assignment_job 
  ON public."JobTagAssignment" USING btree ("jobId");
CREATE INDEX IF NOT EXISTS idx_job_tag_assignment_tag 
  ON public."JobTagAssignment" USING btree ("tagId");

-- =====================================
-- TABLE 61: LaborRate
-- =====================================
CREATE TABLE IF NOT EXISTS public."LaborRate" (
  id text NOT NULL,
  name text NOT NULL,
  description text NULL,
  "hourlyRate" double precision NOT NULL,
  "skillLevel" text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT LaborRate_pkey PRIMARY KEY (id)
);

-- =====================================
-- TABLE 62: Lead (needs enums)
-- =====================================
CREATE TYPE IF NOT EXISTS public."LeadStatus" AS ENUM ('COLD_LEAD', 'WARM_LEAD', 'HOT_LEAD', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST', 'ON_HOLD');
CREATE TYPE IF NOT EXISTS public."LeadSource" AS ENUM ('WEBSITE', 'REFERRAL', 'PHONE', 'EMAIL', 'WALK_IN', 'SOCIAL_MEDIA', 'ADVERTISING', 'OTHER');

CREATE TABLE IF NOT EXISTS public."Lead" (
  id text NOT NULL,
  "firstName" text NOT NULL,
  "lastName" text NOT NULL,
  "companyName" text NULL,
  email text NULL,
  phone text NULL,
  street text NULL,
  city text NULL,
  state text NULL,
  zip text NULL,
  status public."LeadStatus" NOT NULL DEFAULT 'COLD_LEAD'::"LeadStatus",
  source public."LeadSource" NULL,
  "estimatedValue" double precision NULL,
  priority text NULL,
  description text NULL,
  notes text NULL,
  "lastContactDate" timestamp without time zone NULL,
  "nextFollowUpDate" timestamp without time zone NULL,
  "assignedTo" text NULL,
  "convertedToCustomerId" text NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT Lead_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "Lead_convertedToCustomerId_key" 
  ON public."Lead" USING btree ("convertedToCustomerId");

-- =====================================
-- TABLE 63: LeadActivity
-- =====================================
CREATE TABLE IF NOT EXISTS public."LeadActivity" (
  id text NOT NULL,
  "leadId" text NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  outcome text NULL,
  "scheduledDate" timestamp without time zone NULL,
  "completedDate" timestamp without time zone NULL,
  "createdBy" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT LeadActivity_pkey PRIMARY KEY (id)
);

-- =====================================
-- TABLE 64: LeadEstimate
-- =====================================
CREATE TABLE IF NOT EXISTS public."LeadEstimate" (
  id text NOT NULL,
  "leadId" text NOT NULL,
  title text NOT NULL,
  description text NULL,
  "estimatedHours" double precision NULL,
  "laborCost" double precision NULL,
  "materialCost" double precision NULL,
  "totalAmount" double precision NOT NULL,
  "validUntil" timestamp without time zone NULL,
  status text NOT NULL DEFAULT 'DRAFT'::text,
  "sentDate" timestamp without time zone NULL,
  "respondedDate" timestamp without time zone NULL,
  notes text NULL,
  "createdBy" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT LeadEstimate_pkey PRIMARY KEY (id)
);

-- =====================================
-- TABLE 65: Material
-- =====================================
CREATE TABLE IF NOT EXISTS public."Material" (
  id text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text NULL,
  unit text NOT NULL,
  cost double precision NOT NULL,
  price double precision NOT NULL,
  markup double precision NOT NULL DEFAULT 1.5,
  category text NOT NULL,
  "vendorId" text NULL,
  "inStock" integer NOT NULL DEFAULT 0,
  "minStock" integer NOT NULL DEFAULT 0,
  location text NULL,
  "quickbooksItemId" text NULL,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  manufacturer text NULL,
  CONSTRAINT Material_pkey PRIMARY KEY (id),
  CONSTRAINT check_cost_positive CHECK (cost >= 0::double precision),
  CONSTRAINT check_stock_positive CHECK ("inStock" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "Material_code_key" 
  ON public."Material" USING btree (code);
CREATE UNIQUE INDEX IF NOT EXISTS "Material_quickbooksItemId_key" 
  ON public."Material" USING btree ("quickbooksItemId");

-- =====================================
-- TABLE 66: MaterialAttachment
-- =====================================
CREATE TABLE IF NOT EXISTS public."MaterialAttachment" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "materialId" text NOT NULL,
  "fileId" uuid NOT NULL,
  "attachmentType" character varying(50) NOT NULL DEFAULT 'PRODUCT_PHOTO'::character varying,
  description text NULL,
  "isPrimary" boolean NULL DEFAULT false,
  "attachedBy" uuid NULL,
  "attachedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT MaterialAttachment_pkey PRIMARY KEY (id),
  CONSTRAINT MaterialAttachment_materialId_fileId_key UNIQUE ("materialId", "fileId")
);

CREATE INDEX IF NOT EXISTS idx_material_attachment_material_id 
  ON public."MaterialAttachment" USING btree ("materialId");
CREATE INDEX IF NOT EXISTS idx_material_attachment_file_id 
  ON public."MaterialAttachment" USING btree ("fileId");

-- =====================================
-- TABLE 69: MaterialReservation
-- =====================================
CREATE TABLE IF NOT EXISTS public."MaterialReservation" (
  id text NOT NULL DEFAULT encode(gen_random_bytes(12), 'base64'::text),
  "jobId" text NOT NULL,
  "materialId" text NOT NULL,
  "phaseId" text NULL,
  "userId" text NULL,
  "quantityReserved" numeric(10, 2) NOT NULL,
  "reservedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "neededBy" timestamp with time zone NULL,
  "expiresAt" timestamp with time zone NULL,
  status character varying(20) NOT NULL DEFAULT 'ACTIVE'::character varying,
  "fulfilledAt" timestamp with time zone NULL,
  "fulfilledQuantity" numeric(10, 2) NULL DEFAULT 0,
  notes text NULL,
  priority character varying(10) NULL DEFAULT 'MEDIUM'::character varying,
  "createdAt" timestamp with time zone NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT MaterialReservation_pkey PRIMARY KEY (id),
  CONSTRAINT MaterialReservation_jobId_materialId_phaseId_key UNIQUE ("jobId", "materialId", "phaseId"),
  CONSTRAINT MaterialReservation_quantityReserved_check CHECK ("quantityReserved" > 0::numeric),
  CONSTRAINT MaterialReservation_status_check CHECK (
    status::text = ANY (ARRAY['ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED']::text[])
  ),
  CONSTRAINT MaterialReservation_priority_check CHECK (
    priority::text = ANY (ARRAY['LOW', 'MEDIUM', 'HIGH', 'URGENT']::text[])
  ),
  CONSTRAINT MaterialReservation_check CHECK ("fulfilledQuantity" <= "quantityReserved")
);

CREATE INDEX IF NOT EXISTS idx_material_reservation_job 
  ON public."MaterialReservation" USING btree ("jobId");
CREATE INDEX IF NOT EXISTS idx_material_reservation_material 
  ON public."MaterialReservation" USING btree ("materialId");
CREATE INDEX IF NOT EXISTS idx_material_reservation_status 
  ON public."MaterialReservation" USING btree (status);
CREATE INDEX IF NOT EXISTS idx_material_reservation_needed_by 
  ON public."MaterialReservation" USING btree ("neededBy");

-- =====================================
-- TABLE 70: MaterialStockLocation
-- =====================================
CREATE TABLE IF NOT EXISTS public."MaterialStockLocation" (
  id text NOT NULL,
  "materialId" text NOT NULL,
  "locationId" text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT MaterialStockLocation_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "MaterialStockLocation_materialId_locationId_key" 
  ON public."MaterialStockLocation" USING btree ("materialId", "locationId");

-- =====================================
-- TABLE 71: MaterialUsage
-- =====================================
CREATE TABLE IF NOT EXISTS public."MaterialUsage" (
  id text NOT NULL,
  "jobId" text NOT NULL,
  "phaseId" text NULL,
  "materialId" text NOT NULL,
  quantity double precision NOT NULL,
  "unitCost" double precision NOT NULL,
  "totalCost" double precision NOT NULL,
  "usedBy" text NOT NULL,
  "usedAt" timestamp without time zone NOT NULL,
  synced boolean NOT NULL DEFAULT false,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT MaterialUsage_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_material_usage_job_id 
  ON public."MaterialUsage" USING btree ("jobId");
CREATE INDEX IF NOT EXISTS idx_material_usage_material_id 
  ON public."MaterialUsage" USING btree ("materialId");
CREATE INDEX IF NOT EXISTS idx_material_usage_job 
  ON public."MaterialUsage" USING btree ("jobId");

-- =====================================
-- TABLE 72: PurchaseOrder
-- =====================================
CREATE TABLE IF NOT EXISTS public."PurchaseOrder" (
  id text NOT NULL,
  "poNumber" text NOT NULL,
  "jobId" text NOT NULL,
  "phaseId" text NULL,
  "vendorId" text NOT NULL,
  "createdBy" text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING'::text,
  "totalAmount" double precision NOT NULL,
  "approvedBy" text NULL,
  "approvedAt" timestamp without time zone NULL,
  "quickbooksId" text NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT PurchaseOrder_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_poNumber_key" 
  ON public."PurchaseOrder" USING btree ("poNumber");

-- =====================================
-- TABLE 73: PurchaseOrderItem
-- =====================================
CREATE TABLE IF NOT EXISTS public."PurchaseOrderItem" (
  id text NOT NULL,
  "purchaseOrderId" text NOT NULL,
  "materialId" text NOT NULL,
  quantity double precision NOT NULL,
  "unitCost" double precision NOT NULL,
  "totalCost" double precision NOT NULL,
  CONSTRAINT PurchaseOrderItem_pkey PRIMARY KEY (id)
);

-- =====================================
-- TABLE 74: PurchaseOrderRequirement
-- =====================================
CREATE TABLE IF NOT EXISTS public."PurchaseOrderRequirement" (
  id text NOT NULL DEFAULT encode(gen_random_bytes(12), 'base64'::text),
  "materialId" text NOT NULL,
  "jobId" text NULL,
  "reservationId" text NULL,
  "quantityNeeded" numeric(10, 2) NOT NULL,
  "quantityOrdered" numeric(10, 2) NULL DEFAULT 0,
  "estimatedCost" numeric(10, 2) NULL,
  "actualCost" numeric(10, 2) NULL,
  "preferredVendorId" text NULL,
  "supplierQuote" text NULL,
  "neededBy" timestamp with time zone NOT NULL,
  "orderedAt" timestamp with time zone NULL,
  "expectedDelivery" timestamp with time zone NULL,
  "actualDelivery" timestamp with time zone NULL,
  status character varying(20) NOT NULL DEFAULT 'PENDING'::character varying,
  notes text NULL,
  "poNumber" character varying(50) NULL,
  "createdAt" timestamp with time zone NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT PurchaseOrderRequirement_pkey PRIMARY KEY (id),
  CONSTRAINT PurchaseOrderRequirement_quantityNeeded_check CHECK ("quantityNeeded" > 0::numeric),
  CONSTRAINT PurchaseOrderRequirement_status_check CHECK (
    status::text = ANY (ARRAY['PENDING', 'QUOTED', 'ORDERED', 'SHIPPED', 'DELIVERED', 'CANCELLED']::text[])
  ),
  CONSTRAINT PurchaseOrderRequirement_check CHECK ("quantityOrdered" <= "quantityNeeded")
);

CREATE INDEX IF NOT EXISTS idx_po_requirement_material 
  ON public."PurchaseOrderRequirement" USING btree ("materialId");
CREATE INDEX IF NOT EXISTS idx_po_requirement_job 
  ON public."PurchaseOrderRequirement" USING btree ("jobId");
CREATE INDEX IF NOT EXISTS idx_po_requirement_status 
  ON public."PurchaseOrderRequirement" USING btree (status);
CREATE INDEX IF NOT EXISTS idx_po_requirement_needed_by 
  ON public."PurchaseOrderRequirement" USING btree ("neededBy");

-- =====================================
-- TABLE 75: QuickBooksAccount
-- =====================================
CREATE TABLE IF NOT EXISTS public."QuickBooksAccount" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "quickbooksId" character varying(100) NOT NULL,
  name character varying(100) NOT NULL,
  "accountType" character varying(50) NOT NULL,
  "accountSubType" character varying(50) NULL,
  description text NULL,
  "currentBalance" numeric(12, 2) NULL,
  active boolean NULL DEFAULT true,
  "parentAccountId" character varying(100) NULL,
  "fullyQualifiedName" text NULL,
  "syncVersion" character varying(20) NULL,
  "lastSyncAt" timestamp without time zone NULL DEFAULT now(),
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT QuickBooksAccount_pkey PRIMARY KEY (id),
  CONSTRAINT QuickBooksAccount_quickbooksId_key UNIQUE ("quickbooksId")
);

CREATE INDEX IF NOT EXISTS idx_qb_account_qb_id 
  ON public."QuickBooksAccount" USING btree ("quickbooksId");
CREATE INDEX IF NOT EXISTS idx_qb_account_type 
  ON public."QuickBooksAccount" USING btree ("accountType");

-- =====================================
-- TABLE 76: QuickBooksConnection
-- =====================================
CREATE TABLE IF NOT EXISTS public."QuickBooksConnection" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "companyId" character varying(100) NOT NULL,
  "accessToken" text NOT NULL,
  "refreshToken" text NOT NULL,
  "tokenExpiresAt" timestamp without time zone NOT NULL,
  "realmId" character varying(100) NOT NULL,
  "baseUrl" character varying(255) NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "lastSyncAt" timestamp without time zone NULL,
  "syncErrors" jsonb NULL DEFAULT '[]'::jsonb,
  "connectionMetadata" jsonb NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT QuickBooksConnection_pkey PRIMARY KEY (id),
  CONSTRAINT QuickBooksConnection_companyId_key UNIQUE ("companyId")
);

CREATE INDEX IF NOT EXISTS idx_qb_connection_company 
  ON public."QuickBooksConnection" USING btree ("companyId");
CREATE INDEX IF NOT EXISTS idx_qb_connection_active 
  ON public."QuickBooksConnection" USING btree ("isActive");

-- =====================================
-- TABLE 77: QuickBooksItem
-- =====================================
CREATE TABLE IF NOT EXISTS public."QuickBooksItem" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "quickbooksId" character varying(100) NOT NULL,
  name character varying(100) NOT NULL,
  description text NULL,
  type character varying(20) NOT NULL,
  "unitPrice" numeric(10, 2) NULL,
  "qtyOnHand" numeric(10, 2) NULL,
  "incomeAccountId" character varying(100) NULL,
  "assetAccountId" character varying(100) NULL,
  "expenseAccountId" character varying(100) NULL,
  taxable boolean NULL DEFAULT false,
  active boolean NULL DEFAULT true,
  sku character varying(100) NULL,
  "syncVersion" character varying(20) NULL,
  "lastSyncAt" timestamp without time zone NULL DEFAULT now(),
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT QuickBooksItem_pkey PRIMARY KEY (id),
  CONSTRAINT QuickBooksItem_quickbooksId_key UNIQUE ("quickbooksId")
);

CREATE INDEX IF NOT EXISTS idx_qb_item_qb_id 
  ON public."QuickBooksItem" USING btree ("quickbooksId");
CREATE INDEX IF NOT EXISTS idx_qb_item_active 
  ON public."QuickBooksItem" USING btree (active);

-- =====================================
-- TABLE 78: QuickBooksMapping
-- =====================================
CREATE TABLE IF NOT EXISTS public."QuickBooksMapping" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "localEntityType" character varying(50) NOT NULL,
  "localEntityId" text NOT NULL,
  "quickbooksId" character varying(100) NOT NULL,
  "quickbooksType" character varying(50) NOT NULL,
  "syncVersion" character varying(20) NULL,
  "lastSyncAt" timestamp without time zone NULL DEFAULT now(),
  "syncStatus" character varying(20) NULL DEFAULT 'SYNCED'::character varying,
  "syncErrors" jsonb NULL DEFAULT '[]'::jsonb,
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT QuickBooksMapping_pkey PRIMARY KEY (id),
  CONSTRAINT QuickBooksMapping_localEntityType_localEntityId_key UNIQUE ("localEntityType", "localEntityId"),
  CONSTRAINT QuickBooksMapping_quickbooksId_quickbooksType_key UNIQUE ("quickbooksId", "quickbooksType")
);

CREATE INDEX IF NOT EXISTS idx_qb_mapping_local 
  ON public."QuickBooksMapping" USING btree ("localEntityType", "localEntityId");
CREATE INDEX IF NOT EXISTS idx_qb_mapping_quickbooks 
  ON public."QuickBooksMapping" USING btree ("quickbooksId", "quickbooksType");
CREATE INDEX IF NOT EXISTS idx_qb_mapping_sync_status 
  ON public."QuickBooksMapping" USING btree ("syncStatus");

-- =====================================
-- TABLE 79: QuickBooksSyncConfig
-- =====================================
CREATE TABLE IF NOT EXISTS public."QuickBooksSyncConfig" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "entityType" character varying(50) NOT NULL,
  "syncEnabled" boolean NULL DEFAULT true,
  "syncDirection" character varying(20) NULL DEFAULT 'BIDIRECTIONAL'::character varying,
  "syncFrequency" character varying(20) NULL DEFAULT 'REAL_TIME'::character varying,
  "lastSyncAt" timestamp without time zone NULL,
  "autoCreateInQB" boolean NULL DEFAULT true,
  "conflictResolution" character varying(20) NULL DEFAULT 'QB_WINS'::character varying,
  "fieldMappings" jsonb NULL DEFAULT '{}'::jsonb,
  "syncFilters" jsonb NULL DEFAULT '{}'::jsonb,
  "isActive" boolean NULL DEFAULT true,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT QuickBooksSyncConfig_pkey PRIMARY KEY (id),
  CONSTRAINT QuickBooksSyncConfig_entityType_key UNIQUE ("entityType")
);

-- =====================================
-- TABLE 80: QuickBooksSyncLog
-- =====================================
CREATE TABLE IF NOT EXISTS public."QuickBooksSyncLog" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "operationType" character varying(50) NOT NULL,
  "entityType" character varying(50) NOT NULL,
  "localEntityId" text NULL,
  "quickbooksId" character varying(100) NULL,
  direction character varying(20) NOT NULL,
  status character varying(20) NOT NULL,
  "requestData" jsonb NULL,
  "responseData" jsonb NULL,
  "errorMessage" text NULL,
  "errorCode" character varying(50) NULL,
  duration integer NULL,
  "retryCount" integer NULL DEFAULT 0,
  "scheduledAt" timestamp without time zone NULL,
  "startedAt" timestamp without time zone NULL,
  "completedAt" timestamp without time zone NULL,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT QuickBooksSyncLog_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_qb_sync_log_entity 
  ON public."QuickBooksSyncLog" USING btree ("entityType", "localEntityId");
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_status 
  ON public."QuickBooksSyncLog" USING btree (status);
CREATE INDEX IF NOT EXISTS idx_qb_sync_log_created 
  ON public."QuickBooksSyncLog" USING btree ("createdAt");

-- =====================================
-- TABLE 82: QuickBooksWebhook
-- =====================================
CREATE TABLE IF NOT EXISTS public."QuickBooksWebhook" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "webhookId" character varying(100) NOT NULL,
  "realmId" character varying(100) NOT NULL,
  "eventNotifications" jsonb NOT NULL,
  signature character varying(255) NULL,
  processed boolean NULL DEFAULT false,
  "processedAt" timestamp without time zone NULL,
  "processingErrors" jsonb NULL DEFAULT '[]'::jsonb,
  "receivedAt" timestamp without time zone NULL DEFAULT now(),
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT QuickBooksWebhook_pkey PRIMARY KEY (id),
  CONSTRAINT QuickBooksWebhook_webhookId_key UNIQUE ("webhookId")
);

CREATE INDEX IF NOT EXISTS idx_qb_webhook_realm 
  ON public."QuickBooksWebhook" USING btree ("realmId");
CREATE INDEX IF NOT EXISTS idx_qb_webhook_processed 
  ON public."QuickBooksWebhook" USING btree (processed);

-- =====================================
-- TABLE 83: RoleHierarchy (needs user_role enum)
-- =====================================
CREATE TYPE IF NOT EXISTS public."user_role" AS ENUM ('ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER', 'CUSTOMER');

CREATE TABLE IF NOT EXISTS public."RoleHierarchy" (
  id serial NOT NULL,
  parent_role public."user_role" NOT NULL,
  child_role public."user_role" NOT NULL,
  CONSTRAINT RoleHierarchy_pkey PRIMARY KEY (id),
  CONSTRAINT RoleHierarchy_parent_role_child_role_key UNIQUE (parent_role, child_role)
);

-- =====================================
-- TABLE 84: Route
-- =====================================
CREATE TABLE IF NOT EXISTS public."Route" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "routeName" character varying(100) NOT NULL,
  "routeDate" date NOT NULL,
  "vehicleId" uuid NULL,
  "driverId" text NULL,
  "crewMembers" text[] NULL,
  status character varying(50) NOT NULL DEFAULT 'PLANNED'::character varying,
  "startTime" time without time zone NULL,
  "endTime" time without time zone NULL,
  "estimatedDuration" integer NULL,
  "actualDuration" integer NULL,
  "estimatedDistance" numeric(8, 2) NULL,
  "actualDistance" numeric(8, 2) NULL,
  "estimatedCost" numeric(10, 2) NULL,
  "actualCost" numeric(10, 2) NULL,
  notes text NULL,
  "optimizationScore" numeric(5, 2) NULL,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT Route_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_route_date_vehicle 
  ON public."Route" USING btree ("routeDate", "vehicleId");
CREATE INDEX IF NOT EXISTS idx_route_status 
  ON public."Route" USING btree (status);

-- =====================================
-- TABLE 85: RouteOptimizationSettings
-- =====================================
CREATE TABLE IF NOT EXISTS public."RouteOptimizationSettings" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "settingName" character varying(100) NOT NULL,
  "maxStopsPerRoute" integer NULL DEFAULT 8,
  "maxRouteHours" integer NULL DEFAULT 480,
  "maxRouteDistance" numeric(8, 2) NULL DEFAULT 100,
  "breakDuration" integer NULL DEFAULT 30,
  "lunchBreakDuration" integer NULL DEFAULT 60,
  "travelBufferPercent" numeric(5, 2) NULL DEFAULT 15.0,
  "trafficMultiplier" numeric(5, 2) NULL DEFAULT 1.3,
  "priorityWeighting" numeric(5, 2) NULL DEFAULT 2.0,
  "distanceWeight" numeric(5, 2) NULL DEFAULT 0.4,
  "timeWeight" numeric(5, 2) NULL DEFAULT 0.4,
  "costWeight" numeric(5, 2) NULL DEFAULT 0.2,
  "allowOvertimeRoutes" boolean NULL DEFAULT false,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT RouteOptimizationSettings_pkey PRIMARY KEY (id),
  CONSTRAINT RouteOptimizationSettings_settingName_key UNIQUE ("settingName")
);

-- =====================================
-- TABLE 86: RouteStop
-- =====================================
CREATE TABLE IF NOT EXISTS public."RouteStop" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "routeId" uuid NOT NULL,
  "jobId" text NULL,
  "stopOrder" integer NOT NULL,
  "stopType" character varying(50) NOT NULL DEFAULT 'JOB_SITE'::character varying,
  address text NOT NULL,
  latitude numeric(10, 8) NULL,
  longitude numeric(11, 8) NULL,
  "estimatedArrival" timestamp without time zone NULL,
  "actualArrival" timestamp without time zone NULL,
  "estimatedDeparture" timestamp without time zone NULL,
  "actualDeparture" timestamp without time zone NULL,
  "estimatedDuration" integer NULL,
  "actualDuration" integer NULL,
  "travelTimeFromPrevious" integer NULL,
  "distanceFromPrevious" numeric(8, 2) NULL,
  notes text NULL,
  status character varying(50) NULL DEFAULT 'PLANNED'::character varying,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT RouteStop_pkey PRIMARY KEY (id),
  CONSTRAINT RouteStop_routeId_stopOrder_key UNIQUE ("routeId", "stopOrder")
);

CREATE INDEX IF NOT EXISTS idx_route_stop_route_order 
  ON public."RouteStop" USING btree ("routeId", "stopOrder");
CREATE INDEX IF NOT EXISTS idx_route_stop_job 
  ON public."RouteStop" USING btree ("jobId");

-- =====================================
-- TABLE 88: RouteTemplate
-- =====================================
CREATE TABLE IF NOT EXISTS public."RouteTemplate" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "templateName" character varying(100) NOT NULL,
  description text NULL,
  "vehicleId" uuid NULL,
  "daysOfWeek" integer[] NULL,
  "startTime" time without time zone NULL,
  "maxDuration" integer NULL,
  "maxDistance" numeric(8, 2) NULL,
  "serviceArea" text[] NULL,
  "jobTypes" text[] NULL,
  priority integer NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT RouteTemplate_pkey PRIMARY KEY (id)
);

-- =====================================
-- TABLE 90: ServiceArea
-- =====================================
CREATE TABLE IF NOT EXISTS public."ServiceArea" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "areaName" character varying(100) NOT NULL,
  "areaCode" character varying(20) NOT NULL,
  "centerLat" numeric(10, 8) NULL,
  "centerLng" numeric(11, 8) NULL,
  radius numeric(8, 2) NULL,
  "zipCodes" text[] NULL,
  cities text[] NULL,
  "boundaryCoords" jsonb NULL,
  "defaultVehicleId" uuid NULL,
  "serviceDays" integer[] NULL,
  priority integer NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT ServiceArea_pkey PRIMARY KEY (id),
  CONSTRAINT ServiceArea_areaCode_key UNIQUE ("areaCode")
);

CREATE INDEX IF NOT EXISTS idx_service_area_codes 
  ON public."ServiceArea" USING btree ("areaCode");

-- =====================================
-- Tables 91-97
-- =====================================

-- Table 91: ServiceCall
CREATE TABLE IF NOT EXISTS public."ServiceCall" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "callNumber" character varying NULL,
  "customerId" text NULL,
  "jobId" text NULL,
  "callType" public.service_call_type NULL DEFAULT 'ROUTINE'::service_call_type,
  priority public.service_priority NULL DEFAULT 'NORMAL'::service_priority,
  status public.service_call_status NULL DEFAULT 'NEW'::service_call_status,
  title character varying NULL,
  description text NULL,
  "problemCategory" character varying NULL,
  "urgencyReason" text NULL,
  "serviceAddress" text NULL,
  "serviceCity" character varying NULL,
  "serviceState" character varying NULL,
  "serviceZip" character varying NULL,
  "serviceCountry" character varying NULL DEFAULT 'US'::character varying,
  latitude numeric NULL,
  longitude numeric NULL,
  "locationNotes" text NULL,
  "contactName" character varying NULL,
  "contactPhone" character varying NULL,
  "contactEmail" character varying NULL,
  "alternateContact" character varying NULL,
  "alternatePhone" character varying NULL,
  "requestedDate" timestamp without time zone NULL,
  "requestedTime" character varying NULL,
  "scheduledDate" timestamp without time zone NULL,
  "scheduledStartTime" time without time zone NULL,
  "scheduledEndTime" time without time zone NULL,
  "estimatedDuration" integer NULL,
  "assignedTechnicianId" text NULL,
  "assignedTeamId" uuid NULL,
  "dispatchedAt" timestamp without time zone NULL,
  "dispatchedBy" text NULL,
  "arrivedAt" timestamp without time zone NULL,
  "startedAt" timestamp without time zone NULL,
  "completedAt" timestamp without time zone NULL,
  "workDescription" text NULL,
  "partsUsed" jsonb NULL,
  "laborHours" numeric NULL,
  "customerSignature" text NULL,
  "customerNotes" text NULL,
  "technicianNotes" text NULL,
  "followUpRequired" boolean NULL DEFAULT false,
  "followUpDate" timestamp without time zone NULL,
  "followUpNotes" text NULL,
  billable boolean NULL DEFAULT true,
  "laborRate" numeric NULL,
  "materialCost" numeric NULL,
  "totalCost" numeric NULL,
  "invoiceNumber" character varying NULL,
  "billedAt" timestamp without time zone NULL,
  "paidAt" timestamp without time zone NULL,
  "callSource" character varying NULL,
  "customerSatisfaction" integer NULL,
  "qualityScore" integer NULL,
  "reviewNotes" text NULL,
  "warrantyPeriod" integer NULL,
  "warrantyExpires" timestamp without time zone NULL,
  "isWarrantyCall" boolean NULL DEFAULT false,
  "originalServiceId" uuid NULL,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  "createdBy" text NULL,
  "cancelledAt" timestamp without time zone NULL,
  "cancelledBy" text NULL,
  "cancellationReason" text NULL,
  CONSTRAINT ServiceCall_pkey PRIMARY KEY (id)
);

-- Table 92: ServiceCallAttachment
CREATE TABLE IF NOT EXISTS public."ServiceCallAttachment" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "serviceCallId" uuid NOT NULL,
  "fileId" uuid NOT NULL,
  "attachmentType" character varying(50) NULL,
  description text NULL,
  "takenBy" text NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT ServiceCallAttachment_pkey PRIMARY KEY (id)
);

-- Table 93: ServiceCallChecklist
CREATE TABLE IF NOT EXISTS public."ServiceCallChecklist" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "serviceCallId" uuid NOT NULL,
  "checklistItem" character varying(255) NOT NULL,
  completed boolean NULL DEFAULT false,
  "completedAt" timestamp without time zone NULL,
  "completedBy" text NULL,
  notes text NULL,
  "sortOrder" integer NULL DEFAULT 0,
  CONSTRAINT ServiceCallChecklist_pkey PRIMARY KEY (id)
);

-- Table 94: ServiceCallHistory
CREATE TABLE IF NOT EXISTS public."ServiceCallHistory" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "serviceCallId" uuid NOT NULL,
  "fromStatus" public.service_call_status NULL,
  "toStatus" public.service_call_status NOT NULL,
  "changedBy" text NULL,
  "changedAt" timestamp without time zone NOT NULL DEFAULT now(),
  notes text NULL,
  "automaticChange" boolean NULL DEFAULT false,
  CONSTRAINT ServiceCallHistory_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_service_history_call ON public."ServiceCallHistory" USING btree ("serviceCallId");
CREATE INDEX IF NOT EXISTS idx_service_history_date ON public."ServiceCallHistory" USING btree ("changedAt");

-- Table 95: ServiceCallMaterial
CREATE TABLE IF NOT EXISTS public."ServiceCallMaterial" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "serviceCallId" uuid NOT NULL,
  "materialId" text NOT NULL,
  quantity numeric(10, 2) NOT NULL,
  "unitCost" numeric(10, 2) NULL,
  "totalCost" numeric(10, 2) NULL,
  "usedAt" timestamp without time zone NULL DEFAULT now(),
  "recordedBy" text NULL,
  CONSTRAINT ServiceCallMaterial_pkey PRIMARY KEY (id)
);

-- Table 96: ServiceSchedule
CREATE TABLE IF NOT EXISTS public."ServiceSchedule" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "customerId" text NOT NULL,
  "templateId" uuid NULL,
  name character varying(255) NOT NULL,
  description text NULL,
  "recurrenceType" character varying(20) NOT NULL,
  "recurrenceInterval" integer NULL DEFAULT 1,
  "dayOfWeek" integer NULL,
  "dayOfMonth" integer NULL,
  "preferredTime" time without time zone NULL,
  "lastServiceDate" timestamp without time zone NULL,
  "nextServiceDate" timestamp without time zone NULL,
  "endDate" timestamp without time zone NULL,
  active boolean NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT ServiceSchedule_pkey PRIMARY KEY (id)
);

CREATE TRIGGER update_service_schedule_updated_at_trigger 
BEFORE UPDATE ON "ServiceSchedule" 
FOR EACH ROW
EXECUTE FUNCTION update_service_call_updated_at();

-- Table 97: ServiceTemplate
CREATE TABLE IF NOT EXISTS public."ServiceTemplate" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying(255) NOT NULL,
  description text NULL,
  "serviceType" public.service_call_type NOT NULL,
  "defaultPriority" public.service_priority NULL DEFAULT 'NORMAL'::service_priority,
  "estimatedDuration" integer NULL,
  "defaultChecklist" jsonb NULL,
  "requiredMaterials" jsonb NULL,
  instructions text NULL,
  active boolean NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT ServiceTemplate_pkey PRIMARY KEY (id)
);

CREATE TRIGGER update_service_template_updated_at_trigger 
BEFORE UPDATE ON "ServiceTemplate" 
FOR EACH ROW
EXECUTE FUNCTION update_service_call_updated_at();

-- Tables 98-110
-- =====================================

-- Table 98: ServiceType
CREATE TABLE IF NOT EXISTS public."ServiceType" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "serviceCode" character varying(20) NOT NULL,
  "serviceName" character varying(100) NOT NULL,
  "categoryId" uuid NULL,
  "subCategoryId" uuid NULL,
  description text NULL,
  "standardRate" numeric(10, 2) NULL,
  "estimatedDuration" numeric(8, 2) NULL,
  "requiredEquipment" text[] NULL,
  "safetyRequirements" text NULL,
  "permitRequired" boolean NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT ServiceType_pkey PRIMARY KEY (id),
  CONSTRAINT ServiceType_serviceCode_key UNIQUE ("serviceCode")
);

-- Table 99: StockMovement
CREATE TABLE IF NOT EXISTS public."StockMovement" (
  id text NOT NULL DEFAULT encode(extensions.gen_random_bytes(12), 'base64'::text),
  "materialId" text NOT NULL,
  "storageLocationId" text NULL,
  "jobId" text NULL,
  "userId" text NULL,
  type character varying(20) NOT NULL,
  "quantityBefore" numeric(10, 2) NOT NULL DEFAULT 0,
  "quantityChanged" numeric(10, 2) NOT NULL,
  "quantityAfter" numeric(10, 2) NOT NULL DEFAULT 0,
  "unitCost" numeric(10, 2) NULL,
  "totalValue" numeric(10, 2) NULL,
  reason text NULL,
  "referenceNumber" character varying(100) NULL,
  metadata jsonb NULL,
  "createdAt" timestamp with time zone NULL DEFAULT now(),
  "updatedAt" timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT StockMovement_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_stock_movement_material_id ON public."StockMovement" USING btree ("materialId");
CREATE INDEX IF NOT EXISTS idx_stock_movement_created_at ON public."StockMovement" USING btree ("createdAt");
CREATE INDEX IF NOT EXISTS idx_stock_movement_type ON public."StockMovement" USING btree (type);

-- Table 100: StorageLocation
CREATE TABLE IF NOT EXISTS public."StorageLocation" (
  id text NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  type public.LocationType NOT NULL DEFAULT 'WAREHOUSE'::"LocationType",
  address text NULL,
  description text NULL,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT StorageLocation_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "StorageLocation_name_key" ON public."StorageLocation" USING btree (name);
CREATE UNIQUE INDEX IF NOT EXISTS "StorageLocation_code_key" ON public."StorageLocation" USING btree (code);

-- Table 101: TimeEntry
CREATE TABLE IF NOT EXISTS public."TimeEntry" (
  id text NOT NULL,
  "userId" text NOT NULL,
  "jobId" text NOT NULL,
  "phaseId" text NULL,
  date timestamp without time zone NOT NULL,
  "startTime" timestamp without time zone NOT NULL,
  "endTime" timestamp without time zone NULL,
  hours double precision NOT NULL,
  description text NULL,
  "gpsLatitude" double precision NULL,
  "gpsLongitude" double precision NULL,
  synced boolean NOT NULL DEFAULT false,
  "quickbooksId" text NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  "regularRate" numeric(10, 2) NULL,
  "overtimeRate" numeric(10, 2) NULL,
  "totalCost" numeric(10, 2) NULL,
  CONSTRAINT TimeEntry_pkey PRIMARY KEY (id),
  CONSTRAINT check_hours_positive CHECK ((hours > (0)::double precision)),
  CONSTRAINT check_time_order CHECK (
    (
      ("endTime" IS NULL)
      OR ("endTime" > "startTime")
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_time_entry_job_date ON public."TimeEntry" USING btree ("jobId", "startTime");
CREATE INDEX IF NOT EXISTS idx_time_entry_user_date ON public."TimeEntry" USING btree ("userId", "startTime");

CREATE TRIGGER calculate_cost_on_time_entry 
BEFORE INSERT OR UPDATE OF hours, "regularRate", "overtimeRate" 
ON "TimeEntry" 
FOR EACH ROW
EXECUTE FUNCTION calculate_time_entry_cost();

-- Table 102: TimeEntryBreak
CREATE TABLE IF NOT EXISTS public."TimeEntryBreak" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "timeEntryId" uuid NOT NULL,
  "breakType" public.break_type NOT NULL DEFAULT 'SHORT_BREAK'::break_type,
  "startTime" timestamp without time zone NOT NULL,
  "endTime" timestamp without time zone NULL,
  "durationMinutes" integer NULL,
  "isPaid" boolean NULL DEFAULT true,
  "isDeducted" boolean NULL DEFAULT false,
  latitude numeric(10, 8) NULL,
  longitude numeric(11, 8) NULL,
  notes text NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT TimeEntryBreak_pkey PRIMARY KEY (id)
);

-- Table 103: TravelMatrix
CREATE TABLE IF NOT EXISTS public."TravelMatrix" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "fromAddress" text NOT NULL,
  "toAddress" text NOT NULL,
  "fromLat" numeric(10, 8) NULL,
  "fromLng" numeric(11, 8) NULL,
  "toLat" numeric(10, 8) NULL,
  "toLng" numeric(11, 8) NULL,
  distance numeric(8, 2) NOT NULL,
  duration integer NOT NULL,
  "durationInTraffic" integer NULL,
  "calculatedAt" timestamp without time zone NULL DEFAULT now(),
  source character varying(50) NULL DEFAULT 'GOOGLE_MAPS'::character varying,
  "vehicleType" character varying(50) NULL DEFAULT 'TRUCK'::character varying,
  CONSTRAINT TravelMatrix_pkey PRIMARY KEY (id),
  CONSTRAINT TravelMatrix_fromLat_fromLng_toLat_toLng_vehicleType_key UNIQUE (
    "fromLat",
    "fromLng",
    "toLat",
    "toLng",
    "vehicleType"
  )
);

CREATE INDEX IF NOT EXISTS idx_travel_matrix_coords ON public."TravelMatrix" USING btree ("fromLat", "fromLng", "toLat", "toLng");

-- Table 104: User
CREATE TABLE IF NOT EXISTS public."User" (
  id text NOT NULL,
  email text NOT NULL,
  name text NOT NULL,
  password text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  role public.user_role NOT NULL,
  phone character varying(50) NULL,
  CONSTRAINT User_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON public."User" USING btree (email);
CREATE INDEX IF NOT EXISTS idx_user_role ON public."User" USING btree (role);
CREATE INDEX IF NOT EXISTS idx_user_active_role ON public."User" USING btree (active, role);

CREATE TRIGGER trigger_log_role_changes
AFTER UPDATE OF role ON "User" 
FOR EACH ROW
EXECUTE FUNCTION log_role_changes();

CREATE TRIGGER update_user_updated_at 
BEFORE UPDATE ON "User" 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Table 105: UserAppearanceSettings
CREATE TABLE IF NOT EXISTS public."UserAppearanceSettings" (
  id serial NOT NULL,
  user_id text NOT NULL,
  dark_mode boolean NULL DEFAULT true,
  show_job_numbers boolean NULL DEFAULT true,
  compact_view boolean NULL DEFAULT true,
  show_tooltips boolean NULL DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT UserAppearanceSettings_pkey PRIMARY KEY (id),
  CONSTRAINT UserAppearanceSettings_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_appearance_settings_user_id ON public."UserAppearanceSettings" USING btree (user_id);

CREATE TRIGGER update_user_appearance_settings_updated_at 
BEFORE UPDATE ON "UserAppearanceSettings" 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Table 106: UserAuditLog
CREATE TABLE IF NOT EXISTS public."UserAuditLog" (
  id serial NOT NULL,
  user_id text NULL,
  performed_by text NULL,
  action text NOT NULL,
  resource text NULL,
  old_value text NULL,
  new_value text NULL,
  ip_address inet NULL,
  user_agent text NULL,
  timestamp timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata jsonb NULL,
  CONSTRAINT UserAuditLog_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public."UserAuditLog" USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON public."UserAuditLog" USING btree (performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public."UserAuditLog" USING btree (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON public."UserAuditLog" USING btree ("timestamp");
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON public."UserAuditLog" USING btree (resource);

-- Table 107: UserNotificationSettings
CREATE TABLE IF NOT EXISTS public."UserNotificationSettings" (
  id serial NOT NULL,
  user_id text NOT NULL,
  email_notifications boolean NULL DEFAULT true,
  sms_notifications boolean NULL DEFAULT false,
  new_job_assignments boolean NULL DEFAULT true,
  schedule_changes boolean NULL DEFAULT true,
  invoice_reminders boolean NULL DEFAULT true,
  material_low_stock_alerts boolean NULL DEFAULT false,
  customer_messages boolean NULL DEFAULT true,
  daily_summary boolean NULL DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT UserNotificationSettings_pkey PRIMARY KEY (id),
  CONSTRAINT UserNotificationSettings_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id ON public."UserNotificationSettings" USING btree (user_id);

CREATE TRIGGER update_user_notification_settings_updated_at 
BEFORE UPDATE ON "UserNotificationSettings" 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Table 108: UserPermissions
CREATE TABLE IF NOT EXISTS public."UserPermissions" (
  id serial NOT NULL,
  user_id text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  granted_by text NULL,
  granted_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes text NULL,
  CONSTRAINT UserPermissions_pkey PRIMARY KEY (id),
  CONSTRAINT UserPermissions_user_id_resource_action_key UNIQUE (user_id, resource, action)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public."UserPermissions" USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_resource ON public."UserPermissions" USING btree (resource);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_resource ON public."UserPermissions" USING btree (user_id, resource);

-- Table 109: UserPermissionsView (this is a view, will be added separately)

-- Table 110: UserSecuritySettings
CREATE TABLE IF NOT EXISTS public."UserSecuritySettings" (
  id serial NOT NULL,
  user_id text NOT NULL,
  two_factor_auth boolean NULL DEFAULT false,
  two_factor_secret text NULL,
  password_changed_at timestamp without time zone NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT UserSecuritySettings_pkey PRIMARY KEY (id),
  CONSTRAINT UserSecuritySettings_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_security_settings_user_id ON public."UserSecuritySettings" USING btree (user_id);

CREATE TRIGGER update_user_security_settings_updated_at 
BEFORE UPDATE ON "UserSecuritySettings" 
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Tables 111-114 (Final Tables)
-- =====================================

-- Table 111: UserSession
CREATE TABLE IF NOT EXISTS public."UserSession" (
  id text NOT NULL DEFAULT encode(extensions.gen_random_bytes(12), 'base64'::text),
  "userId" text NOT NULL,
  token character varying(255) NOT NULL,
  "ipAddress" character varying(45) NULL,
  "userAgent" text NULL,
  "lastActivity" timestamp without time zone NULL DEFAULT now(),
  "expiresAt" timestamp without time zone NOT NULL,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT UserSession_pkey PRIMARY KEY (id),
  CONSTRAINT UserSession_token_key UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_user_session_token ON public."UserSession" USING btree (token);
CREATE INDEX IF NOT EXISTS idx_user_session_user ON public."UserSession" USING btree ("userId");
CREATE INDEX IF NOT EXISTS idx_user_session_expires ON public."UserSession" USING btree ("expiresAt");

-- Table 112: Vehicle
CREATE TABLE IF NOT EXISTS public."Vehicle" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "vehicleNumber" character varying(50) NOT NULL,
  "vehicleName" character varying(100) NOT NULL,
  "vehicleType" character varying(50) NOT NULL DEFAULT 'SERVICE_TRUCK'::character varying,
  capacity integer NULL DEFAULT 2,
  "licensePlate" character varying(20) NULL,
  vin character varying(50) NULL,
  year integer NULL,
  make character varying(50) NULL,
  model character varying(50) NULL,
  "homeBaseAddress" text NULL,
  "homeBaseLat" numeric(10, 8) NULL,
  "homeBaseLng" numeric(11, 8) NULL,
  "fuelType" character varying(20) NULL DEFAULT 'GASOLINE'::character varying,
  "avgFuelConsumption" numeric(5, 2) NULL,
  "hourlyOperatingCost" numeric(8, 2) NULL,
  "mileageRate" numeric(5, 2) NULL,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT Vehicle_pkey PRIMARY KEY (id),
  CONSTRAINT Vehicle_vehicleNumber_key UNIQUE ("vehicleNumber")
);

CREATE INDEX IF NOT EXISTS idx_vehicle_active ON public."Vehicle" USING btree (active);

CREATE TRIGGER trigger_update_vehicle_timestamp 
BEFORE UPDATE ON "Vehicle" 
FOR EACH ROW
EXECUTE FUNCTION update_route_timestamp();

-- Table 113: Vendor
CREATE TABLE IF NOT EXISTS public."Vendor" (
  id text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  "contactName" text NULL,
  email text NULL,
  phone text NULL,
  address text NULL,
  "quickbooksId" text NULL,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL,
  CONSTRAINT Vendor_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS "Vendor_code_key" ON public."Vendor" USING btree (code);
CREATE UNIQUE INDEX IF NOT EXISTS "Vendor_quickbooksId_key" ON public."Vendor" USING btree ("quickbooksId");

-- Table 114: Warehouse
CREATE TABLE IF NOT EXISTS public."Warehouse" (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying(20) NOT NULL,
  name character varying(255) NOT NULL,
  description text NULL,
  "isMainWarehouse" boolean NULL DEFAULT false,
  "isActive" boolean NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT Warehouse_pkey PRIMARY KEY (id),
  CONSTRAINT Warehouse_code_key UNIQUE (code)
);

-- =====================================

-- =====================================
-- FOREIGN KEY CONSTRAINTS
-- Add after all tables are created
-- =====================================
-- These will be added after we have all table definitions
-- to avoid dependency issues

-- AssetAssignment foreign keys (commented out until dependent tables exist)
-- ALTER TABLE public."AssetAssignment" 
--   ADD CONSTRAINT AssetAssignment_assetId_fkey 
--   FOREIGN KEY ("assetId") REFERENCES "CompanyAsset" (id) ON DELETE CASCADE;

-- ALTER TABLE public."AssetAssignment" 
--   ADD CONSTRAINT AssetAssignment_userId_fkey 
--   FOREIGN KEY ("userId") REFERENCES "User" (id) ON DELETE CASCADE;

COMMIT;

-- =====================================
-- VIEWS
-- Create after all tables
-- =====================================
-- View 3: CategoryPerformanceView will be added here