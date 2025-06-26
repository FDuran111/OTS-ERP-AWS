-- Create LaborRate table with comprehensive rate management
CREATE TABLE IF NOT EXISTS "LaborRate" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  description text,
  "hourlyRate" decimal(10,2) NOT NULL CHECK ("hourlyRate" > 0),
  "skillLevel" varchar(50) NOT NULL CHECK ("skillLevel" IN ('APPRENTICE', 'HELPER', 'TECH_L1', 'TECH_L2', 'JOURNEYMAN', 'FOREMAN', 'LOW_VOLTAGE', 'CABLING', 'INSTALL')),
  category varchar(50) NOT NULL DEFAULT 'ELECTRICAL' CHECK (category IN ('ELECTRICAL', 'LOW_VOLTAGE', 'SERVICE', 'INSTALL', 'SPECIALTY')),
  "effectiveDate" date NOT NULL DEFAULT CURRENT_DATE,
  "expiryDate" date NULL,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updatedAt" timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_laborrate_skill_level ON "LaborRate"("skillLevel");
CREATE INDEX IF NOT EXISTS idx_laborrate_category ON "LaborRate"(category);
CREATE INDEX IF NOT EXISTS idx_laborrate_active ON "LaborRate"(active);
CREATE INDEX IF NOT EXISTS idx_laborrate_effective_date ON "LaborRate"("effectiveDate");
CREATE INDEX IF NOT EXISTS idx_laborrate_name ON "LaborRate"(name);

-- Create unique constraint on name for active rates
CREATE UNIQUE INDEX IF NOT EXISTS idx_laborrate_name_active_unique 
ON "LaborRate"(name) WHERE active = true;

-- Add constraint to ensure expiry date is after effective date
ALTER TABLE "LaborRate" 
ADD CONSTRAINT chk_laborrate_date_range 
CHECK ("expiryDate" IS NULL OR "expiryDate" > "effectiveDate");

-- Insert default labor rates for electrical work
INSERT INTO "LaborRate" (name, description, "hourlyRate", "skillLevel", category, "effectiveDate") VALUES
('Apprentice Electrician', 'Entry-level apprentice electrician', 45.00, 'APPRENTICE', 'ELECTRICAL', CURRENT_DATE),
('Helper/Laborer', 'General helper and laborer', 35.00, 'HELPER', 'ELECTRICAL', CURRENT_DATE),
('Technician Level 1', 'Junior technician with basic skills', 55.00, 'TECH_L1', 'ELECTRICAL', CURRENT_DATE),
('Technician Level 2', 'Senior technician with advanced skills', 65.00, 'TECH_L2', 'ELECTRICAL', CURRENT_DATE),
('Journeyman Electrician', 'Certified journeyman electrician', 75.00, 'JOURNEYMAN', 'ELECTRICAL', CURRENT_DATE),
('Foreman/Supervisor', 'Project foreman and supervisor', 85.00, 'FOREMAN', 'ELECTRICAL', CURRENT_DATE),
('Low Voltage Specialist', 'Low voltage and data systems specialist', 60.00, 'LOW_VOLTAGE', 'LOW_VOLTAGE', CURRENT_DATE),
('Cabling Technician', 'Network and cabling technician', 55.00, 'CABLING', 'LOW_VOLTAGE', CURRENT_DATE),
('Installation Specialist', 'Equipment installation specialist', 70.00, 'INSTALL', 'INSTALL', CURRENT_DATE),
('Service Call Rate', 'Standard service call rate', 95.00, 'JOURNEYMAN', 'SERVICE', CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Create function to get current rate for a skill level
CREATE OR REPLACE FUNCTION get_current_labor_rate(skill_level_param varchar)
RETURNS TABLE(
  id uuid,
  name varchar,
  "hourlyRate" decimal,
  "skillLevel" varchar,
  category varchar
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lr.id,
    lr.name,
    lr."hourlyRate",
    lr."skillLevel",
    lr.category
  FROM "LaborRate" lr
  WHERE lr."skillLevel" = skill_level_param
    AND lr.active = true
    AND lr."effectiveDate" <= CURRENT_DATE
    AND (lr."expiryDate" IS NULL OR lr."expiryDate" > CURRENT_DATE)
  ORDER BY lr."effectiveDate" DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate job cost based on hours and skill level
CREATE OR REPLACE FUNCTION calculate_labor_cost(
  skill_level_param varchar,
  hours_worked decimal
) RETURNS decimal AS $$
DECLARE
  hourly_rate decimal;
BEGIN
  SELECT lr."hourlyRate" INTO hourly_rate
  FROM "LaborRate" lr
  WHERE lr."skillLevel" = skill_level_param
    AND lr.active = true
    AND lr."effectiveDate" <= CURRENT_DATE
    AND (lr."expiryDate" IS NULL OR lr."expiryDate" > CURRENT_DATE)
  ORDER BY lr."effectiveDate" DESC
  LIMIT 1;
  
  IF hourly_rate IS NULL THEN
    RAISE EXCEPTION 'No active labor rate found for skill level: %', skill_level_param;
  END IF;
  
  RETURN hourly_rate * hours_worked;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updatedAt automatically
CREATE OR REPLACE FUNCTION update_laborrate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_laborrate_updated_at
  BEFORE UPDATE ON "LaborRate"
  FOR EACH ROW
  EXECUTE FUNCTION update_laborrate_updated_at();

-- Add comments for documentation
COMMENT ON TABLE "LaborRate" IS 'Labor rates for different skill levels and categories';
COMMENT ON COLUMN "LaborRate"."skillLevel" IS 'Skill level classification for billing purposes';
COMMENT ON COLUMN "LaborRate".category IS 'Work category for rate organization';
COMMENT ON COLUMN "LaborRate"."effectiveDate" IS 'Date when this rate becomes effective';
COMMENT ON COLUMN "LaborRate"."expiryDate" IS 'Date when this rate expires (NULL = no expiry)';
COMMENT ON FUNCTION get_current_labor_rate(varchar) IS 'Get the current active rate for a skill level';
COMMENT ON FUNCTION calculate_labor_cost(varchar, decimal) IS 'Calculate total labor cost for given skill level and hours';