-- Comprehensive Time Tracking & Payroll Integration Database Schema
-- Real-time job costing with GPS tracking, break management, and payroll integration

-- Time entry status enumeration
CREATE TYPE time_entry_status AS ENUM ('ACTIVE', 'COMPLETED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');

-- Break type enumeration
CREATE TYPE break_type AS ENUM ('LUNCH', 'SHORT_BREAK', 'PERSONAL', 'MEETING', 'TRAVEL', 'OTHER');

-- Overtime calculation methods
CREATE TYPE overtime_type AS ENUM ('DAILY_8HR', 'WEEKLY_40HR', 'DOUBLE_TIME', 'CUSTOM');

-- Pay period types
CREATE TYPE pay_period_type AS ENUM ('WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY');

-- Time tracking settings per company/user
CREATE TABLE IF NOT EXISTS "TimeTrackingSettings" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "companyId" uuid, -- For multi-company support
    
    -- Work schedule defaults
    "standardWorkHours" decimal(4, 2) DEFAULT 8.00, -- Standard daily hours
    "standardWorkWeek" decimal(4, 2) DEFAULT 40.00, -- Standard weekly hours
    "overtimeThreshold" decimal(4, 2) DEFAULT 8.00, -- Hours before overtime
    "doubleTimeThreshold" decimal(4, 2) DEFAULT 12.00, -- Hours before double time
    "overtimeCalculation" overtime_type DEFAULT 'DAILY_8HR',
    
    -- Break policies
    "enableBreakTracking" boolean DEFAULT true,
    "requireBreakApproval" boolean DEFAULT false,
    "maxUnpaidBreakMinutes" integer DEFAULT 30, -- Auto-deduct if over this
    "autoBreakDeduction" boolean DEFAULT false, -- Auto-deduct lunch
    "autoBreakMinutes" integer DEFAULT 30, -- Minutes to auto-deduct
    
    -- GPS and location tracking
    "enableGPSTracking" boolean DEFAULT true,
    "enableGeoFencing" boolean DEFAULT false,
    "geoFenceRadius" integer DEFAULT 100, -- Meters
    "requireOnSiteClockIn" boolean DEFAULT false,
    
    -- Approval workflow
    "requireTimeApproval" boolean DEFAULT true,
    "autoApprovalAfterDays" integer DEFAULT 7,
    "allowSelfEdit" boolean DEFAULT true,
    "editTimeLimit" integer DEFAULT 24, -- Hours after clock-out
    
    -- Rounding rules
    "timeRounding" integer DEFAULT 15, -- Round to nearest X minutes
    "roundingRule" varchar(20) DEFAULT 'NEAREST', -- NEAREST, UP, DOWN
    
    -- Pay periods
    "payPeriodType" pay_period_type DEFAULT 'BIWEEKLY',
    "payPeriodStartDay" integer DEFAULT 1, -- 1=Monday, 7=Sunday
    "payrollCutoffDay" integer DEFAULT 5, -- Days after period end
    
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Employee work schedules and rates
CREATE TABLE IF NOT EXISTS "EmployeeSchedule" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    
    -- Schedule details
    "effectiveDate" date NOT NULL,
    "endDate" date, -- NULL for current schedule
    "isActive" boolean DEFAULT true,
    
    -- Work week schedule (JSON: {monday: {start: "08:00", end: "17:00", break: 30}, ...})
    "weeklySchedule" jsonb NOT NULL DEFAULT '{}',
    "hoursPerWeek" decimal(5, 2) DEFAULT 40.00,
    
    -- Rate information (integrates with LaborRate table)
    "laborRateId" text REFERENCES "LaborRate"(id) ON DELETE SET NULL,
    "regularRate" decimal(10, 2) NOT NULL, -- Override rate if needed
    "overtimeRate" decimal(10, 2), -- Calculated if not set
    "doubleTimeRate" decimal(10, 2), -- Calculated if not set
    
    -- Employee classification
    "isExempt" boolean DEFAULT false, -- Exempt from overtime
    "isPieceWork" boolean DEFAULT false, -- Piece rate vs hourly
    "isContractor" boolean DEFAULT false, -- 1099 vs W2
    
    -- PTO and benefits
    "ptoAccrualRate" decimal(6, 4) DEFAULT 0, -- Hours per hour worked
    "sickTimeAccrual" decimal(6, 4) DEFAULT 0,
    "ptoBalance" decimal(8, 2) DEFAULT 0,
    "sickTimeBalance" decimal(8, 2) DEFAULT 0,
    
    notes text,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Main time entries table
