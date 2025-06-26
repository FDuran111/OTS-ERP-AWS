-- Fix get_available_crew function to use new role system
CREATE OR REPLACE FUNCTION get_available_crew(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS TABLE (
  user_id TEXT,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT,
  conflicts INTEGER
) AS $$
BEGIN
  -- Default end date to same day if not provided
  IF p_end_date IS NULL THEN
    p_end_date := p_start_date + INTERVAL '1 day';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    COUNT(ca.id)::INTEGER as conflicts
  FROM "User" u
  LEFT JOIN "CrewAssignment" ca ON u.id = ca."userId"
  LEFT JOIN "JobSchedule" js ON ca."scheduleId" = js.id
    AND js."startDate" < p_end_date
    AND (js."endDate" IS NULL OR js."endDate" > p_start_date)
    AND js.status IN ('SCHEDULED', 'IN_PROGRESS')
    AND ca.status = 'ASSIGNED'
  WHERE u.role IN ('OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE')
    AND u.active = TRUE
  GROUP BY u.id, u.name, u.email, u.role
  ORDER BY conflicts ASC, u.name ASC;
END;
$$ LANGUAGE plpgsql;

-- Update comment
COMMENT ON FUNCTION get_available_crew IS 'Returns available crew members (OWNER_ADMIN, FOREMAN, EMPLOYEE) for a given date range with conflict count';