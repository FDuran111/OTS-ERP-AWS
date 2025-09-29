-- Create TimeEntryAudit table for tracking all changes to time entries
CREATE TABLE IF NOT EXISTS "TimeEntryAudit" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL,
  user_id TEXT NOT NULL, -- Changed to TEXT to match User table
  action VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', etc.

  -- Track hour changes
  old_hours DECIMAL(10, 2),
  new_hours DECIMAL(10, 2),

  -- Track calculated field changes
  old_regular DECIMAL(10, 2),
  new_regular DECIMAL(10, 2),
  old_overtime DECIMAL(10, 2),
  new_overtime DECIMAL(10, 2),
  old_doubletime DECIMAL(10, 2),
  new_doubletime DECIMAL(10, 2),

  -- Track pay changes
  old_pay DECIMAL(10, 2),
  new_pay DECIMAL(10, 2),

  -- Track job/date changes
  old_job_id UUID,
  new_job_id UUID,
  old_date DATE,
  new_date DATE,
  old_description TEXT,
  new_description TEXT,

  -- Metadata
  changed_by TEXT NOT NULL, -- User ID who made the change
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  change_reason TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Foreign key references (soft - entries might be deleted)
  FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES "User"(id) ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_entry_id ON "TimeEntryAudit"(entry_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON "TimeEntryAudit"(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON "TimeEntryAudit"(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON "TimeEntryAudit"(action);

-- Add comment to explain the audit table
COMMENT ON TABLE "TimeEntryAudit" IS 'Tracks all changes to time entries for compliance and audit purposes';
COMMENT ON COLUMN "TimeEntryAudit".action IS 'Type of change: CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.';
COMMENT ON COLUMN "TimeEntryAudit".changed_by IS 'User who made the change';
COMMENT ON COLUMN "TimeEntryAudit".ip_address IS 'IP address of the user making the change';