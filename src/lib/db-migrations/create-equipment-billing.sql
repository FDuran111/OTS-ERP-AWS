-- Equipment Billing System
-- Specialized billing for equipment like bucket trucks with time tracking

-- Equipment Rate Structure - Different from Company Assets (for billing purposes)
CREATE TABLE IF NOT EXISTS "EquipmentRate" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "equipmentType" varchar(100) NOT NULL, -- BUCKET_TRUCK, CRANE, GENERATOR, etc.
  "equipmentClass" varchar(50) NOT NULL, -- SIZE_35FT, SIZE_45FT, SIZE_60FT, STANDARD, HEAVY_DUTY
  "rateName" varchar(200) NOT NULL,
  "description" text,
  
  -- Billing rates
  "hourlyRate" decimal(10,2) NOT NULL,
  "halfDayRate" decimal(10,2), -- 4 hours
  "fullDayRate" decimal(10,2), -- 8 hours
  "weeklyRate" decimal(10,2), -- 40 hours
  "monthlyRate" decimal(10,2), -- 160 hours
  
  -- Minimum billing requirements
  "minimumBillableHours" decimal(4,2) DEFAULT 1.0,
  "roundingIncrement" decimal(4,2) DEFAULT 0.25, -- Round to nearest 15 minutes
  
  -- Travel and setup
  "travelTimeRate" decimal(10,2), -- Rate for travel time
  "setupTimeRate" decimal(10,2), -- Rate for setup/breakdown
  "minimumTravelTime" decimal(4,2) DEFAULT 0.5, -- Minimum 30 min travel
  
  -- Special rates
  "overtimeMultiplier" decimal(4,2) DEFAULT 1.5, -- After 8 hours
  "weekendMultiplier" decimal(4,2) DEFAULT 1.25,
  "holidayMultiplier" decimal(4,2) DEFAULT 2.0,
  "emergencyMultiplier" decimal(4,2) DEFAULT 2.5,
  
  -- Operator requirements
  "requiresOperator" boolean DEFAULT true,
  "operatorIncluded" boolean DEFAULT false,
  "operatorRate" decimal(10,2), -- Additional operator cost if not included
  
  "effectiveDate" date NOT NULL DEFAULT CURRENT_DATE,
  "expiryDate" date,
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Equipment Usage Tracking - Real-time tracking of equipment usage
CREATE TABLE IF NOT EXISTS "EquipmentUsage" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  "equipmentRateId" uuid NOT NULL REFERENCES "EquipmentRate"(id),
  "assetId" uuid REFERENCES "CompanyAsset"(id), -- Link to actual asset if available
  
  -- Usage details
  "equipmentName" varchar(255) NOT NULL,
  "equipmentType" varchar(100) NOT NULL,
  "operatorId" text REFERENCES "User"(id),
  "usageDate" date NOT NULL,
  
  -- Time tracking
  "startTime" time NOT NULL,
  "endTime" time,
  "totalHours" decimal(8,2),
  "billableHours" decimal(8,2), -- After rounding and minimums
  
  -- Time categories
  "workingHours" decimal(8,2) DEFAULT 0, -- Actual productive work
  "travelHours" decimal(8,2) DEFAULT 0,  -- Travel to/from job
  "setupHours" decimal(8,2) DEFAULT 0,   -- Setup and breakdown
  "idleHours" decimal(8,2) DEFAULT 0,    -- Waiting/downtime
  
  -- Rate information
  "hourlyRate" decimal(10,2) NOT NULL,
  "travelRate" decimal(10,2),
  "setupRate" decimal(10,2),
  "appliedMultiplier" decimal(4,2) DEFAULT 1.0, -- overtime, weekend, etc.
  
  -- Costs
  "baseCost" decimal(12,2) DEFAULT 0,
  "travelCost" decimal(12,2) DEFAULT 0,
  "setupCost" decimal(12,2) DEFAULT 0,
  "operatorCost" decimal(12,2) DEFAULT 0,
  "totalCost" decimal(12,2) NOT NULL,
  
  -- Status and notes
  "status" varchar(30) DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, COMPLETED, BILLED
  "notes" text,
  "mileage" decimal(8,2), -- For travel tracking
  "fuelUsed" decimal(8,2), -- Fuel consumption
  
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Equipment Time Logs - Detailed time tracking entries
CREATE TABLE IF NOT EXISTS "EquipmentTimeLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "usageId" uuid NOT NULL REFERENCES "EquipmentUsage"(id) ON DELETE CASCADE,
  
  -- Time entry details
  "startTime" timestamp NOT NULL,
  "endTime" timestamp,
  "duration" decimal(8,2), -- Hours
  "activity" varchar(100) NOT NULL, -- WORKING, TRAVEL, SETUP, BREAK, MAINTENANCE
  "description" text,
  
  -- Location tracking
  "startLocation" varchar(255),
  "endLocation" varchar(255),
  "gpsCoordinates" varchar(100), -- lat,lng for start location
  
  -- Billing classification
  "billable" boolean DEFAULT true,
  "rateType" varchar(50) DEFAULT 'STANDARD', -- STANDARD, TRAVEL, SETUP, OVERTIME
  
  "recordedBy" text REFERENCES "User"(id),
  "createdAt" timestamp DEFAULT NOW()
);

