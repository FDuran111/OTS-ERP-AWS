-- Job Scheduling System Migration
-- Creates tables for scheduling jobs with start dates and crew assignments

-- Job Schedule Table
CREATE TABLE IF NOT EXISTS "JobSchedule" (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'base64'),
  "jobId" TEXT NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  "scheduledBy" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  
  -- Scheduling details
  "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  "endDate" TIMESTAMP WITH TIME ZONE,
  "estimatedHours" DECIMAL(5,2) NOT NULL CHECK ("estimatedHours" > 0),
  "actualHours" DECIMAL(5,2) DEFAULT 0,
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  "startedAt" TIMESTAMP WITH TIME ZONE,
  "completedAt" TIMESTAMP WITH TIME ZONE,
  
  -- Notes and metadata
  notes TEXT,
  "rescheduleReason" TEXT,
  "originalStartDate" TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE("jobId"), -- One schedule per job
  CHECK ("endDate" IS NULL OR "endDate" >= "startDate")
);

-- Crew Assignment Table
CREATE TABLE IF NOT EXISTS "CrewAssignment" (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'base64'),
  "scheduleId" TEXT NOT NULL REFERENCES "JobSchedule"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "jobId" TEXT NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  
  -- Assignment details
  role VARCHAR(20) DEFAULT 'TECHNICIAN' CHECK (role IN ('LEAD', 'TECHNICIAN', 'APPRENTICE', 'HELPER')),
  "assignedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "assignedBy" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'ACCEPTED', 'DECLINED', 'REMOVED')),
  "respondedAt" TIMESTAMP WITH TIME ZONE,
  
  -- Time tracking
  "checkedInAt" TIMESTAMP WITH TIME ZONE,
  "checkedOutAt" TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  notes TEXT,
  
  -- Audit fields
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE("scheduleId", "userId"), -- One assignment per user per schedule
  CHECK ("checkedOutAt" IS NULL OR "checkedInAt" IS NOT NULL),
  CHECK ("checkedOutAt" IS NULL OR "checkedOutAt" >= "checkedInAt")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_job_schedule_start_date" ON "JobSchedule"("startDate");
CREATE INDEX IF NOT EXISTS "idx_job_schedule_job" ON "JobSchedule"("jobId");
CREATE INDEX IF NOT EXISTS "idx_job_schedule_status" ON "JobSchedule"(status);

CREATE INDEX IF NOT EXISTS "idx_crew_assignment_schedule" ON "CrewAssignment"("scheduleId");
CREATE INDEX IF NOT EXISTS "idx_crew_assignment_user" ON "CrewAssignment"("userId");
CREATE INDEX IF NOT EXISTS "idx_crew_assignment_job" ON "CrewAssignment"("jobId");

-- Create function to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_job_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_job_schedule_updated_at
  BEFORE UPDATE ON "JobSchedule"
  FOR EACH ROW
  EXECUTE FUNCTION update_job_schedule_updated_at();

CREATE TRIGGER update_crew_assignment_updated_at
  BEFORE UPDATE ON "CrewAssignment"
  FOR EACH ROW
  EXECUTE FUNCTION update_job_schedule_updated_at();

-- View for complete schedule information
CREATE OR REPLACE VIEW "ScheduleView" AS
SELECT 
  js.id as "scheduleId",
  js."jobId",
  js."startDate",
  js."endDate",
  js."estimatedHours",
  js."actualHours",
  js.status as "scheduleStatus",
  js.notes as "scheduleNotes",
  js."createdAt" as "scheduledAt",
  
  -- Job information
  j."jobNumber",
  j.description as "jobTitle",
  j."customerId",
  j.type as "jobType",
  j.priority as "jobPriority",
  j.status as "jobStatus",
  j.address,
  j.city,
  j.state,
  j.zip,
  
  -- Crew information (aggregated)
  COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'userId', ca."userId",
        'userName', u.name,
        'userEmail', u.email,
        'role', ca.role,
        'status', ca.status,
        'checkedInAt', ca."checkedInAt",
        'checkedOutAt', ca."checkedOutAt"
      )
    ) FILTER (WHERE ca.id IS NOT NULL),
    '[]'::json
  ) as crew,
  
  -- Crew count
  COUNT(ca.id) FILTER (WHERE ca.status = 'ASSIGNED') as "assignedCrewCount"
  
FROM "JobSchedule" js
INNER JOIN "Job" j ON js."jobId" = j.id
LEFT JOIN "CrewAssignment" ca ON js.id = ca."scheduleId" AND ca.status != 'REMOVED'
LEFT JOIN "User" u ON ca."userId" = u.id
GROUP BY js.id, j.id;

-- Function to get available crew for a date range
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
  WHERE u.role IN ('FIELD_CREW', 'ADMIN')
    AND u.active = TRUE
  GROUP BY u.id, u.name, u.email, u.role
  ORDER BY conflicts ASC, u.name ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update job status when scheduled
CREATE OR REPLACE FUNCTION update_job_status_on_schedule()
RETURNS TRIGGER AS $$
BEGIN
  -- When a job is scheduled, update job status to SCHEDULED if it's still in ESTIMATE
  IF TG_OP = 'INSERT' THEN
    UPDATE "Job" 
    SET status = 'SCHEDULED', "updatedAt" = NOW()
    WHERE id = NEW."jobId" 
      AND status IN ('ESTIMATE', 'APPROVED');
  END IF;
  
  -- When schedule status changes, potentially update job status
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'IN_PROGRESS' AND OLD.status != 'IN_PROGRESS' THEN
      UPDATE "Job" 
      SET status = 'IN_PROGRESS', "updatedAt" = NOW()
      WHERE id = NEW."jobId";
    ELSIF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
      UPDATE "Job" 
      SET status = 'COMPLETED', "completedDate" = NOW(), "updatedAt" = NOW()
      WHERE id = NEW."jobId";
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update job status
CREATE TRIGGER update_job_status_on_schedule
  AFTER INSERT OR UPDATE ON "JobSchedule"
  FOR EACH ROW
  EXECUTE FUNCTION update_job_status_on_schedule();

-- Add comment documentation
COMMENT ON TABLE "JobSchedule" IS 'Stores job scheduling information including start dates and crew assignments';
COMMENT ON TABLE "CrewAssignment" IS 'Tracks crew member assignments to scheduled jobs';
COMMENT ON VIEW "ScheduleView" IS 'Complete view of scheduled jobs with crew and job information';
COMMENT ON FUNCTION get_available_crew IS 'Returns available crew members for a given date range with conflict count';