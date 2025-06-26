-- Service Call Management System Database Schema
-- Handles emergency and routine service calls with complete workflow

-- Service Call Priority enumeration
CREATE TYPE service_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY');

-- Service Call Status enumeration
CREATE TYPE service_call_status AS ENUM ('NEW', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BILLED');

-- Service Call Type enumeration
CREATE TYPE service_call_type AS ENUM ('EMERGENCY', 'ROUTINE', 'SCHEDULED', 'CALLBACK', 'WARRANTY', 'MAINTENANCE');

-- Main service calls table
CREATE TABLE IF NOT EXISTS "ServiceCall" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "callNumber" varchar(20) UNIQUE NOT NULL,
    "customerId" text NOT NULL REFERENCES "Customer"(id) ON DELETE RESTRICT,
    "jobId" text REFERENCES "Job"(id) ON DELETE SET NULL, -- Link to job if converted
    
    -- Call details
    "callType" service_call_type NOT NULL DEFAULT 'ROUTINE',
    "priority" service_priority NOT NULL DEFAULT 'NORMAL',
    "status" service_call_status NOT NULL DEFAULT 'NEW',
    
    -- Problem description
    title varchar(255) NOT NULL,
    description text,
    "problemCategory" varchar(100), -- Electrical, Plumbing, HVAC, etc.
    "urgencyReason" text, -- Why this is urgent/emergency
    
    -- Location information
    "serviceAddress" text,
    "serviceCity" varchar(100),
    "serviceState" varchar(50),
    "serviceZip" varchar(20),
    "serviceCountry" varchar(50) DEFAULT 'US',
    latitude decimal(10, 8),
    longitude decimal(11, 8),
    "locationNotes" text, -- Access instructions, gate codes, etc.
    
    -- Contact information
    "contactName" varchar(255),
    "contactPhone" varchar(20),
    "contactEmail" varchar(255),
    "alternateContact" varchar(255),
    "alternatePhone" varchar(20),
    
    -- Scheduling
    "requestedDate" timestamp,
    "requestedTime" varchar(20), -- Preferred time slot
    "scheduledDate" timestamp,
    "scheduledStartTime" time,
    "scheduledEndTime" time,
    "estimatedDuration" integer, -- Minutes
    
    -- Assignment
    "assignedTechnicianId" text REFERENCES "User"(id) ON DELETE SET NULL,
    "assignedTeamId" uuid, -- Reference to team/crew
    "dispatchedAt" timestamp,
    "dispatchedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    
    -- Service execution
    "arrivedAt" timestamp,
    "startedAt" timestamp,
    "completedAt" timestamp,
    "workDescription" text, -- What was actually done
    "partsUsed" jsonb, -- Array of parts/materials used
    "laborHours" decimal(5, 2),
    
    -- Customer interaction
    "customerSignature" text, -- Base64 signature
    "customerNotes" text,
    "technicianNotes" text,
    "followUpRequired" boolean DEFAULT false,
    "followUpDate" timestamp,
    "followUpNotes" text,
    
    -- Billing and costs
    "billable" boolean DEFAULT true,
    "laborRate" decimal(10, 2),
    "materialCost" decimal(10, 2),
    "totalCost" decimal(10, 2),
    "invoiceNumber" varchar(50),
    "billedAt" timestamp,
    "paidAt" timestamp,
    
    -- Service call source and quality
    "callSource" varchar(50), -- Phone, Online, Mobile App, Referral
    "customerSatisfaction" integer CHECK ("customerSatisfaction" BETWEEN 1 AND 5),
    "qualityScore" integer CHECK ("qualityScore" BETWEEN 1 AND 10),
    "reviewNotes" text,
    
    -- Warranty and callback tracking
    "warrantyPeriod" integer, -- Days
    "warrantyExpires" timestamp,
    "isWarrantyCall" boolean DEFAULT false,
    "originalServiceId" uuid REFERENCES "ServiceCall"(id) ON DELETE SET NULL,
    
    -- Metadata
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW(),
    "createdBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    "cancelledAt" timestamp,
    "cancelledBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    "cancellationReason" text
);

