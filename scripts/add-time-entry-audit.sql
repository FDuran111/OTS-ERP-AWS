-- Create TimeEntryAudit table for tracking all changes to time entries
CREATE TABLE IF NOT EXISTS "TimeEntryAudit" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'UPDATE', 'DELETE', 'APPROVE', etc.

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

  -- Metadata
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  change_reason TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Foreign key references (soft - entries might be deleted)
  FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES "User"(id) ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_entry_id ON "TimeEntryAudit"(entry_id);
CREATE INDEX idx_audit_user_id ON "TimeEntryAudit"(user_id);
CREATE INDEX idx_audit_changed_at ON "TimeEntryAudit"(changed_at DESC);
CREATE INDEX idx_audit_action ON "TimeEntryAudit"(action);

-- Add approvedAt column to TimeEntry if not exists
ALTER TABLE "TimeEntry"
ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "approvedBy" UUID;

-- Create PayrollPeriod table for tracking payroll periods
CREATE TABLE IF NOT EXISTS "PayrollPeriod" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'closed', 'processing', 'paid'

  -- Processing metadata
  closed_at TIMESTAMP,
  closed_by UUID,
  processed_at TIMESTAMP,
  processed_by UUID,
  paid_at TIMESTAMP,
  paid_by UUID,

  -- Summary data (cached for performance)
  total_employees INTEGER DEFAULT 0,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  total_regular_hours DECIMAL(10, 2) DEFAULT 0,
  total_overtime_hours DECIMAL(10, 2) DEFAULT 0,
  total_doubletime_hours DECIMAL(10, 2) DEFAULT 0,
  total_pay DECIMAL(12, 2) DEFAULT 0,

  -- Audit fields
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(company_id, start_date, end_date),
  FOREIGN KEY (closed_by) REFERENCES "User"(id) ON DELETE SET NULL,
  FOREIGN KEY (processed_by) REFERENCES "User"(id) ON DELETE SET NULL,
  FOREIGN KEY (paid_by) REFERENCES "User"(id) ON DELETE SET NULL
);

-- Create index for efficient period lookups
CREATE INDEX idx_payroll_period_dates ON "PayrollPeriod"(start_date, end_date);
CREATE INDEX idx_payroll_period_status ON "PayrollPeriod"(status);

-- Function to check if a time entry can be edited
CREATE OR REPLACE FUNCTION can_edit_time_entry(entry_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  entry_date DATE;
  approved_at TIMESTAMP;
  period_status VARCHAR(20);
BEGIN
  -- Get entry details
  SELECT date, "approvedAt" INTO entry_date, approved_at
  FROM "TimeEntry"
  WHERE id = entry_id;

  -- Check if entry is approved
  IF approved_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if period is closed
  SELECT status INTO period_status
  FROM "PayrollPeriod"
  WHERE entry_date BETWEEN start_date AND end_date
  LIMIT 1;

  IF period_status IN ('closed', 'processing', 'paid') THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add comment to explain the audit table
COMMENT ON TABLE "TimeEntryAudit" IS 'Tracks all changes to time entries for compliance and audit purposes';
COMMENT ON COLUMN "TimeEntryAudit".action IS 'Type of change: UPDATE, DELETE, APPROVE, REJECT, etc.';
COMMENT ON COLUMN "TimeEntryAudit".changed_by IS 'User who made the change';
COMMENT ON COLUMN "TimeEntryAudit".ip_address IS 'IP address of the user making the change';

-- Sample query to view audit history for an entry
-- SELECT
--   a.*,
--   u.name as changed_by_name,
--   e.name as employee_name
-- FROM "TimeEntryAudit" a
-- JOIN "User" u ON a.changed_by = u.id
-- JOIN "User" e ON a.user_id = e.id
-- WHERE a.entry_id = 'some-entry-id'
-- ORDER BY a.changed_at DESC;