-- Add hours tracking to JobAssignment table
ALTER TABLE "JobAssignment" 
ADD COLUMN IF NOT EXISTS "hoursWorked" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS "overtimeHours" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "JobAssignment_assignedAt_idx" ON "JobAssignment"("assignedAt");
CREATE INDEX IF NOT EXISTS "JobAssignment_userId_assignedAt_idx" ON "JobAssignment"("userId", "assignedAt");

-- Add crew tracking table for daily hours
CREATE TABLE IF NOT EXISTS "CrewDailyHours" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "regularHours" DOUBLE PRECISION DEFAULT 0,
  "overtimeHours" DOUBLE PRECISION DEFAULT 0,
  "jobIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CrewDailyHours_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CrewDailyHours_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE("userId", "date")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "CrewDailyHours_date_idx" ON "CrewDailyHours"("date");
CREATE INDEX IF NOT EXISTS "CrewDailyHours_userId_date_idx" ON "CrewDailyHours"("userId", "date");

-- Add overtime cost configuration
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "hourlyRate" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS "overtimeRate" DOUBLE PRECISION DEFAULT 0;

-- Add productivity score calculation fields
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "productivityScore" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastProductivityUpdate" TIMESTAMP(3);