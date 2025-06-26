-- QuickBooks Integration Database Migration
-- Comprehensive QuickBooks Online integration with OAuth 2.0 and data synchronization

-- QuickBooks company connection
CREATE TABLE IF NOT EXISTS "QuickBooksConnection" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "companyId" varchar(100) UNIQUE NOT NULL, -- QuickBooks Company ID
  "accessToken" text NOT NULL,
  "refreshToken" text NOT NULL,
  "tokenExpiresAt" timestamp NOT NULL,
  "realmId" varchar(100) NOT NULL, -- QuickBooks Realm ID
  "baseUrl" varchar(255) NOT NULL, -- Sandbox or Production URL
  "isActive" boolean NOT NULL DEFAULT true,
  "lastSyncAt" timestamp,
  "syncErrors" jsonb DEFAULT '[]',
  "connectionMetadata" jsonb DEFAULT '{}',
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- QuickBooks entity mappings (track QB IDs for our entities)
CREATE TABLE IF NOT EXISTS "QuickBooksMapping" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "localEntityType" varchar(50) NOT NULL, -- CUSTOMER, INVOICE, ITEM, PAYMENT, etc.
  "localEntityId" text NOT NULL, -- Our internal ID
  "quickbooksId" varchar(100) NOT NULL, -- QuickBooks entity ID
  "quickbooksType" varchar(50) NOT NULL, -- Customer, Invoice, Item, Payment, etc.
  "syncVersion" varchar(20), -- QuickBooks SyncToken for optimistic locking
  "lastSyncAt" timestamp DEFAULT NOW(),
  "syncStatus" varchar(20) DEFAULT 'SYNCED', -- SYNCED, PENDING, ERROR, CONFLICT
  "syncErrors" jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW(),
  UNIQUE("localEntityType", "localEntityId"),
  UNIQUE("quickbooksId", "quickbooksType")
);

-- QuickBooks sync operations log
CREATE TABLE IF NOT EXISTS "QuickBooksSyncLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "operationType" varchar(50) NOT NULL, -- CREATE, UPDATE, DELETE, FETCH
  "entityType" varchar(50) NOT NULL, -- CUSTOMER, INVOICE, ITEM, PAYMENT
  "localEntityId" text,
  "quickbooksId" varchar(100),
  "direction" varchar(20) NOT NULL, -- TO_QB, FROM_QB, BIDIRECTIONAL
  "status" varchar(20) NOT NULL, -- SUCCESS, ERROR, PENDING, SKIPPED
  "requestData" jsonb,
  "responseData" jsonb,
  "errorMessage" text,
  "errorCode" varchar(50),
  "duration" integer, -- milliseconds
  "retryCount" integer DEFAULT 0,
  "scheduledAt" timestamp,
  "startedAt" timestamp,
  "completedAt" timestamp,
  "createdAt" timestamp DEFAULT NOW()
);

-- QuickBooks webhook events
CREATE TABLE IF NOT EXISTS "QuickBooksWebhook" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "webhookId" varchar(100) UNIQUE NOT NULL,
  "realmId" varchar(100) NOT NULL,
  "eventNotifications" jsonb NOT NULL,
  "signature" varchar(255),
  "processed" boolean DEFAULT false,
  "processedAt" timestamp,
  "processingErrors" jsonb DEFAULT '[]',
  "receivedAt" timestamp DEFAULT NOW(),
  "createdAt" timestamp DEFAULT NOW()
);

-- QuickBooks sync configuration
CREATE TABLE IF NOT EXISTS "QuickBooksSyncConfig" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "entityType" varchar(50) UNIQUE NOT NULL,
  "syncEnabled" boolean DEFAULT true,
  "syncDirection" varchar(20) DEFAULT 'BIDIRECTIONAL', -- TO_QB, FROM_QB, BIDIRECTIONAL
  "syncFrequency" varchar(20) DEFAULT 'REAL_TIME', -- REAL_TIME, HOURLY, DAILY, MANUAL
  "lastSyncAt" timestamp,
  "autoCreateInQB" boolean DEFAULT true,
  "conflictResolution" varchar(20) DEFAULT 'QB_WINS', -- QB_WINS, LOCAL_WINS, MANUAL
  "fieldMappings" jsonb DEFAULT '{}',
  "syncFilters" jsonb DEFAULT '{}',
  "isActive" boolean DEFAULT true,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- QuickBooks items (products/services) cache
