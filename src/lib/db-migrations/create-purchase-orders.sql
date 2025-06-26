-- Purchase Order Management System Schema
-- Provides comprehensive PO tracking with approval workflows and budget controls

-- PO Status enum
CREATE TYPE po_status AS ENUM (
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'SENT',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
  'CLOSED'
);

-- PO Priority enum
CREATE TYPE po_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- PO Type enum
CREATE TYPE po_type AS ENUM (
  'STANDARD',      -- Regular purchase order
  'BLANKET',       -- Long-term agreement with vendor
  'CONTRACT',      -- Contract-based PO
  'PLANNED'        -- Planned future order
);

-- Approval Action enum
CREATE TYPE approval_action AS ENUM ('APPROVE', 'REJECT', 'REQUEST_INFO', 'DELEGATE');

-- Main Purchase Orders table
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "poNumber" varchar(20) UNIQUE NOT NULL,
  "vendorId" text NOT NULL REFERENCES "Vendor"(id) ON DELETE RESTRICT,
  "jobId" text REFERENCES "Job"(id) ON DELETE SET NULL,
  "createdBy" text NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  
  -- PO Details
  type po_type DEFAULT 'STANDARD',
  status po_status DEFAULT 'DRAFT',
  priority po_priority DEFAULT 'NORMAL',
  
  -- Dates
  "orderDate" date NOT NULL DEFAULT CURRENT_DATE,
  "requiredDate" date,
  "expiryDate" date,
  
  -- Financial
  "subtotal" decimal(12, 2) DEFAULT 0,
  "taxAmount" decimal(12, 2) DEFAULT 0,
  "shippingAmount" decimal(12, 2) DEFAULT 0,
  "discountAmount" decimal(12, 2) DEFAULT 0,
  "totalAmount" decimal(12, 2) GENERATED ALWAYS AS (
    "subtotal" + "taxAmount" + "shippingAmount" - "discountAmount"
  ) STORED,
  
  -- Delivery Information
  "shipToAddress" text,
  "shipToCity" varchar(100),
  "shipToState" varchar(50),
  "shipToZip" varchar(20),
  "shipToContact" varchar(255),
  "shipToPhone" varchar(20),
  
  -- References
  "referenceNumber" varchar(50),
  "contractNumber" varchar(50),
  
  -- Terms and Notes
  "paymentTerms" varchar(100),
  "shippingTerms" varchar(100),
  "notes" text,
  "internalNotes" text,
  
  -- Approval tracking
  "currentApprover" text REFERENCES "User"(id) ON DELETE SET NULL,
  "approvalLevel" integer DEFAULT 1,
  "approvedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
  "approvedAt" timestamp,
  "rejectedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
  "rejectedAt" timestamp,
  "rejectionReason" text,
  
  -- Tracking
  "sentAt" timestamp,
  "receivedAt" timestamp,
  "closedAt" timestamp,
  
  -- Timestamps
  "createdAt" timestamp NOT NULL DEFAULT NOW(),
  "updatedAt" timestamp NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT fk_po_vendor FOREIGN KEY ("vendorId") REFERENCES "Vendor"(id) ON DELETE RESTRICT,
  CONSTRAINT fk_po_job FOREIGN KEY ("jobId") REFERENCES "Job"(id) ON DELETE SET NULL,
  CONSTRAINT fk_po_created_by FOREIGN KEY ("createdBy") REFERENCES "User"(id) ON DELETE RESTRICT
);

-- Create indexes for PurchaseOrder
CREATE INDEX idx_po_vendor ON "PurchaseOrder" ("vendorId");
CREATE INDEX idx_po_job ON "PurchaseOrder" ("jobId");
CREATE INDEX idx_po_status ON "PurchaseOrder" (status);
CREATE INDEX idx_po_created_by ON "PurchaseOrder" ("createdBy");
CREATE INDEX idx_po_order_date ON "PurchaseOrder" ("orderDate");

