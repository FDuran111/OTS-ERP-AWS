-- General Ledger Database Migration
-- Comprehensive double-entry accounting system with Chart of Accounts, Periods, and Journal Entries

-- ============================================================================
-- ACCOUNT (Chart of Accounts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "Account" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) UNIQUE NOT NULL,
  name varchar(100) NOT NULL,
  "accountType" varchar(20) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, COGS, EXPENSE
  "accountSubType" varchar(50), -- CurrentAsset, FixedAsset, CurrentLiability, etc.
  "parentAccountId" uuid,
  "isActive" boolean DEFAULT true,
  "isPosting" boolean DEFAULT true, -- false for header/parent accounts
  "balanceType" varchar(10) NOT NULL, -- DEBIT or CREDIT (normal balance)
  description text,
  "quickbooksId" varchar(100), -- For QB sync
  "quickbooksSyncToken" varchar(20), -- QB version for optimistic locking
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW(),
  CONSTRAINT fk_parent_account FOREIGN KEY ("parentAccountId") 
    REFERENCES "Account"(id) ON DELETE RESTRICT,
  CONSTRAINT chk_account_type CHECK ("accountType" IN (
    'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE'
  )),
  CONSTRAINT chk_balance_type CHECK ("balanceType" IN ('DEBIT', 'CREDIT'))
);

-- ============================================================================
-- ACCOUNTING SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS "AccountingSettings" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "periodFrequency" varchar(20) NOT NULL DEFAULT 'MONTHLY',
  "fiscalYearStartMonth" integer NOT NULL DEFAULT 1, -- 1=January, 7=July, etc.
  "defaultCurrency" varchar(3) DEFAULT 'USD',
  "enableMultiCurrency" boolean DEFAULT false,
  "retainedEarningsAccountId" uuid, -- Account for closing entries
  "currentPeriodId" uuid, -- Currently open period
  "autoCreatePeriods" boolean DEFAULT true,
  "requireApproval" boolean DEFAULT false, -- Require approval before posting
  "enableBudgets" boolean DEFAULT false,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW(),
  CONSTRAINT chk_period_frequency CHECK ("periodFrequency" IN (
    'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'YEARLY'
  )),
  CONSTRAINT chk_fiscal_month CHECK ("fiscalYearStartMonth" BETWEEN 1 AND 12)
);

-- Insert default settings
INSERT INTO "AccountingSettings" (id, "periodFrequency", "fiscalYearStartMonth") 
VALUES (gen_random_uuid(), 'MONTHLY', 1)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ACCOUNTING PERIOD
-- ============================================================================
CREATE TABLE IF NOT EXISTS "AccountingPeriod" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(50) NOT NULL, -- "January 2025", "Q1 2025", etc.
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  status varchar(10) NOT NULL DEFAULT 'OPEN',
  "fiscalYear" integer NOT NULL,
  "periodNumber" integer NOT NULL, -- 1-12 for monthly, 1-4 for quarterly, etc.
  "closedBy" text,
  "closedAt" timestamp,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW(),
  CONSTRAINT chk_period_status CHECK (status IN ('OPEN', 'CLOSED', 'LOCKED')),
  CONSTRAINT chk_period_dates CHECK ("endDate" >= "startDate"),
  CONSTRAINT fk_closed_by FOREIGN KEY ("closedBy") REFERENCES "User"(id),
  UNIQUE ("fiscalYear", "periodNumber")
);

-- ============================================================================
-- JOURNAL ENTRY
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS journal_entry_number_seq START 1000;

