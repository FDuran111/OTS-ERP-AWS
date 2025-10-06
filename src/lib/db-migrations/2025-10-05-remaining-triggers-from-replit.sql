-- ================================================
-- Remaining Database Triggers Migration (Part 2)
-- Exported from Replit Neon DB
-- Date: 2025-10-05
--
-- This adds the remaining triggers for:
-- - Accounting validation (period open, entry balance)
-- - Purchase order receipt handling
-- - Timestamp auto-updates
-- - QuickBooks integration
-- ================================================

-- ================================================
-- 1. ACCOUNTING & FINANCIAL VALIDATION
-- ================================================

-- Ensure journal entries can only be posted to OPEN periods
CREATE OR REPLACE FUNCTION check_period_open()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_period_status VARCHAR(10);
BEGIN
  -- Get period status
  SELECT status INTO v_period_status
  FROM "AccountingPeriod"
  WHERE id = NEW."periodId";

  -- Only allow posting to OPEN periods
  IF v_period_status != 'OPEN' THEN
    RAISE EXCEPTION 'Cannot post to period %: period is %',
      NEW."periodId", v_period_status;
  END IF;

  RETURN NEW;
END;
$$;

-- Validate journal entries are balanced (debits = credits)
CREATE OR REPLACE FUNCTION validate_journal_entry_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_debit_total NUMERIC(15,2);
  v_credit_total NUMERIC(15,2);
BEGIN
  -- Calculate totals for this entry
  SELECT
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0)
  INTO v_debit_total, v_credit_total
  FROM "JournalEntryLine"
  WHERE "entryId" = NEW."entryId";

  -- Check if balanced (allow small rounding differences)
  IF ABS(v_debit_total - v_credit_total) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry % is not balanced: debits=%, credits=%',
      NEW."entryId", v_debit_total, v_credit_total;
  END IF;

  RETURN NEW;
END;
$$;

-- ================================================
-- 2. PURCHASE ORDER & INVENTORY MANAGEMENT
-- ================================================

-- Prevent receiving more items than ordered
CREATE OR REPLACE FUNCTION prevent_over_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

-- Prevent over-receipt on updates
CREATE OR REPLACE FUNCTION prevent_over_receipt_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

-- Update stock levels when items are received
CREATE OR REPLACE FUNCTION update_stock_on_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

-- Handle receipt item deletions (reverse stock adjustments)
CREATE OR REPLACE FUNCTION handle_receipt_item_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

-- Handle receipt item quantity updates (adjust stock)
CREATE OR REPLACE FUNCTION handle_receipt_item_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

-- ================================================
-- 3. TIMESTAMP UPDATE FUNCTIONS
-- ================================================

-- Generic updatedAt column updater
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- GL/Accounting timestamp updater
CREATE OR REPLACE FUNCTION update_gl_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;

-- QuickBooks integration timestamp updater
CREATE OR REPLACE FUNCTION update_quickbooks_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;

-- ================================================
-- CREATE TRIGGERS
-- ================================================

-- Drop existing triggers (idempotent)
DROP TRIGGER IF EXISTS trigger_check_period_open_insert ON "JournalEntry";
DROP TRIGGER IF EXISTS trigger_check_period_open_update ON "JournalEntry";
DROP TRIGGER IF EXISTS trigger_validate_entry_balance_insert ON "JournalEntryLine";
DROP TRIGGER IF EXISTS trigger_validate_entry_balance_update ON "JournalEntryLine";
DROP TRIGGER IF EXISTS trigger_prevent_over_receipt ON "ReceiptItem";
DROP TRIGGER IF EXISTS trigger_prevent_over_receipt_on_update ON "ReceiptItem";
DROP TRIGGER IF EXISTS trigger_update_stock_on_receipt ON "ReceiptItem";
DROP TRIGGER IF EXISTS trigger_handle_receipt_item_delete ON "ReceiptItem";
DROP TRIGGER IF EXISTS trigger_handle_receipt_item_update ON "ReceiptItem";
DROP TRIGGER IF EXISTS trigger_account_updated ON "Account";
DROP TRIGGER IF EXISTS trigger_period_updated ON "AccountingPeriod";
DROP TRIGGER IF EXISTS trigger_settings_updated ON "AccountingSettings";
DROP TRIGGER IF EXISTS trigger_entry_updated ON "JournalEntry";
DROP TRIGGER IF EXISTS update_material_location_stock_updated_at ON "MaterialLocationStock";
DROP TRIGGER IF EXISTS update_material_vendor_price_updated_at ON "MaterialVendorPrice";
DROP TRIGGER IF EXISTS update_permission_updated_at ON "Permission";
DROP TRIGGER IF EXISTS update_permission_group_updated_at ON "PermissionGroup";
DROP TRIGGER IF EXISTS update_role_updated_at ON "Role";
DROP TRIGGER IF EXISTS update_stock_transfer_updated_at ON "StockTransfer";
DROP TRIGGER IF EXISTS update_stock_transfer_item_updated_at ON "StockTransferItem";
DROP TRIGGER IF EXISTS qb_connection_updated_trigger ON "QuickBooksConnection";
DROP TRIGGER IF EXISTS qb_mapping_updated_trigger ON "QuickBooksMapping";
DROP TRIGGER IF EXISTS qb_sync_config_updated_trigger ON "QuickBooksSyncConfig";

