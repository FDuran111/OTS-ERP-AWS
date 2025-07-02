-- Fix EmployeeCostSummary view to restore the original definition with cost calculations
-- This view was simplified during RBAC migration and lost its cost calculation functionality

-- Drop the simplified view
DROP VIEW IF EXISTS "EmployeeCostSummary" CASCADE;

-- Recreate the view with the original definition including all cost calculations
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
  WHEN u.role = 'TECHNICIAN' THEN 'JOURNEYMAN'
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

-- Add comment explaining the view
COMMENT ON VIEW "EmployeeCostSummary" IS 'Comprehensive employee cost summary including base salary, overhead costs, and asset assignments';