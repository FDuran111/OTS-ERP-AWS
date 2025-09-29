-- Material Tracking Enhancements Migration
-- Adds support for:
-- 1. Per-location stock tracking
-- 2. Material transfers between locations
-- 3. Offline-capable stock movements with idempotency
-- 4. Vendor pricing and lead times for purchase orders
-- 5. Material photos and documents

-- ================================================
-- 1. MaterialLocationStock - Per-Location Stock Tracking
-- ================================================
CREATE TABLE IF NOT EXISTS "MaterialLocationStock" (
    id TEXT PRIMARY KEY DEFAULT ('mls_' || REPLACE(gen_random_uuid()::text, '-', '')),
    "materialId" TEXT NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
    "storageLocationId" TEXT NOT NULL REFERENCES "StorageLocation"(id) ON DELETE CASCADE,
    quantity NUMERIC(15, 4) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Unique constraint to ensure one stock record per material per location
    UNIQUE ("materialId", "storageLocationId")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_material_location_stock_material" 
    ON "MaterialLocationStock" ("materialId");
CREATE INDEX IF NOT EXISTS "idx_material_location_stock_location" 
    ON "MaterialLocationStock" ("storageLocationId");
CREATE INDEX IF NOT EXISTS "idx_material_location_stock_low" 
    ON "MaterialLocationStock" (quantity) WHERE quantity < 10;

-- ================================================
-- 2. Enhance StockMovement for Offline + Transfers
-- ================================================

-- Add clientRequestId for idempotency (offline sync)
ALTER TABLE "StockMovement" 
    ADD COLUMN IF NOT EXISTS "clientRequestId" TEXT UNIQUE;

-- Add transferId to link transfer IN/OUT movements
ALTER TABLE "StockMovement" 
    ADD COLUMN IF NOT EXISTS "transferId" TEXT;

-- Add index on transferId for faster transfer lookups
CREATE INDEX IF NOT EXISTS "idx_stock_movement_transfer_id" 
    ON "StockMovement" ("transferId");

-- Add index on clientRequestId for idempotency checks
CREATE INDEX IF NOT EXISTS "idx_stock_movement_client_request" 
    ON "StockMovement" ("clientRequestId");

-- ================================================
-- 3. StockTransfer - Manage Transfers Between Locations
-- ================================================
CREATE TABLE IF NOT EXISTS "StockTransfer" (
    id TEXT PRIMARY KEY DEFAULT ('trx_' || REPLACE(gen_random_uuid()::text, '-', '')),
    "transferNumber" VARCHAR(50) UNIQUE,
    "sourceLocationId" TEXT NOT NULL REFERENCES "StorageLocation"(id),
    "destLocationId" TEXT NOT NULL REFERENCES "StorageLocation"(id),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
    "transferDate" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "completedDate" TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    "createdBy" TEXT REFERENCES "User"(id),
    "approvedBy" TEXT REFERENCES "User"(id),
    "approvedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraint to prevent transfer to same location
    CHECK ("sourceLocationId" != "destLocationId")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_stock_transfer_source" 
    ON "StockTransfer" ("sourceLocationId");
CREATE INDEX IF NOT EXISTS "idx_stock_transfer_dest" 
    ON "StockTransfer" ("destLocationId");
CREATE INDEX IF NOT EXISTS "idx_stock_transfer_status" 
    ON "StockTransfer" (status);
CREATE INDEX IF NOT EXISTS "idx_stock_transfer_created_by" 
    ON "StockTransfer" ("createdBy");

-- ================================================
-- 4. StockTransferItem - Items in a Transfer
-- ================================================
CREATE TABLE IF NOT EXISTS "StockTransferItem" (
    id TEXT PRIMARY KEY DEFAULT ('txi_' || REPLACE(gen_random_uuid()::text, '-', '')),
    "transferId" TEXT NOT NULL REFERENCES "StockTransfer"(id) ON DELETE CASCADE,
    "materialId" TEXT NOT NULL REFERENCES "Material"(id),
    "quantityRequested" NUMERIC(15, 4) NOT NULL CHECK ("quantityRequested" > 0),
    "quantityTransferred" NUMERIC(15, 4) DEFAULT 0 CHECK ("quantityTransferred" >= 0),
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_stock_transfer_item_transfer" 
    ON "StockTransferItem" ("transferId");
CREATE INDEX IF NOT EXISTS "idx_stock_transfer_item_material" 
    ON "StockTransferItem" ("materialId");

-- ================================================
-- 5. MaterialVendorPrice - Vendor Pricing & Lead Times
-- ================================================
CREATE TABLE IF NOT EXISTS "MaterialVendorPrice" (
    id TEXT PRIMARY KEY DEFAULT ('mvp_' || REPLACE(gen_random_uuid()::text, '-', '')),
    "materialId" TEXT NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
    "vendorId" TEXT NOT NULL REFERENCES "Vendor"(id) ON DELETE CASCADE,
    "unitCost" NUMERIC(15, 4) NOT NULL CHECK ("unitCost" >= 0),
    "leadTimeDays" INTEGER DEFAULT 7 CHECK ("leadTimeDays" >= 0),
    "vendorSku" VARCHAR(100),
    "minimumOrderQuantity" NUMERIC(15, 4) DEFAULT 1,
    "priceBreaks" JSONB, -- [{quantity: 100, price: 9.50}, {quantity: 500, price: 8.75}]
    "lastUpdated" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "isPreferred" BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- One vendor price record per material-vendor combination
    UNIQUE ("materialId", "vendorId")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_material_vendor_price_material" 
    ON "MaterialVendorPrice" ("materialId");
CREATE INDEX IF NOT EXISTS "idx_material_vendor_price_vendor" 
    ON "MaterialVendorPrice" ("vendorId");
CREATE INDEX IF NOT EXISTS "idx_material_vendor_price_preferred" 
    ON "MaterialVendorPrice" ("isPreferred") WHERE "isPreferred" = true;

-- ================================================
-- 6. MaterialDocument - Photos & Spec Sheets
-- ================================================
-- Links materials to file attachments for photos and documents
CREATE TABLE IF NOT EXISTS "MaterialDocument" (
    id TEXT PRIMARY KEY DEFAULT ('md_' || REPLACE(gen_random_uuid()::text, '-', '')),
    "materialId" TEXT NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
    "fileId" UUID NOT NULL REFERENCES "FileAttachment"(id) ON DELETE CASCADE,
    "documentType" VARCHAR(50) NOT NULL DEFAULT 'PHOTO'
        CHECK ("documentType" IN ('PHOTO', 'SPEC_SHEET', 'DATA_SHEET', 'MANUAL', 'WARRANTY', 'OTHER')),
    "isPrimary" BOOLEAN DEFAULT false, -- Primary photo for catalog display
    "displayOrder" INTEGER DEFAULT 0,
    description TEXT,
    "uploadedBy" TEXT REFERENCES "User"(id),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- One file can only be attached once to a material
    UNIQUE ("materialId", "fileId")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_material_document_material" 
    ON "MaterialDocument" ("materialId");
CREATE INDEX IF NOT EXISTS "idx_material_document_file" 
    ON "MaterialDocument" ("fileId");
CREATE INDEX IF NOT EXISTS "idx_material_document_type" 
    ON "MaterialDocument" ("documentType");
CREATE INDEX IF NOT EXISTS "idx_material_document_primary" 
    ON "MaterialDocument" ("isPrimary") WHERE "isPrimary" = true;

-- ================================================
-- 7. Update Triggers for Timestamps
-- ================================================

-- Create update_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for new tables
CREATE TRIGGER update_material_location_stock_updated_at
    BEFORE UPDATE ON "MaterialLocationStock"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_transfer_updated_at
    BEFORE UPDATE ON "StockTransfer"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_transfer_item_updated_at
    BEFORE UPDATE ON "StockTransferItem"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_material_vendor_price_updated_at
    BEFORE UPDATE ON "MaterialVendorPrice"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 8. Helper Functions
-- ================================================

-- Function to get available stock for a material at a specific location
CREATE OR REPLACE FUNCTION get_available_stock_at_location(
    p_material_id TEXT,
    p_location_id TEXT
) RETURNS NUMERIC AS $$
DECLARE
    v_available NUMERIC;
BEGIN
    SELECT COALESCE(mls.quantity, 0) - COALESCE(
        (SELECT SUM(mr."quantityReserved" - COALESCE(mr."fulfilledQuantity", 0))
         FROM "MaterialReservation" mr
         WHERE mr."materialId" = p_material_id
           AND mr."storageLocationId" = p_location_id
           AND mr.status = 'ACTIVE'
        ), 0
    ) INTO v_available
    FROM "MaterialLocationStock" mls
    WHERE mls."materialId" = p_material_id
      AND mls."storageLocationId" = p_location_id;
    
    RETURN COALESCE(v_available, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to sync Material.inStock from location stocks
CREATE OR REPLACE FUNCTION sync_material_total_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_material_id TEXT;
BEGIN
    -- Handle both INSERT/UPDATE (NEW) and DELETE (OLD)
    v_material_id := COALESCE(NEW."materialId", OLD."materialId");
    
    UPDATE "Material" m
    SET "inStock" = (
        SELECT COALESCE(SUM(mls.quantity), 0)
        FROM "MaterialLocationStock" mls
        WHERE mls."materialId" = v_material_id
    )
    WHERE m.id = v_material_id;
    
    RETURN NULL; -- Return value ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-sync total stock when location stock changes
CREATE TRIGGER sync_material_stock_on_location_change
    AFTER INSERT OR UPDATE OR DELETE ON "MaterialLocationStock"
    FOR EACH ROW
    EXECUTE FUNCTION sync_material_total_stock();

-- ================================================
-- 9. Migrate Existing Data (if any)
-- ================================================

-- Create initial location stock records for existing materials
-- This will create one record per material at a default "Main Warehouse" location
DO $$
DECLARE
    v_default_location_id TEXT;
BEGIN
    -- Get or create a default storage location
    SELECT id INTO v_default_location_id
    FROM "StorageLocation"
    WHERE code = 'MAIN-WH' OR name = 'Main Warehouse'
    LIMIT 1;
    
    IF v_default_location_id IS NULL THEN
        v_default_location_id := 'sl_' || REPLACE(gen_random_uuid()::text, '-', '');
        INSERT INTO "StorageLocation" (id, name, code, type, active)
        VALUES (v_default_location_id, 'Main Warehouse Default', 'MAIN-WH', 'WAREHOUSE', true);
    END IF;
    
    -- Migrate existing material stock to location-based tracking
    INSERT INTO "MaterialLocationStock" ("materialId", "storageLocationId", quantity)
    SELECT 
        m.id,
        v_default_location_id,
        COALESCE(m."inStock", 0)
    FROM "Material" m
    WHERE NOT EXISTS (
        SELECT 1 
        FROM "MaterialLocationStock" mls 
        WHERE mls."materialId" = m.id 
          AND mls."storageLocationId" = v_default_location_id
    )
    AND m.active = true;
    
    RAISE NOTICE 'Migrated existing material stock to location-based tracking at location: %', v_default_location_id;
END $$;

-- ================================================
-- 10. Generate Transfer Numbers
-- ================================================

-- Sequence for transfer numbers
CREATE SEQUENCE IF NOT EXISTS transfer_number_seq START WITH 1;

-- Function to generate transfer numbers
CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    v_year VARCHAR(4);
    v_seq VARCHAR(6);
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YY');
    v_seq := LPAD(nextval('transfer_number_seq')::TEXT, 6, '0');
    RETURN 'TRF-' || v_year || '-' || v_seq;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Completion Message
-- ================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Material tracking enhancements migration completed successfully!';
    RAISE NOTICE '   - MaterialLocationStock: Per-location inventory tracking';
    RAISE NOTICE '   - StockTransfer: Transfer management between locations';
    RAISE NOTICE '   - MaterialVendorPrice: Vendor pricing and lead times';
    RAISE NOTICE '   - MaterialDocument: Photos and spec sheets';
    RAISE NOTICE '   - Enhanced StockMovement: Offline sync support';
END $$;