CREATE TABLE IF NOT EXISTS "QuickBooksItem" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "quickbooksId" varchar(100) UNIQUE NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "type" varchar(20) NOT NULL, -- Service, Inventory, NonInventory
  "unitPrice" decimal(10,2),
  "qtyOnHand" decimal(10,2),
  "incomeAccountId" varchar(100),
  "assetAccountId" varchar(100),
  "expenseAccountId" varchar(100),
  "taxable" boolean DEFAULT false,
  "active" boolean DEFAULT true,
  "sku" varchar(100),
  "syncVersion" varchar(20),
  "lastSyncAt" timestamp DEFAULT NOW(),
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- QuickBooks chart of accounts cache
CREATE TABLE IF NOT EXISTS "QuickBooksAccount" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "quickbooksId" varchar(100) UNIQUE NOT NULL,
  "name" varchar(100) NOT NULL,
  "accountType" varchar(50) NOT NULL,
  "accountSubType" varchar(50),
  "description" text,
  "currentBalance" decimal(12,2),
  "active" boolean DEFAULT true,
  "parentAccountId" varchar(100),
  "fullyQualifiedName" text,
  "syncVersion" varchar(20),
  "lastSyncAt" timestamp DEFAULT NOW(),
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_qb_connection_company" ON "QuickBooksConnection"("companyId");
CREATE INDEX IF NOT EXISTS "idx_qb_connection_active" ON "QuickBooksConnection"("isActive");
CREATE INDEX IF NOT EXISTS "idx_qb_mapping_local" ON "QuickBooksMapping"("localEntityType", "localEntityId");
CREATE INDEX IF NOT EXISTS "idx_qb_mapping_quickbooks" ON "QuickBooksMapping"("quickbooksId", "quickbooksType");
CREATE INDEX IF NOT EXISTS "idx_qb_mapping_sync_status" ON "QuickBooksMapping"("syncStatus");
CREATE INDEX IF NOT EXISTS "idx_qb_sync_log_entity" ON "QuickBooksSyncLog"("entityType", "localEntityId");
CREATE INDEX IF NOT EXISTS "idx_qb_sync_log_status" ON "QuickBooksSyncLog"("status");
CREATE INDEX IF NOT EXISTS "idx_qb_sync_log_created" ON "QuickBooksSyncLog"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_qb_webhook_realm" ON "QuickBooksWebhook"("realmId");
CREATE INDEX IF NOT EXISTS "idx_qb_webhook_processed" ON "QuickBooksWebhook"("processed");
CREATE INDEX IF NOT EXISTS "idx_qb_item_qb_id" ON "QuickBooksItem"("quickbooksId");
CREATE INDEX IF NOT EXISTS "idx_qb_item_active" ON "QuickBooksItem"("active");
CREATE INDEX IF NOT EXISTS "idx_qb_account_qb_id" ON "QuickBooksAccount"("quickbooksId");
CREATE INDEX IF NOT EXISTS "idx_qb_account_type" ON "QuickBooksAccount"("accountType");

-- Views for easy data access
CREATE OR REPLACE VIEW "QuickBooksSyncStatus" AS
SELECT 
  qbc."companyId",
  qbc."realmId",
  qbc."isActive" as "connectionActive",
  qbc."lastSyncAt" as "lastConnectionSync",
  qbc."tokenExpiresAt",
  -- Sync statistics
  COUNT(DISTINCT qbm.id) as "totalMappings",
  COUNT(DISTINCT CASE WHEN qbm."syncStatus" = 'SYNCED' THEN qbm.id END) as "syncedMappings",
  COUNT(DISTINCT CASE WHEN qbm."syncStatus" = 'ERROR' THEN qbm.id END) as "errorMappings",
  COUNT(DISTINCT CASE WHEN qbm."syncStatus" = 'PENDING' THEN qbm.id END) as "pendingMappings",
  -- Recent sync activity
  COUNT(DISTINCT CASE WHEN qbsl."status" = 'SUCCESS' AND qbsl."createdAt" > NOW() - INTERVAL '1 hour' THEN qbsl.id END) as "recentSuccessfulSyncs",
  COUNT(DISTINCT CASE WHEN qbsl."status" = 'ERROR' AND qbsl."createdAt" > NOW() - INTERVAL '1 hour' THEN qbsl.id END) as "recentErrorSyncs",
  -- Connection health
  CASE 
    WHEN qbc."tokenExpiresAt" < NOW() THEN 'TOKEN_EXPIRED'
    WHEN qbc."tokenExpiresAt" < NOW() + INTERVAL '1 day' THEN 'TOKEN_EXPIRING'
    WHEN qbc."lastSyncAt" < NOW() - INTERVAL '1 day' THEN 'SYNC_STALE'
    ELSE 'HEALTHY'
  END as "healthStatus"
FROM "QuickBooksConnection" qbc
LEFT JOIN "QuickBooksMapping" qbm ON qbc."companyId" = qbc."companyId"
LEFT JOIN "QuickBooksSyncLog" qbsl ON qbc."companyId" = qbc."companyId"
GROUP BY qbc."companyId", qbc."realmId", qbc."isActive", qbc."lastSyncAt", qbc."tokenExpiresAt";

-- Customer mapping view
CREATE OR REPLACE VIEW "CustomerQuickBooksMapping" AS
SELECT 
  c.id as "customerId",
  c."companyName",
  c."firstName",
  c."lastName",
  c.email,
  c.phone,
  qbm."quickbooksId",
  qbm."syncVersion",
  qbm."lastSyncAt",
  qbm."syncStatus",
  qbm."syncErrors"
