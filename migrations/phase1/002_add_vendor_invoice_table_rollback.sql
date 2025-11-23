-- Rollback: Remove VendorInvoice table
-- Purpose: Revert changes from 002_add_vendor_invoice_table.sql
-- Author: Phase 1 Task 2.1
-- Date: 2025-11-08

BEGIN;

-- Drop the table (cascades to indexes and constraints)
DROP TABLE IF EXISTS "VendorInvoice" CASCADE;

COMMIT;
