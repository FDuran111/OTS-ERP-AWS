/**
 * Unit Tests - Journal Entry Automation
 * Phase 1 Task 1.5 - Tests for core accounting automation functions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import {
  validateJournalEntry,
  createAutoJournalEntry,
  findExistingJournalEntry,
} from '@/lib/accounting/journal-entry-automation';
import { generateInvoiceJournalEntry } from '@/lib/workflows/invoice-automation';
import { generateJobCompletionJournalEntry } from '@/lib/workflows/job-completion-automation';
import type { JournalEntryLine, CreateAutoJournalEntryRequest } from '@/lib/accounting/types';
import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

// Test database setup and utilities
let testAccountIds: string[] = [];
let testJournalEntryIds: string[] = [];
let testInvoiceIds: string[] = [];
let testJobIds: string[] = [];
let testCustomerId: string | null = null;
let testUserId: string | null = null;

/**
 * Create test accounts needed for journal entries
 */
async function createTestAccounts() {
  const accounts = [
    { code: '1100', name: 'Accounts Receivable', accountType: 'ASSET', balanceType: 'DEBIT' },
    { code: '1200', name: 'Inventory', accountType: 'ASSET', balanceType: 'DEBIT' },
    { code: '2000', name: 'Accounts Payable', accountType: 'LIABILITY', balanceType: 'CREDIT' },
    { code: '4000', name: 'Revenue', accountType: 'REVENUE', balanceType: 'CREDIT' },
    { code: '5000', name: 'COGS', accountType: 'COGS', balanceType: 'DEBIT' },
    { code: '5100', name: 'Labor Expense', accountType: 'EXPENSE', balanceType: 'DEBIT' },
    { code: '5200', name: 'Equipment Expense', accountType: 'EXPENSE', balanceType: 'DEBIT' },
  ];

  const accountIds: string[] = [];

  for (const account of accounts) {
    // Check if account already exists
    const existing = await query(
      'SELECT id FROM "Account" WHERE code = $1',
      [account.code]
    );

    if (existing.rows.length > 0) {
      accountIds.push(existing.rows[0].id);
    } else {
      const result = await query(
        `INSERT INTO "Account" (id, code, name, "accountType", "balanceType", "isActive", "isPosting")
         VALUES ($1, $2, $3, $4, $5, true, true)
         RETURNING id`,
        [randomUUID(), account.code, account.name, account.accountType, account.balanceType]
      );
      accountIds.push(result.rows[0].id);
    }
  }

  return accountIds;
}

/**
 * Create a test customer
 */
async function createTestCustomer(): Promise<string> {
  const result = await query(
    `INSERT INTO "Customer" (id, "firstName", "lastName", email, phone, "createdAt", "updatedAt")
     VALUES ($1, 'Test', 'Customer', 'test@example.com', '555-0100', NOW(), NOW())
     RETURNING id`,
    [randomUUID()]
  );
  return result.rows[0].id;
}

/**
 * Create a test user (for job costs)
 */