CREATE TABLE IF NOT EXISTS "TimeEntry" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "employeeScheduleId" uuid REFERENCES "EmployeeSchedule"(id) ON DELETE SET NULL,
    
    -- Time tracking
    "clockInTime" timestamp NOT NULL,
    "clockOutTime" timestamp,
    "totalHours" decimal(8, 4) GENERATED ALWAYS AS (
        CASE 
            WHEN "clockOutTime" IS NOT NULL THEN 
                EXTRACT(EPOCH FROM ("clockOutTime" - "clockInTime")) / 3600.0
            ELSE NULL
        END
    ) STORED,
    "regularHours" decimal(8, 4) DEFAULT 0, -- Calculated after breaks/approval
    "overtimeHours" decimal(8, 4) DEFAULT 0,
    "doubleTimeHours" decimal(8, 4) DEFAULT 0,
    "breakMinutes" integer DEFAULT 0, -- Total break time in minutes
    
    -- Job assignment
    "jobId" text REFERENCES "Job"(id) ON DELETE SET NULL,
    "serviceCallId" uuid REFERENCES "ServiceCall"(id) ON DELETE SET NULL,
    "jobPhaseId" text REFERENCES "JobPhase"(id) ON DELETE SET NULL,
    "workDescription" text,
    
    -- Location tracking
    "clockInLatitude" decimal(10, 8),
    "clockInLongitude" decimal(11, 8),
    "clockOutLatitude" decimal(10, 8),
    "clockOutLongitude" decimal(11, 8),
    "workSiteAddress" text,
    "isOnSite" boolean GENERATED ALWAYS AS (
        CASE 
            WHEN "clockInLatitude" IS NOT NULL AND "clockInLongitude" IS NOT NULL THEN true
            ELSE false
        END
    ) STORED,
    
    -- Equipment and vehicle tracking
    "vehicleId" uuid REFERENCES "Vehicle"(id) ON DELETE SET NULL,
    "equipmentIds" uuid[], -- Array of equipment used during this time
    "mileageStart" decimal(8, 1),
    "mileageEnd" decimal(8, 1),
    "totalMileage" decimal(8, 1) GENERATED ALWAYS AS ("mileageEnd" - "mileageStart") STORED,
    
    -- Status and approval
    status time_entry_status DEFAULT 'ACTIVE',
    "isManualEntry" boolean DEFAULT false, -- Was entered manually vs clocked
    "enteredBy" text REFERENCES "User"(id) ON DELETE SET NULL, -- Who entered if manual
    "approvedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    "approvedAt" timestamp,
    "approvalNotes" text,
    
    -- Payroll integration
    "payPeriodStart" date, -- Which pay period this belongs to
    "payPeriodEnd" date,
    "isPaid" boolean DEFAULT false,
    "paidAt" timestamp,
    "payrollBatchId" uuid, -- Reference to payroll batch
    
    -- Rate information (locked when approved)
    "appliedRegularRate" decimal(10, 2),
    "appliedOvertimeRate" decimal(10, 2),
    "appliedDoubleTimeRate" decimal(10, 2),
    "regularPay" decimal(12, 2) GENERATED ALWAYS AS ("regularHours" * "appliedRegularRate") STORED,
    "overtimePay" decimal(12, 2) GENERATED ALWAYS AS ("overtimeHours" * "appliedOvertimeRate") STORED,
    "doubleTimePay" decimal(12, 2) GENERATED ALWAYS AS ("doubleTimeHours" * "appliedDoubleTimeRate") STORED,
    "totalPay" decimal(12, 2) GENERATED ALWAYS AS (
        COALESCE("regularPay", 0) + COALESCE("overtimePay", 0) + COALESCE("doubleTimePay", 0)
    ) STORED,
    
    notes text,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Break tracking during time entries
CREATE TABLE IF NOT EXISTS "TimeEntryBreak" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "timeEntryId" uuid NOT NULL REFERENCES "TimeEntry"(id) ON DELETE CASCADE,
    
    -- Break details
    "breakType" break_type NOT NULL DEFAULT 'SHORT_BREAK',
    "startTime" timestamp NOT NULL,
    "endTime" timestamp,
    "durationMinutes" integer GENERATED ALWAYS AS (
        CASE 
            WHEN "endTime" IS NOT NULL THEN 
                EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60
            ELSE NULL
        END
    ) STORED,
    
    -- Break policies
    "isPaid" boolean DEFAULT true,
    "isDeducted" boolean DEFAULT false, -- Whether deducted from total hours
    "isApproved" boolean DEFAULT true,
    
    -- Location (for break compliance)
    latitude decimal(10, 8),
    longitude decimal(11, 8),
    
    notes text,
    "createdAt" timestamp NOT NULL DEFAULT NOW()
);

