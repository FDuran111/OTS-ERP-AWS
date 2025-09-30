-- Purchase Order Receiving System
-- Track when materials are received from vendors and update inventory

-- PurchaseOrderReceipt table: Records when a PO is received
CREATE TABLE IF NOT EXISTS "PurchaseOrderReceipt" (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "receiptNumber" VARCHAR(50) NOT NULL UNIQUE,
  "purchaseOrderId" VARCHAR(36) NOT NULL REFERENCES "PurchaseOrder"(id) ON DELETE RESTRICT,
  "storageLocationId" VARCHAR(36) REFERENCES "StorageLocation"(id),
  "receivedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receivedBy" VARCHAR(36) NOT NULL REFERENCES "User"(id),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'COMPLETED', -- COMPLETED, PARTIAL, CANCELLED
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ReceiptItem table: Individual line items received
CREATE TABLE IF NOT EXISTS "ReceiptItem" (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "receiptId" VARCHAR(36) NOT NULL REFERENCES "PurchaseOrderReceipt"(id) ON DELETE CASCADE,
  "poItemId" VARCHAR(36) NOT NULL REFERENCES "PurchaseOrderItem"(id) ON DELETE RESTRICT,
  "materialId" VARCHAR(36) REFERENCES "Material"(id),
  "quantityReceived" DECIMAL(12,3) NOT NULL CHECK ("quantityReceived" > 0),
  "unitCost" DECIMAL(12,2), -- Actual cost at time of receipt
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_po_receipt_po ON "PurchaseOrderReceipt"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS idx_po_receipt_date ON "PurchaseOrderReceipt"("receivedAt");
CREATE INDEX IF NOT EXISTS idx_receipt_item_receipt ON "ReceiptItem"("receiptId");
CREATE INDEX IF NOT EXISTS idx_receipt_item_po_item ON "ReceiptItem"("poItemId");
CREATE INDEX IF NOT EXISTS idx_receipt_item_material ON "ReceiptItem"("materialId");

-- Function to calculate total received quantity for a PO item
CREATE OR REPLACE FUNCTION get_po_item_received_qty(po_item_id VARCHAR)
RETURNS DECIMAL AS $$
DECLARE
  total_received DECIMAL(12,3);
BEGIN
  SELECT COALESCE(SUM(ri."quantityReceived"), 0)
  INTO total_received
  FROM "ReceiptItem" ri
  WHERE ri."poItemId" = po_item_id;
  
  RETURN total_received;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate remaining quantity for a PO item
CREATE OR REPLACE FUNCTION get_po_item_remaining_qty(po_item_id VARCHAR)
RETURNS DECIMAL AS $$
DECLARE
  ordered_qty DECIMAL(12,3);
  received_qty DECIMAL(12,3);
BEGIN
  SELECT quantity INTO ordered_qty
  FROM "PurchaseOrderItem"
  WHERE id = po_item_id;
  
  SELECT get_po_item_received_qty(po_item_id) INTO received_qty;
  
  RETURN GREATEST(ordered_qty - received_qty, 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update material stock when items are received
CREATE OR REPLACE FUNCTION update_stock_on_receipt()
RETURNS TRIGGER AS $$
DECLARE
  v_material_id VARCHAR(36);
  v_storage_location_id VARCHAR(36);
  v_user_id VARCHAR(36);
  v_po_id VARCHAR(36);
BEGIN
  -- Get material ID and storage location from receipt
  SELECT ri."materialId", r."storageLocationId", r."receivedBy", r."purchaseOrderId"
  INTO v_material_id, v_storage_location_id, v_user_id, v_po_id
  FROM "ReceiptItem" ri
  JOIN "PurchaseOrderReceipt" r ON ri."receiptId" = r.id
  WHERE ri.id = NEW.id;
  
  IF v_material_id IS NOT NULL THEN
    -- Update material stock level
    UPDATE "Material"
    SET 
      "inStock" = "inStock" + NEW."quantityReceived",
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = v_material_id;
    
    -- Create stock movement record
    INSERT INTO "StockMovement" (
      id, "materialId", "storageLocationId", type, quantity, 
      reason, "userId", "purchaseOrderId", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text,
      v_material_id,
      v_storage_location_id,
      'ADD',
      NEW."quantityReceived",
      'Purchase Order Receipt',
      v_user_id,
      v_po_id,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
    
    -- Update location stock if location is specified
    IF v_storage_location_id IS NOT NULL THEN
      INSERT INTO "MaterialLocationStock" ("materialId", "locationId", quantity, "updatedAt")
      VALUES (v_material_id, v_storage_location_id, NEW."quantityReceived", CURRENT_TIMESTAMP)
      ON CONFLICT ("materialId", "locationId")
      DO UPDATE SET 
        quantity = "MaterialLocationStock".quantity + EXCLUDED.quantity,
        "updatedAt" = CURRENT_TIMESTAMP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_on_receipt
AFTER INSERT ON "ReceiptItem"
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_receipt();

-- View for PO receiving status
CREATE OR REPLACE VIEW "PurchaseOrderReceivingStatus" AS
SELECT 
  po.id as "purchaseOrderId",
  po."poNumber",
  poi.id as "poItemId",
  poi."materialId",
  m.code as "materialCode",
  m.name as "materialName",
  poi.quantity as "orderedQty",
  get_po_item_received_qty(poi.id) as "receivedQty",
  get_po_item_remaining_qty(poi.id) as "remainingQty",
  CASE 
    WHEN get_po_item_received_qty(poi.id) = 0 THEN 'NOT_RECEIVED'
    WHEN get_po_item_received_qty(poi.id) < poi.quantity THEN 'PARTIAL'
    ELSE 'COMPLETE'
  END as "receivingStatus"
FROM "PurchaseOrder" po
JOIN "PurchaseOrderItem" poi ON po.id = poi."purchaseOrderId"
LEFT JOIN "Material" m ON poi."materialId" = m.id;

-- Function to auto-generate receipt numbers
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS VARCHAR AS $$
DECLARE
  next_number INTEGER;
  receipt_number VARCHAR;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING("receiptNumber" FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM "PurchaseOrderReceipt"
  WHERE "receiptNumber" ~ '^RCV-[0-9]+$';
  
  receipt_number := 'RCV-' || LPAD(next_number::TEXT, 6, '0');
  
  RETURN receipt_number;
END;
$$ LANGUAGE plpgsql;
