/**
 * Workflow Automation - Job Completion to COGS Recognition
 * Phase 1 Task 1.4 - Automatically create COGS journal entries when jobs complete
 */

import { createAutoJournalEntry, findExistingJournalEntry, getAccountCode } from '@/lib/accounting/journal-entry-automation';
import { query } from '@/lib/db';

/**
 * Generates journal entry for job completion (COGS recognition)
 *
 * Accounting entries:
 * - DEBIT: COGS - Labor (5100)
 * - DEBIT: COGS - Materials (5000)
 * - DEBIT: COGS - Equipment (5200)
 * - CREDIT: Inventory/WIP (1200)
 *
 * @param jobId - ID of the completed job
 * @returns Created journal entry ID
 * @throws Error if job not found or entry creation fails
 */
export async function generateJobCompletionJournalEntry(jobId: string): Promise<string> {
  // Check for existing entry
  const existingEntryId = await findExistingJournalEntry('JOB_COMPLETION', jobId);
  if (existingEntryId) {
    console.log(`Journal entry already exists for job ${jobId}: ${existingEntryId}`);
    return existingEntryId;
  }

  // Fetch job details
  const jobResult = await query(
    `SELECT id, status, "completedDate", "completedAt", "jobNumber", description
     FROM "Job" 
     WHERE id = $1`,
    [jobId]
  );

  if (jobResult.rows.length === 0) {
    throw new Error(`Job not found: ${jobId}`);
  }

  const job = jobResult.rows[0];

  // Verify job is completed
  if (job.status !== 'COMPLETED') {
    throw new Error(`Job ${jobId} is not completed. Current status: ${job.status}`);
  }

  // Fetch job cost data - sum totalCost from each cost table
  const laborCostResult = await query(
    `SELECT COALESCE(SUM("totalCost"), 0) as "totalCost"
     FROM "JobLaborCost" 
     WHERE "jobId" = $1`,
    [jobId]
  );

  const materialCostResult = await query(
    `SELECT COALESCE(SUM("totalCost"), 0) as "totalCost"
     FROM "JobMaterialCost" 
     WHERE "jobId" = $1`,
    [jobId]
  );

  const equipmentCostResult = await query(
    `SELECT COALESCE(SUM("totalCost"), 0) as "totalCost"
     FROM "JobEquipmentCost" 
     WHERE "jobId" = $1`,
    [jobId]
  );

  // Calculate total costs
  const laborCost = parseFloat(laborCostResult.rows[0]?.totalCost || 0);
  const materialCost = parseFloat(materialCostResult.rows[0]?.totalCost || 0);
  const equipmentCost = parseFloat(equipmentCostResult.rows[0]?.totalCost || 0);
  const totalCost = laborCost + materialCost + equipmentCost;

  // Validate that there are costs to record
  if (totalCost <= 0) {
    throw new Error(`Job ${jobId} has no costs to record. Total cost: ${totalCost}`);
  }

  // Get account codes
  const laborExpenseAccount = getAccountCode('laborExpenseAccount'); // 5100
  const materialExpenseAccount = getAccountCode('cogsAccount'); // 5000
  const equipmentExpenseAccount = getAccountCode('equipmentExpenseAccount'); // 5200
  const inventoryAccount = getAccountCode('inventoryAccount'); // 1200

  // Create journal entry lines (only include non-zero amounts)
  const lines = [];

  if (laborCost > 0) {
    lines.push({
      accountCode: laborExpenseAccount,
      debit: laborCost,
      credit: 0,
      description: `Labor cost - Job ${job.jobNumber || jobId}`,
    });
  }

  if (materialCost > 0) {
    lines.push({
      accountCode: materialExpenseAccount,
      debit: materialCost,
      credit: 0,
      description: `Material cost - Job ${job.jobNumber || jobId}`,
    });
  }

  if (equipmentCost > 0) {
    lines.push({
      accountCode: equipmentExpenseAccount,
      debit: equipmentCost,
      credit: 0,
      description: `Equipment cost - Job ${job.jobNumber || jobId}`,
    });
  }

  // Credit side (total)
  lines.push({
    accountCode: inventoryAccount,
    debit: 0,
    credit: totalCost,
    description: `WIP/Inventory - Job ${job.jobNumber || jobId}`,
  });

  // Determine completion date for journal entry
  const completionDate = job.completedDate 
    ? new Date(job.completedDate) 
    : job.completedAt 
    ? new Date(job.completedAt) 
    : new Date();

  // Create the journal entry
  const entry = await createAutoJournalEntry({
    sourceType: 'JOB_COMPLETION',
    sourceId: jobId,
    date: completionDate,
    description: `COGS recognition for completed job ${job.jobNumber || jobId}`,
    lines,
    reference: job.jobNumber ? `JOB-${job.jobNumber}` : `JOB-${jobId}`,
  });

  // Return the journal entry ID
  return entry.id;
}

/**
 * Event handler for job.completed event
 *
 * This will be called by the event bus when a job status changes to COMPLETED
 * In Phase 3, this will be integrated with the full event system
 *
 * @param jobId - ID of the completed job
 * @returns Journal entry ID if successful
 * @throws Error if journal entry creation fails
 */
export async function onJobCompleted(jobId: string): Promise<string> {
  try {
    console.log(`[Automation] Job completed: ${jobId}`);

    if (!jobId || typeof jobId !== 'string') {
      throw new Error(`Invalid job ID: ${jobId}`);
    }

    const journalEntryId = await generateJobCompletionJournalEntry(jobId);

    console.log(`[Automation] Generated COGS journal entry ${journalEntryId} for job ${jobId}`);
    
    return journalEntryId;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Automation] Failed to generate COGS entry for job ${jobId}:`, errorMessage);
    
    // Log additional context for debugging
    if (error instanceof Error && error.stack) {
      console.error(`[Automation] Error stack:`, error.stack);
    }

    // Re-throw with more context
    throw new Error(`Failed to create COGS journal entry for job ${jobId}: ${errorMessage}`);
  }
}
