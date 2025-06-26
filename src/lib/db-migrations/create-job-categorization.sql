-- Job Categorization System
-- Comprehensive sector classification for business analysis

-- Job Categories - High-level business sectors
CREATE TABLE IF NOT EXISTS "JobCategory" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "categoryCode" varchar(20) UNIQUE NOT NULL,
  "categoryName" varchar(100) NOT NULL,
  "description" text,
  "color" varchar(7) DEFAULT '#1976d2', -- Hex color for UI
  "icon" varchar(50) DEFAULT 'work', -- Material-UI icon name
  "active" boolean NOT NULL DEFAULT true,
  "sortOrder" integer DEFAULT 0,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Job Sub-Categories - Detailed classification within sectors
CREATE TABLE IF NOT EXISTS "JobSubCategory" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "categoryId" uuid NOT NULL REFERENCES "JobCategory"(id) ON DELETE CASCADE,
  "subCategoryCode" varchar(20) NOT NULL,
  "subCategoryName" varchar(100) NOT NULL,
  "description" text,
  "defaultLaborRate" decimal(10,2), -- Suggested hourly rate for this type
  "estimatedHours" decimal(8,2), -- Typical hours for this work type
  "requiresCertification" boolean DEFAULT false,
  "requiredSkillLevel" varchar(50), -- APPRENTICE, JOURNEYMAN, etc.
  "active" boolean NOT NULL DEFAULT true,
  "sortOrder" integer DEFAULT 0,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW(),
  UNIQUE("categoryId", "subCategoryCode")
);

-- Job Tags - Flexible tagging system for cross-cutting attributes
CREATE TABLE IF NOT EXISTS "JobTag" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tagName" varchar(50) UNIQUE NOT NULL,
  "tagType" varchar(30) NOT NULL DEFAULT 'GENERAL', -- GENERAL, PRIORITY, COMPLEXITY, CERTIFICATION
  "description" text,
  "color" varchar(7) DEFAULT '#757575',
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp DEFAULT NOW()
);

-- Job-Tag relationships (many-to-many)
CREATE TABLE IF NOT EXISTS "JobTagAssignment" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  "tagId" uuid NOT NULL REFERENCES "JobTag"(id) ON DELETE CASCADE,
  "assignedAt" timestamp DEFAULT NOW(),
  "assignedBy" text REFERENCES "User"(id),
  UNIQUE("jobId", "tagId")
);

