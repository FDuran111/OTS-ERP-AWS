/**
 * Workflow Automation - Invoice to Revenue Recognition
 * Phase 1 Task 1.3 - Automatically create journal entries when invoices are created
 */

import { createAutoJournalEntry, findExistingJournalEntry, getAccountCode } from '@/lib/accounting/journal-entry-automation';
import { query } from '@/lib/db';

/**
 * Generates journal entry for invoice revenue recognition
 *
 * Accounting entries:
 * - DEBIT: Accounts Receivable (1100)
 * - CREDIT: Revenue (4000)
 *
 * @param invoiceId - ID of the invoice
 * @returns Created journal entry ID
 * @throws Error if invoice not found or entry creation fails
 */
export async function generateInvoiceJournalEntry(invoiceId: string): Promise<string> {
  // Check for existing entry
  const existingEntryId = await findExistingJournalEntry('INVOICE', invoiceId);
  if (existingEntryId) {
    console.log(`Journal entry already exists for invoice ${invoiceId}: ${existingEntryId}`);
    return existingEntryId;
  }

  // Fetch invoice data
  const invoiceResult = await query(
    `SELECT id, "customerId", "totalAmount", "createdAt", "invoiceNumber", notes, status
     FROM "Invoice" 
     WHERE id = $1`,
    [invoiceId]
  );

  if (invoiceResult.rows.length === 0) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  const invoice = invoiceResult.rows[0];
  const invoiceAmount = parseFloat(invoice.totalAmount || 0);

  if (invoiceAmount <= 0) {
    throw new Error(`Invoice ${invoiceId} has invalid amount: ${invoiceAmount}`);
  }

  // Get account codes
  const arAccount = getAccountCode('accountsReceivableAccount'); // 1100
  const revenueAccount = getAccountCode('revenueAccount'); // 4000

  // Create journal entry lines
  const lines = [
    {
      accountCode: arAccount,
      debit: invoiceAmount,
      credit: 0,
      description: `AR - Invoice ${invoice.invoiceNumber || invoice.id}`,
    },
    {
      accountCode: revenueAccount,
      debit: 0,
      credit: invoiceAmount,
      description: `Revenue - Invoice ${invoice.invoiceNumber || invoice.id}`,
    },
  ];

  // Create the journal entry
  const entry = await createAutoJournalEntry({
    sourceType: 'INVOICE',
    sourceId: invoiceId,
    date: invoice.createdAt ? new Date(invoice.createdAt) : new Date(),
    description: `Revenue recognition for invoice ${invoice.invoiceNumber || invoice.id}`,
    lines,
    reference: invoice.invoiceNumber ? `INV-${invoice.invoiceNumber}` : `INV-${invoice.id}`,
  });

  // Return the journal entry ID
  return entry.id;
}

/**
 * Event handler for invoice.created event
 *
 * This will be called by the event bus when an invoice is created
 * In Phase 3, this will be integrated with the full event system
 *
 * @param invoiceId - ID of the created invoice
 * @returns Journal entry ID if successful
 * @throws Error if journal entry creation fails
 */
export async function onInvoiceCreated(invoiceId: string): Promise<string> {
  try {
    console.log(`[Automation] Invoice created: ${invoiceId}`);

    if (!invoiceId || typeof invoiceId !== 'string') {
      throw new Error(`Invalid invoice ID: ${invoiceId}`);
    }

    const journalEntryId = await generateInvoiceJournalEntry(invoiceId);

    console.log(`[Automation] Generated journal entry ${journalEntryId} for invoice ${invoiceId}`);
    
    return journalEntryId;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Automation] Failed to generate journal entry for invoice ${invoiceId}:`, errorMessage);
    
    // Log additional context for debugging
    if (error instanceof Error && error.stack) {
      console.error(`[Automation] Error stack:`, error.stack);
    }

    // Re-throw with more context
    throw new Error(`Failed to create journal entry for invoice ${invoiceId}: ${errorMessage}`);
  }
}
