-- Advanced Inventory Management System Database Schema
-- Comprehensive tracking, stock monitoring, reorder automation, and analytics

-- Stock movement type enumeration
CREATE TYPE stock_movement_type AS ENUM (
    'PURCHASE', 'SALE', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'DAMAGED', 
    'EXPIRED', 'STOLEN', 'FOUND', 'INITIAL_STOCK', 'PHYSICAL_COUNT'
);

-- Reorder status enumeration
CREATE TYPE reorder_status AS ENUM ('PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED');

-- Alert severity enumeration
CREATE TYPE alert_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Warehouse/Location tracking
CREATE TABLE IF NOT EXISTS "Warehouse" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(20) UNIQUE NOT NULL,
    name varchar(255) NOT NULL,
    description text,
    "isMainWarehouse" boolean DEFAULT false,
    "isActive" boolean DEFAULT true,
    
    -- Location details
    address text,
    city varchar(100),
    state varchar(50),
    "zipCode" varchar(20),
    country varchar(50) DEFAULT 'US',
    
    -- Contact information
    "managerName" varchar(255),
    "managerPhone" varchar(20),
    "managerEmail" varchar(255),
    
    -- Operational details
    "operatingHours" jsonb, -- {"monday": {"open": "08:00", "close": "17:00"}, ...}
    "storageCapacity" decimal(15, 2), -- In cubic feet/meters
    "currentUtilization" decimal(5, 2) DEFAULT 0, -- Percentage
    
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Enhanced material categories
CREATE TABLE IF NOT EXISTS "MaterialCategory" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(20) UNIQUE NOT NULL,
    name varchar(255) NOT NULL,
    description text,
    "parentCategoryId" uuid REFERENCES "MaterialCategory"(id) ON DELETE SET NULL,
    
    -- Inventory settings
    "defaultReorderPoint" integer DEFAULT 10,
    "defaultReorderQuantity" integer DEFAULT 50,
    "defaultLeadTimeDays" integer DEFAULT 7,
    "requiresSerialNumbers" boolean DEFAULT false,
    "requiresLotTracking" boolean DEFAULT false,
    "hasShelfLife" boolean DEFAULT false,
    "defaultShelfLifeDays" integer,
    
    -- Categorization
    "isDangerous" boolean DEFAULT false, -- Hazardous materials
    "isConsumable" boolean DEFAULT true, -- vs. returnable/reusable
    "isStockable" boolean DEFAULT true, -- vs. special order only
    
    "sortOrder" integer DEFAULT 0,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Enhanced inventory levels per warehouse
CREATE TABLE IF NOT EXISTS "InventoryLevel" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "materialId" text NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
    "warehouseId" uuid NOT NULL REFERENCES "Warehouse"(id) ON DELETE CASCADE,
    
    -- Stock levels
    "currentStock" decimal(15, 4) NOT NULL DEFAULT 0,
    "reservedStock" decimal(15, 4) NOT NULL DEFAULT 0, -- Reserved for jobs/orders
    "availableStock" decimal(15, 4) GENERATED ALWAYS AS ("currentStock" - "reservedStock") STORED,
    "transitStock" decimal(15, 4) NOT NULL DEFAULT 0, -- In transit from suppliers
    
    -- Reorder settings (can override category defaults)
    "reorderPoint" integer,
    "reorderQuantity" integer,
    "maxStockLevel" integer,
    "leadTimeDays" integer,
    
    -- Location within warehouse
    "binLocation" varchar(50), -- Aisle-Bay-Shelf notation (e.g., A1-B2-S3)
    "zone" varchar(50), -- High-velocity, climate-controlled, etc.
    
    -- Cost tracking
    "averageCost" decimal(15, 4), -- Moving average cost
    "lastPurchaseCost" decimal(15, 4),
    "totalValue" decimal(15, 2) GENERATED ALWAYS AS ("currentStock" * "averageCost") STORED,
    
    -- Stock tracking
    "lastStockCount" timestamp,
    "lastStockMovement" timestamp,
    "stockAccuracy" decimal(5, 2) DEFAULT 100.00, -- Percentage accuracy from cycle counts
    
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW(),
    
    UNIQUE("materialId", "warehouseId")
);