-- Real-time job costing integration
CREATE TABLE IF NOT EXISTS "JobLaborActual" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "jobId" text NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
    "jobPhaseId" text REFERENCES "JobPhase"(id) ON DELETE CASCADE,
    "timeEntryId" uuid NOT NULL REFERENCES "TimeEntry"(id) ON DELETE CASCADE,
    "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    
    -- Actual vs estimated tracking
    "actualHours" decimal(8, 4) NOT NULL,
    "actualCost" decimal(12, 2) NOT NULL,
    "burdenedCost" decimal(12, 2), -- Including overhead/benefits
    "billableHours" decimal(8, 4), -- Hours that can be billed to customer
    "billableRate" decimal(10, 2), -- Rate to bill customer
    "billableAmount" decimal(12, 2) GENERATED ALWAYS AS ("billableHours" * "billableRate") STORED,
    
    -- Cost center allocation
    "costCategoryId" uuid REFERENCES "JobCategory"(id) ON DELETE SET NULL,
    "workType" varchar(100), -- Installation, Maintenance, Troubleshooting, etc.
    "skillLevel" varchar(50), -- Apprentice, Journeyman, Master, Foreman
    
    -- Productivity metrics
    "taskDescription" text,
    "unitsCompleted" decimal(10, 2), -- For productivity tracking
    "unitType" varchar(50), -- outlets, fixtures, feet, etc.
    "productivityRate" decimal(10, 4) GENERATED ALWAYS AS (
        CASE 
            WHEN "actualHours" > 0 AND "unitsCompleted" > 0 THEN 
                "unitsCompleted" / "actualHours"
            ELSE NULL
        END
    ) STORED,
    
    "dateWorked" date NOT NULL,
    "createdAt" timestamp NOT NULL DEFAULT NOW()
);

-- Equipment time tracking integration
CREATE TABLE IF NOT EXISTS "EquipmentTimeEntry" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "timeEntryId" uuid NOT NULL REFERENCES "TimeEntry"(id) ON DELETE CASCADE,
    "equipmentId" uuid NOT NULL REFERENCES "CompanyAsset"(id) ON DELETE CASCADE,
    "jobId" text REFERENCES "Job"(id) ON DELETE SET NULL,
    
    -- Usage tracking
    "startTime" timestamp NOT NULL,
    "endTime" timestamp,
    "totalHours" decimal(8, 4) GENERATED ALWAYS AS (
        CASE 
            WHEN "endTime" IS NOT NULL THEN 
                EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 3600.0
            ELSE NULL
        END
    ) STORED,
    
    -- Billing information
    "billableHours" decimal(8, 4),
    "billableRate" decimal(10, 2),
    "billingAmount" decimal(12, 2) GENERATED ALWAYS AS ("billableHours" * "billableRate") STORED,
    
    -- Equipment specific
    "meterStart" decimal(10, 2), -- Hours, miles, etc.
    "meterEnd" decimal(10, 2),
    "meterUsage" decimal(10, 2) GENERATED ALWAYS AS ("meterEnd" - "meterStart") STORED,
    "fuelUsed" decimal(8, 2), -- Gallons
    "fuelCost" decimal(8, 2),
    
    -- Location and work details
    "workDescription" text,
    "operatorNotes" text,
    
    "createdAt" timestamp NOT NULL DEFAULT NOW()
);

-- Time tracking GPS trail for detailed tracking
CREATE TABLE IF NOT EXISTS "TimeEntryGPSTrail" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "timeEntryId" uuid NOT NULL REFERENCES "TimeEntry"(id) ON DELETE CASCADE,
    
    -- Location data
    latitude decimal(10, 8) NOT NULL,
    longitude decimal(11, 8) NOT NULL,
    accuracy decimal(8, 2), -- GPS accuracy in meters
    altitude decimal(8, 2),
    speed decimal(8, 2), -- Speed in mph
    
    -- Context
    "activityType" varchar(50), -- WORKING, TRAVELING, ON_BREAK, etc.
    "batteryLevel" integer, -- Device battery level
    "signalStrength" integer, -- GPS signal strength
    
    "recordedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Payroll periods and batch processing
