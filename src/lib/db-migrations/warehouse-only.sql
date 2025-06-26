-- Just create the warehouse table first

-- Warehouse/Location tracking
CREATE TABLE IF NOT EXISTS "Warehouse" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(20) UNIQUE NOT NULL,
    name varchar(255) NOT NULL,
    description text,
    "isMainWarehouse" boolean DEFAULT false,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Create main warehouse
INSERT INTO "Warehouse" (code, name, "isMainWarehouse", "isActive")
SELECT 'MAIN', 'Main Warehouse', true, true
WHERE NOT EXISTS (SELECT 1 FROM "Warehouse" WHERE code = 'MAIN');