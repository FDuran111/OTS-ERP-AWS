-- Create JobReminder table for enhanced reminder system
CREATE TABLE IF NOT EXISTS "JobReminder" (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'base64'),
  "jobId" TEXT NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'JOB_START', 
    'PHASE_START', 
    'DEADLINE_WARNING', 
    'FOLLOW_UP', 
    'OVERDUE',
    'CUSTOM'
  )),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  "reminderDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'SNOOZED', 'DISMISSED')),
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "acknowledgedAt" TIMESTAMP WITH TIME ZONE,
  "snoozedUntil" TIMESTAMP WITH TIME ZONE,
  "phaseId" TEXT REFERENCES "JobPhase"(id) ON DELETE CASCADE, -- Optional: for phase-specific reminders
  metadata JSONB -- Store additional reminder configuration
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_reminder_job_id ON "JobReminder"("jobId");
CREATE INDEX IF NOT EXISTS idx_job_reminder_date ON "JobReminder"("reminderDate");
CREATE INDEX IF NOT EXISTS idx_job_reminder_status ON "JobReminder"(status);
CREATE INDEX IF NOT EXISTS idx_job_reminder_type ON "JobReminder"(type);
CREATE INDEX IF NOT EXISTS idx_job_reminder_priority ON "JobReminder"(priority);

-- Create a function to automatically create job start reminders when jobs are scheduled
CREATE OR REPLACE FUNCTION create_job_start_reminders()
RETURNS TRIGGER AS $$
DECLARE
  reminder_days INTEGER := 3; -- Default reminder 3 days before
  reminder_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only create reminders for newly scheduled jobs or when scheduled date changes
  IF (TG_OP = 'INSERT' AND NEW."scheduledDate" IS NOT NULL AND NEW.status = 'SCHEDULED') OR
     (TG_OP = 'UPDATE' AND OLD."scheduledDate" IS DISTINCT FROM NEW."scheduledDate" AND NEW."scheduledDate" IS NOT NULL) THEN
    
    -- Calculate reminder date (3 days before job start)
    reminder_date := NEW."scheduledDate" - INTERVAL '3 days';
    
    -- Only create reminder if it's in the future
    IF reminder_date > NOW() THEN
      INSERT INTO "JobReminder" (
        "jobId",
        type,
        title,
        message,
        "reminderDate",
        priority,
        status
      ) VALUES (
        NEW.id,
        'JOB_START',
        'Job Starting Soon: ' || NEW."jobNumber",
        'Job "' || COALESCE(NEW.description, 'Scheduled Job') || '" is scheduled to start in 3 days.',
        reminder_date,
        'HIGH',
        'ACTIVE'
      )
      ON CONFLICT DO NOTHING; -- Prevent duplicates
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_create_job_start_reminders ON "Job";
CREATE TRIGGER trigger_create_job_start_reminders
  AFTER INSERT OR UPDATE ON "Job"
  FOR EACH ROW
  EXECUTE FUNCTION create_job_start_reminders();

-- Add some sample reminder types data (optional)
COMMENT ON TABLE "JobReminder" IS 'Enhanced job reminder system supporting multiple reminder types and actions';
COMMENT ON COLUMN "JobReminder".type IS 'Type of reminder: JOB_START, PHASE_START, DEADLINE_WARNING, FOLLOW_UP, OVERDUE, CUSTOM';
COMMENT ON COLUMN "JobReminder".priority IS 'Priority level: LOW, MEDIUM, HIGH, URGENT';
COMMENT ON COLUMN "JobReminder".status IS 'Current status: ACTIVE, ACKNOWLEDGED, SNOOZED, DISMISSED';
COMMENT ON COLUMN "JobReminder".metadata IS 'Additional configuration data stored as JSON';