-- 1. Accounting Period Validation
CREATE TRIGGER trigger_check_period_open_insert
  BEFORE INSERT ON "JournalEntry"
  FOR EACH ROW EXECUTE FUNCTION check_period_open();

CREATE TRIGGER trigger_check_period_open_update
  BEFORE UPDATE ON "JournalEntry"
  FOR EACH ROW EXECUTE FUNCTION check_period_open();

-- 2. Journal Entry Balance Validation
CREATE TRIGGER trigger_validate_entry_balance_insert
  AFTER INSERT ON "JournalEntryLine"
  FOR EACH ROW EXECUTE FUNCTION validate_journal_entry_balance();

CREATE TRIGGER trigger_validate_entry_balance_update
  AFTER UPDATE ON "JournalEntryLine"
  FOR EACH ROW EXECUTE FUNCTION validate_journal_entry_balance();

-- 3. Purchase Order Receipt Business Rules
CREATE TRIGGER trigger_prevent_over_receipt
  BEFORE INSERT ON "ReceiptItem"
  FOR EACH ROW EXECUTE FUNCTION prevent_over_receipt();

CREATE TRIGGER trigger_prevent_over_receipt_on_update
  BEFORE UPDATE ON "ReceiptItem"
  FOR EACH ROW EXECUTE FUNCTION prevent_over_receipt_on_update();

CREATE TRIGGER trigger_update_stock_on_receipt
  AFTER INSERT ON "ReceiptItem"
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_receipt();

CREATE TRIGGER trigger_handle_receipt_item_delete
  BEFORE DELETE ON "ReceiptItem"
  FOR EACH ROW EXECUTE FUNCTION handle_receipt_item_delete();

CREATE TRIGGER trigger_handle_receipt_item_update
  AFTER UPDATE ON "ReceiptItem"
  FOR EACH ROW EXECUTE FUNCTION handle_receipt_item_update();

-- 4. Accounting Timestamp Updates
CREATE TRIGGER trigger_account_updated
  BEFORE UPDATE ON "Account"
  FOR EACH ROW EXECUTE FUNCTION update_gl_timestamp();

CREATE TRIGGER trigger_period_updated
  BEFORE UPDATE ON "AccountingPeriod"
  FOR EACH ROW EXECUTE FUNCTION update_gl_timestamp();

CREATE TRIGGER trigger_settings_updated
  BEFORE UPDATE ON "AccountingSettings"
  FOR EACH ROW EXECUTE FUNCTION update_gl_timestamp();

CREATE TRIGGER trigger_entry_updated
  BEFORE UPDATE ON "JournalEntry"
  FOR EACH ROW EXECUTE FUNCTION update_gl_timestamp();

-- 5. Material & Inventory Timestamp Updates
CREATE TRIGGER update_material_location_stock_updated_at
  BEFORE UPDATE ON "MaterialLocationStock"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_material_vendor_price_updated_at
  BEFORE UPDATE ON "MaterialVendorPrice"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Permissions & Roles Timestamp Updates
CREATE TRIGGER update_permission_updated_at
  BEFORE UPDATE ON "Permission"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permission_group_updated_at
  BEFORE UPDATE ON "PermissionGroup"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_updated_at
  BEFORE UPDATE ON "Role"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Stock Transfer Timestamp Updates
CREATE TRIGGER update_stock_transfer_updated_at
  BEFORE UPDATE ON "StockTransfer"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_transfer_item_updated_at
  BEFORE UPDATE ON "StockTransferItem"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. QuickBooks Integration Timestamp Updates
CREATE TRIGGER qb_connection_updated_trigger
  BEFORE UPDATE ON "QuickBooksConnection"
  FOR EACH ROW EXECUTE FUNCTION update_quickbooks_timestamp();

CREATE TRIGGER qb_mapping_updated_trigger
  BEFORE UPDATE ON "QuickBooksMapping"
  FOR EACH ROW EXECUTE FUNCTION update_quickbooks_timestamp();

CREATE TRIGGER qb_sync_config_updated_trigger
  BEFORE UPDATE ON "QuickBooksSyncConfig"
  FOR EACH ROW EXECUTE FUNCTION update_quickbooks_timestamp();

-- ================================================
-- VERIFICATION
-- ================================================

-- Run this after migration to verify:
-- SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public';
-- Should match Replit's count (around 100)
