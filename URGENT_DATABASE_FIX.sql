-- URGENT: Run this SQL in your Supabase SQL Editor to fix the 500 errors
-- This adds the missing fields that are causing the API to crash

-- Add manufacturer field to Material table
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "manufacturer" TEXT;

-- Add the multi-location inventory tables if they don't exist
CREATE TYPE IF NOT EXISTS "LocationType" AS ENUM ('WAREHOUSE', 'SHOP', 'TRUCK', 'OFFICE', 'SUPPLIER');

CREATE TABLE IF NOT EXISTS "StorageLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'WAREHOUSE',
    "address" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MaterialStockLocation" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialStockLocation_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes (with IF NOT EXISTS equivalent using DO blocks)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'StorageLocation_name_key') THEN
        CREATE UNIQUE INDEX "StorageLocation_name_key" ON "StorageLocation"("name");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'StorageLocation_code_key') THEN
        CREATE UNIQUE INDEX "StorageLocation_code_key" ON "StorageLocation"("code");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'MaterialStockLocation_materialId_locationId_key') THEN
        CREATE UNIQUE INDEX "MaterialStockLocation_materialId_locationId_key" ON "MaterialStockLocation"("materialId", "locationId");
    END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'MaterialStockLocation_materialId_fkey'
    ) THEN
        ALTER TABLE "MaterialStockLocation" ADD CONSTRAINT "MaterialStockLocation_materialId_fkey" 
        FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'MaterialStockLocation_locationId_fkey'
    ) THEN
        ALTER TABLE "MaterialStockLocation" ADD CONSTRAINT "MaterialStockLocation_locationId_fkey" 
        FOREIGN KEY ("locationId") REFERENCES "StorageLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Insert default storage locations if they don't exist
INSERT INTO "StorageLocation" ("id", "name", "code", "type", "description", "createdAt", "updatedAt") 
SELECT 'default_warehouse', 'Main Warehouse', 'WH01', 'WAREHOUSE', 'Primary storage facility', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "StorageLocation" WHERE "id" = 'default_warehouse');

INSERT INTO "StorageLocation" ("id", "name", "code", "type", "description", "createdAt", "updatedAt") 
SELECT 'default_shop', 'Shop Floor', 'SHOP1', 'SHOP', 'On-site shop storage', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "StorageLocation" WHERE "id" = 'default_shop');

INSERT INTO "StorageLocation" ("id", "name", "code", "type", "description", "createdAt", "updatedAt") 
SELECT 'default_truck', 'Service Truck', 'TRUCK1', 'TRUCK', 'Mobile inventory', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "StorageLocation" WHERE "id" = 'default_truck');

-- Add some sample manufacturers to existing materials if needed
UPDATE "Material" SET "manufacturer" = 'Square D' WHERE "name" ILIKE '%square d%' AND "manufacturer" IS NULL;
UPDATE "Material" SET "manufacturer" = 'Schneider Electric' WHERE "name" ILIKE '%schneider%' AND "manufacturer" IS NULL;
UPDATE "Material" SET "manufacturer" = 'Eaton' WHERE "name" ILIKE '%eaton%' AND "manufacturer" IS NULL;
UPDATE "Material" SET "manufacturer" = 'General Electric' WHERE "name" ILIKE '%ge %' OR "name" ILIKE '%general electric%' AND "manufacturer" IS NULL;

-- Confirm the changes
SELECT 'Database updated successfully!' as status;