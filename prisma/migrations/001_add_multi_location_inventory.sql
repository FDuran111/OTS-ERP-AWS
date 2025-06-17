-- Migration: Add multi-location inventory tracking
-- This migration adds support for tracking material stock across multiple storage locations

-- Create LocationType enum
CREATE TYPE "LocationType" AS ENUM ('WAREHOUSE', 'SHOP', 'TRUCK', 'OFFICE', 'SUPPLIER');

-- Create StorageLocation table
CREATE TABLE "StorageLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'WAREHOUSE',
    "address" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("id")
);

-- Create MaterialStockLocation table
CREATE TABLE "MaterialStockLocation" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialStockLocation_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "StorageLocation_name_key" ON "StorageLocation"("name");
CREATE UNIQUE INDEX "StorageLocation_code_key" ON "StorageLocation"("code");
CREATE UNIQUE INDEX "MaterialStockLocation_materialId_locationId_key" ON "MaterialStockLocation"("materialId", "locationId");

-- Add foreign key constraints
ALTER TABLE "MaterialStockLocation" ADD CONSTRAINT "MaterialStockLocation_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialStockLocation" ADD CONSTRAINT "MaterialStockLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StorageLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default storage locations
INSERT INTO "StorageLocation" ("id", "name", "code", "type", "description", "createdAt", "updatedAt") VALUES
('default_warehouse', 'Main Warehouse', 'WH01', 'WAREHOUSE', 'Primary storage facility', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('default_shop', 'Shop Floor', 'SHOP1', 'SHOP', 'On-site shop storage', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('default_truck', 'Service Truck', 'TRUCK1', 'TRUCK', 'Mobile inventory', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);