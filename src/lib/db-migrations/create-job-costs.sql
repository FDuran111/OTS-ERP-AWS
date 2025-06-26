-- Create comprehensive job cost tracking tables for P&L reporting

-- Job Cost Summary table for overall job financials
CREATE TABLE IF NOT EXISTS "JobCost" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  
  -- Labor Costs
  "totalLaborHours" decimal(10,2) DEFAULT 0,
  "totalLaborCost" decimal(12,2) DEFAULT 0,
  "averageLaborRate" decimal(10,2) DEFAULT 0,
  
  -- Material Costs
  "totalMaterialCost" decimal(12,2) DEFAULT 0,
  "materialMarkup" decimal(5,2) DEFAULT 0, -- percentage
  "materialMarkupAmount" decimal(12,2) DEFAULT 0,
  
  -- Equipment Costs
  "totalEquipmentCost" decimal(12,2) DEFAULT 0,
  "equipmentHours" decimal(10,2) DEFAULT 0,
  
  -- Overhead and Other Costs
  "overheadPercentage" decimal(5,2) DEFAULT 15.0, -- default 15%
  "overheadAmount" decimal(12,2) DEFAULT 0,
  "miscCosts" decimal(12,2) DEFAULT 0,
  "miscCostDescription" text,
  
  -- Totals
  "totalDirectCosts" decimal(12,2) DEFAULT 0, -- labor + materials + equipment
  "totalIndirectCosts" decimal(12,2) DEFAULT 0, -- overhead + misc
  "totalJobCost" decimal(12,2) DEFAULT 0,
  
  -- Revenue and Profit
  "billedAmount" decimal(12,2) DEFAULT 0,
  "grossProfit" decimal(12,2) DEFAULT 0,
  "grossMargin" decimal(5,2) DEFAULT 0, -- percentage
  
  -- Tracking
  "lastCalculated" timestamp with time zone DEFAULT NOW(),
  "createdAt" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Detailed Labor Cost Breakdown
CREATE TABLE IF NOT EXISTS "JobLaborCost" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES "User"(id),
  "laborRateId" text REFERENCES "LaborRate"(id),
  "skillLevel" varchar(50) NOT NULL,
  "hourlyRate" decimal(10,2) NOT NULL,
  "hoursWorked" decimal(10,2) NOT NULL,
  "totalCost" decimal(12,2) NOT NULL,
  "workDate" date NOT NULL,
  "timeEntryId" uuid,
  "createdAt" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Detailed Material Cost Breakdown
CREATE TABLE IF NOT EXISTS "JobMaterialCost" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  "materialId" text NOT NULL REFERENCES "Material"(id),
  "quantityUsed" decimal(10,3) NOT NULL,
  "unitCost" decimal(10,2) NOT NULL,
  "totalCost" decimal(12,2) NOT NULL,
  "markup" decimal(5,2) DEFAULT 0,
  "markupAmount" decimal(12,2) DEFAULT 0,
  "billedAmount" decimal(12,2) DEFAULT 0,
  "usageDate" date NOT NULL,
  "reservationId" uuid,
  "createdAt" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Equipment Cost Tracking
CREATE TABLE IF NOT EXISTS "JobEquipmentCost" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  "equipmentName" varchar(255) NOT NULL,
  "equipmentType" varchar(100) NOT NULL, -- 'BUCKET_TRUCK', 'CRANE', 'GENERATOR', etc.
  "hourlyRate" decimal(10,2) NOT NULL,
  "hoursUsed" decimal(10,2) NOT NULL,
  "totalCost" decimal(12,2) NOT NULL,
  "usageDate" date NOT NULL,
  "operatorId" text REFERENCES "User"(id),
  "notes" text,
  "createdAt" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobcost_job_id ON "JobCost"("jobId");
CREATE INDEX IF NOT EXISTS idx_joblaborcost_job_id ON "JobLaborCost"("jobId");
CREATE INDEX IF NOT EXISTS idx_joblaborcost_user_id ON "JobLaborCost"("userId");
CREATE INDEX IF NOT EXISTS idx_joblaborcost_work_date ON "JobLaborCost"("workDate");
CREATE INDEX IF NOT EXISTS idx_jobmaterialcost_job_id ON "JobMaterialCost"("jobId");
CREATE INDEX IF NOT EXISTS idx_jobmaterialcost_material_id ON "JobMaterialCost"("materialId");
CREATE INDEX IF NOT EXISTS idx_jobequipmentcost_job_id ON "JobEquipmentCost"("jobId");