-- Service call history for status tracking
CREATE TABLE IF NOT EXISTS "ServiceCallHistory" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "serviceCallId" uuid NOT NULL REFERENCES "ServiceCall"(id) ON DELETE CASCADE,
    "fromStatus" service_call_status,
    "toStatus" service_call_status NOT NULL,
    "changedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    "changedAt" timestamp NOT NULL DEFAULT NOW(),
    notes text,
    "automaticChange" boolean DEFAULT false
);

-- Service call attachments (photos, documents)
CREATE TABLE IF NOT EXISTS "ServiceCallAttachment" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "serviceCallId" uuid NOT NULL REFERENCES "ServiceCall"(id) ON DELETE CASCADE,
    "fileId" uuid NOT NULL REFERENCES "FileAttachment"(id) ON DELETE CASCADE,
    "attachmentType" varchar(50), -- before_photo, after_photo, document, signature
    description text,
    "takenBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    "createdAt" timestamp NOT NULL DEFAULT NOW()
);

-- Service call checklist items
CREATE TABLE IF NOT EXISTS "ServiceCallChecklist" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "serviceCallId" uuid NOT NULL REFERENCES "ServiceCall"(id) ON DELETE CASCADE,
    "checklistItem" varchar(255) NOT NULL,
    completed boolean DEFAULT false,
    "completedAt" timestamp,
    "completedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    notes text,
    "sortOrder" integer DEFAULT 0
);

-- Service call equipment/materials used
CREATE TABLE IF NOT EXISTS "ServiceCallMaterial" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "serviceCallId" uuid NOT NULL REFERENCES "ServiceCall"(id) ON DELETE CASCADE,
    "materialId" text NOT NULL REFERENCES "Material"(id) ON DELETE RESTRICT,
    quantity decimal(10, 2) NOT NULL,
    "unitCost" decimal(10, 2),
    "totalCost" decimal(10, 2),
    "usedAt" timestamp DEFAULT NOW(),
    "recordedBy" text REFERENCES "User"(id) ON DELETE SET NULL
);

-- Service templates for common service types
CREATE TABLE IF NOT EXISTS "ServiceTemplate" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255) NOT NULL,
    description text,
    "serviceType" service_call_type NOT NULL,
    "defaultPriority" service_priority DEFAULT 'NORMAL',
    "estimatedDuration" integer, -- Minutes
    "defaultChecklist" jsonb, -- Array of checklist items
    "requiredMaterials" jsonb, -- Array of common materials
    "instructions" text,
    active boolean DEFAULT true,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Service areas and coverage zones
CREATE TABLE IF NOT EXISTS "ServiceArea" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(255) NOT NULL,
    description text,
    "coverageZone" polygon, -- Geographic area
    "zipCodes" text[], -- Array of covered zip codes
    "primaryTechnicianId" text REFERENCES "User"(id) ON DELETE SET NULL,
    "backupTechnicianId" text REFERENCES "User"(id) ON DELETE SET NULL,
    "maxTravelTime" integer, -- Maximum travel time in minutes
    "serviceRate" decimal(10, 2), -- Special rate for this area
    active boolean DEFAULT true,
    "createdAt" timestamp NOT NULL DEFAULT NOW()
);

-- Service call recurring schedules
CREATE TABLE IF NOT EXISTS "ServiceSchedule" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "customerId" text NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
    "templateId" uuid REFERENCES "ServiceTemplate"(id) ON DELETE SET NULL,
    name varchar(255) NOT NULL,
    description text,
    "recurrenceType" varchar(20) NOT NULL, -- weekly, monthly, quarterly, annually
    "recurrenceInterval" integer DEFAULT 1, -- Every X weeks/months/etc
    "dayOfWeek" integer, -- 0-6 for weekly
    "dayOfMonth" integer, -- 1-31 for monthly
    "preferredTime" time,
    "lastServiceDate" timestamp,
    "nextServiceDate" timestamp,
    "endDate" timestamp,
    active boolean DEFAULT true,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_call_status ON "ServiceCall"("status");