-- Stock movement history for complete audit trail
CREATE TABLE IF NOT EXISTS "StockMovement" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "materialId" text NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
    "warehouseId" uuid NOT NULL REFERENCES "Warehouse"(id) ON DELETE CASCADE,
    
    -- Movement details
    "movementType" stock_movement_type NOT NULL,
    quantity decimal(15, 4) NOT NULL, -- Positive for inbound, negative for outbound
    "previousStock" decimal(15, 4) NOT NULL,
    "newStock" decimal(15, 4) NOT NULL,
    
    -- Cost information
    "unitCost" decimal(15, 4),
    "totalCost" decimal(15, 2),
    
    -- Reference information
    "referenceType" varchar(50), -- 'JOB', 'PURCHASE_ORDER', 'TRANSFER', etc.
    "referenceId" text, -- ID of the related record
    "documentNumber" varchar(100), -- PO number, invoice number, etc.
    
    -- Lot/Serial tracking
    "lotNumber" varchar(100),
    "serialNumber" varchar(100),
    "expirationDate" timestamp,
    
    -- Movement context
    reason text,
    notes text,
    "performedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    "approvedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    
    "createdAt" timestamp NOT NULL DEFAULT NOW()
);

-- Automatic reorder management
CREATE TABLE IF NOT EXISTS "ReorderRequest" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "materialId" text NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
    "warehouseId" uuid NOT NULL REFERENCES "Warehouse"(id) ON DELETE CASCADE,
    
    -- Request details
    "requestedQuantity" integer NOT NULL,
    "currentStock" decimal(15, 4) NOT NULL,
    "reorderPoint" integer NOT NULL,
    "urgencyLevel" alert_severity NOT NULL DEFAULT 'MEDIUM',
    
    -- Supplier information
    "preferredSupplierId" text, -- Reference to supplier if we have a suppliers table
    "supplierName" varchar(255),
    "supplierContact" varchar(255),
    "estimatedCost" decimal(15, 2),
    "estimatedLeadTime" integer, -- Days
    
    -- Status tracking
    status reorder_status NOT NULL DEFAULT 'PENDING',
    "statusNotes" text,
    
    -- Automation details
    "isAutoGenerated" boolean DEFAULT true,
    "generatedAt" timestamp DEFAULT NOW(),
    "reviewedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    "reviewedAt" timestamp,
    
    -- Order tracking
    "purchaseOrderNumber" varchar(100),
    "orderedQuantity" integer,
    "orderedAt" timestamp,
    "expectedDelivery" timestamp,
    "receivedQuantity" integer,
    "receivedAt" timestamp,
    
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Stock alerts and notifications
CREATE TABLE IF NOT EXISTS "StockAlert" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "materialId" text NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
    "warehouseId" uuid NOT NULL REFERENCES "Warehouse"(id) ON DELETE CASCADE,
    
    -- Alert details
    "alertType" varchar(50) NOT NULL, -- 'LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCKED', 'EXPIRING', 'EXPIRED'
    severity alert_severity NOT NULL,
    title varchar(255) NOT NULL,
    message text NOT NULL,
    
    -- Alert context
    "currentStock" decimal(15, 4),
    "thresholdValue" decimal(15, 4), -- The threshold that triggered this alert
    "recommendedAction" text,
    
    -- Status
    "isActive" boolean DEFAULT true,
    "isResolved" boolean DEFAULT false,
    "resolvedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    "resolvedAt" timestamp,
    "resolutionNotes" text,
    
    -- Notification tracking
    "notificationsSent" integer DEFAULT 0,
    "lastNotificationAt" timestamp,
    "notifyUsers" text[], -- Array of user IDs to notify
    
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Physical inventory counts/cycle counts
CREATE TABLE IF NOT EXISTS "InventoryCount" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "warehouseId" uuid NOT NULL REFERENCES "Warehouse"(id) ON DELETE CASCADE,
    
    -- Count session details
    "countNumber" varchar(50) UNIQUE NOT NULL,
    "countType" varchar(50) NOT NULL, -- 'FULL_INVENTORY', 'CYCLE_COUNT', 'SPOT_CHECK'
    "countDate" timestamp NOT NULL DEFAULT NOW(),
    
    -- Status
    "status" varchar(50) NOT NULL DEFAULT 'IN_PROGRESS', -- 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    "isCompleted" boolean DEFAULT false,
    "completedAt" timestamp,
    
    -- Assignment
    "assignedTo" text[] NOT NULL, -- Array of user IDs
    "supervisedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    
    -- Planning
    "plannedStartDate" timestamp,
    "plannedEndDate" timestamp,
    notes text,
    
    "createdBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Individual item counts within inventory count sessions