FROM "Customer" c
LEFT JOIN "QuickBooksMapping" qbm ON c.id = qbm."localEntityId" AND qbm."localEntityType" = 'CUSTOMER';

-- Invoice mapping view
CREATE OR REPLACE VIEW "InvoiceQuickBooksMapping" AS
SELECT 
  j.id as "jobId",
  j."jobNumber",
  j."customerId",
  j."billedAmount",
  j."billedDate",
  j.status as "jobStatus",
  qbm."quickbooksId",
  qbm."syncVersion",
  qbm."lastSyncAt",
  qbm."syncStatus",
  qbm."syncErrors"
FROM "Job" j
LEFT JOIN "QuickBooksMapping" qbm ON j.id = qbm."localEntityId" AND qbm."localEntityType" = 'INVOICE'
WHERE j."billedAmount" IS NOT NULL AND j."billedAmount" > 0;

-- Functions for QuickBooks integration
CREATE OR REPLACE FUNCTION create_quickbooks_mapping(
  p_local_entity_type varchar(50),
  p_local_entity_id text,
  p_quickbooks_id varchar(100),
  p_quickbooks_type varchar(50),
  p_sync_version varchar(20) DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_mapping_id uuid;
BEGIN
  INSERT INTO "QuickBooksMapping" (
    "localEntityType", "localEntityId", "quickbooksId", "quickbooksType", "syncVersion"
  ) VALUES (
    p_local_entity_type, p_local_entity_id, p_quickbooks_id, p_quickbooks_type, p_sync_version
  ) RETURNING id INTO v_mapping_id;
  
  RETURN v_mapping_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log sync operations
CREATE OR REPLACE FUNCTION log_quickbooks_sync(
  p_operation_type varchar(50),
  p_entity_type varchar(50),
  p_local_entity_id text,
  p_quickbooks_id varchar(100),
  p_direction varchar(20),
  p_status varchar(20),
  p_request_data jsonb DEFAULT NULL,
  p_response_data jsonb DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_duration integer DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO "QuickBooksSyncLog" (
    "operationType", "entityType", "localEntityId", "quickbooksId", 
    "direction", "status", "requestData", "responseData", 
    "errorMessage", "duration", "completedAt"
  ) VALUES (
    p_operation_type, p_entity_type, p_local_entity_id, p_quickbooks_id,
    p_direction, p_status, p_request_data, p_response_data,
    p_error_message, p_duration, NOW()
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update sync status
CREATE OR REPLACE FUNCTION update_sync_status(
  p_local_entity_type varchar(50),
  p_local_entity_id text,
  p_sync_status varchar(20),
  p_sync_version varchar(20) DEFAULT NULL,
  p_error_data jsonb DEFAULT NULL
) RETURNS boolean AS $$
BEGIN
  UPDATE "QuickBooksMapping" 
  SET 
    "syncStatus" = p_sync_status,
    "syncVersion" = COALESCE(p_sync_version, "syncVersion"),
    "lastSyncAt" = NOW(),
    "syncErrors" = COALESCE(p_error_data, "syncErrors"),
    "updatedAt" = NOW()
  WHERE "localEntityType" = p_local_entity_type 
    AND "localEntityId" = p_local_entity_id;
    
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Insert default sync configurations
INSERT INTO "QuickBooksSyncConfig" ("entityType", "syncDirection", "syncFrequency", "autoCreateInQB") VALUES
('CUSTOMER', 'BIDIRECTIONAL', 'REAL_TIME', true),
('INVOICE', 'TO_QB', 'REAL_TIME', true),
('PAYMENT', 'FROM_QB', 'HOURLY', false),
('ITEM', 'FROM_QB', 'DAILY', false),
('ACCOUNT', 'FROM_QB', 'DAILY', false)
ON CONFLICT ("entityType") DO NOTHING;

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_quickbooks_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
DROP TRIGGER IF EXISTS qb_connection_updated_trigger ON "QuickBooksConnection";
CREATE TRIGGER qb_connection_updated_trigger
  BEFORE UPDATE ON "QuickBooksConnection"
  FOR EACH ROW
  EXECUTE FUNCTION update_quickbooks_timestamp();

DROP TRIGGER IF EXISTS qb_mapping_updated_trigger ON "QuickBooksMapping";
CREATE TRIGGER qb_mapping_updated_trigger
  BEFORE UPDATE ON "QuickBooksMapping"
  FOR EACH ROW
  EXECUTE FUNCTION update_quickbooks_timestamp();

DROP TRIGGER IF EXISTS qb_sync_config_updated_trigger ON "QuickBooksSyncConfig";
CREATE TRIGGER qb_sync_config_updated_trigger
  BEFORE UPDATE ON "QuickBooksSyncConfig"
  FOR EACH ROW
  EXECUTE FUNCTION update_quickbooks_timestamp();