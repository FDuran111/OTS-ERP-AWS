-- Supabase Public Schema Recreation for RDS - Part 2
-- Tables 32-43
-- Generated: 2025-09-03

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
-- TABLE 35: Invoice
-- =====================================
-- Note: Requires InvoiceStatus enum type
CREATE TYPE IF NOT EXISTS public."InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

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
-- TABLE 38: Job
-- =====================================
-- Note: Requires JobType and JobStatus enum types
CREATE TYPE IF NOT EXISTS public."JobType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'SERVICE', 'MAINTENANCE', 'EMERGENCY');
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