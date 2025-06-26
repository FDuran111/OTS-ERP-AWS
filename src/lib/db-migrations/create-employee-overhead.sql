-- Employee Overhead Cost Tracking
-- Tracks costs per employee including benefits, equipment, vehicles, etc.

CREATE TABLE IF NOT EXISTS "EmployeeOverhead" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "overheadType" varchar(50) NOT NULL,
  "overheadCategory" varchar(50) NOT NULL,
  "annualCost" decimal(12,2) NOT NULL DEFAULT 0,
  "monthlyCost" decimal(10,2) NOT NULL DEFAULT 0,
  "dailyCost" decimal(8,2) NOT NULL DEFAULT 0,
  "hourlyCost" decimal(6,2) NOT NULL DEFAULT 0,
  "description" text,
  "effectiveDate" date NOT NULL DEFAULT CURRENT_DATE,
  "expiryDate" date,
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Company Assets (vehicles, equipment assigned to employees)
CREATE TABLE IF NOT EXISTS "CompanyAsset" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "assetNumber" varchar(50) UNIQUE NOT NULL,
  "assetType" varchar(50) NOT NULL, -- VEHICLE, TRUCK, PHONE, LAPTOP, TOOLS, etc.
  "category" varchar(50) NOT NULL, -- FIELD_EQUIPMENT, OFFICE_EQUIPMENT, VEHICLE, etc.
  "name" varchar(200) NOT NULL,
  "description" text,
  "make" varchar(100),
  "model" varchar(100),
  "year" integer,
  "serialNumber" varchar(200),
  "purchaseDate" date,
  "purchasePrice" decimal(12,2),
  "currentValue" decimal(12,2),
  "depreciationMethod" varchar(50) DEFAULT 'STRAIGHT_LINE',
  "usefulLife" integer DEFAULT 5, -- years
  "annualDepreciation" decimal(10,2) DEFAULT 0,
  "maintenanceCost" decimal(10,2) DEFAULT 0, -- annual
  "insuranceCost" decimal(10,2) DEFAULT 0, -- annual
  "totalAnnualCost" decimal(12,2) DEFAULT 0,
  "status" varchar(30) NOT NULL DEFAULT 'ACTIVE',
  "location" varchar(200),
  "notes" text,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Asset Assignments to Employees
CREATE TABLE IF NOT EXISTS "AssetAssignment" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "assetId" uuid NOT NULL REFERENCES "CompanyAsset"(id) ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "assignedDate" date NOT NULL DEFAULT CURRENT_DATE,
  "returnedDate" date,
  "purpose" varchar(200),
  "notes" text,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW(),
  UNIQUE("assetId", "userId", "assignedDate")
);

-- Employee Cost Summary View
CREATE OR REPLACE VIEW "EmployeeCostSummary" AS
SELECT 
  u.id as "userId",
  u.name,
  u.email,
  u.role,
  -- Base compensation
  COALESCE(lr."hourlyRate", 0) as "baseHourlyRate",
  COALESCE(lr."hourlyRate", 0) * 2080 as "baseAnnualSalary", -- 40 hrs/week * 52 weeks
  
  -- Overhead costs
  COALESCE(SUM(eo."annualCost"), 0) as "totalOverheadCost",
  COALESCE(SUM(eo."hourlyCost"), 0) as "totalOverheadHourly",
  
  -- Asset costs
  COALESCE(asset_costs."totalAssetCost", 0) as "totalAssetCost",
  COALESCE(asset_costs."totalAssetHourly", 0) as "totalAssetHourly",
  
  -- Total cost per employee
  COALESCE(lr."hourlyRate", 0) + 
  COALESCE(SUM(eo."hourlyCost"), 0) + 
  COALESCE(asset_costs."totalAssetHourly", 0) as "totalHourlyCost",
  
  -- Annual totals
  (COALESCE(lr."hourlyRate", 0) * 2080) + 
  COALESCE(SUM(eo."annualCost"), 0) + 
  COALESCE(asset_costs."totalAssetCost", 0) as "totalAnnualCost"
  
FROM "User" u
LEFT JOIN "LaborRate" lr ON lr."skillLevel" = CASE 
  WHEN u.role = 'FIELD_CREW' THEN 'JOURNEYMAN'
  WHEN u.role = 'ADMIN' THEN 'FOREMAN'
  WHEN u.role = 'OFFICE' THEN 'TECH_L2'
  ELSE 'JOURNEYMAN'