-- Purchase Order Line Items
CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "purchaseOrderId" uuid NOT NULL REFERENCES "PurchaseOrder"(id) ON DELETE CASCADE,
  "lineNumber" integer NOT NULL,
  
  -- Item details
  "materialId" text REFERENCES "Material"(id) ON DELETE SET NULL,
  "itemCode" varchar(50),
  "description" text NOT NULL,
  "category" varchar(100),
  
  -- Quantities and Pricing
  "quantity" decimal(12, 4) NOT NULL,
  "unit" varchar(20) NOT NULL,
  "unitPrice" decimal(12, 4) NOT NULL,
  "discountPercent" decimal(5, 2) DEFAULT 0,
  "discountAmount" decimal(12, 2) DEFAULT 0,
  "taxRate" decimal(5, 2) DEFAULT 0,
  "taxAmount" decimal(12, 2) GENERATED ALWAYS AS (
    ("quantity" * "unitPrice" - "discountAmount") * "taxRate" / 100
  ) STORED,
  "lineTotal" decimal(12, 2) GENERATED ALWAYS AS (
    ("quantity" * "unitPrice" - "discountAmount") * (1 + "taxRate" / 100)
  ) STORED,
  
  -- Receiving tracking
  "receivedQuantity" decimal(12, 4) DEFAULT 0,
  "remainingQuantity" decimal(12, 4) GENERATED ALWAYS AS (
    "quantity" - "receivedQuantity"
  ) STORED,
  
  -- Job allocation
  "jobPhaseId" text REFERENCES "JobPhase"(id) ON DELETE SET NULL,
  
  -- Notes
  "notes" text,
  
  -- Timestamps
  "createdAt" timestamp NOT NULL DEFAULT NOW(),
  "updatedAt" timestamp NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE("purchaseOrderId", "lineNumber"),
  CHECK ("quantity" > 0),
  CHECK ("unitPrice" >= 0)
);

-- Create indexes for PurchaseOrderItem
CREATE INDEX idx_po_item_material ON "PurchaseOrderItem" ("materialId");
CREATE INDEX idx_po_item_job_phase ON "PurchaseOrderItem" ("jobPhaseId");

-- PO Approval Rules
CREATE TABLE IF NOT EXISTS "POApprovalRule" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  "isActive" boolean DEFAULT true,
  
  -- Conditions
  "minAmount" decimal(12, 2),
  "maxAmount" decimal(12, 2),
  "jobTypes" text[], -- Array of job types this rule applies to
  "categories" text[], -- Array of material categories
  "vendorIds" text[], -- Specific vendors
  
  -- Approval requirements
  "requiresManagerApproval" boolean DEFAULT false,
  "requiresFinanceApproval" boolean DEFAULT false,
  "requiresExecutiveApproval" boolean DEFAULT false,
  
  -- Approvers
  "level1Approver" text REFERENCES "User"(id) ON DELETE SET NULL,
  "level2Approver" text REFERENCES "User"(id) ON DELETE SET NULL,
  "level3Approver" text REFERENCES "User"(id) ON DELETE SET NULL,
  
  -- Auto-approval settings
  "autoApproveBelow" decimal(12, 2),
  
  -- Timestamps
  "createdAt" timestamp NOT NULL DEFAULT NOW(),
  "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- Create indexes for POApprovalRule
CREATE INDEX idx_approval_rule_active ON "POApprovalRule" ("isActive");
CREATE INDEX idx_approval_rule_amounts ON "POApprovalRule" ("minAmount", "maxAmount");

-- PO Approval History
CREATE TABLE IF NOT EXISTS "POApprovalHistory" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "purchaseOrderId" uuid NOT NULL REFERENCES "PurchaseOrder"(id) ON DELETE CASCADE,
  "approverId" text NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "approvalLevel" integer NOT NULL,
  action approval_action NOT NULL,
  "comments" text,
  "delegatedTo" text REFERENCES "User"(id) ON DELETE SET NULL,
  
  -- Snapshot of PO at time of approval
  "amountAtApproval" decimal(12, 2) NOT NULL,
  
  -- Timestamps
  "createdAt" timestamp NOT NULL DEFAULT NOW()
);

-- Create indexes for POApprovalHistory
CREATE INDEX idx_approval_history_po ON "POApprovalHistory" ("purchaseOrderId");
CREATE INDEX idx_approval_history_approver ON "POApprovalHistory" ("approverId");

