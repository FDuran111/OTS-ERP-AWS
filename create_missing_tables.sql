-- Create missing tables in RDS
-- Generated from local database schema

-- Start transaction
BEGIN;

-- 1. Role
CREATE TABLE IF NOT EXISTS "Role" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "level" INTEGER DEFAULT 50,
  "createdBy" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  PRIMARY KEY ("id")
);

-- 2. Permission
CREATE TABLE IF NOT EXISTS "Permission" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

-- 3. RolePermission
CREATE TABLE IF NOT EXISTS "RolePermission" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "roleId" UUID NOT NULL,
  "permissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE,
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE
);

-- 4. RoleAssignment
CREATE TABLE IF NOT EXISTS "RoleAssignment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "roleId" UUID NOT NULL,
  "assignedBy" TEXT,
  "assignedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "isActive" BOOLEAN DEFAULT true,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- 5. UserPermission
CREATE TABLE IF NOT EXISTS "UserPermission" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "grantedBy" TEXT,
  "grantedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "isActive" BOOLEAN DEFAULT true,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE
);

-- 6. PermissionGroup
CREATE TABLE IF NOT EXISTS "PermissionGroup" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

-- 7. PermissionGroupMember
CREATE TABLE IF NOT EXISTS "PermissionGroupMember" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "groupId" UUID NOT NULL,
  "permissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("groupId") REFERENCES "PermissionGroup"("id") ON DELETE CASCADE,
  FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE
);

-- 8. TimeEntryPhoto
CREATE TABLE IF NOT EXISTS "TimeEntryPhoto" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "timeEntryId" TEXT NOT NULL,
  "fileId" UUID NOT NULL,
  "photoType" VARCHAR(50) DEFAULT 'GENERAL',
  "description" TEXT,
  "uploadedBy" TEXT,
  "uploadedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE,
  FOREIGN KEY ("uploadedBy") REFERENCES "User"("id"),
  FOREIGN KEY ("fileId") REFERENCES "FileUpload"("id")
);

-- 9. TimeEntryRejectionNote
CREATE TABLE IF NOT EXISTS "TimeEntryRejectionNote" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "timeEntryId" TEXT NOT NULL,
  "noteText" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "isResolved" BOOLEAN DEFAULT false,
  "resolvedAt" TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE,
  FOREIGN KEY ("createdBy") REFERENCES "User"("id")
);

-- 10. Account
CREATE TABLE IF NOT EXISTS "Account" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(20) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "accountType" VARCHAR(20) NOT NULL,
  "accountSubType" VARCHAR(50),
  "parentAccountId" UUID,
  "isActive" BOOLEAN DEFAULT true,
  "isPosting" BOOLEAN DEFAULT true,
  "balanceType" VARCHAR(10) NOT NULL,
  "description" TEXT,
  "quickbooksId" VARCHAR(100),
  "quickbooksSyncToken" VARCHAR(20),
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("parentAccountId") REFERENCES "Account"("id")
);

-- 11. AccountingPeriod  
CREATE TABLE IF NOT EXISTS "AccountingPeriod" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(50) NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "status" VARCHAR(10) NOT NULL DEFAULT 'OPEN',
  "fiscalYear" INTEGER NOT NULL,
  "periodNumber" INTEGER NOT NULL,
  "closedBy" TEXT,
  "closedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now(),
  PRIMARY KEY ("id")
);

-- 12. AccountBalance
CREATE TABLE IF NOT EXISTS "AccountBalance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "accountId" UUID NOT NULL,
  "periodId" UUID NOT NULL,
  "beginningBalance" NUMERIC DEFAULT 0,
  "debitTotal" NUMERIC DEFAULT 0,
  "creditTotal" NUMERIC DEFAULT 0,
  "endingBalance" NUMERIC DEFAULT 0,
  "lastUpdated" TIMESTAMP DEFAULT now(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE,
  FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod"("id") ON DELETE CASCADE
);