CREATE TABLE IF NOT EXISTS "InventoryCountItem" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "countId" uuid NOT NULL REFERENCES "InventoryCount"(id) ON DELETE CASCADE,
    "materialId" text NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
    
    -- Count details
    "expectedQuantity" decimal(15, 4) NOT NULL, -- System quantity before count
    "countedQuantity" decimal(15, 4), -- Actual counted quantity
    variance decimal(15, 4) GENERATED ALWAYS AS ("countedQuantity" - "expectedQuantity") STORED,
    "variancePercentage" decimal(8, 4) GENERATED ALWAYS AS (
        CASE 
            WHEN "expectedQuantity" = 0 THEN 100.0
            ELSE (("countedQuantity" - "expectedQuantity") / "expectedQuantity") * 100
        END
    ) STORED,
    
    -- Location and tracking
    "binLocation" varchar(50),
    "lotNumber" varchar(100),
    "serialNumbers" text[], -- Array for multiple serial numbers
    
    -- Count process
    "isCounted" boolean DEFAULT false,
    "countedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    "countedAt" timestamp,
    "recountRequired" boolean DEFAULT false,
    "recountReason" text,
    
    -- Adjustments
    "adjustmentApplied" boolean DEFAULT false,
    "adjustmentBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    "adjustmentAt" timestamp,
    "adjustmentReason" text,
    
    notes text,
    "createdAt" timestamp NOT NULL DEFAULT NOW()
);

-- Material reservations for jobs/orders
CREATE TABLE IF NOT EXISTS "StockReservation" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "materialId" text NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
    "warehouseId" uuid NOT NULL REFERENCES "Warehouse"(id) ON DELETE CASCADE,
    
    -- Reservation details
    quantity decimal(15, 4) NOT NULL,
    "reservationType" varchar(50) NOT NULL, -- 'JOB', 'SERVICE_CALL', 'QUOTE', 'TRANSFER'
    "referenceId" text NOT NULL, -- ID of job, service call, etc.
    "referenceNumber" varchar(100), -- Job number, service call number, etc.
    
    -- Timing
    "reservedUntil" timestamp, -- Auto-release date
    "isActive" boolean DEFAULT true,
    "releasedAt" timestamp,
    "releasedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    
    -- Fulfillment
    "fulfilledQuantity" decimal(15, 4) DEFAULT 0,
    "isFulfilled" boolean DEFAULT false,
    "fulfilledAt" timestamp,
    
    "createdBy" text REFERENCES "User"(id) ON DELETE SET NULL,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Supplier catalog and pricing
CREATE TABLE IF NOT EXISTS "SupplierCatalog" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "materialId" text NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
    
    -- Supplier details
    "supplierName" varchar(255) NOT NULL,
    "supplierPartNumber" varchar(100),
    "supplierContact" varchar(255),
    "supplierPhone" varchar(20),
    "supplierEmail" varchar(255),
    
    -- Pricing
    "unitCost" decimal(15, 4) NOT NULL,
    "minimumOrderQuantity" integer DEFAULT 1,
    "priceBreaks" jsonb, -- [{"quantity": 100, "price": 9.50}, ...]
    "lastPriceUpdate" timestamp DEFAULT NOW(),
    
    -- Terms
    "leadTimeDays" integer NOT NULL DEFAULT 7,
    "paymentTerms" varchar(100), -- "Net 30", "2/10 Net 30", etc.
    "shippingCost" decimal(10, 2),
    "freeShippingThreshold" decimal(10, 2),
    
    -- Status
    "isPreferred" boolean DEFAULT false,
    "isActive" boolean DEFAULT true,
    "lastOrderDate" timestamp,
    "performanceRating" decimal(3, 2) CHECK ("performanceRating" BETWEEN 1.0 AND 5.0),
    
    notes text,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_level_material ON "InventoryLevel"("materialId");
CREATE INDEX IF NOT EXISTS idx_inventory_level_warehouse ON "InventoryLevel"("warehouseId");
CREATE INDEX IF NOT EXISTS idx_inventory_level_low_stock ON "InventoryLevel"("availableStock") WHERE "availableStock" <= COALESCE("reorderPoint", 0);

CREATE INDEX IF NOT EXISTS idx_stock_movement_material ON "StockMovement"("materialId");
CREATE INDEX IF NOT EXISTS idx_stock_movement_warehouse ON "StockMovement"("warehouseId");
CREATE INDEX IF NOT EXISTS idx_stock_movement_date ON "StockMovement"("createdAt");
CREATE INDEX IF NOT EXISTS idx_stock_movement_type ON "StockMovement"("movementType");

CREATE INDEX IF NOT EXISTS idx_reorder_request_status ON "ReorderRequest"(status);
CREATE INDEX IF NOT EXISTS idx_reorder_request_urgency ON "ReorderRequest"("urgencyLevel");
CREATE INDEX IF NOT EXISTS idx_reorder_request_material ON "ReorderRequest"("materialId");

