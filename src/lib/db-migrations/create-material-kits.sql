-- Material Kits/Assemblies System
-- Allows creating bundled materials for common electrical installations

-- MaterialKit table: Defines reusable material bundles
CREATE TABLE IF NOT EXISTS "MaterialKit" (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  "unitCost" DECIMAL(12,2) DEFAULT 0.00, -- Calculated from components
  "unitPrice" DECIMAL(12,2) DEFAULT 0.00, -- Selling price
  active BOOLEAN DEFAULT true,
  notes TEXT,
  "createdBy" VARCHAR(36) REFERENCES "User"(id),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MaterialKitItem table: Component materials that make up a kit
CREATE TABLE IF NOT EXISTS "MaterialKitItem" (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "kitId" VARCHAR(36) NOT NULL REFERENCES "MaterialKit"(id) ON DELETE CASCADE,
  "materialId" VARCHAR(36) NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
  quantity DECIMAL(12,3) NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("kitId", "materialId") -- Prevent duplicate materials in same kit
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_materialkititem_kit ON "MaterialKitItem"("kitId");
CREATE INDEX IF NOT EXISTS idx_materialkititem_material ON "MaterialKitItem"("materialId");
CREATE INDEX IF NOT EXISTS idx_materialkit_code ON "MaterialKit"(code);
CREATE INDEX IF NOT EXISTS idx_materialkit_category ON "MaterialKit"(category) WHERE active = true;

-- Function to calculate kit cost from component materials
CREATE OR REPLACE FUNCTION calculate_kit_cost(kit_id VARCHAR)
RETURNS DECIMAL AS $$
DECLARE
  total_cost DECIMAL(12,2);
BEGIN
  SELECT COALESCE(SUM(mki.quantity * m.cost), 0)
  INTO total_cost
  FROM "MaterialKitItem" mki
  JOIN "Material" m ON mki."materialId" = m.id
  WHERE mki."kitId" = kit_id;
  
  RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate kit price from component materials (with markup)
CREATE OR REPLACE FUNCTION calculate_kit_price(kit_id VARCHAR)
RETURNS DECIMAL AS $$
DECLARE
  total_price DECIMAL(12,2);
BEGIN
  SELECT COALESCE(SUM(mki.quantity * m.price), 0)
  INTO total_price
  FROM "MaterialKitItem" mki
  JOIN "Material" m ON mki."materialId" = m.id
  WHERE mki."kitId" = kit_id;
  
  RETURN total_price;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update kit cost/price when components change
CREATE OR REPLACE FUNCTION update_kit_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE "MaterialKit"
    SET 
      "unitCost" = calculate_kit_cost(OLD."kitId"),
      "unitPrice" = calculate_kit_price(OLD."kitId"),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = OLD."kitId";
    RETURN OLD;
  ELSE
    UPDATE "MaterialKit"
    SET 
      "unitCost" = calculate_kit_cost(NEW."kitId"),
      "unitPrice" = calculate_kit_price(NEW."kitId"),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = NEW."kitId";
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kit_totals
AFTER INSERT OR UPDATE OR DELETE ON "MaterialKitItem"
FOR EACH ROW
EXECUTE FUNCTION update_kit_totals();

-- View for easy kit browsing with component counts
CREATE OR REPLACE VIEW "MaterialKitSummary" AS
SELECT 
  mk.id,
  mk.code,
  mk.name,
  mk.description,
  mk.category,
  mk."unitCost",
  mk."unitPrice",
  mk.active,
  COUNT(mki.id) as "componentCount",
  mk."createdAt",
  mk."updatedAt"
FROM "MaterialKit" mk
LEFT JOIN "MaterialKitItem" mki ON mk.id = mki."kitId"
GROUP BY mk.id, mk.code, mk.name, mk.description, mk.category, 
         mk."unitCost", mk."unitPrice", mk.active, mk."createdAt", mk."updatedAt";
