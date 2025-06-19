-- Material Reservation System Migration
-- Creates tables for reserving materials for specific jobs

-- Material Reservations Table
CREATE TABLE IF NOT EXISTS "MaterialReservation" (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'base64'),
  "jobId" TEXT NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  "materialId" TEXT NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
  "phaseId" TEXT REFERENCES "JobPhase"(id) ON DELETE SET NULL,
  "userId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  
  -- Reservation details
  "quantityReserved" DECIMAL(10,2) NOT NULL CHECK ("quantityReserved" > 0),
  "reservedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "neededBy" TIMESTAMP WITH TIME ZONE, -- When the material is needed for the job
  "expiresAt" TIMESTAMP WITH TIME ZONE, -- When the reservation expires if not used
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED')),
  "fulfilledAt" TIMESTAMP WITH TIME ZONE,
  "fulfilledQuantity" DECIMAL(10,2) DEFAULT 0,
  
  -- Notes and metadata
  notes TEXT,
  priority VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  
  -- Audit fields
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE("jobId", "materialId", "phaseId"), -- One reservation per material per job phase
  CHECK ("fulfilledQuantity" <= "quantityReserved")
);

-- Purchase Order Requirements Table
CREATE TABLE IF NOT EXISTS "PurchaseOrderRequirement" (
  id TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(12), 'base64'),
  "materialId" TEXT NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
  "jobId" TEXT REFERENCES "Job"(id) ON DELETE CASCADE,
  "reservationId" TEXT REFERENCES "MaterialReservation"(id) ON DELETE CASCADE,
  
  -- PO details
  "quantityNeeded" DECIMAL(10,2) NOT NULL CHECK ("quantityNeeded" > 0),
  "quantityOrdered" DECIMAL(10,2) DEFAULT 0,
  "estimatedCost" DECIMAL(10,2),
  "actualCost" DECIMAL(10,2),
  
  -- Supplier information
  "preferredVendorId" TEXT REFERENCES "Vendor"(id),
  "supplierQuote" TEXT, -- Quote reference or document
  
  -- Timeline
  "neededBy" TIMESTAMP WITH TIME ZONE NOT NULL,
  "orderedAt" TIMESTAMP WITH TIME ZONE,
  "expectedDelivery" TIMESTAMP WITH TIME ZONE,
  "actualDelivery" TIMESTAMP WITH TIME ZONE,
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN 
    ('PENDING', 'QUOTED', 'ORDERED', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  
  -- Notes
  notes TEXT,
  "poNumber" VARCHAR(50), -- Purchase order number
  
  -- Audit fields
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK ("quantityOrdered" <= "quantityNeeded")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_material_reservation_job" ON "MaterialReservation"("jobId");
CREATE INDEX IF NOT EXISTS "idx_material_reservation_material" ON "MaterialReservation"("materialId");
CREATE INDEX IF NOT EXISTS "idx_material_reservation_status" ON "MaterialReservation"(status);
CREATE INDEX IF NOT EXISTS "idx_material_reservation_needed_by" ON "MaterialReservation"("neededBy");

CREATE INDEX IF NOT EXISTS "idx_po_requirement_material" ON "PurchaseOrderRequirement"("materialId");
CREATE INDEX IF NOT EXISTS "idx_po_requirement_job" ON "PurchaseOrderRequirement"("jobId");
CREATE INDEX IF NOT EXISTS "idx_po_requirement_status" ON "PurchaseOrderRequirement"(status);
CREATE INDEX IF NOT EXISTS "idx_po_requirement_needed_by" ON "PurchaseOrderRequirement"("neededBy");

-- Create function to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_material_reservation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_material_reservation_updated_at
  BEFORE UPDATE ON "MaterialReservation"
  FOR EACH ROW
  EXECUTE FUNCTION update_material_reservation_updated_at();

CREATE TRIGGER update_po_requirement_updated_at
  BEFORE UPDATE ON "PurchaseOrderRequirement"
  FOR EACH ROW
  EXECUTE FUNCTION update_material_reservation_updated_at();

-- View for material availability calculation
CREATE OR REPLACE VIEW "MaterialAvailability" AS
SELECT 
  m.id,
  m.code,
  m.name,
  m.unit,
  m."inStock" as total_stock,
  COALESCE(SUM(
    CASE 
      WHEN mr.status = 'ACTIVE' 
      THEN mr."quantityReserved" - COALESCE(mr."fulfilledQuantity", 0)
      ELSE 0 
    END
  ), 0) as total_reserved,
  m."inStock" - COALESCE(SUM(
    CASE 
      WHEN mr.status = 'ACTIVE' 
      THEN mr."quantityReserved" - COALESCE(mr."fulfilledQuantity", 0)
      ELSE 0 
    END
  ), 0) as available_stock,
  m."minStock",
  m.cost,
  m.category,
  m."vendorId",
  m.active
FROM "Material" m
LEFT JOIN "MaterialReservation" mr ON m.id = mr."materialId" 
  AND mr.status = 'ACTIVE'
WHERE m.active = TRUE
GROUP BY m.id, m.code, m.name, m.unit, m."inStock", m."minStock", 
         m.cost, m.category, m."vendorId", m.active;

-- Function to check if sufficient stock is available for reservation
CREATE OR REPLACE FUNCTION check_material_availability(
  p_material_id TEXT,
  p_quantity DECIMAL(10,2),
  p_exclude_reservation_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_available_stock DECIMAL(10,2);
BEGIN
  SELECT available_stock INTO v_available_stock
  FROM "MaterialAvailability" 
  WHERE id = p_material_id;
  
  -- If excluding a specific reservation (for updates), add back its quantity
  IF p_exclude_reservation_id IS NOT NULL THEN
    SELECT v_available_stock + COALESCE(mr."quantityReserved" - COALESCE(mr."fulfilledQuantity", 0), 0)
    INTO v_available_stock
    FROM "MaterialReservation" mr
    WHERE mr.id = p_exclude_reservation_id;
  END IF;
  
  RETURN v_available_stock >= p_quantity;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create PO requirements when stock is insufficient
CREATE OR REPLACE FUNCTION create_po_requirement_if_needed()
RETURNS TRIGGER AS $$
DECLARE
  v_available_stock DECIMAL(10,2);
  v_shortage DECIMAL(10,2);
BEGIN
  -- Get current available stock
  SELECT available_stock INTO v_available_stock
  FROM "MaterialAvailability"
  WHERE id = NEW."materialId";
  
  -- If there's a shortage, create PO requirement
  IF v_available_stock < 0 THEN
    v_shortage := ABS(v_available_stock);
    
    -- Create or update PO requirement
    INSERT INTO "PurchaseOrderRequirement" (
      "materialId",
      "jobId", 
      "reservationId",
      "quantityNeeded",
      "neededBy",
      notes
    ) VALUES (
      NEW."materialId",
      NEW."jobId",
      NEW.id,
      v_shortage,
      COALESCE(NEW."neededBy", NEW."reservedAt" + INTERVAL '7 days'),
      'Auto-generated due to insufficient stock for reservation'
    )
    ON CONFLICT ("materialId", "jobId") 
    DO UPDATE SET 
      "quantityNeeded" = "PurchaseOrderRequirement"."quantityNeeded" + v_shortage,
      "updatedAt" = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create PO requirements
CREATE TRIGGER auto_create_po_requirement
  AFTER INSERT ON "MaterialReservation"
  FOR EACH ROW
  EXECUTE FUNCTION create_po_requirement_if_needed();

-- Add comment documentation
COMMENT ON TABLE "MaterialReservation" IS 'Stores material reservations for specific jobs and phases';
COMMENT ON TABLE "PurchaseOrderRequirement" IS 'Tracks materials that need to be purchased when stock is insufficient';
COMMENT ON VIEW "MaterialAvailability" IS 'Calculated view showing total, reserved, and available stock for each material';
COMMENT ON FUNCTION check_material_availability IS 'Checks if sufficient stock is available for a reservation';