CREATE INDEX IF NOT EXISTS idx_stock_alert_active ON "StockAlert"("isActive", "isResolved");
CREATE INDEX IF NOT EXISTS idx_stock_alert_severity ON "StockAlert"(severity);
CREATE INDEX IF NOT EXISTS idx_stock_alert_type ON "StockAlert"("alertType");

CREATE INDEX IF NOT EXISTS idx_reservation_active ON "StockReservation"("isActive", "materialId", "warehouseId");
CREATE INDEX IF NOT EXISTS idx_reservation_reference ON "StockReservation"("referenceType", "referenceId");

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_warehouse_updated_at_trigger
    BEFORE UPDATE ON "Warehouse"
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_updated_at();

CREATE TRIGGER update_material_category_updated_at_trigger
    BEFORE UPDATE ON "MaterialCategory"
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_updated_at();

CREATE TRIGGER update_inventory_level_updated_at_trigger
    BEFORE UPDATE ON "InventoryLevel"
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_updated_at();

CREATE TRIGGER update_reorder_request_updated_at_trigger
    BEFORE UPDATE ON "ReorderRequest"
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_updated_at();

CREATE TRIGGER update_stock_alert_updated_at_trigger
    BEFORE UPDATE ON "StockAlert"
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_updated_at();

CREATE TRIGGER update_inventory_count_updated_at_trigger
    BEFORE UPDATE ON "InventoryCount"
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_updated_at();

CREATE TRIGGER update_stock_reservation_updated_at_trigger
    BEFORE UPDATE ON "StockReservation"
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_updated_at();

CREATE TRIGGER update_supplier_catalog_updated_at_trigger
    BEFORE UPDATE ON "SupplierCatalog"
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_updated_at();

-- Will create this function after tables are created

-- Move this function to end after all tables are created

-- Function to generate inventory count numbers
CREATE OR REPLACE FUNCTION generate_count_number()
RETURNS varchar(50) AS $$
DECLARE
    prefix varchar(3) := 'IC';
    year_suffix varchar(2) := to_char(CURRENT_DATE, 'YY');
    sequence_num integer;
    new_number varchar(50);
BEGIN
    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING("countNumber" FROM 6) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM "InventoryCount"
    WHERE "countNumber" LIKE prefix || year_suffix || '%';
    
    -- Format as IC24-0001
    new_number := prefix || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate count numbers
CREATE OR REPLACE FUNCTION set_count_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."countNumber" IS NULL OR NEW."countNumber" = '' THEN
        NEW."countNumber" := generate_count_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_count_number_trigger
    BEFORE INSERT ON "InventoryCount"
    FOR EACH ROW
    EXECUTE FUNCTION set_count_number();

-- Function to check for low stock and create alerts
CREATE OR REPLACE FUNCTION check_low_stock_alerts()
RETURNS TRIGGER AS $$
DECLARE
    reorder_point INTEGER;
    category_record RECORD;