-- Equipment Maintenance Log - Track maintenance for billing accuracy
CREATE TABLE IF NOT EXISTS "EquipmentMaintenance" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "assetId" uuid NOT NULL REFERENCES "CompanyAsset"(id),
  
  "maintenanceDate" date NOT NULL,
  "maintenanceType" varchar(100) NOT NULL, -- PREVENTIVE, REPAIR, INSPECTION, UPGRADE
  "description" text NOT NULL,
  "hoursOutOfService" decimal(8,2) DEFAULT 0,
  "cost" decimal(10,2) DEFAULT 0,
  "performedBy" varchar(255),
  "vendorId" text REFERENCES "Vendor"(id),
  
  -- Impact on billing
  "affectsBilling" boolean DEFAULT false,
  "billingNotes" text,
  
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Equipment Billing Summary View
CREATE OR REPLACE VIEW "EquipmentBillingSummary" AS
SELECT 
  eu.id as "usageId",
  eu."jobId",
  j."jobNumber",
  j."description" as "jobDescription",
  eu."equipmentName",
  eu."equipmentType",
  eu."usageDate",
  u.name as "operatorName",
  
  -- Time breakdown
  eu."totalHours",
  eu."billableHours",
  eu."workingHours",
  eu."travelHours",
  eu."setupHours",
  eu."idleHours",
  
  -- Rates and costs
  eu."hourlyRate",
  eu."appliedMultiplier",
  eu."baseCost",
  eu."travelCost",
  eu."setupCost",
  eu."operatorCost",
  eu."totalCost",
  
  -- Efficiency metrics
  CASE WHEN eu."totalHours" > 0 THEN (eu."workingHours" / eu."totalHours") * 100 ELSE 0 END as "utilizationPercent",
  CASE WHEN eu."billableHours" > 0 THEN eu."totalCost" / eu."billableHours" ELSE 0 END as "effectiveHourlyRate",
  
  eu."status",
  eu."notes",
  eu."createdAt"
  
FROM "EquipmentUsage" eu
LEFT JOIN "Job" j ON eu."jobId" = j.id
LEFT JOIN "User" u ON eu."operatorId" = u.id
ORDER BY eu."usageDate" DESC, eu."createdAt" DESC;

-- Function to calculate billable hours based on rounding rules
CREATE OR REPLACE FUNCTION calculate_billable_hours(
  total_hours decimal,
  minimum_hours decimal DEFAULT 1.0,
  rounding_increment decimal DEFAULT 0.25
) RETURNS decimal AS $$
DECLARE
  billable_hours decimal;
BEGIN
  -- Apply minimum billing
  billable_hours := GREATEST(total_hours, minimum_hours);
  
  -- Round up to nearest increment
  billable_hours := CEIL(billable_hours / rounding_increment) * rounding_increment;
  
  RETURN billable_hours;
END;
$$ LANGUAGE plpgsql;

-- Function to update equipment usage costs
CREATE OR REPLACE FUNCTION update_equipment_usage_cost(usage_id uuid) RETURNS void AS $$
DECLARE
  usage_record "EquipmentUsage"%ROWTYPE;
  rate_record "EquipmentRate"%ROWTYPE;
  base_cost decimal := 0;
  travel_cost decimal := 0;
  setup_cost decimal := 0;
  operator_cost decimal := 0;
  total_cost decimal := 0;
