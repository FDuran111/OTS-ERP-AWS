-- Fix PO Receiving: Add idempotency, over-receipt prevention, and proper sequence

-- 1. Add idempotency: unique constraint on (receiptId, poItemId)
ALTER TABLE "ReceiptItem" 
DROP CONSTRAINT IF EXISTS unique_receipt_po_item;

ALTER TABLE "ReceiptItem"
ADD CONSTRAINT unique_receipt_po_item UNIQUE ("receiptId", "poItemId");

-- 2. Create sequence for receipt numbers (thread-safe)
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

-- 3. Replace receipt number generator with sequence-based version
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS VARCHAR AS $$
DECLARE
  next_number INTEGER;
  receipt_number VARCHAR;
BEGIN
  next_number := nextval('receipt_number_seq');
  receipt_number := 'RCV-' || LPAD(next_number::TEXT, 6, '0');
  RETURN receipt_number;
END;
$$ LANGUAGE plpgsql;

-- 4. Prevent over-receipt: BEFORE INSERT trigger
CREATE OR REPLACE FUNCTION prevent_over_receipt()
RETURNS TRIGGER AS $$
DECLARE
  v_ordered_qty DECIMAL(12,3);
  v_already_received DECIMAL(12,3);
  v_total_received DECIMAL(12,3);
BEGIN
  -- Get ordered quantity
  SELECT quantity INTO v_ordered_qty
  FROM "PurchaseOrderItem"
  WHERE id = NEW."poItemId";
  
  -- Get already received quantity
  SELECT COALESCE(SUM("quantityReceived"), 0) INTO v_already_received
  FROM "ReceiptItem"
  WHERE "poItemId" = NEW."poItemId";
  
  -- Calculate total after this receipt
  v_total_received := v_already_received + NEW."quantityReceived";
  
  -- Prevent over-receipt
  IF v_total_received > v_ordered_qty THEN
    RAISE EXCEPTION 'Cannot receive % units. Only % units remaining (ordered: %, already received: %)',
      NEW."quantityReceived", (v_ordered_qty - v_already_received), v_ordered_qty, v_already_received;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_over_receipt
BEFORE INSERT ON "ReceiptItem"
FOR EACH ROW
EXECUTE FUNCTION prevent_over_receipt();

-- 5. Handle UPDATE on ReceiptItem: adjust stock delta
CREATE OR REPLACE FUNCTION handle_receipt_item_update()
RETURNS TRIGGER AS $$
DECLARE
  v_material_id VARCHAR(36);
  v_storage_location_id VARCHAR(36);
  v_user_id VARCHAR(36);
  v_po_id VARCHAR(36);
  v_qty_delta DECIMAL(12,3);
BEGIN
  -- Calculate quantity change
  v_qty_delta := NEW."quantityReceived" - OLD."quantityReceived";
  
  IF v_qty_delta != 0 THEN
    -- Get context
    SELECT ri."materialId", r."storageLocationId", r."receivedBy", r."purchaseOrderId"
    INTO v_material_id, v_storage_location_id, v_user_id, v_po_id
    FROM "ReceiptItem" ri
    JOIN "PurchaseOrderReceipt" r ON ri."receiptId" = r.id
    WHERE ri.id = NEW.id;
    
    IF v_material_id IS NOT NULL THEN
      -- Adjust material stock
      UPDATE "Material"
      SET "inStock" = "inStock" + v_qty_delta,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = v_material_id;
      
      -- Create compensating stock movement
      INSERT INTO "StockMovement" (
        id, "materialId", "storageLocationId", type, quantity,
        reason, "userId", "purchaseOrderId", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text,
        v_material_id,
        v_storage_location_id,
        CASE WHEN v_qty_delta > 0 THEN 'ADD' ELSE 'REMOVE' END,
        ABS(v_qty_delta),
        'Receipt Item Quantity Adjustment',
        v_user_id,
        v_po_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );
      
      -- Adjust location stock if applicable
      IF v_storage_location_id IS NOT NULL THEN
        INSERT INTO "MaterialLocationStock" ("materialId", "locationId", quantity, "updatedAt")
        VALUES (v_material_id, v_storage_location_id, v_qty_delta, CURRENT_TIMESTAMP)
        ON CONFLICT ("materialId", "locationId")
        DO UPDATE SET 
          quantity = "MaterialLocationStock".quantity + EXCLUDED.quantity,
          "updatedAt" = CURRENT_TIMESTAMP;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_receipt_item_update
AFTER UPDATE ON "ReceiptItem"
FOR EACH ROW
WHEN (OLD."quantityReceived" != NEW."quantityReceived")
EXECUTE FUNCTION handle_receipt_item_update();

-- 6. Handle DELETE on ReceiptItem: reverse stock changes
CREATE OR REPLACE FUNCTION handle_receipt_item_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_material_id VARCHAR(36);
  v_storage_location_id VARCHAR(36);
  v_user_id VARCHAR(36);
  v_po_id VARCHAR(36);
BEGIN
  -- Get context
  SELECT ri."materialId", r."storageLocationId", r."receivedBy", r."purchaseOrderId"
  INTO v_material_id, v_storage_location_id, v_user_id, v_po_id
  FROM "ReceiptItem" ri
  JOIN "PurchaseOrderReceipt" r ON ri."receiptId" = r.id
  WHERE ri.id = OLD.id;
  
  IF v_material_id IS NOT NULL THEN
    -- Reverse material stock
    UPDATE "Material"
    SET "inStock" = "inStock" - OLD."quantityReceived",
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE id = v_material_id;
    
    -- Create compensating stock movement
    INSERT INTO "StockMovement" (
      id, "materialId", "storageLocationId", type, quantity,
      reason, "userId", "purchaseOrderId", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text,
      v_material_id,
      v_storage_location_id,
      'REMOVE',
      OLD."quantityReceived",
      'Receipt Item Deleted',
      v_user_id,
      v_po_id,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
    
    -- Reverse location stock if applicable
    IF v_storage_location_id IS NOT NULL THEN
      UPDATE "MaterialLocationStock"
      SET quantity = quantity - OLD."quantityReceived",
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "materialId" = v_material_id AND "locationId" = v_storage_location_id;
      
      -- Clean up zero quantities
      DELETE FROM "MaterialLocationStock"
      WHERE quantity <= 0 AND "materialId" = v_material_id AND "locationId" = v_storage_location_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_receipt_item_delete
BEFORE DELETE ON "ReceiptItem"
FOR EACH ROW
EXECUTE FUNCTION handle_receipt_item_delete();