BEGIN
    -- Get the reorder point (from inventory level or category default)
    SELECT COALESCE(il."reorderPoint", mc."defaultReorderPoint", 10) INTO reorder_point
    FROM "InventoryLevel" il
    JOIN "Material" m ON il."materialId" = m.id
    LEFT JOIN "MaterialCategory" mc ON m.category = mc.name
    WHERE il."materialId" = NEW."materialId" AND il."warehouseId" = NEW."warehouseId";
    
    -- Check if we need to create/update alerts
    IF NEW."availableStock" <= reorder_point THEN
        -- Create or update low stock alert (check if one doesn't already exist)
        IF NOT EXISTS (
            SELECT 1 FROM "StockAlert" 
            WHERE "materialId" = NEW."materialId" 
            AND "warehouseId" = NEW."warehouseId"
            AND "alertType" IN ('LOW_STOCK', 'OUT_OF_STOCK')
            AND "isActive" = true 
            AND "isResolved" = false
        ) THEN
            INSERT INTO "StockAlert" (
                "materialId", "warehouseId", "alertType", severity, title, message,
                "currentStock", "thresholdValue", "recommendedAction"
            ) VALUES (
                NEW."materialId", NEW."warehouseId", 
                CASE WHEN NEW."availableStock" <= 0 THEN 'OUT_OF_STOCK' ELSE 'LOW_STOCK' END,
                CASE WHEN NEW."availableStock" <= 0 THEN 'CRITICAL' ELSE 'HIGH' END,
                CASE WHEN NEW."availableStock" <= 0 THEN 'Out of Stock' ELSE 'Low Stock Alert' END,
                CASE WHEN NEW."availableStock" <= 0 THEN 
                    'Material is out of stock and needs immediate attention'
                ELSE 
                    'Material stock is below reorder point: ' || NEW."availableStock" || ' available, reorder at ' || reorder_point
                END,
                NEW."availableStock", reorder_point,
                'Review and create purchase order for this material'
            );
        ELSE
            -- Update existing alert
            UPDATE "StockAlert"
            SET 
                "currentStock" = NEW."availableStock",
                severity = CASE WHEN NEW."availableStock" <= 0 THEN 'CRITICAL' ELSE 'HIGH' END,
                "alertType" = CASE WHEN NEW."availableStock" <= 0 THEN 'OUT_OF_STOCK' ELSE 'LOW_STOCK' END,
                "updatedAt" = NOW()
            WHERE "materialId" = NEW."materialId" 
            AND "warehouseId" = NEW."warehouseId"
            AND "alertType" IN ('LOW_STOCK', 'OUT_OF_STOCK')
            AND "isActive" = true 
            AND "isResolved" = false;
        END IF;
            
        -- Create automatic reorder request if enabled
        INSERT INTO "ReorderRequest" (
            "materialId", "warehouseId", "requestedQuantity", "currentStock", 
            "reorderPoint", "urgencyLevel"
        )
        SELECT 
            NEW."materialId", NEW."warehouseId",
            COALESCE(il."reorderQuantity", mc."defaultReorderQuantity", 50),
            NEW."availableStock", reorder_point,
            CASE WHEN NEW."availableStock" <= 0 THEN 'CRITICAL' ELSE 'HIGH' END
        FROM "InventoryLevel" il
        JOIN "Material" m ON il."materialId" = m.id
        LEFT JOIN "MaterialCategory" mc ON m.category = mc.name
        WHERE il."materialId" = NEW."materialId" AND il."warehouseId" = NEW."warehouseId"
        AND NOT EXISTS (
            SELECT 1 FROM "ReorderRequest" 
            WHERE "materialId" = NEW."materialId" 
            AND "warehouseId" = NEW."warehouseId" 
            AND status IN ('PENDING', 'ORDERED')
        );
    ELSE
        -- Resolve low stock alerts if stock is now above reorder point
        UPDATE "StockAlert"
        SET "isResolved" = true, "resolvedAt" = NOW(), "resolutionNotes" = 'Stock replenished above reorder point'
        WHERE "materialId" = NEW."materialId" 
        AND "warehouseId" = NEW."warehouseId"
        AND "alertType" IN ('LOW_STOCK', 'OUT_OF_STOCK')
        AND "isActive" = true 
        AND "isResolved" = false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_low_stock_alerts_trigger
    AFTER UPDATE OF "availableStock" ON "InventoryLevel"
    FOR EACH ROW
    EXECUTE FUNCTION check_low_stock_alerts();

-- Function to automatically update inventory levels when stock movements occur
CREATE OR REPLACE FUNCTION update_inventory_level_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the inventory level
    UPDATE "InventoryLevel"
    SET 
        "currentStock" = "currentStock" + NEW.quantity,
        "lastStockMovement" = NEW."createdAt",
        "averageCost" = CASE 
            WHEN NEW.quantity > 0 AND NEW."unitCost" IS NOT NULL THEN
                (("currentStock" * COALESCE("averageCost", 0)) + (NEW.quantity * NEW."unitCost")) / 
                NULLIF("currentStock" + NEW.quantity, 0)
            ELSE "averageCost"
        END,
        "lastPurchaseCost" = CASE 
            WHEN NEW."movementType" = 'PURCHASE' AND NEW."unitCost" IS NOT NULL THEN NEW."unitCost"
            ELSE "lastPurchaseCost"
        END
    WHERE "materialId" = NEW."materialId" AND "warehouseId" = NEW."warehouseId";
    
    -- Insert inventory level record if it doesn't exist
    INSERT INTO "InventoryLevel" ("materialId", "warehouseId", "currentStock", "lastStockMovement")
    SELECT NEW."materialId", NEW."warehouseId", NEW.quantity, NEW."createdAt"
    WHERE NOT EXISTS (
        SELECT 1 FROM "InventoryLevel" 
        WHERE "materialId" = NEW."materialId" AND "warehouseId" = NEW."warehouseId"
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_level_on_movement_trigger
    AFTER INSERT ON "StockMovement"
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_level_on_movement();