CREATE TABLE IF NOT EXISTS "JournalEntry" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "entryNumber" varchar(20) UNIQUE NOT NULL DEFAULT 'JE-' || nextval('journal_entry_number_seq'),
  "entryDate" date NOT NULL,
  "periodId" uuid NOT NULL,
  status varchar(10) NOT NULL DEFAULT 'DRAFT',
  description text,
  "sourceModule" varchar(50), -- MANUAL, AR_INVOICE, AP_BILL, INVENTORY, PAYROLL, etc.
  "sourceId" varchar(100), -- ID of source transaction (invoice ID, bill ID, etc.)
  "createdBy" text NOT NULL,
  "postedBy" text,
  "postedAt" timestamp,
  "reversedBy" text, -- For reversing entries
  "reversalOf" uuid, -- Points to original entry if this is a reversal
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW(),
  CONSTRAINT fk_period FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod"(id) ON DELETE RESTRICT,
  CONSTRAINT fk_created_by FOREIGN KEY ("createdBy") REFERENCES "User"(id),
  CONSTRAINT fk_posted_by FOREIGN KEY ("postedBy") REFERENCES "User"(id),
  CONSTRAINT fk_reversed_by FOREIGN KEY ("reversedBy") REFERENCES "User"(id),
  CONSTRAINT fk_reversal_of FOREIGN KEY ("reversalOf") REFERENCES "JournalEntry"(id),
  CONSTRAINT chk_entry_status CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED')),
  UNIQUE ("sourceModule", "sourceId") -- Idempotency: same source can't post twice
);

-- ============================================================================
-- JOURNAL ENTRY LINE
-- ============================================================================
CREATE TABLE IF NOT EXISTS "JournalEntryLine" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "entryId" uuid NOT NULL,
  "lineNumber" integer NOT NULL, -- Order within entry
  "accountId" uuid NOT NULL,
  debit numeric(15,2) DEFAULT 0 CHECK (debit >= 0),
  credit numeric(15,2) DEFAULT 0 CHECK (credit >= 0),
  description text,
  -- References for tracking
  "referenceType" varchar(50), -- CUSTOMER, VENDOR, JOB, MATERIAL, EMPLOYEE, etc.
  "referenceId" text,
  -- Common foreign keys for reporting
  "jobId" text,
  "customerId" text,
  "vendorId" text,
  "materialId" text,
  "employeeId" text,
  "createdAt" timestamp DEFAULT NOW(),
  CONSTRAINT fk_entry FOREIGN KEY ("entryId") REFERENCES "JournalEntry"(id) ON DELETE CASCADE,
  CONSTRAINT fk_account FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON DELETE RESTRICT,
  CONSTRAINT fk_job FOREIGN KEY ("jobId") REFERENCES "Job"(id),
  CONSTRAINT fk_customer FOREIGN KEY ("customerId") REFERENCES "Customer"(id),
  CONSTRAINT fk_vendor FOREIGN KEY ("vendorId") REFERENCES "Vendor"(id),
  CONSTRAINT fk_material FOREIGN KEY ("materialId") REFERENCES "Material"(id),
  CONSTRAINT fk_employee FOREIGN KEY ("employeeId") REFERENCES "User"(id),
  CONSTRAINT chk_debit_or_credit CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0)
  ),
  UNIQUE ("entryId", "lineNumber")
);

