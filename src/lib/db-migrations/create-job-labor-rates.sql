-- Job Labor Rate Overrides Migration
-- Creates table to store per-job, per-worker labor rate overrides

-- Job Labor Rate Overrides Table
CREATE TABLE IF NOT EXISTS "JobLaborRates" (
  id SERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  overridden_rate DECIMAL(10,2) NOT NULL CHECK (overridden_rate > 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT REFERENCES "User"(id),
  notes TEXT,
  
  -- Ensure one override per user per job
  UNIQUE(job_id, user_id)
);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_job_labor_rates_updated_at ON "JobLaborRates";
CREATE TRIGGER update_job_labor_rates_updated_at
  BEFORE UPDATE ON "JobLaborRates"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_labor_rates_job_id ON "JobLaborRates"(job_id);
CREATE INDEX IF NOT EXISTS idx_job_labor_rates_user_id ON "JobLaborRates"(user_id);
CREATE INDEX IF NOT EXISTS idx_job_labor_rates_composite ON "JobLaborRates"(job_id, user_id);

-- Add comments for documentation
COMMENT ON TABLE "JobLaborRates" IS 'Per-job labor rate overrides for specific workers';
COMMENT ON COLUMN "JobLaborRates".job_id IS 'Reference to the job';
COMMENT ON COLUMN "JobLaborRates".user_id IS 'Reference to the worker/user';
COMMENT ON COLUMN "JobLaborRates".overridden_rate IS 'Custom hourly rate for this worker on this job';
COMMENT ON COLUMN "JobLaborRates".notes IS 'Optional reason for rate override';

-- Create view for easy querying with user and job details
CREATE OR REPLACE VIEW "JobLaborRatesWithDetails" AS
SELECT 
  jlr.id,
  jlr.job_id,
  jlr.user_id,
  jlr.overridden_rate,
  jlr.created_at,
  jlr.updated_at,
  jlr.notes,
  u.name as user_name,
  u.email as user_email,
  u.role as user_role,
  j."jobNumber",
  j.description as job_description,
  j.status as job_status
FROM "JobLaborRates" jlr
INNER JOIN "User" u ON jlr.user_id = u.id
INNER JOIN "Job" j ON jlr.job_id = j.id;

COMMENT ON VIEW "JobLaborRatesWithDetails" IS 'Job labor rates with user and job information for easy querying';

-- Function to get effective labor rate for a user on a job
CREATE OR REPLACE FUNCTION get_effective_labor_rate(p_job_id TEXT, p_user_id TEXT)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  override_rate DECIMAL(10,2);
  default_rate DECIMAL(10,2);
BEGIN
  -- First, check for job-specific override
  SELECT overridden_rate INTO override_rate
  FROM "JobLaborRates"
  WHERE job_id = p_job_id AND user_id = p_user_id;
  
  IF override_rate IS NOT NULL THEN
    RETURN override_rate;
  END IF;
  
  -- If no override, try to get default rate from user's labor rate record
  -- This assumes there's a default labor rate system in place
  SELECT COALESCE(
    (SELECT rate FROM "LaborRate" WHERE user_id = p_user_id AND effective_date <= CURRENT_DATE ORDER BY effective_date DESC LIMIT 1),
    85.00  -- Default fallback rate
  ) INTO default_rate;
  
  RETURN default_rate;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_effective_labor_rate(TEXT, TEXT) IS 'Returns the effective labor rate for a user on a job, considering overrides';

-- Function to apply rate overrides to time entries for cost calculation
CREATE OR REPLACE FUNCTION calculate_job_labor_cost_with_overrides(p_job_id TEXT)
RETURNS TABLE(
  user_id TEXT,
  user_name TEXT,
  total_hours DECIMAL(10,2),
  effective_rate DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  has_override BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    te.user_id,
    u.name as user_name,
    COALESCE(SUM(te.hours), 0) as total_hours,
    get_effective_labor_rate(p_job_id, te.user_id) as effective_rate,
    COALESCE(SUM(te.hours), 0) * get_effective_labor_rate(p_job_id, te.user_id) as total_cost,
    EXISTS(SELECT 1 FROM "JobLaborRates" WHERE job_id = p_job_id AND user_id = te.user_id) as has_override
  FROM "TimeEntry" te
  INNER JOIN "User" u ON te.user_id = u.id
  WHERE te.job_id = p_job_id
  GROUP BY te.user_id, u.name
  ORDER BY u.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_job_labor_cost_with_overrides(TEXT) IS 'Calculates labor costs for a job considering rate overrides';

-- Sample data for testing (optional - can be removed in production)
-- This assumes some basic job and user data exists
DO $$
BEGIN
  -- Only insert if we have test data
  IF EXISTS (SELECT 1 FROM "Job" LIMIT 1) AND EXISTS (SELECT 1 FROM "User" LIMIT 1) THEN
    -- Insert sample rate override (if not already exists)
    INSERT INTO "JobLaborRates" (job_id, user_id, overridden_rate, notes)
    SELECT 
      j.id,
      u.id,
      125.00,
      'Senior technician rate for complex electrical work'
    FROM "Job" j, "User" u
    WHERE j."jobNumber" LIKE '%001%'
    AND u.name LIKE '%Tim%'
    LIMIT 1
    ON CONFLICT (job_id, user_id) DO NOTHING;
  END IF;
END $$;