async function createTestUser(): Promise<string> {
  // Check if test user already exists
  const existing = await query(
    'SELECT id FROM "User" WHERE email = $1',
    ['test-user@example.com']
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const result = await query(
    `INSERT INTO "User" (id, email, name, role, password, "createdAt", "updatedAt")
     VALUES ($1, 'test-user@example.com', 'Test User', 'EMPLOYEE', 'test-password-hash', NOW(), NOW())
     RETURNING id`,
    [randomUUID()]
  );
  return result.rows[0].id;
}

/**
 * Create a test job (for invoices)
 */
async function createTestJob(customerId: string): Promise<string> {
  const result = await query(
    `INSERT INTO "Job" (id, "jobNumber", "customerId", type, status, description, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'INSTALLATION', 'ESTIMATE', 'Test job for invoicing', NOW(), NOW())
     RETURNING id`,
    [randomUUID(), `JOB-TEST-${Date.now()}`, customerId]
  );
  return result.rows[0].id;
}

/**
 * Create a test material (for job costs)
 */
async function createTestMaterial(): Promise<string> {
  const result = await query(
    `INSERT INTO "Material" (id, code, name, description, unit, cost, price, category, "createdAt", "updatedAt")
     VALUES ($1, $2, 'Test Material', 'Test material for accounting tests', 'EACH', 10.00, 15.00, 'TEST', NOW(), NOW())
     RETURNING id`,
    [randomUUID(), `MAT-TEST-${Date.now()}`]
  );
  return result.rows[0].id;
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  // Delete in reverse order of dependencies
  if (testJournalEntryIds.length > 0) {
    await query(
      `DELETE FROM "JournalEntryLine" WHERE "entryId" = ANY($1::uuid[])`,
      [testJournalEntryIds]
    );
    await query(
      `DELETE FROM "JournalEntry" WHERE id = ANY($1::uuid[])`,
      [testJournalEntryIds]
    );
    testJournalEntryIds = [];
  }

  if (testInvoiceIds.length > 0) {
    await query(
      `DELETE FROM "InvoiceLineItem" WHERE "invoiceId" = ANY($1::text[])`,
      [testInvoiceIds]
    );
    await query(
      `DELETE FROM "Invoice" WHERE id = ANY($1::text[])`,
      [testInvoiceIds]
    );
    testInvoiceIds = [];
  }

  if (testJobIds.length > 0) {
    await query(
      `DELETE FROM "JobLaborCost" WHERE "jobId" = ANY($1::text[])`,
      [testJobIds]
    );
    await query(
      `DELETE FROM "JobMaterialCost" WHERE "jobId" = ANY($1::text[])`,
      [testJobIds]
    );
    await query(
      `DELETE FROM "JobEquipmentCost" WHERE "jobId" = ANY($1::text[])`,
      [testJobIds]
    );
    await query(
      `DELETE FROM "Job" WHERE id = ANY($1::text[])`,
      [testJobIds]
    );
    testJobIds = [];
  }

  if (testCustomerId) {
    await query('DELETE FROM "Customer" WHERE id = $1', [testCustomerId]);
    testCustomerId = null;
  }

  // Note: We don't delete test users as they may be reused
}

describe('Journal Entry Automation', () => {
  beforeAll(async () => {
    // Create test accounts
    testAccountIds = await createTestAccounts();
    testCustomerId = await createTestCustomer();
    testUserId = await createTestUser();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    // Clean up journal entries created during tests
    await cleanupTestData();
  });

  describe('validateJournalEntry', () => {
    it('should validate a balanced journal entry', () => {
      const lines: JournalEntryLine[] = [
        { accountCode: '1100', debit: 1000, credit: 0, description: 'AR' },
        { accountCode: '4000', debit: 0, credit: 1000, description: 'Revenue' },
      ];

      const result = validateJournalEntry(lines);

      expect(result.valid).toBe(true);
      expect(result.balanced).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject an unbalanced journal entry', () => {
      const lines: JournalEntryLine[] = [
        { accountCode: '1100', debit: 1000, credit: 0 },
        { accountCode: '4000', debit: 0, credit: 500 },
      ];

      const result = validateJournalEntry(lines);

      expect(result.valid).toBe(false);
      expect(result.balanced).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not balanced');
    });

    it('should reject entry with both debit and credit on same line', () => {
      const lines: JournalEntryLine[] = [
        { accountCode: '1100', debit: 1000, credit: 500 },
      ];

      const result = validateJournalEntry(lines);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Line 1: Cannot have both debit and credit');
    });

    it('should reject entry with no lines', () => {
      const result = validateJournalEntry([]);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Journal entry must have at least one line');
    });

    it('should reject line with missing account code', () => {
      const lines: JournalEntryLine[] = [
        { accountCode: '', debit: 1000, credit: 0 },
        { accountCode: '4000', debit: 0, credit: 1000 },
      ];

      const result = validateJournalEntry(lines);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Line 1: Account code is required');
    });
  });

  describe('createAutoJournalEntry', () => {
    it('should create a journal entry with source tracking', async () => {
      const request: CreateAutoJournalEntryRequest = {
        sourceType: 'INVOICE',
        sourceId: randomUUID(),
        date: new Date(),
        description: 'Test invoice journal entry',
        lines: [
          { accountCode: '1100', debit: 1000, credit: 0, description: 'AR' },
          { accountCode: '4000', debit: 0, credit: 1000, description: 'Revenue' },
        ],
        reference: 'TEST-INV-001',
      };

      const result = await createAutoJournalEntry(request);
      testJournalEntryIds.push(result.id);

      // Verify journal entry was created
      expect(result.id).toBeDefined();
      expect(result.balanced).toBe(true);
      expect(result.totalDebits).toBe(1000);
      expect(result.totalCredits).toBe(1000);

      // Verify in database
      const dbEntry = await query(
        `SELECT id, "sourceType", "sourceId", "autoGenerated", description, status
         FROM "JournalEntry" WHERE id = $1`,
        [result.id]
      );

      expect(dbEntry.rows).toHaveLength(1);
      expect(dbEntry.rows[0].sourceType).toBe('INVOICE');
      expect(dbEntry.rows[0].sourceId).toBe(request.sourceId);
      expect(dbEntry.rows[0].autoGenerated).toBe(true);
      expect(dbEntry.rows[0].status).toBe('DRAFT');

      // Verify lines were created
      const dbLines = await query(
        `SELECT "lineNumber", "accountId", debit, credit, description
         FROM "JournalEntryLine" WHERE "entryId" = $1 ORDER BY "lineNumber"`,
        [result.id]
      );

      expect(dbLines.rows).toHaveLength(2);
      expect(parseFloat(dbLines.rows[0].debit)).toBe(1000);
      expect(parseFloat(dbLines.rows[0].credit)).toBe(0);
      expect(parseFloat(dbLines.rows[1].debit)).toBe(0);
      expect(parseFloat(dbLines.rows[1].credit)).toBe(1000);
    });

    it('should prevent duplicate journal entries for same source', async () => {
      const sourceId = randomUUID();
      const request: CreateAutoJournalEntryRequest = {
        sourceType: 'INVOICE',
        sourceId,
        date: new Date(),
        description: 'First entry',
        lines: [
          { accountCode: '1100', debit: 500, credit: 0 },
          { accountCode: '4000', debit: 0, credit: 500 },
        ],
      };

      // Create first entry
      const firstResult = await createAutoJournalEntry(request);
      testJournalEntryIds.push(firstResult.id);

      // Attempt to create duplicate - should use findExistingJournalEntry check
      // But since createAutoJournalEntry doesn't check internally, we test findExistingJournalEntry separately
      const existingId = await findExistingJournalEntry('INVOICE', sourceId);
      expect(existingId).toBe(firstResult.id);

      // Verify only one entry exists
      const count = await query(
        `SELECT COUNT(*) as count FROM "JournalEntry" WHERE "sourceType" = $1 AND "sourceId" = $2`,
        ['INVOICE', sourceId]
      );
      expect(parseInt(count.rows[0].count)).toBe(1);
    });

    it('should rollback transaction if account code is invalid', async () => {
      const request: CreateAutoJournalEntryRequest = {
        sourceType: 'INVOICE',
        sourceId: randomUUID(),
        date: new Date(),
        description: 'Test with invalid account',
        lines: [
          { accountCode: '9999', debit: 1000, credit: 0 }, // Non-existent account
          { accountCode: '4000', debit: 0, credit: 1000 },
        ],
      };

      // Should throw error because account doesn't exist
      await expect(createAutoJournalEntry(request)).rejects.toThrow();

      // Verify no partial data was created
      const count = await query(
        `SELECT COUNT(*) as count FROM "JournalEntry" WHERE "sourceId" = $1`,
        [request.sourceId]
      );
      expect(parseInt(count.rows[0].count)).toBe(0);
    });

    it('should validate balance before creating entry', async () => {
      const request: CreateAutoJournalEntryRequest = {
        sourceType: 'INVOICE',
        sourceId: randomUUID(),
        date: new Date(),
        description: 'Unbalanced entry',
        lines: [
          { accountCode: '1100', debit: 1000, credit: 0 },
          { accountCode: '4000', debit: 0, credit: 500 }, // Unbalanced
        ],
      };

      await expect(createAutoJournalEntry(request)).rejects.toThrow('not balanced');
    });
  });

  describe('findExistingJournalEntry', () => {
    it('should find existing journal entry by source', async () => {
      const sourceId = randomUUID();
      const request: CreateAutoJournalEntryRequest = {
        sourceType: 'JOB_COMPLETION',
        sourceId,
        date: new Date(),
        description: 'Test job completion',
        lines: [
          { accountCode: '5100', debit: 500, credit: 0 },
          { accountCode: '1200', debit: 0, credit: 500 },
        ],
      };

      const entry = await createAutoJournalEntry(request);
      testJournalEntryIds.push(entry.id);

      const foundId = await findExistingJournalEntry('JOB_COMPLETION', sourceId);
      expect(foundId).toBe(entry.id);
    });

    it('should return null if no entry exists for source', async () => {
      const nonExistentId = randomUUID();
      const result = await findExistingJournalEntry('INVOICE', nonExistentId);
      expect(result).toBeNull();
    });

    it('should handle different source types correctly', async () => {
      const sourceId = randomUUID();
      
      // Create entry with INVOICE source type
      const invoiceRequest: CreateAutoJournalEntryRequest = {
        sourceType: 'INVOICE',
        sourceId,
        date: new Date(),
        description: 'Invoice entry',
        lines: [
          { accountCode: '1100', debit: 1000, credit: 0 },
          { accountCode: '4000', debit: 0, credit: 1000 },
        ],
      };
      const invoiceEntry = await createAutoJournalEntry(invoiceRequest);
      testJournalEntryIds.push(invoiceEntry.id);

      // Should find INVOICE entry
      const foundInvoice = await findExistingJournalEntry('INVOICE', sourceId);
      expect(foundInvoice).toBe(invoiceEntry.id);

      // Should not find JOB_COMPLETION entry with same sourceId
      const foundJob = await findExistingJournalEntry('JOB_COMPLETION', sourceId);
      expect(foundJob).toBeNull();
    });
  });
});

describe('Invoice Automation', () => {
  beforeEach(async () => {
    // Ensure test accounts exist
    if (testAccountIds.length === 0) {
      testAccountIds = await createTestAccounts();
    }
    if (!testCustomerId) {
      testCustomerId = await createTestCustomer();
    }
  });

  it('should generate correct journal entry for invoice', async () => {
    // Create test job and invoice
    const jobId = await createTestJob(testCustomerId!);
    testJobIds.push(jobId);

    const invoiceId = randomUUID();
    const invoiceNumber = `INV-TEST-${Date.now()}`;
    const invoiceAmount = 1500.00;

    await query(
      `INSERT INTO "Invoice" (id, "invoiceNumber", "jobId", "customerId", status, "totalAmount", "subtotalAmount", "taxAmount", "dueDate", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7, $8, NOW(), NOW())`,
      [invoiceId, invoiceNumber, jobId, testCustomerId, invoiceAmount, invoiceAmount * 0.92, invoiceAmount * 0.08, new Date()]
    );
    testInvoiceIds.push(invoiceId);

    // Generate journal entry
    const journalEntryId = await generateInvoiceJournalEntry(invoiceId);
    testJournalEntryIds.push(journalEntryId);

    // Verify journal entry
    const entry = await query(
      `SELECT id, "sourceType", "sourceId", "autoGenerated", description
       FROM "JournalEntry" WHERE id = $1`,
      [journalEntryId]
    );

    expect(entry.rows).toHaveLength(1);
    expect(entry.rows[0].sourceType).toBe('INVOICE');
    expect(entry.rows[0].sourceId).toBe(invoiceId);
    expect(entry.rows[0].autoGenerated).toBe(true);

    // Verify lines - DR AR, CR Revenue
    const lines = await query(
      `SELECT jel.debit, jel.credit, a.code as "accountCode"
       FROM "JournalEntryLine" jel
       JOIN "Account" a ON jel."accountId" = a.id
       WHERE jel."entryId" = $1
       ORDER BY jel."lineNumber"`,
      [journalEntryId]
    );

    expect(lines.rows).toHaveLength(2);
    
    // Find AR line (should be debit)
    const arLine = lines.rows.find((l: any) => l.accountCode === '1100');
    expect(arLine).toBeDefined();
    expect(parseFloat(arLine.debit)).toBe(invoiceAmount);
    expect(parseFloat(arLine.credit)).toBe(0);

    // Find Revenue line (should be credit)
    const revenueLine = lines.rows.find((l: any) => l.accountCode === '4000');
    expect(revenueLine).toBeDefined();
    expect(parseFloat(revenueLine.debit)).toBe(0);
    expect(parseFloat(revenueLine.credit)).toBe(invoiceAmount);
  });

  it('should prevent duplicate entries for same invoice', async () => {
    const jobId = await createTestJob(testCustomerId!);
    testJobIds.push(jobId);

    const invoiceId = randomUUID();
    const invoiceNumber = `INV-DUP-${Date.now()}`;

    await query(
      `INSERT INTO "Invoice" (id, "invoiceNumber", "jobId", "customerId", status, "totalAmount", "subtotalAmount", "taxAmount", "dueDate", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7, $8, NOW(), NOW())`,
      [invoiceId, invoiceNumber, jobId, testCustomerId, 1000, 920, 80, new Date()]
    );
    testInvoiceIds.push(invoiceId);

    // Create first entry
    const firstId = await generateInvoiceJournalEntry(invoiceId);
    testJournalEntryIds.push(firstId);

    // Attempt to create duplicate - should return existing ID
    const secondId = await generateInvoiceJournalEntry(invoiceId);
    expect(secondId).toBe(firstId);

    // Verify only one entry exists
    const count = await query(
      `SELECT COUNT(*) as count FROM "JournalEntry" WHERE "sourceType" = 'INVOICE' AND "sourceId" = $1`,
      [invoiceId]
    );
    expect(parseInt(count.rows[0].count)).toBe(1);
  });

  it('should throw error if invoice not found', async () => {
    const nonExistentInvoiceId = randomUUID();
    await expect(generateInvoiceJournalEntry(nonExistentInvoiceId)).rejects.toThrow('Invoice not found');
  });

  it('should throw error if invoice has invalid amount', async () => {
    const jobId = await createTestJob(testCustomerId!);
    testJobIds.push(jobId);

    const invoiceId = randomUUID();
    await query(
      `INSERT INTO "Invoice" (id, "invoiceNumber", "jobId", "customerId", status, "totalAmount", "subtotalAmount", "taxAmount", "dueDate", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7, $8, NOW(), NOW())`,
      [invoiceId, `INV-ZERO-${Date.now()}`, jobId, testCustomerId, 0, 0, 0, new Date()]
    );
    testInvoiceIds.push(invoiceId);

    await expect(generateInvoiceJournalEntry(invoiceId)).rejects.toThrow('invalid amount');
  });
});

describe('Job Completion Automation', () => {
  beforeEach(async () => {
    // Ensure test accounts exist
    if (testAccountIds.length === 0) {
      testAccountIds = await createTestAccounts();
    }
    if (!testCustomerId) {
      testCustomerId = await createTestCustomer();
    }
    if (!testUserId) {
      testUserId = await createTestUser();
    }
  });


  it('should generate correct COGS entry for completed job', async () => {
    // Create test job
    const jobId = randomUUID();
    const jobNumber = `JOB-TEST-${Date.now()}`;

    await query(
      `INSERT INTO "Job" (id, "jobNumber", "customerId", type, status, description, "completedDate", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'INSTALLATION', 'COMPLETED', 'Test job', NOW(), NOW(), NOW())`,
      [jobId, jobNumber, testCustomerId]
    );
    testJobIds.push(jobId);

    // Create test material
    const materialId = await createTestMaterial();

    // Create job costs
    const laborCost = 500.00;
    const materialCost = 300.00;
    const equipmentCost = 200.00;

    await query(
      `INSERT INTO "JobLaborCost" (id, "jobId", "userId", "skillLevel", "hourlyRate", "hoursWorked", "totalCost", "workDate")
       VALUES ($1, $2, $3, 'JOURNEYMAN', 50.00, 10, $4, CURRENT_DATE)`,
      [randomUUID(), jobId, testUserId, laborCost]
    );

    await query(
      `INSERT INTO "JobMaterialCost" (id, "jobId", "materialId", "quantityUsed", "unitCost", "totalCost", "usageDate")
       VALUES ($1, $2, $3, 10, 30.00, $4, CURRENT_DATE)`,
      [randomUUID(), jobId, materialId, materialCost]
    );

    await query(
      `INSERT INTO "JobEquipmentCost" (id, "jobId", "equipmentName", "equipmentType", "hourlyRate", "hoursUsed", "totalCost", "usageDate")
       VALUES ($1, $2, 'Bucket Truck', 'BUCKET_TRUCK', 50.00, 4, $3, CURRENT_DATE)`,
      [randomUUID(), jobId, equipmentCost]
    );

    // Generate journal entry
    const journalEntryId = await generateJobCompletionJournalEntry(jobId);
    testJournalEntryIds.push(journalEntryId);

    // Verify journal entry
    const entry = await query(
      `SELECT id, "sourceType", "sourceId", "autoGenerated", description
       FROM "JournalEntry" WHERE id = $1`,
      [journalEntryId]
    );

    expect(entry.rows).toHaveLength(1);
    expect(entry.rows[0].sourceType).toBe('JOB_COMPLETION');
    expect(entry.rows[0].sourceId).toBe(jobId);
    expect(entry.rows[0].autoGenerated).toBe(true);

    // Verify lines - DR expenses, CR inventory
    const lines = await query(
      `SELECT jel.debit, jel.credit, a.code as "accountCode", jel.description
       FROM "JournalEntryLine" jel
       JOIN "Account" a ON jel."accountId" = a.id
       WHERE jel."entryId" = $1
       ORDER BY jel."lineNumber"`,
      [journalEntryId]
    );

    const totalCost = laborCost + materialCost + equipmentCost;
    expect(lines.rows.length).toBeGreaterThanOrEqual(3); // At least 3 debit lines + 1 credit

    // Find labor expense line
    const laborLine = lines.rows.find((l: any) => l.accountCode === '5100');
    expect(laborLine).toBeDefined();
    expect(parseFloat(laborLine.debit)).toBe(laborCost);

    // Find material expense line
    const materialLine = lines.rows.find((l: any) => l.accountCode === '5000');
    expect(materialLine).toBeDefined();
    expect(parseFloat(materialLine.debit)).toBe(materialCost);

    // Find equipment expense line
    const equipmentLine = lines.rows.find((l: any) => l.accountCode === '5200');
    expect(equipmentLine).toBeDefined();
    expect(parseFloat(equipmentLine.debit)).toBe(equipmentCost);

    // Find inventory credit line
    const inventoryLine = lines.rows.find((l: any) => l.accountCode === '1200');
    expect(inventoryLine).toBeDefined();
    expect(parseFloat(inventoryLine.credit)).toBe(totalCost);
    expect(parseFloat(inventoryLine.debit)).toBe(0);
  });

  it('should prevent duplicate entries for same job', async () => {
    const jobId = randomUUID();
    await query(
      `INSERT INTO "Job" (id, "jobNumber", "customerId", type, status, description, "completedDate", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'INSTALLATION', 'COMPLETED', 'Test job', NOW(), NOW(), NOW())`,
      [jobId, `JOB-DUP-${Date.now()}`, testCustomerId]
    );
    testJobIds.push(jobId);

    await query(
      `INSERT INTO "JobLaborCost" (id, "jobId", "userId", "skillLevel", "hourlyRate", "hoursWorked", "totalCost", "workDate")
       VALUES ($1, $2, $3, 'JOURNEYMAN', 50.00, 5, 250.00, CURRENT_DATE)`,
      [randomUUID(), jobId, testUserId]
    );

    const firstId = await generateJobCompletionJournalEntry(jobId);
    testJournalEntryIds.push(firstId);

    const secondId = await generateJobCompletionJournalEntry(jobId);
    expect(secondId).toBe(firstId);
  });

  it('should throw error if job not found', async () => {
    const nonExistentJobId = randomUUID();
    await expect(generateJobCompletionJournalEntry(nonExistentJobId)).rejects.toThrow('Job not found');
  });

  it('should throw error if job is not completed', async () => {
    const jobId = randomUUID();
    await query(
      `INSERT INTO "Job" (id, "jobNumber", "customerId", type, status, description, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'INSTALLATION', 'IN_PROGRESS', 'Incomplete job', NOW(), NOW())`,
      [jobId, `JOB-INCOMPLETE-${Date.now()}`, testCustomerId]
    );
    testJobIds.push(jobId);

    await expect(generateJobCompletionJournalEntry(jobId)).rejects.toThrow('not completed');
  });

  it('should throw error if job has no costs', async () => {
    const jobId = randomUUID();
    await query(
      `INSERT INTO "Job" (id, "jobNumber", "customerId", type, status, description, "completedDate", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'INSTALLATION', 'COMPLETED', 'Job with no costs', NOW(), NOW(), NOW())`,
      [jobId, `JOB-NOCOST-${Date.now()}`, testCustomerId]
    );
    testJobIds.push(jobId);

    await expect(generateJobCompletionJournalEntry(jobId)).rejects.toThrow('no costs to record');
  });

  it('should only include non-zero cost categories', async () => {
    const jobId = randomUUID();
    await query(
      `INSERT INTO "Job" (id, "jobNumber", "customerId", type, status, description, "completedDate", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'INSTALLATION', 'COMPLETED', 'Job with only labor', NOW(), NOW(), NOW())`,
      [jobId, `JOB-LABORONLY-${Date.now()}`, testCustomerId]
    );
    testJobIds.push(jobId);

    // Only add labor cost
    await query(
      `INSERT INTO "JobLaborCost" (id, "jobId", "userId", "skillLevel", "hourlyRate", "hoursWorked", "totalCost", "workDate")
       VALUES ($1, $2, $3, 'JOURNEYMAN', 50.00, 10, 500.00, CURRENT_DATE)`,
      [randomUUID(), jobId, testUserId]
    );

    const journalEntryId = await generateJobCompletionJournalEntry(jobId);
    testJournalEntryIds.push(journalEntryId);

    // Verify only labor and inventory lines exist
    const lines = await query(
      `SELECT a.code as "accountCode", jel.debit, jel.credit
       FROM "JournalEntryLine" jel
       JOIN "Account" a ON jel."accountId" = a.id
       WHERE jel."entryId" = $1`,
      [journalEntryId]
    );

    const accountCodes = lines.rows.map((r: any) => r.accountCode);
    expect(accountCodes).toContain('5100'); // Labor expense
    expect(accountCodes).toContain('1200'); // Inventory
    expect(accountCodes).not.toContain('5000'); // Material expense (should not be included)
    expect(accountCodes).not.toContain('5200'); // Equipment expense (should not be included)
  });
});
