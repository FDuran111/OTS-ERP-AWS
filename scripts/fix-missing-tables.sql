-- Create missing tables for jobs functionality

-- JobAssignment table for assigning users to jobs
CREATE TABLE IF NOT EXISTS "JobAssignment" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "jobId" UUID NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    role VARCHAR(50),
    "assignedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" UUID REFERENCES "User"(id),
    notes TEXT,
    UNIQUE("jobId", "userId")
);

-- JobSchedule table for scheduling jobs
CREATE TABLE IF NOT EXISTS "JobSchedule" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "jobId" UUID NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
    "scheduledDate" DATE NOT NULL,
    "scheduledTime" TIME,
    "estimatedDuration" INTEGER, -- in minutes
    "actualStartTime" TIMESTAMP,
    "actualEndTime" TIMESTAMP,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    notes TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("jobId", "scheduledDate")
);

-- Fix TimeEntry table columns
ALTER TABLE "TimeEntry" 
    ADD COLUMN IF NOT EXISTS "jobId" UUID REFERENCES "Job"(id),
    ADD COLUMN IF NOT EXISTS "userId" UUID REFERENCES "User"(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_assignment_job ON "JobAssignment"("jobId");
CREATE INDEX IF NOT EXISTS idx_job_assignment_user ON "JobAssignment"("userId");
CREATE INDEX IF NOT EXISTS idx_job_schedule_job ON "JobSchedule"("jobId");
CREATE INDEX IF NOT EXISTS idx_job_schedule_date ON "JobSchedule"("scheduledDate");
CREATE INDEX IF NOT EXISTS idx_time_entry_job ON "TimeEntry"("jobId");
CREATE INDEX IF NOT EXISTS idx_time_entry_user ON "TimeEntry"("userId");

-- Add some test assignments for existing jobs
INSERT INTO "JobAssignment" ("jobId", "userId", role)
SELECT 
    j.id,
    u.id,
    'TECHNICIAN'
FROM "Job" j
CROSS JOIN (SELECT id FROM "User" WHERE active = true LIMIT 1) u
WHERE j.status IN ('IN_PROGRESS', 'SCHEDULED')
ON CONFLICT ("jobId", "userId") DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Missing tables created successfully!';
END $$;