CREATE TABLE IF NOT EXISTS "PayrollPeriod" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Period definition
    "periodStart" date NOT NULL,
    "periodEnd" date NOT NULL,
    "payDate" date NOT NULL,
    "cutoffDate" date NOT NULL, -- Last day to submit time
    
    -- Status
    "isOpen" boolean DEFAULT true,
    "isProcessed" boolean DEFAULT false,
    "isApproved" boolean DEFAULT false,
    "isPaid" boolean DEFAULT false,
    
    -- Summary data
    "totalEmployees" integer DEFAULT 0,
    "totalHours" decimal(12, 4) DEFAULT 0,
    "totalRegularPay" decimal(15, 2) DEFAULT 0,
    "totalOvertimePay" decimal(15, 2) DEFAULT 0,
    "totalGrossPay" decimal(15, 2) DEFAULT 0,
    "totalTaxes" decimal(15, 2) DEFAULT 0,
    "totalNetPay" decimal(15, 2) DEFAULT 0,
    
    -- Processing info
    "processedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    "processedAt" timestamp,
    "approvedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    "approvedAt" timestamp,
    
    notes text,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Employee payroll summary per period
CREATE TABLE IF NOT EXISTS "EmployeePayroll" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "payrollPeriodId" uuid NOT NULL REFERENCES "PayrollPeriod"(id) ON DELETE CASCADE,
    "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    "employeeScheduleId" uuid REFERENCES "EmployeeSchedule"(id) ON DELETE SET NULL,
    
    -- Time summary
    "totalHours" decimal(10, 4) NOT NULL DEFAULT 0,
    "regularHours" decimal(10, 4) NOT NULL DEFAULT 0,
    "overtimeHours" decimal(10, 4) NOT NULL DEFAULT 0,
    "doubleTimeHours" decimal(10, 4) NOT NULL DEFAULT 0,
    "ptoHours" decimal(10, 4) NOT NULL DEFAULT 0,
    "sickHours" decimal(10, 4) NOT NULL DEFAULT 0,
    "holidayHours" decimal(10, 4) NOT NULL DEFAULT 0,
    
    -- Pay calculations
    "regularRate" decimal(10, 2) NOT NULL,
    "overtimeRate" decimal(10, 2) NOT NULL,
    "doubleTimeRate" decimal(10, 2) NOT NULL,
    "regularPay" decimal(12, 2) NOT NULL DEFAULT 0,
    "overtimePay" decimal(12, 2) NOT NULL DEFAULT 0,
    "doubleTimePay" decimal(12, 2) NOT NULL DEFAULT 0,
    "ptoPay" decimal(12, 2) NOT NULL DEFAULT 0,
    "sickPay" decimal(12, 2) NOT NULL DEFAULT 0,
    "holidayPay" decimal(12, 2) NOT NULL DEFAULT 0,
    "bonusPay" decimal(12, 2) NOT NULL DEFAULT 0,
    "grossPay" decimal(12, 2) GENERATED ALWAYS AS (
        "regularPay" + "overtimePay" + "doubleTimePay" + "ptoPay" + "sickPay" + "holidayPay" + "bonusPay"
    ) STORED,
    
    -- Deductions (basic - integrate with payroll provider for full)
    "federalTax" decimal(12, 2) DEFAULT 0,
    "stateTax" decimal(12, 2) DEFAULT 0,
    "socialSecurity" decimal(12, 2) DEFAULT 0,
    "medicare" decimal(12, 2) DEFAULT 0,
    "otherDeductions" decimal(12, 2) DEFAULT 0,
    "totalDeductions" decimal(12, 2) GENERATED ALWAYS AS (
        COALESCE("federalTax", 0) + COALESCE("stateTax", 0) + COALESCE("socialSecurity", 0) + 
        COALESCE("medicare", 0) + COALESCE("otherDeductions", 0)
    ) STORED,
    "netPay" decimal(12, 2) GENERATED ALWAYS AS ("grossPay" - "totalDeductions") STORED,
    
    -- Job cost allocation (how much labor was billed to jobs)
    "jobCostAllocated" decimal(12, 2) DEFAULT 0,
    "overheadAllocated" decimal(12, 2) DEFAULT 0,
    
    -- Export tracking
    "exportedToPayroll" boolean DEFAULT false,
    "exportedAt" timestamp,
    "payrollReference" varchar(100), -- External payroll system reference
    
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW(),
    
    UNIQUE("payrollPeriodId", "userId")
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_time_entry_user_date ON "TimeEntry"("userId", "clockInTime");
CREATE INDEX IF NOT EXISTS idx_time_entry_job ON "TimeEntry"("jobId", "clockInTime");
CREATE INDEX IF NOT EXISTS idx_time_entry_status ON "TimeEntry"(status, "clockInTime");
CREATE INDEX IF NOT EXISTS idx_time_entry_pay_period ON "TimeEntry"("payPeriodStart", "payPeriodEnd");
CREATE INDEX IF NOT EXISTS idx_time_entry_active ON "TimeEntry"("userId") WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_employee_schedule_user ON "EmployeeSchedule"("userId", "effectiveDate");
CREATE INDEX IF NOT EXISTS idx_employee_schedule_active ON "EmployeeSchedule"("userId") WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS idx_job_labor_actual_job ON "JobLaborActual"("jobId", "dateWorked");
CREATE INDEX IF NOT EXISTS idx_job_labor_actual_user ON "JobLaborActual"("userId", "dateWorked");

