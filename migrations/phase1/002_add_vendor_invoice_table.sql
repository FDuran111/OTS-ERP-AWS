-- Migration: Create VendorInvoice table for AP tracking
-- Purpose: Track vendor invoices and accounts payable
-- Author: Phase 1 Task 2.1
-- Date: 2025-11-08

BEGIN;

-- Create VendorInvoice table
CREATE TABLE IF NOT EXISTS "VendorInvoice" (
  "id" text PRIMARY KEY,
  "vendorId" text NOT NULL,
  "purchaseOrderId" text,
  "invoiceNumber" varchar(100) NOT NULL,
  "invoiceDate" timestamp(3) NOT NULL,
  "dueDate" timestamp(3) NOT NULL,
  "amount" decimal(10,2) NOT NULL,
  "paidAmount" decimal(10,2) DEFAULT 0 NOT NULL,
  "status" varchar(20) DEFAULT 'PENDING' NOT NULL,
  "description" text,
  "fileUrl" text,
  "journalEntryId" text,
  "createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "createdBy" text NOT NULL
);

-- Add CHECK constraint for status
ALTER TABLE "VendorInvoice"
ADD CONSTRAINT "vendor_invoice_status_check"
CHECK ("status" IN ('PENDING', 'APPROVED', 'PAID', 'VOID', 'OVERDUE'));

-- Add CHECK constraint for amounts
ALTER TABLE "VendorInvoice"
ADD CONSTRAINT "vendor_invoice_amount_positive"
CHECK ("amount" > 0);

ALTER TABLE "VendorInvoice"
ADD CONSTRAINT "vendor_invoice_paid_amount_valid"
CHECK ("paidAmount" >= 0 AND "paidAmount" <= "amount");

-- Create indexes
CREATE INDEX "idx_vendor_invoice_vendor" ON "VendorInvoice" ("vendorId");
CREATE INDEX "idx_vendor_invoice_po" ON "VendorInvoice" ("purchaseOrderId");
CREATE INDEX "idx_vendor_invoice_status" ON "VendorInvoice" ("status");
CREATE INDEX "idx_vendor_invoice_due_date" ON "VendorInvoice" ("dueDate");
CREATE INDEX "idx_vendor_invoice_journal_entry" ON "VendorInvoice" ("journalEntryId");

-- Create unique constraint on vendor + invoice number
CREATE UNIQUE INDEX "idx_vendor_invoice_number_unique"
ON "VendorInvoice" ("vendorId", "invoiceNumber");

-- Add foreign key constraints (if tables exist)
-- Note: These will be added by Composer after verifying table existence
-- ALTER TABLE "VendorInvoice" ADD CONSTRAINT "fk_vendor_invoice_vendor" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id");
-- ALTER TABLE "VendorInvoice" ADD CONSTRAINT "fk_vendor_invoice_po" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id");
-- ALTER TABLE "VendorInvoice" ADD CONSTRAINT "fk_vendor_invoice_journal" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id");

-- Add comments
COMMENT ON TABLE "VendorInvoice" IS 'Tracks vendor invoices and accounts payable';
COMMENT ON COLUMN "VendorInvoice"."status" IS 'PENDING, APPROVED, PAID, VOID, or OVERDUE';
COMMENT ON COLUMN "VendorInvoice"."paidAmount" IS 'Amount paid so far (can be partial payment)';

COMMIT;
