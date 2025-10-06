# Database Schema Comparison Report
**Local DB vs Replit Neon DB**
**Date:** 2025-10-05

## Executive Summary

Your local database and Replit database are **NOT exact matches**. There are schema differences in both table structure and column definitions.

### Overall Statistics
- **Local Tables:** 129
- **Replit Tables:** 128
- **Common Tables:** 128
- **Triggers:** Local 98, Replit 100 (functionally equivalent)

---

## Table Differences

### Tables Only in Local (1)
- ✅ **RoleAssignment** - Exists only in local DB

### Tables Only in Replit (0)
- None

---

## Column Differences (5 tables affected)

### 1. **JournalEntryLine** - Significant Differences

**Local has (not in Replit):**
- `projectId` - Project reference
- `memo` - Memo field

**Replit has (not in Local):**
- `employeeId` - Employee reference
- `materialId` - Material reference
- `referenceId` - Generic reference ID
- `referenceType` - Reference type discriminator
- `vendorId` - Vendor reference

**Impact:** ⚠️ **HIGH** - Replit has a more flexible journal entry system with multiple reference types

---

### 2. **Role** - Different Structure

**Local has (not in Replit):**
- `active` - Boolean active flag
- `color` - UI color for role
- `display_name` - Display name
- `permissions` - Direct permissions (JSONB likely)

**Replit has (not in Local):**
- `createdBy` - User who created the role
- `isActive` - Boolean active flag (different name)
- `level` - Hierarchy level for role

**Impact:** ⚠️ **MEDIUM** - Different role management approach. Replit uses RolePermission table, Local embeds permissions

---

### 3. **StockMovement** - Minor Differences

**Replit has (not in Local):**
- `clientRequestId` - Client-side request tracking
- `transferId` - Link to stock transfers

**Impact:** 🟡 **LOW** - Additional tracking fields in Replit

---

### 4. **TimeEntryAudit** - Audit Trail Differences

**Replit has (not in Local):**
- `changes` - JSONB field for detailed change tracking
- `correlation_id` - Correlation ID for bulk operations
- `job_labor_cost_id` - Link to generated labor costs
- `notes` - Notes field

**Impact:** ⚠️ **MEDIUM** - Replit has richer audit trail (this is from the new commits we just merged)

---

### 5. **UserAuditLog** - Audit Differences

**Replit has (not in Local):**
- `resourceId` - Resource identifier
- `severity` - Severity level (INFO, WARNING, CRITICAL)

**Impact:** 🟡 **LOW-MEDIUM** - Additional audit metadata in Replit

---

## Key Findings

### 🔴 **Critical Differences**

1. **JournalEntryLine structure** - Replit uses a more flexible reference system
2. **Role table structure** - Fundamentally different approaches to permission management

### ⚠️ **Important Differences**

3. **TimeEntryAudit** - Replit has enhanced audit features (though code may handle this)
4. **RoleAssignment table** - Only exists locally, may be unused/deprecated

### 🟡 **Minor Differences**

5. **StockMovement** - Extra tracking fields
6. **UserAuditLog** - Extra metadata fields

---

## Recommendations

### Immediate Actions Needed:

1. **Decide on Role Management Strategy:**
   - Migrate Local → Replit structure (use RolePermission table)
   - OR migrate Replit → Local structure (embed permissions in Role)
   - Current: **INCOMPATIBLE** schemas

2. **JournalEntryLine Alignment:**
   - Choose one reference system (Replit's is more flexible)
   - Migrate existing data if changing

3. **Audit Tables:**
   - Add missing columns to local OR accept differences
   - The new code from Replit expects `changes`, `correlation_id`, etc.

### Optional/Future:

4. **Remove RoleAssignment table** if unused locally
5. **Add tracking fields** to StockMovement/UserAuditLog for consistency

---

## Migration Complexity Assessment

| Area | Complexity | Estimated Effort |
|------|-----------|------------------|
| Role/Permission System | 🔴 **HIGH** | 4-8 hours |
| JournalEntryLine | ⚠️ **MEDIUM** | 2-4 hours |
| Audit Tables | 🟡 **LOW** | 1-2 hours |
| Minor Fields | 🟢 **TRIVIAL** | 30 min |

---

## Next Steps

1. **Review Role Management Requirements** - Decide which approach to use
2. **Test Current Code** - See if it works despite schema differences (may use dynamic queries)
3. **Plan Migration** - If full sync needed, plan data migration strategy
4. **Backup Everything** - Before any schema changes

---

## Notes

- Triggers are now in sync (functionally equivalent)
- Table count difference is just the RoleAssignment table
- Most core tables (TimeEntry, Job, User, etc.) are likely identical
- The differences are in supporting/metadata tables