-- PO Receiving Records
CREATE TABLE IF NOT EXISTS "POReceiving" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "purchaseOrderId" uuid NOT NULL REFERENCES "PurchaseOrder"(id) ON DELETE CASCADE,
  "receivedBy" text NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "receivedAt" timestamp NOT NULL DEFAULT NOW(),
  
  -- Receipt details
  "receiptNumber" varchar(50),
  "packingSlipNumber" varchar(50),
  "invoiceNumber" varchar(50),
  
  -- Notes and issues
  "notes" text,
  "hasDiscrepancies" boolean DEFAULT false,
  "discrepancyNotes" text,
  
  -- Timestamps
  "createdAt" timestamp NOT NULL DEFAULT NOW()
);

-- PO Receiving Line Items
CREATE TABLE IF NOT EXISTS "POReceivingItem" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "receivingId" uuid NOT NULL REFERENCES "POReceiving"(id) ON DELETE CASCADE,
  "poItemId" uuid NOT NULL REFERENCES "PurchaseOrderItem"(id) ON DELETE CASCADE,
  
  -- Quantities
  "orderedQuantity" decimal(12, 4) NOT NULL,
  "receivedQuantity" decimal(12, 4) NOT NULL,
  "acceptedQuantity" decimal(12, 4) NOT NULL,
  "rejectedQuantity" decimal(12, 4) DEFAULT 0,
  
  -- Quality and location
  "qualityNotes" text,
  "storageLocation" varchar(100),
  "lotNumber" varchar(50),
  "serialNumbers" text[],
  
  -- For inventory integration
  "stockMovementId" uuid, -- References StockMovement when created
  
  -- Timestamps
  "createdAt" timestamp NOT NULL DEFAULT NOW()
);

-- Create indexes for POReceivingItem
CREATE INDEX idx_receiving_item_po_item ON "POReceivingItem" ("poItemId");

-- PO Templates for recurring orders
CREATE TABLE IF NOT EXISTS "POTemplate" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  "vendorId" text REFERENCES "Vendor"(id) ON DELETE SET NULL,
  "createdBy" text NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "isActive" boolean DEFAULT true,
  
  -- Template defaults
  "paymentTerms" varchar(100),
  "shippingTerms" varchar(100),
  "notes" text,
  
  -- Recurrence settings
  "isRecurring" boolean DEFAULT false,
  "recurrencePattern" varchar(50), -- 'WEEKLY', 'MONTHLY', etc.
  "nextOrderDate" date,
  
  -- Timestamps
  "createdAt" timestamp NOT NULL DEFAULT NOW(),
  "updatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- PO Template Items
CREATE TABLE IF NOT EXISTS "POTemplateItem" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "templateId" uuid NOT NULL REFERENCES "POTemplate"(id) ON DELETE CASCADE,
  "lineNumber" integer NOT NULL,
  
  -- Item details (same as PO items)
  "materialId" text REFERENCES "Material"(id) ON DELETE SET NULL,
  "itemCode" varchar(50),
  "description" text NOT NULL,
  "category" varchar(100),
  "quantity" decimal(12, 4) NOT NULL,
  "unit" varchar(20) NOT NULL,
  "estimatedUnitPrice" decimal(12, 4),
  
  -- Timestamps
  "createdAt" timestamp NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE("templateId", "lineNumber")
);

-- Vendor Price History (for price tracking)
CREATE TABLE IF NOT EXISTS "VendorPriceHistory" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "vendorId" text NOT NULL REFERENCES "Vendor"(id) ON DELETE CASCADE,
  "materialId" text NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
  "unitPrice" decimal(12, 4) NOT NULL,
  "effectiveDate" date NOT NULL DEFAULT CURRENT_DATE,
  "expiryDate" date,
  "minimumQuantity" decimal(12, 4) DEFAULT 1,
  "leadTimeDays" integer,
  "notes" text,
  
  -- Source tracking
  "purchaseOrderId" uuid REFERENCES "PurchaseOrder"(id) ON DELETE SET NULL,
  "recordedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
  
  -- Timestamps
  "createdAt" timestamp NOT NULL DEFAULT NOW()
);

