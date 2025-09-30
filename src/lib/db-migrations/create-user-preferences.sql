-- User Preferences and Saved Views
-- Store user-specific UI preferences, saved filters, and custom views

-- UserViewPreference table: Stores saved views and preferences per user
CREATE TABLE IF NOT EXISTS "UserViewPreference" (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(36) NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  page VARCHAR(100) NOT NULL, -- materials, jobs, invoices, etc.
  "viewName" VARCHAR(255), -- null for default view, named for saved views
  "isDefault" BOOLEAN DEFAULT false, -- Is this the default view for this page
  filters JSONB, -- Saved filter values
  columns JSONB, -- Column visibility and order
  sorting JSONB, -- Sort configuration
  grouping JSONB, -- Grouping configuration
  "keyboardShortcuts" JSONB, -- Custom keyboard shortcuts
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", page, "viewName") -- Each view name must be unique per user per page
);

-- NotificationPreference table: User notification settings
CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(36) NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
  "lowStockAlerts" BOOLEAN DEFAULT true,
  "lowStockThreshold" DECIMAL(5,2) DEFAULT 20.0, -- Alert when stock is below this % of min
  "poReceivedAlerts" BOOLEAN DEFAULT true,
  "reservationReminders" BOOLEAN DEFAULT true,
  "reminderDaysBefore" INTEGER DEFAULT 1, -- Days before need-by date to send reminder
  "stockoutAlerts" BOOLEAN DEFAULT true,
  "priceChangeAlerts" BOOLEAN DEFAULT false,
  "emailNotifications" BOOLEAN DEFAULT true,
  "smsNotifications" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification table: Actual notification records