-- ============================================================================
-- ACCOUNT BALANCE (Materialized for performance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "AccountBalance" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "accountId" uuid NOT NULL,
  "periodId" uuid NOT NULL,
  "beginningBalance" numeric(15,2) DEFAULT 0,
  "debitTotal" numeric(15,2) DEFAULT 0,
  "creditTotal" numeric(15,2) DEFAULT 0,
  "endingBalance" numeric(15,2) DEFAULT 0,
  "lastUpdated" timestamp DEFAULT NOW(),
  CONSTRAINT fk_balance_account FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON DELETE CASCADE,
  CONSTRAINT fk_balance_period FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod"(id) ON DELETE CASCADE,
  UNIQUE ("accountId", "periodId")
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_account_code ON "Account"(code);
CREATE INDEX IF NOT EXISTS idx_account_type ON "Account"("accountType");
CREATE INDEX IF NOT EXISTS idx_account_parent ON "Account"("parentAccountId");
CREATE INDEX IF NOT EXISTS idx_account_active ON "Account"("isActive", "isPosting");

CREATE INDEX IF NOT EXISTS idx_period_dates ON "AccountingPeriod"("startDate", "endDate");
CREATE INDEX IF NOT EXISTS idx_period_status ON "AccountingPeriod"(status);
CREATE INDEX IF NOT EXISTS idx_period_fiscal ON "AccountingPeriod"("fiscalYear", "periodNumber");

CREATE INDEX IF NOT EXISTS idx_entry_date ON "JournalEntry"("entryDate");
CREATE INDEX IF NOT EXISTS idx_entry_period ON "JournalEntry"("periodId");
CREATE INDEX IF NOT EXISTS idx_entry_status ON "JournalEntry"(status);
CREATE INDEX IF NOT EXISTS idx_entry_source ON "JournalEntry"("sourceModule", "sourceId");
CREATE INDEX IF NOT EXISTS idx_entry_posted_at ON "JournalEntry"("postedAt");

CREATE INDEX IF NOT EXISTS idx_line_entry ON "JournalEntryLine"("entryId");
CREATE INDEX IF NOT EXISTS idx_line_account ON "JournalEntryLine"("accountId");
CREATE INDEX IF NOT EXISTS idx_line_job ON "JournalEntryLine"("jobId");
CREATE INDEX IF NOT EXISTS idx_line_customer ON "JournalEntryLine"("customerId");
CREATE INDEX IF NOT EXISTS idx_line_vendor ON "JournalEntryLine"("vendorId");
CREATE INDEX IF NOT EXISTS idx_line_reference ON "JournalEntryLine"("referenceType", "referenceId");

CREATE INDEX IF NOT EXISTS idx_balance_account_period ON "AccountBalance"("accountId", "periodId");

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to validate journal entry balance (debits = credits)
CREATE OR REPLACE FUNCTION validate_journal_entry_balance()
RETURNS trigger AS $$
DECLARE
  v_debit_total numeric(15,2);
  v_credit_total numeric(15,2);
BEGIN
  -- Calculate totals for this entry
  SELECT 
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0)
  INTO v_debit_total, v_credit_total
  FROM "JournalEntryLine"
  WHERE "entryId" = NEW."entryId";
  
  -- Check if balanced (allow small rounding differences)
  IF ABS(v_debit_total - v_credit_total) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry % is not balanced: debits=%, credits=%', 
      NEW."entryId", v_debit_total, v_credit_total;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent posting to closed periods
CREATE OR REPLACE FUNCTION check_period_open()
RETURNS trigger AS $$
DECLARE
  v_period_status varchar(10);
BEGIN
  -- Get period status
  SELECT status INTO v_period_status
  FROM "AccountingPeriod"
  WHERE id = NEW."periodId";
  
  -- Only allow posting to OPEN periods
  IF v_period_status != 'OPEN' THEN
    RAISE EXCEPTION 'Cannot post to period %: period is %', 
      NEW."periodId", v_period_status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update account balances
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS trigger AS $$
DECLARE
  v_account_id uuid;
  v_period_id uuid;
  v_debit_amount numeric(15,2);
  v_credit_amount numeric(15,2);
BEGIN
  -- Only update for POSTED entries
  SELECT "periodId" INTO v_period_id
  FROM "JournalEntry"
  WHERE id = NEW."entryId" AND status = 'POSTED';
  
  IF v_period_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Insert or update account balance
  INSERT INTO "AccountBalance" ("accountId", "periodId", "debitTotal", "creditTotal", "endingBalance")
  VALUES (
    NEW."accountId",
    v_period_id,
    NEW.debit,
    NEW.credit,
    NEW.debit - NEW.credit
  )
  ON CONFLICT ("accountId", "periodId") DO UPDATE SET
    "debitTotal" = "AccountBalance"."debitTotal" + NEW.debit,
    "creditTotal" = "AccountBalance"."creditTotal" + NEW.credit,
    "endingBalance" = "AccountBalance"."endingBalance" + (NEW.debit - NEW.credit),
    "lastUpdated" = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Validate entry balance after line insert/update
DROP TRIGGER IF EXISTS trigger_validate_entry_balance ON "JournalEntryLine";
CREATE TRIGGER trigger_validate_entry_balance
  AFTER INSERT OR UPDATE ON "JournalEntryLine"
  FOR EACH ROW
  EXECUTE FUNCTION validate_journal_entry_balance();

-- Prevent posting to closed periods
DROP TRIGGER IF EXISTS trigger_check_period_open ON "JournalEntry";
CREATE TRIGGER trigger_check_period_open
  BEFORE INSERT OR UPDATE OF status ON "JournalEntry"
  FOR EACH ROW
  WHEN (NEW.status = 'POSTED')
  EXECUTE FUNCTION check_period_open();