CREATE INDEX IF NOT EXISTS idx_equipment_time_entry ON "EquipmentTimeEntry"("equipmentId", "startTime");
CREATE INDEX IF NOT EXISTS idx_equipment_time_job ON "EquipmentTimeEntry"("jobId", "startTime");

CREATE INDEX IF NOT EXISTS idx_gps_trail_time_entry ON "TimeEntryGPSTrail"("timeEntryId", "recordedAt");

CREATE INDEX IF NOT EXISTS idx_payroll_period_dates ON "PayrollPeriod"("periodStart", "periodEnd");
CREATE INDEX IF NOT EXISTS idx_employee_payroll_period ON "EmployeePayroll"("payrollPeriodId", "userId");

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_time_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_time_tracking_settings_updated_at_trigger
    BEFORE UPDATE ON "TimeTrackingSettings"
    FOR EACH ROW
    EXECUTE FUNCTION update_time_tracking_updated_at();

CREATE TRIGGER update_employee_schedule_updated_at_trigger
    BEFORE UPDATE ON "EmployeeSchedule"
    FOR EACH ROW
    EXECUTE FUNCTION update_time_tracking_updated_at();

CREATE TRIGGER update_time_entry_updated_at_trigger
    BEFORE UPDATE ON "TimeEntry"
    FOR EACH ROW
    EXECUTE FUNCTION update_time_tracking_updated_at();

CREATE TRIGGER update_payroll_period_updated_at_trigger
    BEFORE UPDATE ON "PayrollPeriod"
    FOR EACH ROW
    EXECUTE FUNCTION update_time_tracking_updated_at();

CREATE TRIGGER update_employee_payroll_updated_at_trigger
    BEFORE UPDATE ON "EmployeePayroll"
    FOR EACH ROW
    EXECUTE FUNCTION update_time_tracking_updated_at();

-- Function to automatically calculate overtime
CREATE OR REPLACE FUNCTION calculate_overtime_hours()
RETURNS TRIGGER AS $$
DECLARE
    settings_record RECORD;
    daily_hours decimal(8,4);
    weekly_hours decimal(8,4);
    total_minutes integer;
    break_minutes integer;
    net_hours decimal(8,4);