-- Create function to calculate and update job costs
CREATE OR REPLACE FUNCTION calculate_job_costs(job_id_param text)
RETURNS void AS $$
DECLARE
  job_cost_record "JobCost"%ROWTYPE;
  total_labor_hours decimal := 0;
  total_labor_cost decimal := 0;
  avg_labor_rate decimal := 0;
  total_material_cost decimal := 0;
  total_material_markup decimal := 0;
  total_equipment_cost decimal := 0;
  total_equipment_hours decimal := 0;
  overhead_amount decimal := 0;
  total_direct_costs decimal := 0;
  total_indirect_costs decimal := 0;
  total_job_cost decimal := 0;
  billed_amount decimal := 0;
  gross_profit decimal := 0;
  gross_margin decimal := 0;
  overhead_percentage decimal := 15.0;
BEGIN
  -- Get or create JobCost record
  SELECT * INTO job_cost_record FROM "JobCost" WHERE "jobId" = job_id_param;
  
  IF NOT FOUND THEN
    INSERT INTO "JobCost" ("jobId") VALUES (job_id_param)
    RETURNING * INTO job_cost_record;
  END IF;
  
  -- Calculate Labor Costs
  SELECT 
    COALESCE(SUM("hoursWorked"), 0),
    COALESCE(SUM("totalCost"), 0),
    CASE WHEN SUM("hoursWorked") > 0 THEN SUM("totalCost") / SUM("hoursWorked") ELSE 0 END
  INTO total_labor_hours, total_labor_cost, avg_labor_rate
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
  
  -- Calculate totals
  total_direct_costs := total_labor_cost + total_material_cost + total_equipment_cost;
  overhead_amount := total_direct_costs * (overhead_percentage / 100);
  total_indirect_costs := overhead_amount + COALESCE(job_cost_record."miscCosts", 0);
  total_job_cost := total_direct_costs + total_indirect_costs;
  
  -- Get billed amount from Job table
  SELECT COALESCE("billedAmount", 0) INTO billed_amount
  FROM "Job" WHERE id = job_id_param;
  
  -- Calculate profit and margin
  gross_profit := billed_amount - total_job_cost;
  gross_margin := CASE WHEN billed_amount > 0 THEN (gross_profit / billed_amount) * 100 ELSE 0 END;
  
  -- Update JobCost record
  UPDATE "JobCost" SET
    "totalLaborHours" = total_labor_hours,
    "totalLaborCost" = total_labor_cost,
    "averageLaborRate" = avg_labor_rate,
    "totalMaterialCost" = total_material_cost,
    "materialMarkupAmount" = total_material_markup,
    "totalEquipmentCost" = total_equipment_cost,
    "equipmentHours" = total_equipment_hours,
    "overheadAmount" = overhead_amount,
    "totalDirectCosts" = total_direct_costs,
    "totalIndirectCosts" = total_indirect_costs,
    "totalJobCost" = total_job_cost,
    "billedAmount" = billed_amount,
    "grossProfit" = gross_profit,
    "grossMargin" = gross_margin,
    "lastCalculated" = NOW(),
    "updatedAt" = NOW()
  WHERE "jobId" = job_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to add labor cost from time entry
CREATE OR REPLACE FUNCTION add_labor_cost_from_time_entry(
  job_id_param text,
  user_id_param text,
  hours_param decimal,
  work_date_param date,
  time_entry_id_param uuid DEFAULT NULL
) RETURNS void AS $$
DECLARE
  skill_level_var varchar;
  hourly_rate_var decimal;
  labor_rate_id_var text;
  total_cost_var decimal;