-- 13. AccountingSettings
CREATE TABLE IF NOT EXISTS "AccountingSettings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "periodFrequency" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
  "fiscalYearStartMonth" INTEGER NOT NULL DEFAULT 1,
  "defaultCurrency" VARCHAR(3) DEFAULT 'USD',
  "enableMultiCurrency" BOOLEAN DEFAULT false,
  "retainedEarningsAccountId" UUID,
  "currentPeriodId" UUID,
  "autoCreatePeriods" BOOLEAN DEFAULT true,
  "requireApproval" BOOLEAN DEFAULT false,
  "enableBudgets" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("retainedEarningsAccountId") REFERENCES "Account"("id"),
  FOREIGN KEY ("currentPeriodId") REFERENCES "AccountingPeriod"("id")
);

-- 14. JournalEntry (requires sequence first)
CREATE SEQUENCE IF NOT EXISTS journal_entry_number_seq START 1;

CREATE TABLE IF NOT EXISTS "JournalEntry" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entryNumber" VARCHAR(20) DEFAULT ('JE-' || lpad(nextval('journal_entry_number_seq')::text, 8, '0')),
  "entryDate" DATE NOT NULL,
  "description" TEXT,
  "status" VARCHAR(10) DEFAULT 'DRAFT',
  "sourceModule" VARCHAR(50),
  "sourceId" VARCHAR(100),
  "periodId" UUID,
  "reversalOf" UUID,
  "reversedBy" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "postedBy" TEXT,
  "postedAt" TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod"("id"),
  FOREIGN KEY ("reversalOf") REFERENCES "JournalEntry"("id")
);

-- 15. JournalEntryLine
CREATE TABLE IF NOT EXISTS "JournalEntryLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entryId" UUID,
  "accountId" UUID,
  "lineNumber" INTEGER NOT NULL,
  "description" TEXT,
  "debit" NUMERIC DEFAULT 0,
  "credit" NUMERIC DEFAULT 0,
  "customerId" TEXT,
  "jobId" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "referenceType" VARCHAR(50),
  "referenceId" TEXT,
  "vendorId" TEXT,
  "materialId" TEXT,
  "employeeId" TEXT,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE,
  FOREIGN KEY ("accountId") REFERENCES "Account"("id")
);

