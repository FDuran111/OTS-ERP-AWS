/**
 * Workflow Automation - Purchase Order Receipt to Accounts Payable
 * Phase 1 Task 2.2 - Automatically create AP entries when POs are received
 */

import { createAutoJournalEntry, findExistingJournalEntry, getAccountCode } from '@/lib/accounting/journal-entry-automation';
import type { POReceiptData } from '@/lib/accounting/types';
import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

/**
 * Helper function to calculate due date based on invoice date and payment terms
 * @param invoiceDate - Date of the invoice
 * @param days - Number of days until due (default: 30)
 * @returns Due date
 */
function calculateDueDate(invoiceDate: Date, days: number = 30): Date {
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
}

/**
 * Generates journal entry for PO receipt (AP recognition)
 *
 * Accounting entries:
 * - DEBIT: Inventory (1200) or relevant expense account
 * - CREDIT: Accounts Payable (2000)
 *
 * @param purchaseOrderId - ID of the received purchase order
 * @returns Created journal entry ID
 * @throws Error if PO not found or entry creation fails
 */
export async function generatePOReceiptJournalEntry(purchaseOrderId: string): Promise<string> {
  // Step 1: Check if journal entry already exists for this PO
  const existingEntryId = await findExistingJournalEntry('PURCHASE_ORDER', purchaseOrderId);
  if (existingEntryId) {
    console.log(`[Automation] Journal entry already exists for PO ${purchaseOrderId}: ${existingEntryId}`);
    return existingEntryId;
  }

  // Step 2: Fetch PO data
  const poResult = await query(
    `SELECT 
      id, 
      "vendorId", 
      "totalAmount", 
      status,
      "updatedAt",
      "createdAt"
    FROM "PurchaseOrder"
    WHERE id = $1`,
    [purchaseOrderId]
  );

  if (poResult.rows.length === 0) {
    throw new Error(`Purchase order not found: ${purchaseOrderId}`);
  }

  const po = poResult.rows[0];

  // Verify status is 'RECEIVED'
  if (po.status !== 'RECEIVED') {
    throw new Error(`Purchase order ${purchaseOrderId} is not in RECEIVED status. Current status: ${po.status}`);
  }

  // Get receipt date from PurchaseOrderReceipt table if available, otherwise use PO updatedAt
  let receiptDate: Date;
  const receiptResult = await query(
    `SELECT MAX("receivedAt") as "receiptDate"
     FROM "PurchaseOrderReceipt"
     WHERE "purchaseOrderId" = $1`,
    [purchaseOrderId]
  );

  if (receiptResult.rows.length > 0 && receiptResult.rows[0].receiptDate) {
    receiptDate = new Date(receiptResult.rows[0].receiptDate);
  } else {
    receiptDate = new Date(po.updatedAt || po.createdAt);
  }

  const poTotal = parseFloat(po.totalAmount || 0);
  if (poTotal <= 0) {
    throw new Error(`Purchase order ${purchaseOrderId} has invalid total amount: ${poTotal}`);
  }

  // Step 3: Create journal entry lines
  // DR Inventory (1200) for the PO total
  // CR Accounts Payable (2000) for the PO total
  const inventoryAccountCode = getAccountCode('inventoryAccount'); // Returns '1200'
  const accountsPayableAccountCode = getAccountCode('accountsPayableAccount'); // Returns '2000'

  const journalEntryLines = [
    {
      accountCode: inventoryAccountCode,
      debit: poTotal,
      credit: 0,
      description: `PO Receipt - ${purchaseOrderId}`,
    },
    {
      accountCode: accountsPayableAccountCode,
      debit: 0,
      credit: poTotal,
      description: `Accounts Payable - PO ${purchaseOrderId}`,
    },
  ];

  // Step 4: Create the journal entry
  const journalEntry = await createAutoJournalEntry({
    sourceType: 'PURCHASE_ORDER',
    sourceId: purchaseOrderId,
    date: receiptDate,
    description: `Purchase Order Receipt - PO ${purchaseOrderId}`,
    lines: journalEntryLines,
    reference: `PO-${purchaseOrderId}`,
  });

  // Step 5: Create VendorInvoice record
  const vendorInvoiceId = randomUUID();
  const invoiceDate = receiptDate;
  const dueDate = calculateDueDate(invoiceDate, 30); // 30 days default

  await query(
    `INSERT INTO "VendorInvoice" (
      id,
      "vendorId",
      "purchaseOrderId",
      "invoiceNumber",
      "invoiceDate",
      "dueDate",
      amount,
      "paidAmount",
      status,
      "journalEntryId",
      "createdBy",
      "createdAt",
      "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      vendorInvoiceId,
      po.vendorId,
      purchaseOrderId,
      `PO-${purchaseOrderId}`,
      invoiceDate,
      dueDate,
      poTotal,
      0, // paidAmount starts at 0
      'PENDING',
      journalEntry.id,
      'SYSTEM',
      new Date(),
      new Date(),
    ]
  );

  console.log(`[Automation] Created VendorInvoice ${vendorInvoiceId} for PO ${purchaseOrderId}`);

  // Step 6: Return journal entry ID
  return journalEntry.id;
}

/**
 * Event handler for purchaseOrder.received event
 *
 * This will be called by the event bus when a PO status changes to RECEIVED
 * In Phase 3, this will be integrated with the full event system
 *
 * @param purchaseOrderId - ID of the received purchase order
 */
export async function onPOReceived(purchaseOrderId: string): Promise<void> {
  try {
    console.log(`[Automation] Purchase order received: ${purchaseOrderId}`);

    const journalEntryId = await generatePOReceiptJournalEntry(purchaseOrderId);

    console.log(`[Automation] Generated AP journal entry ${journalEntryId} for PO ${purchaseOrderId}`);
  } catch (error) {
    console.error(`[Automation] Failed to generate AP entry for PO ${purchaseOrderId}:`, error);
    // TODO: In Phase 3, add error handling and retry logic
    throw error;
  }
}
