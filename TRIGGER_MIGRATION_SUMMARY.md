# Database Trigger Migration Summary

## Overview
This document summarizes the database triggers that exist in the Replit production database but are missing from the local database.

**Migration File**: `src/lib/db-migrations/2025-10-05-critical-triggers-from-replit.sql`

## Critical Impact Summary

### 🔴 **CRITICAL - DO NOT SKIP**

#### 1. `handle_approved_time_entry()` Trigger
- **Location**: TimeEntry table (AFTER INSERT OR UPDATE)
- **Purpose**: Auto-creates JobLaborCost records when time entries are approved
- **Why Critical**:
  - The application code at `src/app/api/time-entries/[id]/approve/route.ts` **expects** this to happen
  - Code waits 100ms then queries for the JobLaborCost record
  - **WITHOUT THIS TRIGGER**: Approved time entries won't create labor costs, breaking job costing
- **Impact**: Revenue tracking, job profitability, payroll calculations all depend on this

#### 2. `prevent_audit_modification()` Triggers
- **Location**: TimeEntryAudit table (BEFORE UPDATE/DELETE)
- **Purpose**: Makes audit records immutable (cannot be modified or deleted)
- **Why Critical**:
  - Compliance requirement for audit trails
  - Prevents tampering with historical records
  - Legal and financial audit requirements
- **Impact**: Audit integrity, compliance violations if missing

### ⚠️ **HIGH PRIORITY - Recommended**

#### 3. Role & Permission Audit Logging
- **Triggers**: `log_role_changes()`, `log_permission_change()`
- **Location**: Role, User, UserPermission tables
- **Purpose**: Track all changes to roles and permissions for security audit
- **Impact**: Security compliance, user access tracking, forensic analysis

#### 4. Material Stock Synchronization
- **Trigger**: `sync_material_total_stock()`
- **Location**: MaterialLocationStock table
- **Purpose**: Keep Material.inStock in sync with location quantities
- **Impact**: Inventory accuracy, stock level reporting

#### 5. Material Cost History Tracking
- **Trigger**: `track_material_cost_change()`
- **Location**: Material table (AFTER UPDATE)
- **Purpose**: Maintain historical record of material cost changes
- **Impact**: Cost trend analysis, pricing history

### 🟡 **MEDIUM PRIORITY - Nice to Have**

#### 6. Material Kit Total Updates
- **Trigger**: `update_kit_totals()`
- **Location**: MaterialKitItem table
- **Purpose**: Auto-calculate kit costs and prices when items change
- **Impact**: Material kit pricing accuracy

#### 7. Account Balance Updates
- **Trigger**: `update_account_balance()`
- **Location**: JournalEntryLine table
- **Purpose**: Update AccountBalance table when journal entries are posted
- **Impact**: Financial reporting, account balances

## Helper Functions Required

The triggers depend on these helper functions (also in migration):

1. `get_acting_user()` - Gets current user ID from session
2. `calculate_kit_cost()` - Calculates material kit costs
3. `calculate_kit_price()` - Calculates material kit prices

## What's Already Working

✅ **Application-Level Audit Logging** (from the 12 new commits):
- IP address tracking
- User agent logging
- Correlation IDs for bulk operations
- Change tracking with `audit-helper.ts`

These work alongside the database triggers for complete audit coverage.

## Testing After Migration

After running the migration, test these scenarios:

1. **Approve a time entry** - Verify JobLaborCost is auto-created
2. **Try to modify TimeEntryAudit** - Should fail with "immutable" error
3. **Change a role** - Verify UserAuditLog entry created
4. **Grant a permission** - Verify UserAuditLog entry created
5. **Update material stock** - Verify Material.inStock updates automatically

## Rollback Plan

If issues occur, drop the triggers:

```sql
-- Drop all triggers created by this migration
DROP TRIGGER IF EXISTS trigger_approved_time_entry ON "TimeEntry";
DROP TRIGGER IF EXISTS prevent_timeentryaudit_delete ON "TimeEntryAudit";
DROP TRIGGER IF EXISTS prevent_timeentryaudit_update ON "TimeEntryAudit";
-- (etc - see migration file for full list)
```

## Recommendation

**Run this migration on local DB** to match Replit production environment. The `handle_approved_time_entry()` trigger is especially critical since the application code depends on it.

## Questions to Answer Before Running

1. ✅ Do we have the `add_labor_cost_from_time_entry()` function? (Yes, exists in both DBs)
2. ✅ Do we have the TimeEntryAudit table? (Yes, confirmed)
3. ✅ Do we have the UserAuditLog table? (Need to verify)
4. ⚠️ Should we test on a backup first? (Recommended)
