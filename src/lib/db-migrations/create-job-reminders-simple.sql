-- Create JobReminder table for enhanced reminder system
CREATE TABLE IF NOT EXISTS "JobReminder" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  "reminderDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "acknowledgedAt" TIMESTAMP WITH TIME ZONE,
  "snoozedUntil" TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);