-- Update account balances when lines are added
DROP TRIGGER IF EXISTS trigger_update_account_balance ON "JournalEntryLine";
CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT ON "JournalEntryLine"
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_gl_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_account_updated ON "Account";
CREATE TRIGGER trigger_account_updated
  BEFORE UPDATE ON "Account"
  FOR EACH ROW
  EXECUTE FUNCTION update_gl_timestamp();

DROP TRIGGER IF EXISTS trigger_period_updated ON "AccountingPeriod";
CREATE TRIGGER trigger_period_updated
  BEFORE UPDATE ON "AccountingPeriod"
  FOR EACH ROW
  EXECUTE FUNCTION update_gl_timestamp();

DROP TRIGGER IF EXISTS trigger_entry_updated ON "JournalEntry";
CREATE TRIGGER trigger_entry_updated
  BEFORE UPDATE ON "JournalEntry"
  FOR EACH ROW
  EXECUTE FUNCTION update_gl_timestamp();

DROP TRIGGER IF EXISTS trigger_settings_updated ON "AccountingSettings";
CREATE TRIGGER trigger_settings_updated
  BEFORE UPDATE ON "AccountingSettings"
  FOR EACH ROW
  EXECUTE FUNCTION update_gl_timestamp();

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Account hierarchy view (with full path)
CREATE OR REPLACE VIEW "AccountHierarchy" AS
WITH RECURSIVE account_tree AS (
  -- Base case: top-level accounts
  SELECT 
    id,
    code,
    name,
    "accountType",
    "accountSubType",
    "parentAccountId",
    "isActive",
    "isPosting",
    "balanceType",
    name::text as "fullPath",
    0 as level
  FROM "Account"
  WHERE "parentAccountId" IS NULL
  
  UNION ALL
  
  -- Recursive case: child accounts
  SELECT 
    a.id,
    a.code,
    a.name,
    a."accountType",
    a."accountSubType",
    a."parentAccountId",
    a."isActive",
    a."isPosting",
    a."balanceType",
    (at."fullPath" || ' > ' || a.name)::text as "fullPath",
    at.level + 1 as level
  FROM "Account" a
  INNER JOIN account_tree at ON a."parentAccountId" = at.id
)
SELECT * FROM account_tree
ORDER BY "accountType", code;

-- Trial Balance view (current balances for all accounts)
CREATE OR REPLACE VIEW "TrialBalance" AS
SELECT 
  a.id as "accountId",
  a.code,
  a.name,
  a."accountType",
  a."balanceType",
  COALESCE(SUM(jel.debit), 0) as "totalDebits",
  COALESCE(SUM(jel.credit), 0) as "totalCredits",
  CASE 
    WHEN a."balanceType" = 'DEBIT' THEN COALESCE(SUM(jel.debit - jel.credit), 0)
    ELSE COALESCE(SUM(jel.credit - jel.debit), 0)
  END as balance
FROM "Account" a
LEFT JOIN "JournalEntryLine" jel ON a.id = jel."accountId"
LEFT JOIN "JournalEntry" je ON jel."entryId" = je.id AND je.status = 'POSTED'
WHERE a."isActive" = true AND a."isPosting" = true
GROUP BY a.id, a.code, a.name, a."accountType", a."balanceType"
HAVING COALESCE(SUM(jel.debit), 0) != 0 OR COALESCE(SUM(jel.credit), 0) != 0
ORDER BY a.code;

-- Period summary view
CREATE OR REPLACE VIEW "PeriodSummary" AS
SELECT 
  ap.id as "periodId",
  ap.name as "periodName",
  ap."startDate",
  ap."endDate",
  ap.status,
  ap."fiscalYear",
  COUNT(DISTINCT je.id) as "entryCount",
  COUNT(DISTINCT CASE WHEN je.status = 'POSTED' THEN je.id END) as "postedCount",
  COUNT(DISTINCT CASE WHEN je.status = 'DRAFT' THEN je.id END) as "draftCount"
FROM "AccountingPeriod" ap
LEFT JOIN "JournalEntry" je ON ap.id = je."periodId"
GROUP BY ap.id, ap.name, ap."startDate", ap."endDate", ap.status, ap."fiscalYear"
ORDER BY ap."startDate" DESC;