CREATE INDEX IF NOT EXISTS idx_service_call_priority ON "ServiceCall"("priority");
CREATE INDEX IF NOT EXISTS idx_service_call_customer ON "ServiceCall"("customerId");
CREATE INDEX IF NOT EXISTS idx_service_call_technician ON "ServiceCall"("assignedTechnicianId");
CREATE INDEX IF NOT EXISTS idx_service_call_scheduled_date ON "ServiceCall"("scheduledDate");
CREATE INDEX IF NOT EXISTS idx_service_call_created_at ON "ServiceCall"("createdAt");
-- Spatial index requires PostGIS extension for proper geographic indexing
-- CREATE INDEX IF NOT EXISTS idx_service_call_location ON "ServiceCall" USING GIST(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_service_call_lat ON "ServiceCall"(latitude);
CREATE INDEX IF NOT EXISTS idx_service_call_lng ON "ServiceCall"(longitude);
CREATE INDEX IF NOT EXISTS idx_service_call_number ON "ServiceCall"("callNumber");

-- History tracking
CREATE INDEX IF NOT EXISTS idx_service_history_call ON "ServiceCallHistory"("serviceCallId");
CREATE INDEX IF NOT EXISTS idx_service_history_date ON "ServiceCallHistory"("changedAt");

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_service_call_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_call_updated_at_trigger
    BEFORE UPDATE ON "ServiceCall"
    FOR EACH ROW
    EXECUTE FUNCTION update_service_call_updated_at();

CREATE TRIGGER update_service_template_updated_at_trigger
    BEFORE UPDATE ON "ServiceTemplate"
    FOR EACH ROW
    EXECUTE FUNCTION update_service_call_updated_at();

CREATE TRIGGER update_service_schedule_updated_at_trigger
    BEFORE UPDATE ON "ServiceSchedule"
    FOR EACH ROW
    EXECUTE FUNCTION update_service_call_updated_at();

-- Function to generate service call numbers
CREATE OR REPLACE FUNCTION generate_service_call_number()
RETURNS varchar(20) AS $$
DECLARE
    prefix varchar(3) := 'SC';
    year_suffix varchar(2) := to_char(CURRENT_DATE, 'YY');
    sequence_num integer;
    new_number varchar(20);
BEGIN
    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING("callNumber" FROM 6) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM "ServiceCall"
    WHERE "callNumber" LIKE prefix || year_suffix || '%';
    
    -- Format as SC24-0001
    new_number := prefix || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate service call numbers
CREATE OR REPLACE FUNCTION set_service_call_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."callNumber" IS NULL OR NEW."callNumber" = '' THEN
        NEW."callNumber" := generate_service_call_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_service_call_number_trigger
    BEFORE INSERT ON "ServiceCall"
    FOR EACH ROW
    EXECUTE FUNCTION set_service_call_number();

-- Function to automatically create status history
CREATE OR REPLACE FUNCTION create_service_call_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history if status actually changed
    IF TG_OP = 'UPDATE' AND OLD."status" != NEW."status" THEN
        INSERT INTO "ServiceCallHistory" ("serviceCallId", "fromStatus", "toStatus", "changedAt", "automaticChange")
        VALUES (NEW.id, OLD."status", NEW."status", NOW(), true);
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO "ServiceCallHistory" ("serviceCallId", "fromStatus", "toStatus", "changedAt", "automaticChange")
        VALUES (NEW.id, NULL, NEW."status", NOW(), true);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_service_call_history_trigger
    AFTER INSERT OR UPDATE ON "ServiceCall"
    FOR EACH ROW
    EXECUTE FUNCTION create_service_call_history();