-- Create job categorization tables

-- JobCategory table
CREATE TABLE IF NOT EXISTS "JobCategory" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "categoryCode" VARCHAR(20) UNIQUE NOT NULL,
    "categoryName" VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#1976d2',
    icon VARCHAR(50) DEFAULT 'work',
    active BOOLEAN DEFAULT true,
    "sortOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- JobSubCategory table
CREATE TABLE IF NOT EXISTS "JobSubCategory" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "categoryId" UUID REFERENCES "JobCategory"(id) ON DELETE CASCADE,
    "subCategoryCode" VARCHAR(20) NOT NULL,
    "subCategoryName" VARCHAR(100) NOT NULL,
    description TEXT,
    "defaultLaborRate" DECIMAL(10,2),
    "estimatedHours" DECIMAL(10,2),
    "requiresCertification" BOOLEAN DEFAULT false,
    "requiredSkillLevel" VARCHAR(50),
    active BOOLEAN DEFAULT true,
    "sortOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("categoryId", "subCategoryCode")
);

-- JobTag table
CREATE TABLE IF NOT EXISTS "JobTag" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tagName" VARCHAR(50) UNIQUE NOT NULL,
    "tagCategory" VARCHAR(50),
    color VARCHAR(7) DEFAULT '#9e9e9e',
    description TEXT,
    active BOOLEAN DEFAULT true,
    "usageCount" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- JobToTag junction table
CREATE TABLE IF NOT EXISTS "JobToTag" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "jobId" UUID REFERENCES "Job"(id) ON DELETE CASCADE,
    "tagId" UUID REFERENCES "JobTag"(id) ON DELETE CASCADE,
    "addedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "addedBy" UUID REFERENCES "User"(id),
    UNIQUE("jobId", "tagId")
);

-- Add category columns to Job table
ALTER TABLE "Job"
    ADD COLUMN IF NOT EXISTS "categoryId" UUID REFERENCES "JobCategory"(id),
    ADD COLUMN IF NOT EXISTS "subCategoryId" UUID REFERENCES "JobSubCategory"(id),
    ADD COLUMN IF NOT EXISTS complexity VARCHAR(20) DEFAULT 'STANDARD';

-- Create view for category performance statistics
CREATE OR REPLACE VIEW "CategoryPerformanceView" AS
SELECT 
    jc.id as "categoryId",
    jc."categoryCode",
    jc."categoryName",
    jc.color,
    COUNT(DISTINCT j.id) as "totalJobs",
    COUNT(DISTINCT CASE WHEN j.status = 'COMPLETED' THEN j.id END) as "completedJobs",
    COUNT(DISTINCT CASE WHEN j.status IN ('IN_PROGRESS', 'DISPATCHED') THEN j.id END) as "activeJobs",
    COUNT(DISTINCT CASE WHEN j.status = 'SCHEDULED' THEN j.id END) as "scheduledJobs",
    COALESCE(SUM(j."billedAmount"), 0) as "totalRevenue",
    COALESCE(AVG(j."billedAmount"), 0) as "avgJobValue",
    COALESCE(SUM(j.estimated_amount), 0) as "totalCosts",
    COALESCE(SUM(j."billedAmount") - SUM(j.estimated_amount), 0) as "totalProfit",
    CASE 
        WHEN SUM(j."billedAmount") > 0 
        THEN ((SUM(j."billedAmount") - SUM(j.estimated_amount)) / SUM(j."billedAmount")) * 100
        ELSE 0
    END as "avgMargin",
    COALESCE(SUM(j.actual_hours), 0) as "totalHours",
    COALESCE(AVG(j.actual_hours), 0) as "avgHoursPerJob",
    CASE 
        WHEN AVG(j.estimated_hours) > 0 
        THEN (AVG(j.actual_hours) / AVG(j.estimated_hours)) * 100
        ELSE 0
    END as "avgTimeAccuracy",
    COUNT(DISTINCT CASE WHEN j.complexity = 'SIMPLE' THEN j.id END) as "simpleJobs",
    COUNT(DISTINCT CASE WHEN j.complexity = 'STANDARD' THEN j.id END) as "standardJobs",
    COUNT(DISTINCT CASE WHEN j.complexity = 'COMPLEX' THEN j.id END) as "complexJobs",
    COUNT(DISTINCT CASE WHEN j.complexity = 'CRITICAL' THEN j.id END) as "criticalJobs",
    CASE 
        WHEN COUNT(j.id) > 0 
        THEN (COUNT(CASE WHEN j.status = 'COMPLETED' THEN 1 END)::FLOAT / COUNT(j.id)) * 100
        ELSE 0
    END as "completionRate",
    CASE 
        WHEN SUM(j."billedAmount") > 0 
        THEN ((SUM(j."billedAmount") - SUM(j.estimated_amount)) / SUM(j."billedAmount")) * 100
        ELSE 0
    END as "profitMargin",
    MIN(j."createdAt") as "firstJob",
    MAX(j."createdAt") as "lastJob"