BEGIN
  -- Get usage record
  SELECT * INTO usage_record FROM "EquipmentUsage" WHERE id = usage_id;
  
  -- Get rate record
  SELECT * INTO rate_record FROM "EquipmentRate" WHERE id = usage_record."equipmentRateId";
  
  -- Calculate base cost
  base_cost := usage_record."billableHours" * usage_record."hourlyRate" * usage_record."appliedMultiplier";
  
  -- Calculate travel cost
  IF usage_record."travelHours" > 0 AND usage_record."travelRate" > 0 THEN
    travel_cost := usage_record."travelHours" * usage_record."travelRate";
  END IF;
  
  -- Calculate setup cost
  IF usage_record."setupHours" > 0 AND usage_record."setupRate" > 0 THEN
    setup_cost := usage_record."setupHours" * usage_record."setupRate";
  END IF;
  
  -- Calculate operator cost (if not included in base rate)
  IF rate_record."requiresOperator" AND NOT rate_record."operatorIncluded" THEN
    IF rate_record."operatorRate" > 0 THEN
      operator_cost := usage_record."totalHours" * rate_record."operatorRate";
    END IF;
  END IF;
  
  total_cost := base_cost + travel_cost + setup_cost + operator_cost;
  
  -- Update usage record
  UPDATE "EquipmentUsage" SET
    "baseCost" = base_cost,
    "travelCost" = travel_cost,
    "setupCost" = setup_cost,
    "operatorCost" = operator_cost,
    "totalCost" = total_cost,
    "updatedAt" = NOW()
  WHERE id = usage_id;
END;
$$ LANGUAGE plpgsql;

-- Function to start equipment usage tracking
CREATE OR REPLACE FUNCTION start_equipment_usage(
  job_id_param text,
  equipment_rate_id_param uuid,
  equipment_name_param varchar,
  operator_id_param text,
  usage_date_param date DEFAULT CURRENT_DATE,
  start_time_param time DEFAULT CURRENT_TIME
) RETURNS uuid AS $$
DECLARE
  usage_id uuid;
  rate_record "EquipmentRate"%ROWTYPE;
BEGIN
  -- Get rate information
  SELECT * INTO rate_record FROM "EquipmentRate" WHERE id = equipment_rate_id_param;
  
  -- Create usage record
  INSERT INTO "EquipmentUsage" (
    "jobId", "equipmentRateId", "equipmentName", "equipmentType",
    "operatorId", "usageDate", "startTime", "hourlyRate",
    "travelRate", "setupRate"
  ) VALUES (
    job_id_param, equipment_rate_id_param, equipment_name_param, rate_record."equipmentType",
    operator_id_param, usage_date_param, start_time_param, rate_record."hourlyRate",
    rate_record."travelTimeRate", rate_record."setupTimeRate"
  ) RETURNING id INTO usage_id;
  
  -- Create initial time log entry
  INSERT INTO "EquipmentTimeLog" (
    "usageId", "startTime", "activity", "description", "recordedBy"
  ) VALUES (
    usage_id, (usage_date_param + start_time_param), 'WORKING', 'Equipment usage started', operator_id_param
  );
  
  RETURN usage_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete equipment usage and calculate final billing
