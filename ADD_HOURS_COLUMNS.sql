-- Add hours tracking columns to JobAssignment table
ALTER TABLE "JobAssignment" 
ADD COLUMN IF NOT EXISTS "hoursWorked" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS "overtimeHours" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "JobAssignment_assignedAt_idx" ON "JobAssignment"("assignedAt");
CREATE INDEX IF NOT EXISTS "JobAssignment_userId_assignedAt_idx" ON "JobAssignment"("userId", "assignedAt");