-- Service Types - Specific electrical services offered
CREATE TABLE IF NOT EXISTS "ServiceType" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "serviceCode" varchar(20) UNIQUE NOT NULL,
  "serviceName" varchar(100) NOT NULL,
  "categoryId" uuid REFERENCES "JobCategory"(id),
  "subCategoryId" uuid REFERENCES "JobSubCategory"(id),
  "description" text,
  "standardRate" decimal(10,2), -- Standard billing rate
  "estimatedDuration" decimal(8,2), -- Typical duration in hours
  "requiredEquipment" text[], -- Array of required equipment types
  "safetyRequirements" text,
  "permitRequired" boolean DEFAULT false,
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Add categorization columns to existing Job table
DO $$
BEGIN
  -- Add category columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Job' AND column_name = 'categoryId') THEN
    ALTER TABLE "Job" ADD COLUMN "categoryId" uuid REFERENCES "JobCategory"(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Job' AND column_name = 'subCategoryId') THEN
    ALTER TABLE "Job" ADD COLUMN "subCategoryId" uuid REFERENCES "JobSubCategory"(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Job' AND column_name = 'serviceTypeId') THEN
    ALTER TABLE "Job" ADD COLUMN "serviceTypeId" uuid REFERENCES "ServiceType"(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Job' AND column_name = 'complexity') THEN
    ALTER TABLE "Job" ADD COLUMN "complexity" varchar(20) DEFAULT 'STANDARD'; -- SIMPLE, STANDARD, COMPLEX, CRITICAL
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Job' AND column_name = 'sector') THEN
    ALTER TABLE "Job" ADD COLUMN "sector" varchar(50); -- RESIDENTIAL, COMMERCIAL, INDUSTRIAL, UTILITY
  END IF;
END
$$;

-- Comprehensive Job Classification View
CREATE OR REPLACE VIEW "JobClassificationView" AS
SELECT 
  j.id as "jobId",
  j."jobNumber",
  j.description as "jobDescription",
  j.status,
  j.type as "jobType",
  j.sector,
  j.complexity,
  
  -- Category information
  jc.id as "categoryId",
  jc."categoryCode",
  jc."categoryName",
  jc."color" as "categoryColor",
  jc."icon" as "categoryIcon",
  
  -- Sub-category information
  jsc.id as "subCategoryId", 
  jsc."subCategoryCode",
  jsc."subCategoryName",
  jsc."defaultLaborRate",
  jsc."estimatedHours",
  jsc."requiresCertification",
  jsc."requiredSkillLevel",
  
  -- Service type information
  st.id as "serviceTypeId",
  st."serviceCode",
  st."serviceName", 
  st."standardRate",
  st."estimatedDuration",
  st."requiredEquipment",
  st."permitRequired",
  
  -- Customer information
  COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as "customerName",
  c."firstName" as "customerFirstName",
  c."lastName" as "customerLastName",
  c."companyName" as "customerCompany",
  
  -- Financial information
  j."estimatedCost",
  j."actualCost", 
  j."billedAmount",
  j."estimatedHours" as "jobEstimatedHours",
  j."actualHours" as "jobActualHours",
  
  -- Dates
  j."scheduledDate",
  j."startDate",
  j."completedDate",
  j."createdAt",
  
  -- Tags (aggregated)
  ARRAY_AGG(DISTINCT jt."tagName") FILTER (WHERE jt."tagName" IS NOT NULL) as "tags"
  
FROM "Job" j
LEFT JOIN "JobCategory" jc ON j."categoryId" = jc.id
LEFT JOIN "JobSubCategory" jsc ON j."subCategoryId" = jsc.id 
LEFT JOIN "ServiceType" st ON j."serviceTypeId" = st.id
LEFT JOIN "Customer" c ON j."customerId" = c.id
LEFT JOIN "JobTagAssignment" jta ON j.id = jta."jobId"
LEFT JOIN "JobTag" jt ON jta."tagId" = jt.id AND jt.active = true
GROUP BY j.id, j."jobNumber", j.description, j.status, j.type, j.sector, j.complexity,
         jc.id, jc."categoryCode", jc."categoryName", jc."color", jc."icon",
         jsc.id, jsc."subCategoryCode", jsc."subCategoryName", jsc."defaultLaborRate", 
         jsc."estimatedHours", jsc."requiresCertification", jsc."requiredSkillLevel",
         st.id, st."serviceCode", st."serviceName", st."standardRate", 
         st."estimatedDuration", st."requiredEquipment", st."permitRequired",
         c."firstName", c."lastName", c."companyName",
         j."estimatedCost", j."actualCost", j."billedAmount", j."estimatedHours", j."actualHours",
         j."scheduledDate", j."startDate", j."completedDate", j."createdAt"
ORDER BY j."createdAt" DESC;

-- Category Performance Analytics View
CREATE OR REPLACE VIEW "CategoryPerformanceView" AS
SELECT 
  jc.id as "categoryId",
  jc."categoryCode",
  jc."categoryName", 
  jc."color",
  
  -- Job counts
  COUNT(j.id) as "totalJobs",
  COUNT(CASE WHEN j.status = 'COMPLETED' THEN 1 END) as "completedJobs",
  COUNT(CASE WHEN j.status = 'IN_PROGRESS' THEN 1 END) as "activeJobs",
  COUNT(CASE WHEN j.status = 'SCHEDULED' THEN 1 END) as "scheduledJobs",
  
  -- Financial metrics
  SUM(j."billedAmount") as "totalRevenue",
  AVG(j."billedAmount") as "avgJobValue",
  SUM(jcost."totalJobCost") as "totalCosts",
  SUM(jcost."grossProfit") as "totalProfit",
  AVG(jcost."grossMargin") as "avgMargin",
  
  -- Time metrics
  SUM(j."actualHours") as "totalHours",
  AVG(j."actualHours") as "avgHoursPerJob",
  AVG(CASE WHEN j."estimatedHours" > 0 AND j."actualHours" > 0 THEN 
    (j."actualHours" / j."estimatedHours") * 100 ELSE NULL END) as "avgTimeAccuracy",
  
  -- Complexity breakdown
  COUNT(CASE WHEN j.complexity = 'SIMPLE' THEN 1 END) as "simpleJobs",
  COUNT(CASE WHEN j.complexity = 'STANDARD' THEN 1 END) as "standardJobs", 
  COUNT(CASE WHEN j.complexity = 'COMPLEX' THEN 1 END) as "complexJobs",
  COUNT(CASE WHEN j.complexity = 'CRITICAL' THEN 1 END) as "criticalJobs",
  
  -- Date ranges
  MIN(j."createdAt") as "firstJob",
  MAX(j."createdAt") as "lastJob",
  
  -- Performance indicators
  CASE WHEN COUNT(j.id) > 0 THEN 
    (COUNT(CASE WHEN j.status = 'COMPLETED' THEN 1 END)::decimal / COUNT(j.id)) * 100 
  ELSE 0 END as "completionRate",
  
  CASE WHEN SUM(j."billedAmount") > 0 AND SUM(jcost."totalJobCost") > 0 THEN
    ((SUM(j."billedAmount") - SUM(jcost."totalJobCost")) / SUM(j."billedAmount")) * 100
  ELSE 0 END as "profitMargin"
  
FROM "JobCategory" jc
LEFT JOIN "Job" j ON jc.id = j."categoryId"
LEFT JOIN "JobCost" jcost ON j.id = jcost."jobId"
WHERE jc.active = true
GROUP BY jc.id, jc."categoryCode", jc."categoryName", jc."color"
ORDER BY "totalRevenue" DESC;

-- Function to automatically suggest category based on job description
CREATE OR REPLACE FUNCTION suggest_job_category(job_description text) 
RETURNS TABLE(category_id uuid, category_name varchar, confidence_score decimal) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jc.id,
    jc."categoryName",
    CASE 
      -- Residential keywords
      WHEN LOWER(job_description) ~ '(residential|home|house|apartment|condo)' THEN 0.9
      -- Commercial keywords  
      WHEN LOWER(job_description) ~ '(commercial|office|retail|store|restaurant|business)' THEN 0.9
      -- Industrial keywords
      WHEN LOWER(job_description) ~ '(industrial|factory|warehouse|manufacturing|plant)' THEN 0.9
      -- Service keywords
      WHEN LOWER(job_description) ~ '(service|repair|maintenance|troubleshoot|fix)' THEN 0.8
      -- Installation keywords
      WHEN LOWER(job_description) ~ '(install|new|panel|outlet|circuit|wire)' THEN 0.8
      -- Emergency keywords
      WHEN LOWER(job_description) ~ '(emergency|urgent|power out|no power)' THEN 0.9
      ELSE 0.3
    END as confidence_score
  FROM "JobCategory" jc
  WHERE jc.active = true
    AND CASE 
      WHEN LOWER(job_description) ~ '(residential|home|house|apartment|condo)' 
        AND jc."categoryCode" = 'RESIDENTIAL' THEN true
      WHEN LOWER(job_description) ~ '(commercial|office|retail|store|restaurant|business)' 
        AND jc."categoryCode" = 'COMMERCIAL' THEN true  
      WHEN LOWER(job_description) ~ '(industrial|factory|warehouse|manufacturing|plant)' 
        AND jc."categoryCode" = 'INDUSTRIAL' THEN true
      WHEN LOWER(job_description) ~ '(service|repair|maintenance|troubleshoot|fix)' 
        AND jc."categoryCode" = 'SERVICE' THEN true
      WHEN LOWER(job_description) ~ '(install|new|panel|outlet|circuit|wire)' 
        AND jc."categoryCode" = 'INSTALLATION' THEN true
      WHEN LOWER(job_description) ~ '(emergency|urgent|power out|no power)' 
        AND jc."categoryCode" = 'EMERGENCY' THEN true
      ELSE jc."categoryCode" = 'GENERAL'
    END
  ORDER BY confidence_score DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- Insert standard electrical job categories
INSERT INTO "JobCategory" ("categoryCode", "categoryName", "description", "color", "icon", "sortOrder")
VALUES 
  ('RESIDENTIAL', 'Residential', 'Residential electrical work including homes, apartments, and condos', '#4CAF50', 'home', 1),
  ('COMMERCIAL', 'Commercial', 'Commercial electrical work for offices, retail, restaurants', '#2196F3', 'business', 2),
  ('INDUSTRIAL', 'Industrial', 'Industrial electrical work for factories, warehouses, manufacturing', '#FF9800', 'factory', 3),
  ('SERVICE', 'Service & Repair', 'Electrical service calls, troubleshooting, and repairs', '#F44336', 'build', 4),
  ('INSTALLATION', 'New Installation', 'New electrical installations and panel upgrades', '#9C27B0', 'electrical_services', 5),
  ('EMERGENCY', 'Emergency', 'Emergency electrical calls and urgent repairs', '#E91E63', 'warning', 6),
  ('MAINTENANCE', 'Maintenance', 'Preventive maintenance and inspections', '#607D8B', 'schedule', 7),
  ('LOW_VOLTAGE', 'Low Voltage', 'Low voltage systems, data, security, and communications', '#00BCD4', 'router', 8),
  ('UTILITY', 'Utility Work', 'Utility-scale electrical work and power line services', '#795548', 'power', 9),
  ('GENERAL', 'General', 'General electrical work not fitting other categories', '#757575', 'work', 10)
ON CONFLICT ("categoryCode") DO NOTHING;

-- Insert sub-categories for each main category
INSERT INTO "JobSubCategory" ("categoryId", "subCategoryCode", "subCategoryName", "description", "defaultLaborRate", "estimatedHours", "requiredSkillLevel")
SELECT 
  jc.id,
  sub.code,
  sub.name,
  sub.description,
  sub.rate,
  sub.hours,
  sub.skill
FROM "JobCategory" jc
CROSS JOIN (VALUES
  -- Residential sub-categories
  ('RESIDENTIAL', 'PANEL_UPGRADE', 'Panel Upgrade', 'Electrical panel replacement and upgrade', 85.00, 6.0, 'JOURNEYMAN'),
  ('RESIDENTIAL', 'OUTLET_INSTALL', 'Outlet Installation', 'New electrical outlet installation', 75.00, 2.0, 'JOURNEYMAN'),
  ('RESIDENTIAL', 'CEILING_FAN', 'Ceiling Fan', 'Ceiling fan installation and wiring', 75.00, 1.5, 'JOURNEYMAN'),
  ('RESIDENTIAL', 'LIGHTING', 'Lighting', 'Interior and exterior lighting installation', 75.00, 3.0, 'JOURNEYMAN'),
  ('RESIDENTIAL', 'REWIRE', 'House Rewiring', 'Complete or partial house rewiring', 85.00, 24.0, 'JOURNEYMAN'),
  
  -- Commercial sub-categories  
  ('COMMERCIAL', 'OFFICE_WIRING', 'Office Wiring', 'Office electrical installation and wiring', 95.00, 8.0, 'JOURNEYMAN'),
  ('COMMERCIAL', 'RETAIL_LIGHTING', 'Retail Lighting', 'Commercial lighting systems', 90.00, 6.0, 'JOURNEYMAN'),
  ('COMMERCIAL', 'RESTAURANT', 'Restaurant Electrical', 'Restaurant kitchen and dining electrical', 95.00, 12.0, 'JOURNEYMAN'),
  
  -- Industrial sub-categories
  ('INDUSTRIAL', 'MOTOR_CONTROL', 'Motor Control', 'Industrial motor control systems', 110.00, 8.0, 'FOREMAN'),
  ('INDUSTRIAL', 'MACHINERY', 'Machinery Wiring', 'Industrial machinery electrical connections', 105.00, 6.0, 'JOURNEYMAN'),
  
  -- Service sub-categories
  ('SERVICE', 'TROUBLESHOOT', 'Troubleshooting', 'Electrical problem diagnosis and repair', 95.00, 2.0, 'JOURNEYMAN'),
  ('SERVICE', 'CIRCUIT_REPAIR', 'Circuit Repair', 'Circuit breaker and wiring repairs', 85.00, 3.0, 'JOURNEYMAN'),
  
  -- Emergency sub-categories
  ('EMERGENCY', 'POWER_OUTAGE', 'Power Outage', 'Emergency power restoration', 150.00, 4.0, 'JOURNEYMAN'),
  ('EMERGENCY', 'ELECTRICAL_FIRE', 'Electrical Fire', 'Post-fire electrical assessment and repair', 150.00, 8.0, 'FOREMAN')
) AS sub(category_code, code, name, description, rate, hours, skill)
WHERE jc."categoryCode" = sub.category_code
ON CONFLICT ("categoryId", "subCategoryCode") DO NOTHING;

-- Insert common job tags
INSERT INTO "JobTag" ("tagName", "tagType", "description", "color")
VALUES 
  ('High Priority', 'PRIORITY', 'High priority job requiring immediate attention', '#F44336'),
  ('Permit Required', 'CERTIFICATION', 'Job requires electrical permit', '#FF9800'),
  ('Safety Critical', 'PRIORITY', 'Safety-critical electrical work', '#E91E63'),
  ('Customer VIP', 'PRIORITY', 'VIP customer requiring special attention', '#9C27B0'),
  ('Warranty Work', 'GENERAL', 'Work covered under warranty', '#4CAF50'),
  ('Follow-up Required', 'GENERAL', 'Job requires follow-up visit', '#2196F3'),
  ('Complex Wiring', 'COMPLEXITY', 'Complex electrical wiring project', '#FF5722'),
  ('New Construction', 'GENERAL', 'New construction electrical work', '#607D8B'),
  ('Renovation', 'GENERAL', 'Electrical work for renovation project', '#795548'),
  ('Code Compliance', 'CERTIFICATION', 'Work required for code compliance', '#009688')
ON CONFLICT ("tagName") DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_category ON "Job"("categoryId", "status");
CREATE INDEX IF NOT EXISTS idx_job_subcategory ON "Job"("subCategoryId", "sector");
CREATE INDEX IF NOT EXISTS idx_job_service_type ON "Job"("serviceTypeId");
CREATE INDEX IF NOT EXISTS idx_job_tag_assignment_job ON "JobTagAssignment"("jobId");
CREATE INDEX IF NOT EXISTS idx_job_tag_assignment_tag ON "JobTagAssignment"("tagId");
CREATE INDEX IF NOT EXISTS idx_job_category_active ON "JobCategory"("active", "sortOrder");
CREATE INDEX IF NOT EXISTS idx_job_subcategory_category ON "JobSubCategory"("categoryId", "active");

COMMENT ON TABLE "JobCategory" IS 'High-level business sector classification for jobs';
COMMENT ON TABLE "JobSubCategory" IS 'Detailed sub-classification within job categories';
COMMENT ON TABLE "JobTag" IS 'Flexible tagging system for cross-cutting job attributes';
COMMENT ON TABLE "ServiceType" IS 'Specific electrical services with standardized rates';
COMMENT ON VIEW "JobClassificationView" IS 'Comprehensive view of job classification data';
COMMENT ON VIEW "CategoryPerformanceView" IS 'Performance analytics by job category';
COMMENT ON FUNCTION suggest_job_category(text) IS 'AI-assisted job category suggestion based on description';