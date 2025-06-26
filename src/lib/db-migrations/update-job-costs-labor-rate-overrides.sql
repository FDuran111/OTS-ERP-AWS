-- Update Job Costs to Support Labor Rate Overrides
-- This migration updates the add_labor_cost_from_time_entry function to use job-specific rate overrides

-- Update function to add labor cost from time entry (with rate override support)
CREATE OR REPLACE FUNCTION add_labor_cost_from_time_entry(
  job_id_param text,
  user_id_param text,
  hours_param decimal,
  work_date_param date,
  time_entry_id_param uuid DEFAULT NULL
) RETURNS void AS $$
DECLARE
  skill_level_var varchar;
  hourly_rate_var decimal;
  labor_rate_id_var text;
  total_cost_var decimal;
BEGIN
  -- Get user's skill level (from User table or default)
  SELECT COALESCE(role, 'JOURNEYMAN') INTO skill_level_var
  FROM "User" WHERE id = user_id_param;
  
  -- Map role to skill level if needed
  CASE skill_level_var
    WHEN 'APPRENTICE' THEN skill_level_var := 'APPRENTICE';
    WHEN 'FIELD_CREW' THEN skill_level_var := 'JOURNEYMAN';
    WHEN 'ADMIN' THEN skill_level_var := 'FOREMAN';
    ELSE skill_level_var := 'JOURNEYMAN';
  END CASE;
  
  -- Get effective labor rate (considering job-specific overrides)
  SELECT get_effective_labor_rate(job_id_param, user_id_param) INTO hourly_rate_var;
  
  -- If no effective rate found, fall back to skill level-based rate
  IF hourly_rate_var IS NULL THEN
    SELECT id, "hourlyRate" INTO labor_rate_id_var, hourly_rate_var
    FROM get_current_labor_rate(skill_level_var);
    
    -- Final default rate if none found
    IF hourly_rate_var IS NULL THEN
      hourly_rate_var := 65.00; -- Default journeyman rate
    END IF;
  END IF;
  
  total_cost_var := hours_param * hourly_rate_var;
  
  -- Insert labor cost record
  INSERT INTO "JobLaborCost" (
    "jobId", "userId", "laborRateId", "skillLevel", 
    "hourlyRate", "hoursWorked", "totalCost", 
    "workDate", "timeEntryId"
  ) VALUES (
    job_id_param, user_id_param, labor_rate_id_var, skill_level_var,
    hourly_rate_var, hours_param, total_cost_var, 
    work_date_param, time_entry_id_param
  );
  
  -- Update job costs summary
  PERFORM calculate_job_costs(job_id_param);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_labor_cost_from_time_entry(TEXT, TEXT, DECIMAL, DATE, UUID) IS 'Adds labor cost record considering job-specific rate overrides';