END AND lr.active = true
LEFT JOIN "EmployeeOverhead" eo ON eo."userId" = u.id AND eo.active = true
LEFT JOIN (
  SELECT 
    aa."userId",
    SUM(ca."totalAnnualCost") as "totalAssetCost",
    SUM(ca."totalAnnualCost" / 2080) as "totalAssetHourly"
  FROM "AssetAssignment" aa
  JOIN "CompanyAsset" ca ON aa."assetId" = ca.id
  WHERE aa."returnedDate" IS NULL 
    AND ca.status = 'ACTIVE'
  GROUP BY aa."userId"
) asset_costs ON asset_costs."userId" = u.id
WHERE u.active = true
GROUP BY u.id, u.name, u.email, u.role, lr."hourlyRate", 
         asset_costs."totalAssetCost", asset_costs."totalAssetHourly";

-- Function to calculate employee true cost per hour
CREATE OR REPLACE FUNCTION get_employee_true_cost(
  user_id text,
  calculation_date date DEFAULT CURRENT_DATE
) RETURNS decimal AS $$
DECLARE
  base_rate decimal := 0;
  overhead_cost decimal := 0;
  asset_cost decimal := 0;
  total_cost decimal := 0;
BEGIN
  -- Get base hourly rate
  SELECT COALESCE(lr."hourlyRate", 65.00) INTO base_rate
  FROM "User" u
  LEFT JOIN "LaborRate" lr ON lr."skillLevel" = CASE 
    WHEN u.role = 'FIELD_CREW' THEN 'JOURNEYMAN'
    WHEN u.role = 'ADMIN' THEN 'FOREMAN'
    WHEN u.role = 'OFFICE' THEN 'TECH_L2'
    ELSE 'JOURNEYMAN'
  END AND lr.active = true
    AND lr."effectiveDate" <= calculation_date
    AND (lr."expiryDate" IS NULL OR lr."expiryDate" > calculation_date)
  WHERE u.id = user_id;
  
  -- Get overhead costs per hour
  SELECT COALESCE(SUM(eo."hourlyCost"), 0) INTO overhead_cost
  FROM "EmployeeOverhead" eo
  WHERE eo."userId" = user_id 
    AND eo.active = true
    AND eo."effectiveDate" <= calculation_date
    AND (eo."expiryDate" IS NULL OR eo."expiryDate" > calculation_date);
  
  -- Get asset costs per hour
  SELECT COALESCE(SUM(ca."totalAnnualCost" / 2080), 0) INTO asset_cost
  FROM "AssetAssignment" aa
  JOIN "CompanyAsset" ca ON aa."assetId" = ca.id
  WHERE aa."userId" = user_id
    AND aa."assignedDate" <= calculation_date
    AND (aa."returnedDate" IS NULL OR aa."returnedDate" > calculation_date)
    AND ca.status = 'ACTIVE';
  
  total_cost := base_rate + overhead_cost + asset_cost;
  
  RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to update asset annual costs
CREATE OR REPLACE FUNCTION update_asset_annual_cost(asset_id uuid) RETURNS void AS $$
DECLARE
  annual_depreciation decimal := 0;
  maintenance decimal := 0;
  insurance decimal := 0;
  total decimal := 0;
  purchase_price decimal := 0;
  useful_life integer := 5;
BEGIN
  -- Get asset details
  SELECT "purchasePrice", "usefulLife", "maintenanceCost", "insuranceCost"
  INTO purchase_price, useful_life, maintenance, insurance
  FROM "CompanyAsset"
  WHERE id = asset_id;
  
  -- Calculate annual depreciation (straight line)
  IF purchase_price > 0 AND useful_life > 0 THEN
    annual_depreciation := purchase_price / useful_life;
  END IF;
  
  -- Calculate total annual cost
  total := annual_depreciation + COALESCE(maintenance, 0) + COALESCE(insurance, 0);
  
  -- Update the asset
  UPDATE "CompanyAsset"
  SET 
    "annualDepreciation" = annual_depreciation,
    "totalAnnualCost" = total,
    "updatedAt" = NOW()
  WHERE id = asset_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update asset costs when changed
CREATE OR REPLACE FUNCTION trigger_update_asset_cost() RETURNS trigger AS $$
BEGIN
  PERFORM update_asset_annual_cost(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_asset_cost_trigger ON "CompanyAsset";
CREATE TRIGGER update_asset_cost_trigger
  AFTER INSERT OR UPDATE ON "CompanyAsset"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_asset_cost();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_overhead_user ON "EmployeeOverhead"("userId", "active", "effectiveDate");
CREATE INDEX IF NOT EXISTS idx_company_asset_status ON "CompanyAsset"("status", "assetType");
CREATE INDEX IF NOT EXISTS idx_asset_assignment_user ON "AssetAssignment"("userId", "returnedDate");
CREATE INDEX IF NOT EXISTS idx_asset_assignment_asset ON "AssetAssignment"("assetId", "assignedDate");

-- Migration completed - sample data can be added separately