-- Integrate Equipment Billing with Job Costing System
-- This connects the equipment usage tracking to the P&L calculations

-- Function to automatically add equipment costs to job costing when usage is completed
CREATE OR REPLACE FUNCTION add_equipment_cost_to_job(usage_id_param uuid) RETURNS void AS $$
DECLARE
  usage_record "EquipmentUsage"%ROWTYPE;
  existing_cost_id uuid;
BEGIN
  -- Get the completed usage record
  SELECT * INTO usage_record FROM "EquipmentUsage" WHERE id = usage_id_param AND status = 'COMPLETED';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Equipment usage not found or not completed';
  END IF;
  
  -- Check if equipment cost already exists for this usage
  SELECT id INTO existing_cost_id 
  FROM "JobEquipmentCost" 
  WHERE "jobId" = usage_record."jobId" 
    AND "equipmentName" = usage_record."equipmentName"
    AND "usageDate" = usage_record."usageDate"
    AND "operatorId" = usage_record."operatorId";
  
  IF existing_cost_id IS NOT NULL THEN
    -- Update existing record
    UPDATE "JobEquipmentCost" SET
      "hourlyRate" = usage_record."hourlyRate",
      "hoursUsed" = usage_record."billableHours",
      "totalCost" = usage_record."totalCost",
      "notes" = COALESCE(usage_record."notes", "notes")
    WHERE id = existing_cost_id;
  ELSE
    -- Insert new equipment cost record
    INSERT INTO "JobEquipmentCost" (
      "jobId", "equipmentName", "equipmentType", "hourlyRate",
      "hoursUsed", "totalCost", "usageDate", "operatorId", "notes"
    ) VALUES (
      usage_record."jobId",
      usage_record."equipmentName",
      usage_record."equipmentType", 
      usage_record."hourlyRate",
      usage_record."billableHours",
      usage_record."totalCost",
      usage_record."usageDate",
      usage_record."operatorId",
      usage_record."notes"
    );
  END IF;
  
  -- Recalculate job costs with the new equipment cost
  PERFORM calculate_job_costs_with_true_cost(usage_record."jobId");
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update job costs when equipment usage is completed
CREATE OR REPLACE FUNCTION trigger_add_equipment_to_job_cost() RETURNS trigger AS $$
BEGIN
  -- Only process when status changes to COMPLETED
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
    PERFORM add_equipment_cost_to_job(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS equipment_usage_completed_trigger ON "EquipmentUsage";
CREATE TRIGGER equipment_usage_completed_trigger
  AFTER UPDATE ON "EquipmentUsage"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_add_equipment_to_job_cost();

-- Enhanced Equipment Billing Analytics View
CREATE OR REPLACE VIEW "EquipmentProfitabilityAnalysis" AS
SELECT 
  er.id as "rateId",
  er."equipmentType",
  er."equipmentClass", 
  er."rateName",
  er."hourlyRate" as "standardRate",
  
  -- Usage statistics
  COUNT(eu.id) as "totalUsages",
  SUM(eu."billableHours") as "totalBillableHours",
  SUM(eu."totalHours") as "totalActualHours",
  AVG(CASE WHEN eu."totalHours" > 0 THEN (eu."workingHours" / eu."totalHours") * 100 ELSE 0 END) as "avgUtilization",
  
  -- Revenue statistics  
  SUM(eu."totalCost") as "totalRevenue",
  AVG(eu."totalCost") as "avgRevenuePerUsage",
  AVG(CASE WHEN eu."billableHours" > 0 THEN eu."totalCost" / eu."billableHours" ELSE 0 END) as "avgEffectiveRate",
  
  -- Cost breakdown
  SUM(eu."baseCost") as "totalBaseCost",
  SUM(eu."travelCost") as "totalTravelCost", 
  SUM(eu."setupCost") as "totalSetupCost",
  SUM(eu."operatorCost") as "totalOperatorCost",
  
  -- Efficiency metrics
  CASE WHEN SUM(eu."totalHours") > 0 THEN 
    (SUM(eu."workingHours") / SUM(eu."totalHours")) * 100 
  ELSE 0 END as "productiveTimePercent",
  
  CASE WHEN SUM(eu."billableHours") > 0 THEN
    SUM(eu."totalCost") / SUM(eu."billableHours")
  ELSE 0 END as "revenuePerBillableHour",
  
  -- Time periods
  MIN(eu."usageDate") as "firstUsage",
  MAX(eu."usageDate") as "lastUsage",
  COUNT(DISTINCT eu."jobId") as "jobsUsed"
  
FROM "EquipmentRate" er
LEFT JOIN "EquipmentUsage" eu ON er.id = eu."equipmentRateId" AND eu.status = 'COMPLETED'
WHERE er.active = true
GROUP BY er.id, er."equipmentType", er."equipmentClass", er."rateName", er."hourlyRate"
ORDER BY "totalRevenue" DESC;

-- Job Equipment Cost Summary with Enhanced Details
CREATE OR REPLACE VIEW "JobEquipmentCostSummary" AS
SELECT 
  j.id as "jobId",
  j."jobNumber",
  j."description" as "jobDescription",
  j.status as "jobStatus",
  
  -- Equipment cost totals
  COUNT(jec.id) as "equipmentEntries",
  SUM(jec."totalCost") as "totalEquipmentCost",
  SUM(jec."hoursUsed") as "totalEquipmentHours",
  
  -- Equipment usage breakdown by type
  COUNT(CASE WHEN jec."equipmentType" = 'BUCKET_TRUCK' THEN 1 END) as "bucketTruckUsages",
  SUM(CASE WHEN jec."equipmentType" = 'BUCKET_TRUCK' THEN jec."totalCost" ELSE 0 END) as "bucketTruckCost",
  COUNT(CASE WHEN jec."equipmentType" = 'CRANE' THEN 1 END) as "craneUsages",
  SUM(CASE WHEN jec."equipmentType" = 'CRANE' THEN jec."totalCost" ELSE 0 END) as "craneCost",
  
  -- Average rates
  CASE WHEN SUM(jec."hoursUsed") > 0 THEN 
    SUM(jec."totalCost") / SUM(jec."hoursUsed") 
  ELSE 0 END as "avgEquipmentRate",
  
  -- Date ranges
  MIN(jec."usageDate") as "firstEquipmentUsage",
  MAX(jec."usageDate") as "lastEquipmentUsage",
  
  -- Job financials (from JobCost table)
  jc."billedAmount",
  jc."totalJobCost",
  jc."grossProfit",
  jc."grossMargin",
  
  -- Equipment cost as percentage of total job cost
  CASE WHEN jc."totalJobCost" > 0 THEN 
    (SUM(jec."totalCost") / jc."totalJobCost") * 100 
  ELSE 0 END as "equipmentCostPercent"
  
FROM "Job" j
LEFT JOIN "JobEquipmentCost" jec ON j.id = jec."jobId"
LEFT JOIN "JobCost" jc ON j.id = jc."jobId"
GROUP BY j.id, j."jobNumber", j."description", j.status, 
         jc."billedAmount", jc."totalJobCost", jc."grossProfit", jc."grossMargin"
HAVING COUNT(jec.id) > 0
ORDER BY "totalEquipmentCost" DESC;

-- Function to get equipment utilization report for a date range
CREATE OR REPLACE FUNCTION get_equipment_utilization_report(
  start_date date,
  end_date date,
  equipment_type_filter varchar DEFAULT NULL
) RETURNS TABLE (
  equipment_type varchar,
  rate_name varchar,
  total_usages bigint,
  total_hours decimal,
  billable_hours decimal,
  total_revenue decimal,
  avg_utilization decimal,
  avg_rate decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eu."equipmentType",
    er."rateName",
    COUNT(eu.id)::bigint as total_usages,
    SUM(eu."totalHours") as total_hours,
    SUM(eu."billableHours") as billable_hours,
    SUM(eu."totalCost") as total_revenue,
    AVG(CASE WHEN eu."totalHours" > 0 THEN (eu."workingHours" / eu."totalHours") * 100 ELSE 0 END) as avg_utilization,
    AVG(CASE WHEN eu."billableHours" > 0 THEN eu."totalCost" / eu."billableHours" ELSE 0 END) as avg_rate
  FROM "EquipmentUsage" eu
  JOIN "EquipmentRate" er ON eu."equipmentRateId" = er.id
  WHERE eu."usageDate" BETWEEN start_date AND end_date
    AND eu.status = 'COMPLETED'
    AND (equipment_type_filter IS NULL OR eu."equipmentType" = equipment_type_filter)
  GROUP BY eu."equipmentType", er."rateName"
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Update existing equipment cost records with data from completed equipment usage
DO $$
DECLARE
    usage_record RECORD;
BEGIN
    FOR usage_record IN 
        SELECT * FROM "EquipmentUsage" WHERE status = 'COMPLETED'
    LOOP
        BEGIN
            PERFORM add_equipment_cost_to_job(usage_record.id);
        EXCEPTION WHEN OTHERS THEN
            -- Continue processing other records if one fails
            CONTINUE;
        END;
    END LOOP;
END
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_equipment_usage_job_date ON "EquipmentUsage"("jobId", "usageDate", "status");
CREATE INDEX IF NOT EXISTS idx_equipment_usage_type_date ON "EquipmentUsage"("equipmentType", "usageDate", "status");
CREATE INDEX IF NOT EXISTS idx_job_equipment_cost_job_type ON "JobEquipmentCost"("jobId", "equipmentType");

COMMENT ON FUNCTION add_equipment_cost_to_job(uuid) IS 'Automatically add completed equipment usage to job equipment costs';
COMMENT ON VIEW "EquipmentProfitabilityAnalysis" IS 'Comprehensive profitability analysis for equipment rates';
COMMENT ON VIEW "JobEquipmentCostSummary" IS 'Summary of equipment costs per job with financial impact analysis';
COMMENT ON FUNCTION get_equipment_utilization_report(date, date, varchar) IS 'Generate equipment utilization report for date range';