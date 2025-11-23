-- Migration 007: Auto-process material usage from TimeEntryMaterial
-- When employees log materials via time entries, this trigger:
--   1. Deducts from Material.inStock
--   2. Creates JobMaterialCost record (job costing)
--   3. Optionally creates StockMovement record (audit trail)
--   4. Updates job cost totals

-- First, add JOB_USAGE to stock_movement_type enum if it doesn't exist
DO $$
BEGIN
  -- Check if the type exists and add the value
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
    BEGIN
      ALTER TYPE stock_movement_type ADD VALUE IF NOT EXISTS 'JOB_USAGE';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Main trigger function for processing material usage
CREATE OR REPLACE FUNCTION process_time_entry_material()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id TEXT;
  v_user_id TEXT;
  v_entry_date DATE;
  v_material_cost NUMERIC(10,2);
  v_material_name TEXT;
  v_current_stock INTEGER;
  v_total_cost NUMERIC(12,2);
  v_markup_percentage NUMERIC(5,2) := 25.0; -- Default 25% markup
  v_markup_amount NUMERIC(12,2);
  v_billed_amount NUMERIC(12,2);
  v_warehouse_id UUID;
BEGIN
  -- Skip if materialId is null (legacy records without material reference)
  IF NEW."materialId" IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get job ID and user ID from the TimeEntry
  SELECT te."jobId", te."userId", te.date::date
  INTO v_job_id, v_user_id, v_entry_date
  FROM "TimeEntry" te
  WHERE te.id = NEW."timeEntryId";

  -- If no job found, skip processing
  IF v_job_id IS NULL THEN
    RAISE NOTICE '[MATERIAL TRIGGER] No job found for time entry %, skipping material processing', NEW."timeEntryId";
    RETURN NEW;
  END IF;

  -- Get material cost and current stock
  SELECT m.cost, m.name, m."inStock"
  INTO v_material_cost, v_material_name, v_current_stock
  FROM "Material" m
  WHERE m.id = NEW."materialId";

  -- If material not found, skip
  IF v_material_cost IS NULL THEN
    RAISE NOTICE '[MATERIAL TRIGGER] Material % not found, skipping', NEW."materialId";
    RETURN NEW;
  END IF;

  -- Default cost to 0 if null
  v_material_cost := COALESCE(v_material_cost, 0);
  v_current_stock := COALESCE(v_current_stock, 0);

  -- Calculate costs
  v_total_cost := NEW.quantity * v_material_cost;
  v_markup_amount := v_total_cost * (v_markup_percentage / 100);
  v_billed_amount := v_total_cost + v_markup_amount;

  -- 1. Deduct from Material.inStock
  UPDATE "Material"
  SET
    "inStock" = GREATEST(0, "inStock" - NEW.quantity::integer),
    "updatedAt" = NOW()
  WHERE id = NEW."materialId";

  RAISE NOTICE '[MATERIAL TRIGGER] Deducted % units from material % (was: %, now: %)',
    NEW.quantity, v_material_name, v_current_stock, GREATEST(0, v_current_stock - NEW.quantity::integer);

  -- 2. Create JobMaterialCost record for job costing
  INSERT INTO "JobMaterialCost" (
    "jobId", "materialId", "quantityUsed", "unitCost",
    "totalCost", "markup", "markupAmount", "billedAmount", "usageDate"
  ) VALUES (
    v_job_id,
    NEW."materialId",
    NEW.quantity,
    v_material_cost,
    v_total_cost,
    v_markup_percentage,
    v_markup_amount,
    v_billed_amount,
    COALESCE(v_entry_date, CURRENT_DATE)
  );

  RAISE NOTICE '[MATERIAL TRIGGER] Created JobMaterialCost: job=%, material=%, qty=%, cost=%',
    v_job_id, NEW."materialId", NEW.quantity, v_total_cost;

  -- 3. Try to create StockMovement for audit trail (if warehouse system is set up)
  BEGIN
    -- Try to get a default warehouse
    SELECT id INTO v_warehouse_id FROM "Warehouse" WHERE "isMainWarehouse" = true LIMIT 1;

    IF v_warehouse_id IS NOT NULL THEN
      INSERT INTO "StockMovement" (
        "materialId", "warehouseId", "movementType", quantity,
        "previousStock", "newStock", "unitCost", "totalCost",
        "referenceType", "referenceId", "performedBy", reason
      ) VALUES (
        NEW."materialId",
        v_warehouse_id,
        'JOB_USAGE'::stock_movement_type,
        -NEW.quantity, -- Negative for outbound
        v_current_stock,
        GREATEST(0, v_current_stock - NEW.quantity::integer),
        v_material_cost,
        v_total_cost,
        'TIME_ENTRY_MATERIAL',
        NEW.id::text,
        v_user_id,
        'Material used on job ' || v_job_id || ' via time entry'
      );
      RAISE NOTICE '[MATERIAL TRIGGER] Created StockMovement audit record';
    END IF;
  EXCEPTION
    WHEN others THEN
      -- StockMovement creation is optional - don't fail if it errors
      RAISE NOTICE '[MATERIAL TRIGGER] StockMovement creation skipped: %', SQLERRM;
  END;

  -- 4. Trigger job cost recalculation if the function exists
  BEGIN
    PERFORM calculate_job_costs(v_job_id);
    RAISE NOTICE '[MATERIAL TRIGGER] Recalculated job costs for job %', v_job_id;
  EXCEPTION
    WHEN undefined_function THEN
      RAISE NOTICE '[MATERIAL TRIGGER] calculate_job_costs function not found, skipping';
    WHEN others THEN
      RAISE NOTICE '[MATERIAL TRIGGER] Job cost recalculation skipped: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS process_material_usage_trigger ON "TimeEntryMaterial";

