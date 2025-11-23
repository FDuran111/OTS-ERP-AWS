/**
 * Accounting Library - Type Definitions
 * Phase 1 Task 1.2 - Foundation types for journal entry automation
 */

/**
 * Valid source types for automated journal entries
 */
export type JournalEntrySourceType =
  | 'INVOICE'
  | 'JOB_COMPLETION'
  | 'PURCHASE_ORDER'
  | 'TIME_APPROVAL'
  | 'MANUAL_ADJUSTMENT'
  | 'VENDOR_INVOICE'
  | 'PAYROLL_ACCRUAL';

/**
 * Journal entry line item (debit or credit)
 */
export interface JournalEntryLine {
  accountCode: string;
  debit: number;
  credit: number;
  description?: string;
  departmentId?: string;
  projectId?: string;
}

/**
 * Request to create an automated journal entry
 */
export interface CreateAutoJournalEntryRequest {
  sourceType: JournalEntrySourceType;
  sourceId: string;
  date: Date;
  description: string;
  lines: JournalEntryLine[];
  reference?: string;
}

/**
 * Response from creating a journal entry
 */
export interface CreateJournalEntryResponse {
  id: string;
  balanced: boolean;
  totalDebits: number;
  totalCredits: number;
  lines: JournalEntryLine[];
}

/**
 * Account mapping configuration
 */
export interface AccountMapping {
  // Revenue accounts
  revenueAccount: string;

  // Asset accounts
  accountsReceivableAccount: string;
  inventoryAccount: string;

  // Expense accounts
  cogsAccount: string;
  laborExpenseAccount: string;
  equipmentExpenseAccount: string;

  // Liability accounts
  accountsPayableAccount: string;
  wagesPayableAccount: string;

  // Equity accounts
  retainedEarningsAccount: string;
}

/**
 * Default account mapping (can be overridden via config)
 */
export const DEFAULT_ACCOUNT_MAPPING: AccountMapping = {
  revenueAccount: '4000',
  accountsReceivableAccount: '1100',
  inventoryAccount: '1200',
  cogsAccount: '5000',
  laborExpenseAccount: '5100',
  equipmentExpenseAccount: '5200',
  accountsPayableAccount: '2000',
  wagesPayableAccount: '2100',
  retainedEarningsAccount: '3200',
};

/**
 * Validation result for journal entry
 */
export interface JournalEntryValidation {
  valid: boolean;
  balanced: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Invoice data for revenue recognition
 */
export interface InvoiceData {
  id: string;
  customerId: string;
  amount: number;
  date: Date;
  description?: string;
  jobId?: string;
}

/**
 * Job completion data for COGS recognition
 */
export interface JobCompletionData {
  id: string;
  customerId: string;
  totalCost: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  completionDate: Date;
}

/**
 * Purchase order receipt data for AP
 */
export interface POReceiptData {
  id: string;
  purchaseOrderId: string;
  vendorId: string;
  amount: number;
  receiptDate: Date;
  description?: string;
}

/**
 * Time approval data for payroll accrual
 */
export interface TimeApprovalData {
  id: string;
  employeeId: string;
  totalHours: number;
  totalPay: number;
  periodStart: Date;
  periodEnd: Date;
  approvalDate: Date;
}