BEGIN
  -- Get user's skill level (from User table or default)
  SELECT COALESCE(role, 'JOURNEYMAN') INTO skill_level_var
  FROM "User" WHERE id = user_id_param;
  
  -- Map role to skill level if needed
  CASE skill_level_var
    WHEN 'APPRENTICE' THEN skill_level_var := 'APPRENTICE';
    WHEN 'FIELD_CREW' THEN skill_level_var := 'JOURNEYMAN';
    WHEN 'ADMIN' THEN skill_level_var := 'FOREMAN';
    ELSE skill_level_var := 'JOURNEYMAN';
  END CASE;
  
  -- Get effective labor rate (considering job-specific overrides)
  SELECT get_effective_labor_rate(job_id_param, user_id_param) INTO hourly_rate_var;
  
  -- If no effective rate found, fall back to skill level-based rate
  IF hourly_rate_var IS NULL THEN
    SELECT id, "hourlyRate" INTO labor_rate_id_var, hourly_rate_var
    FROM get_current_labor_rate(skill_level_var);
    
    -- Final default rate if none found
    IF hourly_rate_var IS NULL THEN
      hourly_rate_var := 65.00; -- Default journeyman rate
    END IF;
  END IF;
  
  total_cost_var := hours_param * hourly_rate_var;
  
  -- Insert labor cost record
  INSERT INTO "JobLaborCost" (
    "jobId", "userId", "laborRateId", "skillLevel", 
    "hourlyRate", "hoursWorked", "totalCost", 
    "workDate", "timeEntryId"
  ) VALUES (
    job_id_param, user_id_param, labor_rate_id_var, skill_level_var,
    hourly_rate_var, hours_param, total_cost_var,
    work_date_param, time_entry_id_param
  );
  
  -- Recalculate job costs
  PERFORM calculate_job_costs(job_id_param);
END;
$$ LANGUAGE plpgsql;

-- Create function to add material cost
CREATE OR REPLACE FUNCTION add_material_cost(
  job_id_param text,
  material_id_param text,
  quantity_param decimal,
  usage_date_param date,
  markup_percentage decimal DEFAULT 25.0
) RETURNS void AS $$
DECLARE
  unit_cost_var decimal;
  total_cost_var decimal;
  markup_amount_var decimal;
  billed_amount_var decimal;
BEGIN
  -- Get material cost
  SELECT cost INTO unit_cost_var
  FROM "Material" WHERE id = material_id_param;
  
  IF unit_cost_var IS NULL THEN
    unit_cost_var := 0;
  END IF;
  
  total_cost_var := quantity_param * unit_cost_var;
  markup_amount_var := total_cost_var * (markup_percentage / 100);
  billed_amount_var := total_cost_var + markup_amount_var;
  
  -- Insert material cost record
  INSERT INTO "JobMaterialCost" (
    "jobId", "materialId", "quantityUsed", "unitCost",
    "totalCost", "markup", "markupAmount", "billedAmount", "usageDate"
  ) VALUES (
    job_id_param, material_id_param, quantity_param, unit_cost_var,
    total_cost_var, markup_percentage, markup_amount_var, billed_amount_var, usage_date_param
  );
  
  -- Recalculate job costs
  PERFORM calculate_job_costs(job_id_param);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate costs when labor/material records change
CREATE OR REPLACE FUNCTION trigger_recalculate_job_costs()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_job_costs(OLD."jobId");
    RETURN OLD;
  ELSE
    PERFORM calculate_job_costs(NEW."jobId");
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_recalc_costs_labor
  AFTER INSERT OR UPDATE OR DELETE ON "JobLaborCost"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_job_costs();

CREATE TRIGGER trigger_recalc_costs_material
  AFTER INSERT OR UPDATE OR DELETE ON "JobMaterialCost"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_job_costs();

CREATE TRIGGER trigger_recalc_costs_equipment
  AFTER INSERT OR UPDATE OR DELETE ON "JobEquipmentCost"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_job_costs();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_jobcost_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_jobcost_updated_at
  BEFORE UPDATE ON "JobCost"
  FOR EACH ROW
  EXECUTE FUNCTION update_jobcost_updated_at();

-- Add comments
COMMENT ON TABLE "JobCost" IS 'Summary of all costs and profit/loss for each job';
COMMENT ON TABLE "JobLaborCost" IS 'Detailed labor cost breakdown by user and time entry';
COMMENT ON TABLE "JobMaterialCost" IS 'Detailed material cost breakdown with markup';
COMMENT ON TABLE "JobEquipmentCost" IS 'Equipment rental and usage costs';
COMMENT ON FUNCTION calculate_job_costs(text) IS 'Recalculate all costs and P&L for a job';
COMMENT ON FUNCTION add_labor_cost_from_time_entry(text, text, decimal, date, uuid) IS 'Add labor cost from time tracking entry';
COMMENT ON FUNCTION add_material_cost(text, text, decimal, date, decimal) IS 'Add material cost with markup calculation';