-- Create indexes for VendorPriceHistory
CREATE INDEX idx_vendor_price_vendor ON "VendorPriceHistory" ("vendorId");
CREATE INDEX idx_vendor_price_material ON "VendorPriceHistory" ("materialId");
CREATE INDEX idx_vendor_price_dates ON "VendorPriceHistory" ("effectiveDate", "expiryDate");

-- Functions and Triggers

-- Auto-generate PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."poNumber" IS NULL THEN
    NEW."poNumber" = 'PO-' || EXTRACT(YEAR FROM NOW())::text || '-' || 
                     LPAD(COALESCE((
                       SELECT COUNT(*) + 1 
                       FROM "PurchaseOrder" 
                       WHERE EXTRACT(YEAR FROM "createdAt") = EXTRACT(YEAR FROM NOW())
                     ), 1)::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_po_number
BEFORE INSERT ON "PurchaseOrder"
FOR EACH ROW
EXECUTE FUNCTION generate_po_number();

-- Update PO totals when items change
CREATE OR REPLACE FUNCTION update_po_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "PurchaseOrder"
  SET 
    "subtotal" = COALESCE((
      SELECT SUM("quantity" * "unitPrice" - "discountAmount")
      FROM "PurchaseOrderItem"
      WHERE "purchaseOrderId" = COALESCE(NEW."purchaseOrderId", OLD."purchaseOrderId")
    ), 0),
    "taxAmount" = COALESCE((
      SELECT SUM("taxAmount")
      FROM "PurchaseOrderItem"
      WHERE "purchaseOrderId" = COALESCE(NEW."purchaseOrderId", OLD."purchaseOrderId")
    ), 0),
    "updatedAt" = NOW()
  WHERE id = COALESCE(NEW."purchaseOrderId", OLD."purchaseOrderId");
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_po_totals_insert
AFTER INSERT ON "PurchaseOrderItem"
FOR EACH ROW
EXECUTE FUNCTION update_po_totals();

CREATE TRIGGER trigger_update_po_totals_update
AFTER UPDATE ON "PurchaseOrderItem"
FOR EACH ROW
EXECUTE FUNCTION update_po_totals();

CREATE TRIGGER trigger_update_po_totals_delete
AFTER DELETE ON "PurchaseOrderItem"
FOR EACH ROW
EXECUTE FUNCTION update_po_totals();

-- Update received quantities
CREATE OR REPLACE FUNCTION update_po_received_quantities()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the PO item received quantity
  UPDATE "PurchaseOrderItem"
  SET "receivedQuantity" = COALESCE((
    SELECT SUM("acceptedQuantity")
    FROM "POReceivingItem"
    WHERE "poItemId" = NEW."poItemId"
  ), 0)
  WHERE id = NEW."poItemId";
  
  -- Check if PO should be marked as received
  UPDATE "PurchaseOrder" po
  SET status = CASE
    WHEN (
      SELECT COUNT(*) 
      FROM "PurchaseOrderItem" poi
      WHERE poi."purchaseOrderId" = po.id
        AND poi."remainingQuantity" > 0
    ) = 0 THEN 'RECEIVED'
    WHEN (
      SELECT COUNT(*)
      FROM "PurchaseOrderItem" poi
      WHERE poi."purchaseOrderId" = po.id
        AND poi."receivedQuantity" > 0
    ) > 0 THEN 'PARTIALLY_RECEIVED'
    ELSE po.status
  END
  WHERE po.id = (
    SELECT "purchaseOrderId" 
    FROM "PurchaseOrderItem" 
    WHERE id = NEW."poItemId"
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_po_received_quantities
AFTER INSERT OR UPDATE ON "POReceivingItem"
FOR EACH ROW
EXECUTE FUNCTION update_po_received_quantities();

-- Auto-update timestamps
CREATE TRIGGER update_purchase_order_updated_at
BEFORE UPDATE ON "PurchaseOrder"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_order_item_updated_at
BEFORE UPDATE ON "PurchaseOrderItem"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_po_approval_rule_updated_at
BEFORE UPDATE ON "POApprovalRule"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_po_template_updated_at
BEFORE UPDATE ON "POTemplate"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();