-- ============================================================================
-- DEFAULT CHART OF ACCOUNTS (Basic structure)
-- ============================================================================

-- Only insert if Account table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Account" LIMIT 1) THEN
    -- ASSETS
    INSERT INTO "Account" (code, name, "accountType", "accountSubType", "isPosting", "balanceType") VALUES
    ('1000', 'Assets', 'ASSET', 'CurrentAsset', false, 'DEBIT'),
    ('1010', 'Cash', 'ASSET', 'CurrentAsset', true, 'DEBIT'),
    ('1020', 'Accounts Receivable', 'ASSET', 'CurrentAsset', true, 'DEBIT'),
    ('1030', 'Inventory', 'ASSET', 'CurrentAsset', true, 'DEBIT'),
    ('1500', 'Fixed Assets', 'ASSET', 'FixedAsset', false, 'DEBIT'),
    ('1510', 'Equipment', 'ASSET', 'FixedAsset', true, 'DEBIT'),
    ('1520', 'Vehicles', 'ASSET', 'FixedAsset', true, 'DEBIT');
    
    -- LIABILITIES
    INSERT INTO "Account" (code, name, "accountType", "accountSubType", "isPosting", "balanceType") VALUES
    ('2000', 'Liabilities', 'LIABILITY', 'CurrentLiability', false, 'CREDIT'),
    ('2010', 'Accounts Payable', 'LIABILITY', 'CurrentLiability', true, 'CREDIT'),
    ('2020', 'Sales Tax Payable', 'LIABILITY', 'CurrentLiability', true, 'CREDIT'),
    ('2030', 'Accrued Expenses', 'LIABILITY', 'CurrentLiability', true, 'CREDIT');
    
    -- EQUITY
    INSERT INTO "Account" (code, name, "accountType", "accountSubType", "isPosting", "balanceType") VALUES
    ('3000', 'Equity', 'EQUITY', 'Equity', false, 'CREDIT'),
    ('3010', 'Owner Equity', 'EQUITY', 'Equity', true, 'CREDIT'),
    ('3020', 'Retained Earnings', 'EQUITY', 'RetainedEarnings', true, 'CREDIT');
    
    -- REVENUE
    INSERT INTO "Account" (code, name, "accountType", "accountSubType", "isPosting", "balanceType") VALUES
    ('4000', 'Revenue', 'REVENUE', 'ServiceRevenue', false, 'CREDIT'),
    ('4010', 'Service Revenue', 'REVENUE', 'ServiceRevenue', true, 'CREDIT'),
    ('4020', 'Product Revenue', 'REVENUE', 'ProductRevenue', true, 'CREDIT');
    
    -- COST OF GOODS SOLD
    INSERT INTO "Account" (code, name, "accountType", "accountSubType", "isPosting", "balanceType") VALUES
    ('5000', 'Cost of Goods Sold', 'COGS', 'COGS', false, 'DEBIT'),
    ('5010', 'Direct Labor', 'COGS', 'DirectLabor', true, 'DEBIT'),
    ('5020', 'Materials', 'COGS', 'Materials', true, 'DEBIT'),
    ('5030', 'Subcontractors', 'COGS', 'Subcontractors', true, 'DEBIT');
    
    -- EXPENSES
    INSERT INTO "Account" (code, name, "accountType", "accountSubType", "isPosting", "balanceType") VALUES
    ('6000', 'Operating Expenses', 'EXPENSE', 'OperatingExpense', false, 'DEBIT'),
    ('6010', 'Rent', 'EXPENSE', 'OperatingExpense', true, 'DEBIT'),
    ('6020', 'Utilities', 'EXPENSE', 'OperatingExpense', true, 'DEBIT'),
    ('6030', 'Insurance', 'EXPENSE', 'OperatingExpense', true, 'DEBIT'),
    ('6040', 'Office Supplies', 'EXPENSE', 'OperatingExpense', true, 'DEBIT'),
    ('6050', 'Vehicle Expenses', 'EXPENSE', 'OperatingExpense', true, 'DEBIT');
  END IF;
END $$;