BEGIN
    -- Only process if clock out time is set and entry is completed
    IF NEW."clockOutTime" IS NULL OR NEW.status NOT IN ('COMPLETED', 'SUBMITTED') THEN
        RETURN NEW;
    END IF;
    
    -- Get time tracking settings
    SELECT * INTO settings_record FROM "TimeTrackingSettings" LIMIT 1;
    
    -- Calculate total break minutes
    SELECT COALESCE(SUM("durationMinutes"), 0) INTO break_minutes
    FROM "TimeEntryBreak"
    WHERE "timeEntryId" = NEW.id AND "isDeducted" = true;
    
    -- Calculate net working hours (total time minus breaks)
    total_minutes := EXTRACT(EPOCH FROM (NEW."clockOutTime" - NEW."clockInTime")) / 60;
    net_hours := (total_minutes - break_minutes) / 60.0;
    
    -- Apply time rounding if configured
    IF settings_record."timeRounding" > 0 THEN
        IF settings_record."roundingRule" = 'UP' THEN
            net_hours := CEIL(net_hours * (60.0 / settings_record."timeRounding")) / (60.0 / settings_record."timeRounding");
        ELSIF settings_record."roundingRule" = 'DOWN' THEN
            net_hours := FLOOR(net_hours * (60.0 / settings_record."timeRounding")) / (60.0 / settings_record."timeRounding");
        ELSE -- NEAREST
            net_hours := ROUND(net_hours * (60.0 / settings_record."timeRounding")) / (60.0 / settings_record."timeRounding");
        END IF;
    END IF;
    
    -- Calculate regular, overtime, and double time hours
    IF settings_record."overtimeCalculation" = 'DAILY_8HR' THEN
        -- Daily overtime calculation
        IF net_hours <= settings_record."overtimeThreshold" THEN
            NEW."regularHours" := net_hours;
            NEW."overtimeHours" := 0;
            NEW."doubleTimeHours" := 0;
        ELSIF net_hours <= settings_record."doubleTimeThreshold" THEN
            NEW."regularHours" := settings_record."overtimeThreshold";
            NEW."overtimeHours" := net_hours - settings_record."overtimeThreshold";
            NEW."doubleTimeHours" := 0;
        ELSE
            NEW."regularHours" := settings_record."overtimeThreshold";
            NEW."overtimeHours" := settings_record."doubleTimeThreshold" - settings_record."overtimeThreshold";
            NEW."doubleTimeHours" := net_hours - settings_record."doubleTimeThreshold";
        END IF;
    ELSE
        -- For now, just weekly - would need more complex logic for actual weekly OT
        NEW."regularHours" := LEAST(net_hours, settings_record."overtimeThreshold");
        NEW."overtimeHours" := GREATEST(0, net_hours - settings_record."overtimeThreshold");
        NEW."doubleTimeHours" := 0;
    END IF;
    
    -- Update break minutes
    NEW."breakMinutes" := break_minutes;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_overtime_hours_trigger
    BEFORE UPDATE ON "TimeEntry"
    FOR EACH ROW
    WHEN (OLD."clockOutTime" IS DISTINCT FROM NEW."clockOutTime" OR OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION calculate_overtime_hours();

-- Function to create job labor actual records
CREATE OR REPLACE FUNCTION create_job_labor_actual()
RETURNS TRIGGER AS $$
DECLARE
    schedule_record RECORD;
    burdened_cost decimal(12,2);
BEGIN
    -- Only create when time entry is completed/approved and has a job
    IF NEW.status NOT IN ('COMPLETED', 'SUBMITTED', 'APPROVED') OR NEW."jobId" IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get employee schedule for rate information
    SELECT * INTO schedule_record 
    FROM "EmployeeSchedule" 
    WHERE "userId" = NEW."userId" 
    AND "isActive" = true 
    AND "effectiveDate" <= NEW."clockInTime"::date
    ORDER BY "effectiveDate" DESC 
    LIMIT 1;
    
    -- Calculate burdened cost (add 30% for benefits/overhead as default)
    burdened_cost := NEW."totalPay" * 1.30;
    
    -- Insert or update job labor actual record
    INSERT INTO "JobLaborActual" (
        "jobId", "jobPhaseId", "timeEntryId", "userId",
        "actualHours", "actualCost", "burdenedCost",
        "billableHours", "billableRate",
        "skillLevel", "dateWorked"
    ) VALUES (
        NEW."jobId", NEW."jobPhaseId", NEW.id, NEW."userId",
        NEW."regularHours" + NEW."overtimeHours" + NEW."doubleTimeHours",
        NEW."totalPay", burdened_cost,
        NEW."regularHours" + NEW."overtimeHours" + NEW."doubleTimeHours", -- Default billable = actual
        COALESCE(schedule_record."regularRate", NEW."appliedRegularRate", 0) * 1.5, -- Default markup
        CASE 
            WHEN schedule_record."regularRate" >= 35 THEN 'Master'
            WHEN schedule_record."regularRate" >= 25 THEN 'Journeyman'
            ELSE 'Apprentice'
        END,
        NEW."clockInTime"::date
    )
    ON CONFLICT ("timeEntryId") DO UPDATE SET
        "actualHours" = EXCLUDED."actualHours",
        "actualCost" = EXCLUDED."actualCost",
        "burdenedCost" = EXCLUDED."burdenedCost",
        "billableHours" = EXCLUDED."billableHours";
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_job_labor_actual_trigger
    AFTER UPDATE ON "TimeEntry"
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('COMPLETED', 'SUBMITTED', 'APPROVED'))
    EXECUTE FUNCTION create_job_labor_actual();

-- Insert default time tracking settings
INSERT INTO "TimeTrackingSettings" DEFAULT VALUES
ON CONFLICT DO NOTHING;