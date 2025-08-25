-- Create material reservation and availability tables/views

-- MaterialReservation table for tracking reserved materials
CREATE TABLE IF NOT EXISTS "MaterialReservation" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "materialId" UUID REFERENCES "Material"(id) ON DELETE CASCADE,
    "jobId" UUID REFERENCES "Job"(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2) NOT NULL,
    "reservedDate" DATE DEFAULT CURRENT_DATE,
    "expectedUseDate" DATE,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    notes TEXT,
    "reservedBy" UUID REFERENCES "User"(id),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MaterialAvailability view for calculating available stock
CREATE OR REPLACE VIEW "MaterialAvailability" AS
SELECT 
    m.id,
    m.code,
    m.name,
    m."inStock",
    COALESCE(SUM(
        CASE 
            WHEN mr.status = 'ACTIVE' THEN mr.quantity 
            ELSE 0 
        END
    ), 0) as total_reserved,
    m."inStock" - COALESCE(SUM(
        CASE 
            WHEN mr.status = 'ACTIVE' THEN mr.quantity 
            ELSE 0 
        END
    ), 0) as available_stock
FROM "Material" m
LEFT JOIN "MaterialReservation" mr ON m.id = mr."materialId"
GROUP BY m.id, m.code, m.name, m."inStock";

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_reservation_material ON "MaterialReservation"("materialId");
CREATE INDEX IF NOT EXISTS idx_material_reservation_job ON "MaterialReservation"("jobId");
CREATE INDEX IF NOT EXISTS idx_material_reservation_status ON "MaterialReservation"(status);

-- Add some test data for materials if empty
INSERT INTO "Material" (code, name, description, category, unit, "inStock", "minStock", cost, price, active)
SELECT 
    'MAT-' || LPAD(generate_series::text, 4, '0'),
    'Material ' || generate_series,
    'Test material description',
    CASE 
        WHEN generate_series % 3 = 0 THEN 'ELECTRICAL'
        WHEN generate_series % 3 = 1 THEN 'PLUMBING'
        ELSE 'GENERAL'
    END,
    CASE 
        WHEN generate_series % 2 = 0 THEN 'PCS'
        ELSE 'FT'
    END,
    (random() * 100)::integer,
    10,
    (random() * 50 + 10)::numeric(10,2),
    (random() * 100 + 20)::numeric(10,2),
    true
FROM generate_series(1, 10)
WHERE NOT EXISTS (SELECT 1 FROM "Material" LIMIT 1);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Material tables and views created successfully!';
END $$;