CREATE TABLE IF NOT EXISTS "Notification" (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(36) NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- LOW_STOCK, PO_RECEIVED, RESERVATION_REMINDER, STOCKOUT, PRICE_CHANGE
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  "relatedEntityType" VARCHAR(50), -- Material, PurchaseOrder, Reservation, etc.
  "relatedEntityId" VARCHAR(36),
  priority VARCHAR(20) DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
  "isRead" BOOLEAN DEFAULT false,
  "readAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_pref_user_page ON "UserViewPreference"("userId", page);
CREATE INDEX IF NOT EXISTS idx_user_pref_default ON "UserViewPreference"("userId", page, "isDefault") WHERE "isDefault" = true;
CREATE INDEX IF NOT EXISTS idx_notification_user ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS idx_notification_unread ON "Notification"("userId", "isRead") WHERE "isRead" = false;
CREATE INDEX IF NOT EXISTS idx_notification_type ON "Notification"(type);
CREATE INDEX IF NOT EXISTS idx_notification_created ON "Notification"("createdAt");

-- Function to get or create default notification preferences
CREATE OR REPLACE FUNCTION get_notification_preferences(p_user_id VARCHAR)
RETURNS TABLE (
  "lowStockAlerts" BOOLEAN,
  "lowStockThreshold" DECIMAL(5,2),
  "poReceivedAlerts" BOOLEAN,
  "reservationReminders" BOOLEAN,
  "reminderDaysBefore" INTEGER,
  "stockoutAlerts" BOOLEAN,
  "priceChangeAlerts" BOOLEAN,
  "emailNotifications" BOOLEAN,
  "smsNotifications" BOOLEAN
) AS $$
BEGIN
  -- Create default preferences if they don't exist
  INSERT INTO "NotificationPreference" ("userId")
  VALUES (p_user_id)
  ON CONFLICT ("userId") DO NOTHING;
  
  -- Return preferences
  RETURN QUERY
  SELECT 
    np."lowStockAlerts",
    np."lowStockThreshold",
    np."poReceivedAlerts",
    np."reservationReminders",
    np."reminderDaysBefore",
    np."stockoutAlerts",
    np."priceChangeAlerts",
    np."emailNotifications",
    np."smsNotifications"
  FROM "NotificationPreference" np
  WHERE np."userId" = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create low stock notification
CREATE OR REPLACE FUNCTION create_low_stock_notification(
  p_material_id VARCHAR,
  p_current_stock DECIMAL,
  p_min_stock DECIMAL
)
RETURNS VOID AS $$
DECLARE
  v_user RECORD;
  v_material RECORD;
  v_stock_pct DECIMAL(5,2);
BEGIN
  -- Get material details
  SELECT code, name INTO v_material
  FROM "Material"
  WHERE id = p_material_id;
  
  -- Calculate stock percentage
  IF p_min_stock > 0 THEN
    v_stock_pct := (p_current_stock / p_min_stock) * 100;
  ELSE
    v_stock_pct := 0;
  END IF;
  
  -- Create notification for users who have low stock alerts enabled
  FOR v_user IN 
    SELECT "userId"
    FROM "NotificationPreference"
    WHERE "lowStockAlerts" = true
      AND v_stock_pct <= "lowStockThreshold"
  LOOP
    INSERT INTO "Notification" (
      id, "userId", type, title, message,
      "relatedEntityType", "relatedEntityId", priority
    ) VALUES (
      gen_random_uuid()::text,
      v_user."userId",
      'LOW_STOCK',
      'Low Stock Alert',
      format('Material %s - %s is low on stock (%s/%s units, %s%%)',
        v_material.code, v_material.name, 
        p_current_stock, p_min_stock, ROUND(v_stock_pct, 1)),
      'Material',
      p_material_id,
      CASE 
        WHEN v_stock_pct <= 10 THEN 'URGENT'
        WHEN v_stock_pct <= 25 THEN 'HIGH'
        ELSE 'NORMAL'
      END
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create PO received notification
CREATE OR REPLACE FUNCTION create_po_received_notification(
  p_po_id VARCHAR,
  p_receipt_id VARCHAR
)
RETURNS VOID AS $$
DECLARE
  v_user RECORD;
  v_po RECORD;
  v_item_count INTEGER;
BEGIN
  -- Get PO details
  SELECT po."poNumber", po."createdBy", v.name as vendor_name
  INTO v_po
  FROM "PurchaseOrder" po
  JOIN "Vendor" v ON po."vendorId" = v.id
  WHERE po.id = p_po_id;
  
  -- Count received items
  SELECT COUNT(*) INTO v_item_count
  FROM "ReceiptItem" ri
  WHERE ri."receiptId" = p_receipt_id;
  
  -- Create notification for users who have PO alerts enabled
  FOR v_user IN 
    SELECT np."userId"
    FROM "NotificationPreference" np
    WHERE np."poReceivedAlerts" = true
  LOOP
    INSERT INTO "Notification" (
      id, "userId", type, title, message,
      "relatedEntityType", "relatedEntityId", priority
    ) VALUES (
      gen_random_uuid()::text,
      v_user."userId",
      'PO_RECEIVED',
      'Purchase Order Received',
      format('PO %s from %s has been received (%s items)',
        v_po."poNumber", v_po.vendor_name, v_item_count),
      'PurchaseOrder',
      p_po_id,
      'NORMAL'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check and create reservation reminders
CREATE OR REPLACE FUNCTION create_reservation_reminders()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_reservation RECORD;
  v_user RECORD;
  v_material RECORD;
BEGIN
  -- Find reservations that need reminders
  FOR v_reservation IN
    SELECT 
      mr.id,
      mr."materialId",
      mr."needByDate",
      mr."quantityReserved",
      mr."userId" as reserved_for_user
    FROM "MaterialReservation" mr
    WHERE mr.status = 'ACTIVE'
      AND mr."needByDate" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "Notification" n
        WHERE n."relatedEntityType" = 'Reservation'
          AND n."relatedEntityId" = mr.id
          AND n.type = 'RESERVATION_REMINDER'
          AND n."createdAt" >= CURRENT_TIMESTAMP - INTERVAL '1 day'
      )
  LOOP
    -- Get material details
    SELECT code, name INTO v_material
    FROM "Material"
    WHERE id = v_reservation."materialId";
    
    -- Create notifications for users with reminder preferences
    FOR v_user IN
      SELECT np."userId", np."reminderDaysBefore"
      FROM "NotificationPreference" np
      WHERE np."reservationReminders" = true
        AND v_reservation."needByDate" <= CURRENT_TIMESTAMP + (np."reminderDaysBefore" || ' days')::INTERVAL
    LOOP
      INSERT INTO "Notification" (
        id, "userId", type, title, message,
        "relatedEntityType", "relatedEntityId", priority
      ) VALUES (
        gen_random_uuid()::text,
        v_user."userId",
        'RESERVATION_REMINDER',
        'Material Reservation Reminder',
        format('Reservation for %s units of %s - %s is needed by %s',
          v_reservation."quantityReserved",
          v_material.code,
          v_material.name,
          to_char(v_reservation."needByDate", 'Mon DD, YYYY')),
        'Reservation',
        v_reservation.id,
        CASE 
          WHEN v_reservation."needByDate" <= CURRENT_TIMESTAMP + INTERVAL '1 day' THEN 'HIGH'
          ELSE 'NORMAL'
        END
      );
      
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- View for unread notifications count per user
CREATE OR REPLACE VIEW "UnreadNotificationCount" AS
SELECT 
  "userId",
  COUNT(*) as "unreadCount",
  COUNT(*) FILTER (WHERE priority = 'URGENT') as "urgentCount",
  COUNT(*) FILTER (WHERE priority = 'HIGH') as "highCount"
FROM "Notification"
WHERE "isRead" = false
GROUP BY "userId";
