-- Create company assets and related tables

-- CompanyAsset table for tracking company equipment and assets
CREATE TABLE IF NOT EXISTS "CompanyAsset" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "assetNumber" VARCHAR(50) UNIQUE NOT NULL,
    "assetType" VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    "serialNumber" VARCHAR(100),
    "purchaseDate" DATE,
    "purchasePrice" DECIMAL(10,2),
    "currentValue" DECIMAL(10,2),
    "depreciationMethod" VARCHAR(50) DEFAULT 'STRAIGHT_LINE',
    "usefulLife" INTEGER DEFAULT 5,
    "annualDepreciation" DECIMAL(10,2) DEFAULT 0,
    "maintenanceCost" DECIMAL(10,2) DEFAULT 0,
    "insuranceCost" DECIMAL(10,2) DEFAULT 0,
    "totalAnnualCost" DECIMAL(10,2) DEFAULT 0,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    notes TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AssetAssignment table for tracking who has which assets
CREATE TABLE IF NOT EXISTS "AssetAssignment" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "assetId" UUID REFERENCES "CompanyAsset"(id) ON DELETE CASCADE,
    "userId" UUID REFERENCES "User"(id),
    "assignedDate" DATE DEFAULT CURRENT_DATE,
    "returnedDate" DATE,
    purpose TEXT,
    condition VARCHAR(50) DEFAULT 'GOOD',
    notes TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- EmployeeOverhead table for tracking employee costs
CREATE TABLE IF NOT EXISTS "EmployeeOverhead" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID REFERENCES "User"(id) UNIQUE,
    "baseSalary" DECIMAL(10,2) DEFAULT 0,
    "hourlyRate" DECIMAL(10,2) DEFAULT 0,
    "overtimeRate" DECIMAL(10,2) DEFAULT 0,
    "employmentType" VARCHAR(50) DEFAULT 'FULL_TIME',
    "healthInsurance" DECIMAL(10,2) DEFAULT 0,
    "dentalInsurance" DECIMAL(10,2) DEFAULT 0,
    "visionInsurance" DECIMAL(10,2) DEFAULT 0,
    "lifeInsurance" DECIMAL(10,2) DEFAULT 0,
    "retirementMatch" DECIMAL(10,2) DEFAULT 0,
    "payrollTaxes" DECIMAL(10,2) DEFAULT 0,
    "workersComp" DECIMAL(10,2) DEFAULT 0,
    "vehicleAllowance" DECIMAL(10,2) DEFAULT 0,
    "phoneAllowance" DECIMAL(10,2) DEFAULT 0,
    "otherBenefits" DECIMAL(10,2) DEFAULT 0,
    "totalMonthlyBurden" DECIMAL(10,2) DEFAULT 0,
    "totalAnnualBurden" DECIMAL(10,2) DEFAULT 0,
    "effectiveDate" DATE DEFAULT CURRENT_DATE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_asset_type ON "CompanyAsset"("assetType");
CREATE INDEX IF NOT EXISTS idx_company_asset_category ON "CompanyAsset"(category);
CREATE INDEX IF NOT EXISTS idx_company_asset_status ON "CompanyAsset"(status);
CREATE INDEX IF NOT EXISTS idx_asset_assignment_asset ON "AssetAssignment"("assetId");
CREATE INDEX IF NOT EXISTS idx_asset_assignment_user ON "AssetAssignment"("userId");
CREATE INDEX IF NOT EXISTS idx_employee_overhead_user ON "EmployeeOverhead"("userId");

-- Insert sample company assets
INSERT INTO "CompanyAsset" ("assetNumber", "assetType", category, name, "purchaseDate", "purchasePrice", "currentValue", "maintenanceCost", "insuranceCost")
VALUES 
('TRUCK-001', 'TRUCK', 'VEHICLE', 'Ford F-150 Service Truck', '2022-01-15', 45000, 38000, 2000, 1500),
('TRUCK-002', 'BUCKET_TRUCK', 'VEHICLE', 'Altec Bucket Truck', '2021-06-01', 125000, 98000, 5000, 3500),
('GEN-001', 'GENERATOR', 'FIELD_EQUIPMENT', '50KW Portable Generator', '2023-03-10', 15000, 14000, 500, 200),
('TOOL-001', 'TOOLS', 'TOOLS', 'Milwaukee Tool Set', '2023-01-01', 5000, 4500, 100, 50),
('LAPTOP-001', 'LAPTOP', 'TECHNOLOGY', 'Dell Precision Laptop', '2023-05-01', 2500, 2000, 50, 100)
ON CONFLICT ("assetNumber") DO NOTHING;

-- Calculate annual costs for assets
UPDATE "CompanyAsset" 
SET 
    "annualDepreciation" = CASE 
        WHEN "purchasePrice" > 0 AND "usefulLife" > 0 
        THEN "purchasePrice" / "usefulLife"
        ELSE 0
    END,
    "totalAnnualCost" = COALESCE("annualDepreciation", 0) + 
                       COALESCE("maintenanceCost", 0) + 
                       COALESCE("insuranceCost", 0);

-- Insert sample employee overhead for existing users
INSERT INTO "EmployeeOverhead" ("userId", "baseSalary", "hourlyRate", "healthInsurance", "payrollTaxes", "workersComp", "totalMonthlyBurden", "totalAnnualBurden")
SELECT 
    u.id,
    CASE 
        WHEN u.role = 'OWNER_ADMIN' THEN 120000
        WHEN u.role = 'FOREMAN' THEN 75000
        ELSE 50000
    END as "baseSalary",
    CASE 
        WHEN u.role = 'OWNER_ADMIN' THEN 75
        WHEN u.role = 'FOREMAN' THEN 45
        ELSE 30
    END as "hourlyRate",
    500 as "healthInsurance",
    CASE 
        WHEN u.role = 'OWNER_ADMIN' THEN 1200
        WHEN u.role = 'FOREMAN' THEN 750
        ELSE 500
    END as "payrollTaxes",
    200 as "workersComp",
    CASE 
        WHEN u.role = 'OWNER_ADMIN' THEN 12000
        WHEN u.role = 'FOREMAN' THEN 7500
        ELSE 5000
    END as "totalMonthlyBurden",
    CASE 
        WHEN u.role = 'OWNER_ADMIN' THEN 144000
        WHEN u.role = 'FOREMAN' THEN 90000
        ELSE 60000
    END as "totalAnnualBurden"
FROM "User" u
WHERE u.active = true
ON CONFLICT ("userId") DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Company assets and employee overhead tables created successfully!';
END $$;