-- 16-29: Material, Stock, Notification tables
CREATE TABLE IF NOT EXISTS "MaterialKit" (
  "id" VARCHAR(36) NOT NULL DEFAULT gen_random_uuid()::text,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(100),
  "unitCost" NUMERIC DEFAULT 0.00,
  "unitPrice" NUMERIC DEFAULT 0.00,
  "active" BOOLEAN DEFAULT true,
  "notes" TEXT,
  "createdBy" VARCHAR(36),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MaterialKitItem" (
  "id" VARCHAR(36) NOT NULL DEFAULT gen_random_uuid()::text,
  "kitId" VARCHAR(36) NOT NULL,
  "materialId" VARCHAR(36) NOT NULL,
  "quantity" NUMERIC NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("kitId") REFERENCES "MaterialKit"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "MaterialCostHistory" (
  "id" VARCHAR(36) NOT NULL DEFAULT gen_random_uuid()::text,
  "materialId" VARCHAR(36) NOT NULL,
  "previousCost" NUMERIC,
  "newCost" NUMERIC NOT NULL,
  "source" VARCHAR(50) NOT NULL,
  "effectiveDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "purchaseOrderId" VARCHAR(36),
  "vendorId" VARCHAR(36),
  "userId" VARCHAR(36),
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MaterialDocument" (
  "id" TEXT NOT NULL DEFAULT ('md_' || replace(gen_random_uuid()::text, '-', '')),
  "materialId" TEXT NOT NULL,
  "fileId" UUID NOT NULL,
  "documentType" VARCHAR(50) NOT NULL DEFAULT 'PHOTO',
  "isPrimary" BOOLEAN DEFAULT false,
  "displayOrder" INTEGER DEFAULT 0,
  "description" TEXT,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("fileId") REFERENCES "FileUpload"("id")
);

CREATE TABLE IF NOT EXISTS "MaterialLocationStock" (
  "id" TEXT NOT NULL DEFAULT ('mls_' || replace(gen_random_uuid()::text, '-', '')),
  "materialId" TEXT NOT NULL,
  "storageLocationId" TEXT NOT NULL,
  "quantity" NUMERIC NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("storageLocationId") REFERENCES "StorageLocation"("id")
);

CREATE TABLE IF NOT EXISTS "MaterialVendorPrice" (
  "id" TEXT NOT NULL DEFAULT ('mvp_' || replace(gen_random_uuid()::text, '-', '')),
  "materialId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "unitCost" NUMERIC NOT NULL,
  "leadTimeDays" INTEGER DEFAULT 7,
  "vendorSku" VARCHAR(100),
  "minimumOrderQuantity" NUMERIC DEFAULT 1,
  "priceBreaks" JSONB,
  "lastUpdated" TIMESTAMPTZ DEFAULT now(),
  "isPreferred" BOOLEAN DEFAULT false,
  "active" BOOLEAN DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id")
);

CREATE TABLE IF NOT EXISTS "ForecastCache" (
  "id" VARCHAR(36) NOT NULL DEFAULT gen_random_uuid()::text,
  "materialId" VARCHAR(36) NOT NULL,
  "abcClass" VARCHAR(1),
  "avgDailyUsage" NUMERIC DEFAULT 0,
  "usageVariance" NUMERIC DEFAULT 0,
  "leadTimeDays" INTEGER DEFAULT 7,
  "reorderPoint" NUMERIC DEFAULT 0,
  "economicOrderQty" NUMERIC DEFAULT 0,
  "stockoutDate" TIMESTAMP,
  "stockoutProbability" NUMERIC,
  "confidenceScore" NUMERIC,
  "totalUsageLast30Days" NUMERIC DEFAULT 0,
  "totalUsageLast90Days" NUMERIC DEFAULT 0,
  "totalUsageLast365Days" NUMERIC DEFAULT 0,
  "jobsUsedOnLast90Days" INTEGER DEFAULT 0,
  "lastUsedDate" TIMESTAMP,
  "calculatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" VARCHAR(36) NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(36) NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "relatedEntityType" VARCHAR(50),
  "relatedEntityId" VARCHAR(36),
  "priority" VARCHAR(20) DEFAULT 'NORMAL',
  "isRead" BOOLEAN DEFAULT false,
  "readAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "id" VARCHAR(36) NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(36) NOT NULL,
  "notificationType" VARCHAR(50) NOT NULL,
  "enabled" BOOLEAN DEFAULT true,
  "emailEnabled" BOOLEAN DEFAULT true,
  "smsEnabled" BOOLEAN DEFAULT false,
  "pushEnabled" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PurchaseOrderReceipt" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "purchaseOrderId" TEXT NOT NULL,
  "receiptNumber" VARCHAR(50),
  "receivedDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receivedBy" TEXT,
  "notes" TEXT,
  "status" VARCHAR(20) DEFAULT 'PARTIAL',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id")
);

CREATE TABLE IF NOT EXISTS "ReceiptItem" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "receiptId" TEXT NOT NULL,
  "poItemId" TEXT NOT NULL,
  "quantityReceived" NUMERIC NOT NULL,
  "qualityStatus" VARCHAR(20) DEFAULT 'ACCEPTED',
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("receiptId") REFERENCES "PurchaseOrderReceipt"("id") ON DELETE CASCADE,
  FOREIGN KEY ("poItemId") REFERENCES "PurchaseOrderItem"("id")
);

CREATE TABLE IF NOT EXISTS "StockTransfer" (
  "id" TEXT NOT NULL DEFAULT ('st_' || replace(gen_random_uuid()::text, '-', '')),
  "transferNumber" VARCHAR(50) NOT NULL,
  "fromLocationId" TEXT NOT NULL,
  "toLocationId" TEXT NOT NULL,
  "status" VARCHAR(20) DEFAULT 'PENDING',
  "requestedBy" TEXT,
  "requestedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP,
  "completedBy" TEXT,
  "completedAt" TIMESTAMP,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("fromLocationId") REFERENCES "StorageLocation"("id"),
  FOREIGN KEY ("toLocationId") REFERENCES "StorageLocation"("id")
);

CREATE TABLE IF NOT EXISTS "StockTransferItem" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "transferId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "quantityRequested" NUMERIC NOT NULL,
  "quantityTransferred" NUMERIC DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "UserViewPreference" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "viewName" VARCHAR(100) NOT NULL,
  "preferences" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

COMMIT;

SELECT 'All 29 tables created successfully!' as result;