CREATE OR REPLACE FUNCTION complete_equipment_usage(
  usage_id_param uuid,
  end_time_param time DEFAULT CURRENT_TIME,
  working_hours_param decimal DEFAULT NULL,
  travel_hours_param decimal DEFAULT 0,
  setup_hours_param decimal DEFAULT 0,
  notes_param text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  usage_record "EquipmentUsage"%ROWTYPE;
  rate_record "EquipmentRate"%ROWTYPE;
  total_hours decimal;
  billable_hours decimal;
  multiplier decimal := 1.0;
BEGIN
  -- Get usage and rate records
  SELECT * INTO usage_record FROM "EquipmentUsage" WHERE id = usage_id_param;
  SELECT * INTO rate_record FROM "EquipmentRate" WHERE id = usage_record."equipmentRateId";
  
  -- Calculate total hours if not provided
  IF working_hours_param IS NULL THEN
    total_hours := EXTRACT(epoch FROM (end_time_param - usage_record."startTime")) / 3600.0;
  ELSE
    total_hours := working_hours_param + travel_hours_param + setup_hours_param;
  END IF;
  
  -- Apply multipliers based on time and day
  IF total_hours > 8 THEN
    multiplier := rate_record."overtimeMultiplier";
  END IF;
  
  -- Check for weekend
  IF EXTRACT(dow FROM usage_record."usageDate") IN (0, 6) THEN
    multiplier := GREATEST(multiplier, rate_record."weekendMultiplier");
  END IF;
  
  -- Calculate billable hours
  billable_hours := calculate_billable_hours(
    COALESCE(working_hours_param, total_hours),
    rate_record."minimumBillableHours",
    rate_record."roundingIncrement"
  );
  
  -- Update usage record
  UPDATE "EquipmentUsage" SET
    "endTime" = end_time_param,
    "totalHours" = total_hours,
    "billableHours" = billable_hours,
    "workingHours" = COALESCE(working_hours_param, total_hours),
    "travelHours" = travel_hours_param,
    "setupHours" = setup_hours_param,
    "idleHours" = total_hours - COALESCE(working_hours_param, total_hours) - travel_hours_param - setup_hours_param,
    "appliedMultiplier" = multiplier,
    "status" = 'COMPLETED',
    "notes" = notes_param,
    "updatedAt" = NOW()
  WHERE id = usage_id_param;
  
  -- Calculate and update costs
  PERFORM update_equipment_usage_cost(usage_id_param);
  
  -- Create final time log entry
  INSERT INTO "EquipmentTimeLog" (
    "usageId", "startTime", "endTime", "duration", "activity", "description", "billable"
  ) VALUES (
    usage_id_param, 
    (usage_record."usageDate" + usage_record."startTime"),
    (usage_record."usageDate" + end_time_param),
    total_hours,
    'COMPLETED',
    'Equipment usage completed',
    true
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update costs when usage is modified
CREATE OR REPLACE FUNCTION trigger_update_equipment_cost() RETURNS trigger AS $$
BEGIN
  IF NEW."billableHours" IS NOT NULL AND NEW."hourlyRate" IS NOT NULL THEN
    PERFORM update_equipment_usage_cost(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_equipment_cost_trigger ON "EquipmentUsage";
CREATE TRIGGER update_equipment_cost_trigger
  AFTER UPDATE ON "EquipmentUsage"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_equipment_cost();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_usage_job ON "EquipmentUsage"("jobId", "usageDate");
CREATE INDEX IF NOT EXISTS idx_equipment_usage_operator ON "EquipmentUsage"("operatorId", "usageDate");
CREATE INDEX IF NOT EXISTS idx_equipment_usage_status ON "EquipmentUsage"("status", "usageDate");
CREATE INDEX IF NOT EXISTS idx_equipment_time_log_usage ON "EquipmentTimeLog"("usageId", "startTime");
CREATE INDEX IF NOT EXISTS idx_equipment_rate_type ON "EquipmentRate"("equipmentType", "active");

-- Insert standard equipment rates
INSERT INTO "EquipmentRate" ("equipmentType", "equipmentClass", "rateName", "description", "hourlyRate", "halfDayRate", "fullDayRate", "weeklyRate", "minimumBillableHours", "requiresOperator", "operatorIncluded", "travelTimeRate", "setupTimeRate")
VALUES 
  ('BUCKET_TRUCK', 'SIZE_35FT', '35ft Bucket Truck', 'Standard 35ft aerial bucket truck', 125.00, 450.00, 850.00, 3200.00, 2.0, true, true, 85.00, 85.00),
  ('BUCKET_TRUCK', 'SIZE_45FT', '45ft Bucket Truck', 'Standard 45ft aerial bucket truck', 145.00, 520.00, 980.00, 3700.00, 2.0, true, true, 95.00, 95.00),
  ('BUCKET_TRUCK', 'SIZE_60FT', '60ft Bucket Truck', 'Heavy duty 60ft aerial bucket truck', 185.00, 665.00, 1250.00, 4800.00, 2.0, true, true, 125.00, 125.00),
  ('CRANE', 'STANDARD', 'Mobile Crane', 'Standard mobile crane with operator', 165.00, 595.00, 1120.00, 4200.00, 4.0, true, true, 110.00, 150.00),
  ('GENERATOR', 'STANDARD', 'Portable Generator', 'Portable power generator', 35.00, 125.00, 240.00, 900.00, 4.0, false, false, 25.00, 35.00),
  ('COMPRESSOR', 'STANDARD', 'Air Compressor', 'Portable air compressor', 45.00, 162.00, 310.00, 1150.00, 4.0, false, false, 35.00, 45.00),
  ('TRENCHER', 'STANDARD', 'Walk Behind Trencher', 'Walk behind trenching machine', 55.00, 198.00, 380.00, 1400.00, 4.0, false, false, 45.00, 55.00),
  ('AUGER', 'STANDARD', 'Hydraulic Auger', 'Truck mounted hydraulic auger', 95.00, 342.00, 650.00, 2450.00, 2.0, true, true, 75.00, 75.00)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE "EquipmentRate" IS 'Billing rates for different types of equipment';
COMMENT ON TABLE "EquipmentUsage" IS 'Real-time tracking of equipment usage for billing';
COMMENT ON TABLE "EquipmentTimeLog" IS 'Detailed time tracking entries for equipment usage';
COMMENT ON VIEW "EquipmentBillingSummary" IS 'Summary view of equipment billing and utilization';