FROM "JobCategory" jc
LEFT JOIN "Job" j ON jc.id = j."categoryId"
GROUP BY jc.id, jc."categoryCode", jc."categoryName", jc.color;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_category ON "Job"("categoryId");
CREATE INDEX IF NOT EXISTS idx_job_subcategory ON "Job"("subCategoryId");
CREATE INDEX IF NOT EXISTS idx_job_complexity ON "Job"(complexity);
CREATE INDEX IF NOT EXISTS idx_jobsubcategory_category ON "JobSubCategory"("categoryId");
CREATE INDEX IF NOT EXISTS idx_jobtotag_job ON "JobToTag"("jobId");
CREATE INDEX IF NOT EXISTS idx_jobtotag_tag ON "JobToTag"("tagId");

-- Insert default categories
INSERT INTO "JobCategory" ("categoryCode", "categoryName", description, color, icon) VALUES
('ELECTRICAL', 'Electrical', 'General electrical work', '#f44336', 'electric_bolt'),
('SERVICE', 'Service Call', 'Service and repair calls', '#ff9800', 'build'),
('INSTALL', 'Installation', 'Equipment installation', '#4caf50', 'construction'),
('MAINT', 'Maintenance', 'Preventive maintenance', '#2196f3', 'engineering'),
('EMERG', 'Emergency', 'Emergency repairs', '#e91e63', 'warning'),
('CONSULT', 'Consultation', 'Consulting and planning', '#9c27b0', 'psychology')
ON CONFLICT ("categoryCode") DO NOTHING;

-- Insert default sub-categories for ELECTRICAL
INSERT INTO "JobSubCategory" ("categoryId", "subCategoryCode", "subCategoryName", "defaultLaborRate", "estimatedHours")
SELECT 
    id,
    'RESI-WIRE',
    'Residential Wiring',
    75.00,
    8
FROM "JobCategory" WHERE "categoryCode" = 'ELECTRICAL'
ON CONFLICT ("categoryId", "subCategoryCode") DO NOTHING;

INSERT INTO "JobSubCategory" ("categoryId", "subCategoryCode", "subCategoryName", "defaultLaborRate", "estimatedHours")
SELECT 
    id,
    'COMM-WIRE',
    'Commercial Wiring',
    85.00,
    16
FROM "JobCategory" WHERE "categoryCode" = 'ELECTRICAL'
ON CONFLICT ("categoryId", "subCategoryCode") DO NOTHING;

INSERT INTO "JobSubCategory" ("categoryId", "subCategoryCode", "subCategoryName", "defaultLaborRate", "estimatedHours")
SELECT 
    id,
    'PANEL-UPG',
    'Panel Upgrade',
    95.00,
    6
FROM "JobCategory" WHERE "categoryCode" = 'ELECTRICAL'
ON CONFLICT ("categoryId", "subCategoryCode") DO NOTHING;

-- Insert default tags
INSERT INTO "JobTag" ("tagName", "tagCategory", color) VALUES
('urgent', 'Priority', '#f44336'),
('warranty', 'Service', '#4caf50'),
('repeat-customer', 'Customer', '#2196f3'),
('new-construction', 'Type', '#ff9800'),
('retrofit', 'Type', '#9c27b0'),
('troubleshooting', 'Service', '#795548'),
('scheduled-maintenance', 'Service', '#607d8b'),
('after-hours', 'Schedule', '#e91e63')
ON CONFLICT ("tagName") DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Job categorization tables created successfully!';
END $$;