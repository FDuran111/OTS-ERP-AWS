-- Update job costing to include true employee costs (base + overhead + assets)
-- This enhances the existing P&L system with more accurate labor cost calculations

-- Add true cost tracking to JobLaborCost table
ALTER TABLE "JobLaborCost" 
ADD COLUMN IF NOT EXISTS "trueCostPerHour" decimal(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalTrueCost" decimal(10,2) DEFAULT 0;

-- Add true cost summary to JobCost table
ALTER TABLE "JobCost"
ADD COLUMN IF NOT EXISTS "totalTrueLaborCost" decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "averageTrueLaborRate" decimal(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "trueCostDifference" decimal(12,2) DEFAULT 0;

-- Function to calculate and add labor cost with true employee cost
CREATE OR REPLACE FUNCTION add_labor_cost_with_true_cost(
  job_id_param text,
  user_id_param text,
  hours_param decimal,
  work_date_param date,
  time_entry_id_param uuid DEFAULT NULL
) RETURNS void AS $$
DECLARE
  skill_level_var varchar(50);
  hourly_rate_var decimal;
  true_cost_var decimal;
  labor_rate_id_var text;
  total_cost_var decimal;
  total_true_cost_var decimal;
BEGIN
  -- Get user's skill level (from User table or default)
  SELECT CASE 
    WHEN role = 'FIELD_CREW' THEN 'JOURNEYMAN'
    WHEN role = 'ADMIN' THEN 'FOREMAN'
    WHEN role = 'OFFICE' THEN 'TECH_L2'
    ELSE 'JOURNEYMAN'
  END INTO skill_level_var
  FROM "User" WHERE id = user_id_param;
  
  -- Get current labor rate for skill level
  SELECT id, "hourlyRate" INTO labor_rate_id_var, hourly_rate_var
  FROM "LaborRate"
  WHERE "skillLevel" = skill_level_var 
    AND active = true 
    AND "effectiveDate" <= CURRENT_DATE 
    AND ("expiryDate" IS NULL OR "expiryDate" > CURRENT_DATE)
  ORDER BY "effectiveDate" DESC 
  LIMIT 1;
  
  -- Default rate if none found
  IF hourly_rate_var IS NULL THEN
    hourly_rate_var := CASE skill_level_var
      WHEN 'APPRENTICE' THEN 45.00
      WHEN 'HELPER' THEN 35.00
      WHEN 'TECH_L1' THEN 55.00
      WHEN 'TECH_L2' THEN 65.00
      WHEN 'JOURNEYMAN' THEN 75.00
      WHEN 'FOREMAN' THEN 85.00
      WHEN 'LOW_VOLTAGE' THEN 60.00
      WHEN 'CABLING' THEN 55.00
      WHEN 'INSTALL' THEN 70.00
      ELSE 65.00
    END;
  END IF;
  
  -- Get true cost per hour (base + overhead + assets)
  SELECT get_employee_true_cost(user_id_param, work_date_param) INTO true_cost_var;
  
  -- Calculate costs
  total_cost_var := hours_param * hourly_rate_var;
  total_true_cost_var := hours_param * true_cost_var;
  
  -- Insert labor cost record with true cost data
  INSERT INTO "JobLaborCost" (
    "jobId", "userId", "laborRateId", "skillLevel", 
    "hourlyRate", "hoursWorked", "totalCost", 
    "trueCostPerHour", "totalTrueCost",
    "workDate", "timeEntryId"
  ) VALUES (
    job_id_param, user_id_param, labor_rate_id_var, skill_level_var,
    hourly_rate_var, hours_param, total_cost_var,
    true_cost_var, total_true_cost_var,
    work_date_param, time_entry_id_param
  );
  
  -- Recalculate job costs
  PERFORM calculate_job_costs_with_true_cost(job_id_param);
END;
$$ LANGUAGE plpgsql;

-- Enhanced job cost calculation function
CREATE OR REPLACE FUNCTION calculate_job_costs_with_true_cost(job_id_param text)
RETURNS void AS $$
DECLARE
  job_cost_record "JobCost"%ROWTYPE;
  total_labor_hours decimal := 0;
  total_labor_cost decimal := 0;
  total_true_labor_cost decimal := 0;
  avg_labor_rate decimal := 0;
  avg_true_labor_rate decimal := 0;
  total_material_cost decimal := 0;
  total_material_markup decimal := 0;
  total_equipment_cost decimal := 0;
  total_equipment_hours decimal := 0;
  overhead_amount decimal := 0;
  total_direct_costs decimal := 0;
  total_true_direct_costs decimal := 0;
  total_indirect_costs decimal := 0;
  total_job_cost decimal := 0;
  total_true_job_cost decimal := 0;
  billed_amount decimal := 0;
  gross_profit decimal := 0;
  true_gross_profit decimal := 0;
  gross_margin decimal := 0;
  true_gross_margin decimal := 0;
  overhead_percentage decimal := 15.0;
  true_cost_difference decimal := 0;
BEGIN
  -- Get or create JobCost record
  SELECT * INTO job_cost_record FROM "JobCost" WHERE "jobId" = job_id_param;
  
  IF NOT FOUND THEN
    INSERT INTO "JobCost" ("jobId") VALUES (job_id_param)
    RETURNING * INTO job_cost_record;
  END IF;
  
  -- Use existing overhead percentage if set
  IF job_cost_record."overheadPercentage" IS NOT NULL THEN
    overhead_percentage := job_cost_record."overheadPercentage";
  END IF;
  
  -- Calculate Labor Costs (both billing rate and true cost)
  SELECT 
    COALESCE(SUM("hoursWorked"), 0),
    COALESCE(SUM("totalCost"), 0),
    COALESCE(SUM("totalTrueCost"), 0),
    CASE WHEN SUM("hoursWorked") > 0 THEN SUM("totalCost") / SUM("hoursWorked") ELSE 0 END,
    CASE WHEN SUM("hoursWorked") > 0 THEN SUM("totalTrueCost") / SUM("hoursWorked") ELSE 0 END
  INTO total_labor_hours, total_labor_cost, total_true_labor_cost, avg_labor_rate, avg_true_labor_rate
  FROM "JobLaborCost"
  WHERE "jobId" = job_id_param;
  
  -- Calculate Material Costs
  SELECT 
    COALESCE(SUM("totalCost"), 0),
    COALESCE(SUM("markupAmount"), 0)
  INTO total_material_cost, total_material_markup
  FROM "JobMaterialCost"
  WHERE "jobId" = job_id_param;
  
  -- Calculate Equipment Costs
  SELECT 
    COALESCE(SUM("totalCost"), 0),
    COALESCE(SUM("hoursUsed"), 0)
  INTO total_equipment_cost, total_equipment_hours
  FROM "JobEquipmentCost"
  WHERE "jobId" = job_id_param;
  
  -- Calculate totals using billing rates (original method)
  total_direct_costs := total_labor_cost + total_material_cost + total_equipment_cost;
  overhead_amount := total_direct_costs * (overhead_percentage / 100);
  total_indirect_costs := overhead_amount + COALESCE(job_cost_record."miscCosts", 0);
  total_job_cost := total_direct_costs + total_indirect_costs;
  
  -- Calculate totals using true costs (more accurate)
  total_true_direct_costs := total_true_labor_cost + total_material_cost + total_equipment_cost;
  total_true_job_cost := total_true_direct_costs + total_indirect_costs;
  
  -- Calculate the difference between billing rates and true costs
  true_cost_difference := total_true_job_cost - total_job_cost;
  
  -- Get billed amount from Job table
  SELECT COALESCE("billedAmount", 0) INTO billed_amount
  FROM "Job" WHERE id = job_id_param;
  
  -- Calculate profit and margin (both billing rate and true cost)
  gross_profit := billed_amount - total_job_cost;
  true_gross_profit := billed_amount - total_true_job_cost;
  gross_margin := CASE WHEN billed_amount > 0 THEN (gross_profit / billed_amount) * 100 ELSE 0 END;
  true_gross_margin := CASE WHEN billed_amount > 0 THEN (true_gross_profit / billed_amount) * 100 ELSE 0 END;
  
  -- Update JobCost record with enhanced data
  UPDATE "JobCost" SET
    "totalLaborHours" = total_labor_hours,
    "totalLaborCost" = total_labor_cost,
    "totalTrueLaborCost" = total_true_labor_cost,
    "averageLaborRate" = avg_labor_rate,
    "averageTrueLaborRate" = avg_true_labor_rate,
    "totalMaterialCost" = total_material_cost,
    "materialMarkupAmount" = total_material_markup,
    "totalEquipmentCost" = total_equipment_cost,
    "equipmentHours" = total_equipment_hours,
    "overheadPercentage" = overhead_percentage,
    "overheadAmount" = overhead_amount,
    "totalDirectCosts" = total_direct_costs,
    "totalIndirectCosts" = total_indirect_costs,
    "totalJobCost" = total_job_cost,
    "trueCostDifference" = true_cost_difference,
    "billedAmount" = billed_amount,
    "grossProfit" = gross_profit,
    "grossMargin" = gross_margin,
    "lastCalculated" = NOW(),
    "updatedAt" = NOW()
  WHERE "jobId" = job_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create a view for comprehensive job cost analysis
CREATE OR REPLACE VIEW "JobCostAnalysis" AS
SELECT 
  j.id as "jobId",
  j."jobNumber",
  j.description as "jobTitle",
  j.status as "jobStatus",
  COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as "customerName",
  
  -- Labor costs
  jc."totalLaborHours",
  jc."totalLaborCost",
  jc."totalTrueLaborCost",
  jc."averageLaborRate",
  jc."averageTrueLaborRate",
  
  -- Other costs
  jc."totalMaterialCost",
  jc."totalEquipmentCost",
  jc."overheadAmount",
  jc."miscCosts",
  
  -- Totals
  jc."totalDirectCosts",
  jc."totalIndirectCosts", 
  jc."totalJobCost",
  jc."totalJobCost" + jc."trueCostDifference" as "totalTrueJobCost",
  jc."trueCostDifference",
  
  -- Revenue and profit
  jc."billedAmount",
  jc."grossProfit",
  jc."billedAmount" - (jc."totalJobCost" + jc."trueCostDifference") as "trueGrossProfit",
  jc."grossMargin",
  CASE 
    WHEN jc."billedAmount" > 0 THEN 
      ((jc."billedAmount" - (jc."totalJobCost" + jc."trueCostDifference")) / jc."billedAmount") * 100 
    ELSE 0 
  END as "trueGrossMargin",
  
  -- Cost efficiency metrics
  CASE 
    WHEN jc."totalLaborCost" > 0 THEN 
      (jc."trueCostDifference" / jc."totalLaborCost") * 100 
    ELSE 0 
  END as "costVariancePercentage",
  
  jc."lastCalculated",
  jc."createdAt",
  jc."updatedAt"
  
FROM "Job" j
LEFT JOIN "Customer" c ON j."customerId" = c.id
LEFT JOIN "JobCost" jc ON j.id = jc."jobId"
WHERE jc."jobId" IS NOT NULL;

-- Update existing labor cost entries to calculate true costs
UPDATE "JobLaborCost" SET
  "trueCostPerHour" = COALESCE(get_employee_true_cost("userId", "workDate"), "hourlyRate"),
  "totalTrueCost" = "hoursWorked" * COALESCE(get_employee_true_cost("userId", "workDate"), "hourlyRate")
WHERE "trueCostPerHour" = 0 OR "trueCostPerHour" IS NULL;

-- Recalculate all existing job costs with true cost data
DO $$
DECLARE
    job_record RECORD;
BEGIN
    FOR job_record IN SELECT DISTINCT "jobId" FROM "JobLaborCost"
    LOOP
        PERFORM calculate_job_costs_with_true_cost(job_record."jobId");
    END LOOP;
END
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_labor_cost_true_cost ON "JobLaborCost"("jobId", "trueCostPerHour");
CREATE INDEX IF NOT EXISTS idx_job_cost_true_cost ON "JobCost"("jobId", "totalTrueLaborCost");

COMMENT ON COLUMN "JobLaborCost"."trueCostPerHour" IS 'Employee true cost per hour including base rate, overhead, and assets';
COMMENT ON COLUMN "JobLaborCost"."totalTrueCost" IS 'Total true cost for this labor entry';
COMMENT ON COLUMN "JobCost"."totalTrueLaborCost" IS 'Total true labor cost including all employee overhead and assets';
COMMENT ON COLUMN "JobCost"."trueCostDifference" IS 'Difference between billing rates and true costs';
COMMENT ON VIEW "JobCostAnalysis" IS 'Comprehensive job cost analysis with billing vs true cost comparison';