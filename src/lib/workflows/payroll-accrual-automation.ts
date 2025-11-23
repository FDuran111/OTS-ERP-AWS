/**
 * Workflow Automation - Time Approval to Payroll Accrual
 * Phase 1 Task 2.3 - Automatically accrue payroll expenses when time is approved
 */

import { createAutoJournalEntry, findExistingJournalEntry, getAccountCode } from '@/lib/accounting/journal-entry-automation';
import type { TimeApprovalData } from '@/lib/accounting/types';
import { query } from '@/lib/db';

/**
 * Generates journal entry for payroll accrual (approved time)
 *
 * Accounting entries:
 * - DEBIT: Labor Expense (5100)
 * - CREDIT: Wages Payable (2100)
 *
 * @param timeEntryIds - Array of approved time entry IDs
 * @returns Created journal entry ID
 * @throws Error if time entries not found or entry creation fails
 */
export async function generatePayrollAccrualJournalEntry(timeEntryIds: string[]): Promise<string> {
  if (!timeEntryIds || timeEntryIds.length === 0) {
    throw new Error('Time entry IDs array is required');
  }

  // Step 1: Check if journal entry already exists for these time entries
  const sourceId = JSON.stringify(timeEntryIds.sort()); // Sort for consistent comparison
  const existingEntryId = await findExistingJournalEntry('TIME_APPROVAL', sourceId);
  if (existingEntryId) {
    console.log(`[Automation] Journal entry already exists for time entries: ${existingEntryId}`);
    return existingEntryId;
  }

  // Step 2: Fetch time entry data
  // Query TimeEntry table for all IDs in the array
  // Get: id, employeeId (userId), regularHours, overtimeHours, doubleTimeHours, regularRate, overtimeRate, doubleTimeRate
  const timeEntriesResult = await query(
    `SELECT 
      id,
      "userId" as "employeeId",
      "regularHours",
      "overtimeHours",
      "doubleTimeHours",
      "regularRate",
      "overtimeRate",
      "doubleTimeRate",
      date,
      status
    FROM "TimeEntry"
    WHERE id = ANY($1::text[])
      AND status = 'approved'`,
    [timeEntryIds]
  );

  if (timeEntriesResult.rows.length === 0) {
    throw new Error(`No approved time entries found for the provided IDs`);
  }

  const timeEntries = timeEntriesResult.rows;

  // Verify we got all requested entries (some might not be approved)
  if (timeEntries.length !== timeEntryIds.length) {
    const foundIds = timeEntries.map((e: any) => e.id);
    const missingIds = timeEntryIds.filter(id => !foundIds.includes(id));
    console.warn(`[Automation] Some time entries were not approved: ${missingIds.join(', ')}`);
  }

  // Step 3: Calculate total payroll
  let totalPayroll = 0;
  const dateRange = {
    min: new Date(timeEntries[0].date),
    max: new Date(timeEntries[0].date),
  };

  for (const entry of timeEntries) {
    // Parse numeric values, defaulting to 0 if null/undefined
    const regularHours = parseFloat(entry.regularHours || 0);
    const overtimeHours = parseFloat(entry.overtimeHours || 0);
    const doubleTimeHours = parseFloat(entry.doubleTimeHours || 0);
    const regularRate = parseFloat(entry.regularRate || 0);
    const overtimeRate = parseFloat(entry.overtimeRate || 0);
    const doubleTimeRate = parseFloat(entry.doubleTimeRate || 0);

    // Calculate pay for each entry
    const regularPay = regularHours * regularRate;
    const overtimePay = overtimeHours * overtimeRate;
    const doubleTimePay = doubleTimeHours * doubleTimeRate;
    
    totalPayroll += regularPay + overtimePay + doubleTimePay;

    // Track date range
    const entryDate = new Date(entry.date);
    if (entryDate < dateRange.min) dateRange.min = entryDate;
    if (entryDate > dateRange.max) dateRange.max = entryDate;
  }

  if (totalPayroll <= 0) {
    throw new Error(`Total payroll amount is invalid: ${totalPayroll}`);
  }

  // Step 4: Create journal entry lines
  // DR Labor Expense (5100) for total payroll
  // CR Wages Payable (2100) for total payroll
  const laborExpenseAccountCode = getAccountCode('laborExpenseAccount'); // Returns '5100'
  const wagesPayableAccountCode = getAccountCode('wagesPayableAccount'); // Returns '2100'

  const journalEntryLines = [
    {
      accountCode: laborExpenseAccountCode,
      debit: totalPayroll,
      credit: 0,
      description: `Payroll Accrual - ${timeEntries.length} time entries`,
    },
    {
      accountCode: wagesPayableAccountCode,
      debit: 0,
      credit: totalPayroll,
      description: `Wages Payable - ${timeEntries.length} time entries`,
    },
  ];

  // Step 5: Create the journal entry with source tracking
  // Use the most recent date from time entries as the entry date
  const entryDate = dateRange.max;

  // Format date range for description
  const dateRangeStr = dateRange.min.toISOString().split('T')[0] === dateRange.max.toISOString().split('T')[0]
    ? dateRange.max.toISOString().split('T')[0]
    : `${dateRange.min.toISOString().split('T')[0]} to ${dateRange.max.toISOString().split('T')[0]}`;

  const journalEntry = await createAutoJournalEntry({
    sourceType: 'TIME_APPROVAL',
    sourceId: sourceId, // Store array as JSON
    date: entryDate,
    description: `Payroll Accrual - ${timeEntries.length} time entries (${dateRangeStr})`,
    lines: journalEntryLines,
    reference: `TIME-${timeEntryIds.slice(0, 3).join('-')}${timeEntryIds.length > 3 ? '...' : ''}`,
  });

  console.log(`[Automation] Created payroll accrual journal entry ${journalEntry.id} for ${timeEntries.length} time entries, total: $${totalPayroll.toFixed(2)}`);

  // Step 6: Return journal entry ID
  return journalEntry.id;
}

/**
 * Event handler for timeEntry.approved event
 *
 * This will be called by the event bus when time entries are approved
 * In Phase 3, this will be integrated with the full event system
 *
 * @param timeEntryIds - Array of approved time entry IDs
 */
export async function onTimeEntriesApproved(timeEntryIds: string[]): Promise<void> {
  try {
    console.log(`[Automation] Time entries approved: ${timeEntryIds.length} entries`);

    const journalEntryId = await generatePayrollAccrualJournalEntry(timeEntryIds);

    console.log(`[Automation] Generated payroll accrual entry ${journalEntryId} for ${timeEntryIds.length} time entries`);
  } catch (error) {
    console.error(`[Automation] Failed to generate payroll accrual:`, error);
    // TODO: In Phase 3, add error handling and retry logic
    throw error;
  }
}
