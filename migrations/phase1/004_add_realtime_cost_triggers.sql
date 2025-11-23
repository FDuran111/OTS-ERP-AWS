-- Migration 004: Add real-time job cost calculation triggers
-- Automatically updates Job.actualHours and Job.actualCost when time/materials change

-- Function to recalculate job costs
CREATE OR REPLACE FUNCTION recalculate_job_costs()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id TEXT;
  v_total_hours NUMERIC(10,2);
  v_labor_cost NUMERIC(15,2);
  v_material_cost NUMERIC(15,2);
  v_equipment_cost NUMERIC(15,2);
  v_total_cost NUMERIC(15,2);
BEGIN
  -- Determine which job to update
  IF TG_OP = 'DELETE' THEN
    v_job_id := OLD."jobId";
  ELSE
    v_job_id := NEW."jobId";
  END IF;

  -- Skip if jobId is null
  IF v_job_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Calculate total hours from TimeEntry
  SELECT COALESCE(SUM(
    COALESCE("regularHours", 0) +
    COALESCE("overtimeHours", 0) +
    COALESCE("doubleTimeHours", 0)
  ), 0)
  INTO v_total_hours
  FROM "TimeEntry"
  WHERE "jobId" = v_job_id;

  -- Calculate labor cost from TimeEntry (hours * rates)
  -- Note: TimeEntry has regularRate, overtimeRate but not doubleTimeRate
  -- For doubleTime, we use regularRate * 2 as fallback
  SELECT COALESCE(SUM(
    (COALESCE("regularHours", 0) * COALESCE("regularRate", 0)) +
    (COALESCE("overtimeHours", 0) * COALESCE("overtimeRate", COALESCE("regularRate", 0) * 1.5)) +
    (COALESCE("doubleTimeHours", 0) * COALESCE("regularRate", 0) * 2)
  ), 0)
  INTO v_labor_cost
  FROM "TimeEntry"
  WHERE "jobId" = v_job_id;

  -- Calculate material cost from MaterialUsage (uses totalCost column)
  SELECT COALESCE(SUM(COALESCE("totalCost", 0)), 0)
  INTO v_material_cost
  FROM "MaterialUsage"
  WHERE "jobId" = v_job_id;

  -- Calculate equipment cost from JobEquipmentCost
  SELECT COALESCE(SUM(COALESCE("totalCost", 0)), 0)
  INTO v_equipment_cost
  FROM "JobEquipmentCost"
  WHERE "jobId" = v_job_id;

  -- Total cost
  v_total_cost := v_labor_cost + v_material_cost + v_equipment_cost;

  -- Update Job with calculated values
  UPDATE "Job"
  SET
    "actualHours" = v_total_hours,
    "actualCost" = v_total_cost,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE id = v_job_id;

  -- Also update or insert into JobCost table for detailed breakdown
  INSERT INTO "JobCost" (
    id, "jobId", "totalLaborCost", "totalMaterialCost", "totalEquipmentCost",
    "totalJobCost", "createdAt", "updatedAt"
  )
  VALUES (
    gen_random_uuid()::text, v_job_id, v_labor_cost, v_material_cost, v_equipment_cost,
    v_total_cost, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
  ON CONFLICT ("jobId")
  DO UPDATE SET
    "totalLaborCost" = v_labor_cost,
    "totalMaterialCost" = v_material_cost,
    "totalEquipmentCost" = v_equipment_cost,
    "totalJobCost" = v_total_cost,
    "updatedAt" = CURRENT_TIMESTAMP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on TimeEntry
DROP TRIGGER IF EXISTS trigger_recalc_costs_on_time_entry_insert ON "TimeEntry";
DROP TRIGGER IF EXISTS trigger_recalc_costs_on_time_entry_update ON "TimeEntry";
DROP TRIGGER IF EXISTS trigger_recalc_costs_on_time_entry_delete ON "TimeEntry";

CREATE TRIGGER trigger_recalc_costs_on_time_entry_insert
  AFTER INSERT ON "TimeEntry"
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_job_costs();

CREATE TRIGGER trigger_recalc_costs_on_time_entry_update
  AFTER UPDATE ON "TimeEntry"
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_job_costs();

CREATE TRIGGER trigger_recalc_costs_on_time_entry_delete
  AFTER DELETE ON "TimeEntry"
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_job_costs();

-- Create triggers on MaterialUsage
DROP TRIGGER IF EXISTS trigger_recalc_costs_on_material_insert ON "MaterialUsage";
DROP TRIGGER IF EXISTS trigger_recalc_costs_on_material_update ON "MaterialUsage";
DROP TRIGGER IF EXISTS trigger_recalc_costs_on_material_delete ON "MaterialUsage";

CREATE TRIGGER trigger_recalc_costs_on_material_insert
  AFTER INSERT ON "MaterialUsage"
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_job_costs();

CREATE TRIGGER trigger_recalc_costs_on_material_update
  AFTER UPDATE ON "MaterialUsage"
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_job_costs();

CREATE TRIGGER trigger_recalc_costs_on_material_delete
  AFTER DELETE ON "MaterialUsage"
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_job_costs();

-- Create triggers on JobEquipmentCost
DROP TRIGGER IF EXISTS trigger_recalc_costs_on_equipment_insert ON "JobEquipmentCost";
DROP TRIGGER IF EXISTS trigger_recalc_costs_on_equipment_update ON "JobEquipmentCost";
DROP TRIGGER IF EXISTS trigger_recalc_costs_on_equipment_delete ON "JobEquipmentCost";

CREATE TRIGGER trigger_recalc_costs_on_equipment_insert
  AFTER INSERT ON "JobEquipmentCost"
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_job_costs();

CREATE TRIGGER trigger_recalc_costs_on_equipment_update
  AFTER UPDATE ON "JobEquipmentCost"
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_job_costs();

CREATE TRIGGER trigger_recalc_costs_on_equipment_delete
  AFTER DELETE ON "JobEquipmentCost"
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_job_costs();

-- Verification: List all triggers created
-- SELECT trigger_name, event_object_table, event_manipulation
-- FROM information_schema.triggers
-- WHERE trigger_name LIKE 'trigger_recalc%'
-- ORDER BY event_object_table, trigger_name;
