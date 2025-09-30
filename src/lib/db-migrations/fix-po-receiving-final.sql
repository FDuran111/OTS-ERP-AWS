-- Final PO Receiving Fixes: Enforce updates, add locking, wire sequence

-- 1. Wire receipt number sequence as default
-- First, initialize sequence from existing data (minimum 1 for sequence)
SELECT setval('receipt_number_seq', 
  GREATEST(1,
    COALESCE(
      (SELECT MAX(CAST(SUBSTRING("receiptNumber" FROM '[0-9]+$') AS INTEGER)) 
       FROM "PurchaseOrderReceipt" 
       WHERE "receiptNumber" ~ '^RCV-[0-9]+$'),
      0
    )
  )
);

-- Set default on column
ALTER TABLE "PurchaseOrderReceipt" 
ALTER COLUMN "receiptNumber" SET DEFAULT generate_receipt_number();

-- 2. Enhanced over-receipt prevention with row-level locking (INSERT)
CREATE OR REPLACE FUNCTION prevent_over_receipt()
RETURNS TRIGGER AS $$
DECLARE
  v_ordered_qty DECIMAL(12,3);
  v_already_received DECIMAL(12,3);
  v_total_received DECIMAL(12,3);
BEGIN
  -- Lock the PO item row to prevent concurrent modification
  SELECT quantity INTO v_ordered_qty
  FROM "PurchaseOrderItem"
  WHERE id = NEW."poItemId"
  FOR UPDATE;
  
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

-- 3. Add over-receipt prevention for UPDATES
CREATE OR REPLACE FUNCTION prevent_over_receipt_on_update()
RETURNS TRIGGER AS $$
DECLARE
  v_ordered_qty DECIMAL(12,3);
  v_already_received DECIMAL(12,3);
  v_total_received DECIMAL(12,3);
BEGIN
  -- Only check if quantity changed
  IF OLD."quantityReceived" = NEW."quantityReceived" THEN
    RETURN NEW;
  END IF;
  
  -- Lock the PO item row to prevent concurrent modification
  SELECT quantity INTO v_ordered_qty
  FROM "PurchaseOrderItem"
  WHERE id = NEW."poItemId"
  FOR UPDATE;
  
  -- Get already received quantity (excluding this record's OLD value)
  SELECT COALESCE(SUM("quantityReceived"), 0) INTO v_already_received
  FROM "ReceiptItem"
  WHERE "poItemId" = NEW."poItemId" AND id != NEW.id;
  
  -- Calculate total with new value
  v_total_received := v_already_received + NEW."quantityReceived";
  
  -- Prevent over-receipt
  IF v_total_received > v_ordered_qty THEN
    RAISE EXCEPTION 'Cannot update to % units. Only % units can be received (ordered: %, already received by others: %)',
      NEW."quantityReceived", (v_ordered_qty - v_already_received), v_ordered_qty, v_already_received;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_over_receipt_on_update ON "ReceiptItem";

CREATE TRIGGER trigger_prevent_over_receipt_on_update
BEFORE UPDATE ON "ReceiptItem"
FOR EACH ROW
EXECUTE FUNCTION prevent_over_receipt_on_update();

-- 4. Ensure UPDATE trigger doesn't run when quantities haven't changed
DROP TRIGGER IF EXISTS trigger_handle_receipt_item_update ON "ReceiptItem";

CREATE TRIGGER trigger_handle_receipt_item_update
AFTER UPDATE OF "quantityReceived" ON "ReceiptItem"
FOR EACH ROW
WHEN (OLD."quantityReceived" IS DISTINCT FROM NEW."quantityReceived")
EXECUTE FUNCTION handle_receipt_item_update();