CREATE TRIGGER process_material_usage_trigger
  AFTER INSERT ON "TimeEntryMaterial"
  FOR EACH ROW
  EXECUTE FUNCTION process_time_entry_material();

-- Also handle DELETE to reverse the inventory deduction
CREATE OR REPLACE FUNCTION reverse_time_entry_material()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id TEXT;
BEGIN
  -- Skip if materialId is null
  IF OLD."materialId" IS NULL THEN
    RETURN OLD;
  END IF;

  -- Get job ID from the TimeEntry
  SELECT te."jobId" INTO v_job_id
  FROM "TimeEntry" te
  WHERE te.id = OLD."timeEntryId";

  -- 1. Restore inventory
  UPDATE "Material"
  SET
    "inStock" = "inStock" + OLD.quantity::integer,
    "updatedAt" = NOW()
  WHERE id = OLD."materialId";

  RAISE NOTICE '[MATERIAL TRIGGER] Restored % units to material %', OLD.quantity, OLD."materialId";

  -- 2. Delete the corresponding JobMaterialCost record
  -- Find by matching job, material, quantity, and approximate date
  DELETE FROM "JobMaterialCost"
  WHERE "jobId" = v_job_id
    AND "materialId" = OLD."materialId"
    AND "quantityUsed" = OLD.quantity
    AND "createdAt" >= OLD."createdAt" - INTERVAL '1 minute'
    AND "createdAt" <= OLD."createdAt" + INTERVAL '1 minute';

  -- 3. Trigger job cost recalculation
  IF v_job_id IS NOT NULL THEN
    BEGIN
      PERFORM calculate_job_costs(v_job_id);
    EXCEPTION
      WHEN undefined_function THEN
        RAISE NOTICE '[MATERIAL TRIGGER] calculate_job_costs function not found';
    END;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reverse_material_usage_trigger ON "TimeEntryMaterial";

CREATE TRIGGER reverse_material_usage_trigger
  AFTER DELETE ON "TimeEntryMaterial"
  FOR EACH ROW
  EXECUTE FUNCTION reverse_time_entry_material();

-- Add comments for documentation
COMMENT ON FUNCTION process_time_entry_material() IS
'Automatically processes material usage from time entries:
- Deducts from Material.inStock
- Creates JobMaterialCost record for job costing
- Creates StockMovement audit record (if warehouse exists)
- Triggers job cost recalculation';

COMMENT ON FUNCTION reverse_time_entry_material() IS
'Reverses material usage when TimeEntryMaterial is deleted:
- Restores Material.inStock
- Removes JobMaterialCost record
- Triggers job cost recalculation';
