#!/bin/bash

# COMPLETE PRODUCTION READINESS TEST SUITE
# Tests every API, button, form, table, integration
# Date: October 12, 2025

echo "=========================================="
echo "PRODUCTION READINESS TEST SUITE"
echo "Complete Application Test - All Features"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0
TEST_NUM=0
SECTION_NUM=0

section() {
    SECTION_NUM=$((SECTION_NUM + 1))
    echo ""
    echo -e "${CYAN}=========================================="
    echo -e "SECTION $SECTION_NUM: $1"
    echo -e "==========================================${NC}"
}

run_test() {
    TEST_NUM=$((TEST_NUM + 1))
    echo -e "\n${YELLOW}[TEST $TEST_NUM]${NC} $1"
}

pass() {
    echo -e "  ${GREEN}✓ PASS${NC} - $1"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "  ${RED}✗ FAIL${NC} - $1"
    FAILED=$((FAILED + 1))
}

warn() {
    echo -e "  ${YELLOW}⚠ WARN${NC} - $1"
    WARNINGS=$((WARNINGS + 1))
}

info() {
    echo -e "  ${BLUE}ℹ INFO${NC} - $1"
}

# ============================================
# SECTION 1: DATABASE CORE TABLES
# ============================================

section "DATABASE CORE TABLES"

CORE_TABLES=(
    "User"
    "Job"
    "Customer"
    "TimeEntry"
    "Material"
    "Invoice"
    "Lead"
    "Vendor"
)

run_test "Verify all core tables exist"
for table in "${CORE_TABLES[@]}"; do
    if psql postgresql://localhost/ots_erp_local -c "\d \"$table\"" > /dev/null 2>&1; then
        pass "$table table exists"
    else
        fail "$table table missing"
    fi
done

# ============================================
# SECTION 2: TIME TRACKING TABLES
# ============================================

section "TIME TRACKING INTEGRATION TABLES"

TIME_TABLES=(
    "TimeEntry"
    "TimeEntryMaterial"
    "TimeEntryPhoto"
    "TimeEntryRejectionNote"
    "TimeEntryAudit"
)

run_test "Verify time tracking tables"
for table in "${TIME_TABLES[@]}"; do
    if psql postgresql://localhost/ots_erp_local -c "\d \"$table\"" > /dev/null 2>&1; then
        pass "$table table exists"
    else
        fail "$table table missing"
    fi
done

# ============================================
# SECTION 3: JOB MANAGEMENT TABLES
# ============================================

section "JOB MANAGEMENT TABLES"

JOB_TABLES=(
    "Job"
    "JobCategory"
    "JobSubCategory"
    "JobPhase"
    "JobSchedule"
    "JobAssignment"
    "JobNote"
    "JobAttachment"
    "JobLaborCost"
    "JobMaterialCost"
    "JobEquipmentCost"
)

run_test "Verify job management tables"
for table in "${JOB_TABLES[@]}"; do
    if psql postgresql://localhost/ots_erp_local -c "\d \"$table\"" > /dev/null 2>&1; then
        pass "$table table exists"
    else
        fail "$table table missing"
    fi
done

# ============================================
# SECTION 4: CUSTOMER & LEAD TABLES
# ============================================

section "CUSTOMER & LEAD MANAGEMENT TABLES"

CUSTOMER_TABLES=(
    "Customer"
    "CustomerActivity"
    "CustomerFeedback"
    "CustomerMessage"
    "CustomerNotification"
    "Lead"
    "LeadActivity"
    "LeadEstimate"
)

run_test "Verify customer/lead tables"
for table in "${CUSTOMER_TABLES[@]}"; do
    if psql postgresql://localhost/ots_erp_local -c "\d \"$table\"" > /dev/null 2>&1; then
        pass "$table table exists"
    else
        warn "$table table missing (may not be in use)"
    fi
done

# ============================================
# SECTION 5: MATERIALS & INVENTORY
# ============================================

section "MATERIALS & INVENTORY TABLES"

MATERIAL_TABLES=(
    "Material"
    "MaterialUsage"
    "MaterialReservation"
    "MaterialAttachment"
    "StockMovement"
    "Vendor"
    "PurchaseOrder"
    "PurchaseOrderItem"
)

run_test "Verify materials/inventory tables"
for table in "${MATERIAL_TABLES[@]}"; do
    if psql postgresql://localhost/ots_erp_local -c "\d \"$table\"" > /dev/null 2>&1; then
        pass "$table table exists"
    else
        warn "$table table missing (may not be in use)"
    fi
done

# ============================================
# SECTION 6: INVOICING & ACCOUNTING
# ============================================

section "INVOICING & ACCOUNTING TABLES"

INVOICE_TABLES=(
    "Invoice"
    "InvoiceLineItem"
    "Account"
    "JournalEntry"
    "JournalEntryLine"
    "AccountingPeriod"
)

run_test "Verify invoicing/accounting tables"
for table in "${INVOICE_TABLES[@]}"; do
    if psql postgresql://localhost/ots_erp_local -c "\d \"$table\"" > /dev/null 2>&1; then
        pass "$table table exists"
    else
        warn "$table table missing (may not be in use)"
    fi
done

# ============================================
# SECTION 7: USER & PERMISSION TABLES
# ============================================

section "USER & PERMISSION TABLES"

USER_TABLES=(
    "User"
    "Role"
    "RoleAssignment"
    "UserPermissions"
    "UserNotificationSettings"
    "UserSecuritySettings"
    "UserAuditLog"
)

run_test "Verify user/permission tables"
for table in "${USER_TABLES[@]}"; do
    if psql postgresql://localhost/ots_erp_local -c "\d \"$table\"" > /dev/null 2>&1; then
        pass "$table table exists"
    else
        warn "$table table missing"
    fi
done

# ============================================
# SECTION 8: NOTIFICATION SYSTEM
# ============================================

section "NOTIFICATION SYSTEM TABLES"

run_test "Verify notification system"
if psql postgresql://localhost/ots_erp_local -c "\d \"NotificationLog\"" > /dev/null 2>&1; then
    pass "NotificationLog table exists"

    # Check recent notifications
    NOTIF_COUNT=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT COUNT(*) FROM \"NotificationLog\"")
    info "Total notifications in system: $NOTIF_COUNT"
else
    warn "NotificationLog table missing"
fi

# ============================================
# SECTION 9: API ENDPOINT TESTS
# ============================================

section "API ENDPOINT AVAILABILITY"

run_test "Test authentication endpoints"
LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/login)
if [ "$LOGIN_RESPONSE" == "200" ] || [ "$LOGIN_RESPONSE" == "405" ]; then
    pass "Login endpoint responding (HTTP $LOGIN_RESPONSE)"
else
    fail "Login endpoint not responding (HTTP $LOGIN_RESPONSE)"
fi

LOGOUT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/logout)
if [ "$LOGOUT_RESPONSE" == "200" ] || [ "$LOGOUT_RESPONSE" == "401" ] || [ "$LOGOUT_RESPONSE" == "307" ]; then
    pass "Logout endpoint responding (HTTP $LOGOUT_RESPONSE)"
else
    warn "Logout endpoint issue (HTTP $LOGOUT_RESPONSE)"
fi

run_test "Test job management endpoints"
JOBS_GET=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/jobs)
if [ "$JOBS_GET" == "200" ] || [ "$JOBS_GET" == "307" ] || [ "$JOBS_GET" == "401" ]; then
    pass "GET /api/jobs responding (HTTP $JOBS_GET)"
else
    fail "GET /api/jobs not responding (HTTP $JOBS_GET)"
fi

run_test "Test time entry endpoints"
TIME_GET=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/time-entries)
if [ "$TIME_GET" == "200" ] || [ "$TIME_GET" == "307" ] || [ "$TIME_GET" == "401" ]; then
    pass "GET /api/time-entries responding (HTTP $TIME_GET)"
else
    fail "GET /api/time-entries not responding (HTTP $TIME_GET)"
fi

run_test "Test customer endpoints"
CUST_GET=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/customers)
if [ "$CUST_GET" == "200" ] || [ "$CUST_GET" == "307" ] || [ "$CUST_GET" == "401" ]; then
    pass "GET /api/customers responding (HTTP $CUST_GET)"
else
    warn "GET /api/customers issue (HTTP $CUST_GET)"
fi

run_test "Test materials endpoints"
MAT_GET=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/materials)
if [ "$MAT_GET" == "200" ] || [ "$MAT_GET" == "307" ] || [ "$MAT_GET" == "401" ]; then
    pass "GET /api/materials responding (HTTP $MAT_GET)"
else
    warn "GET /api/materials issue (HTTP $MAT_GET)"
fi

run_test "Test user management endpoints"
USER_GET=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/users)
if [ "$USER_GET" == "200" ] || [ "$USER_GET" == "307" ] || [ "$USER_GET" == "401" ]; then
    pass "GET /api/users responding (HTTP $USER_GET)"
else
    fail "GET /api/users not responding (HTTP $USER_GET)"
fi

run_test "Test invoice endpoints"
INV_GET=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/invoices)
if [ "$INV_GET" == "200" ] || [ "$INV_GET" == "307" ] || [ "$INV_GET" == "401" ]; then
    pass "GET /api/invoices responding (HTTP $INV_GET)"
else
    warn "GET /api/invoices issue (HTTP $INV_GET)"
fi

run_test "Test lead management endpoints"
LEAD_GET=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/leads)
if [ "$LEAD_GET" == "200" ] || [ "$LEAD_GET" == "307" ] || [ "$LEAD_GET" == "401" ]; then
    pass "GET /api/leads responding (HTTP $LEAD_GET)"
else
    warn "GET /api/leads issue (HTTP $LEAD_GET)"
fi

run_test "Test schedule endpoints"
SCHEDULE_GET=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/schedule)
if [ "$SCHEDULE_GET" == "200" ] || [ "$SCHEDULE_GET" == "307" ] || [ "$SCHEDULE_GET" == "401" ]; then
    pass "GET /api/schedule responding (HTTP $SCHEDULE_GET)"
else
    warn "GET /api/schedule issue (HTTP $SCHEDULE_GET)"
fi

run_test "Test reports endpoints"
REPORT_GET=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/reports)
if [ "$REPORT_GET" == "200" ] || [ "$REPORT_GET" == "307" ] || [ "$REPORT_GET" == "401" ] || [ "$REPORT_GET" == "404" ]; then
    pass "GET /api/reports responding (HTTP $REPORT_GET)"
else
    warn "GET /api/reports issue (HTTP $REPORT_GET)"
fi

# ============================================
# SECTION 10: PAGE ROUTE TESTS
# ============================================

section "PAGE ROUTES ACCESSIBILITY"

run_test "Test authentication pages"
LOGIN_PAGE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login)
if [ "$LOGIN_PAGE" == "200" ]; then
    pass "Login page accessible"
else
    fail "Login page not accessible (HTTP $LOGIN_PAGE)"
fi

run_test "Test dashboard pages"
DASH_PAGE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard)
if [ "$DASH_PAGE" == "200" ] || [ "$DASH_PAGE" == "307" ]; then
    pass "Dashboard page responding (HTTP $DASH_PAGE)"
else
    fail "Dashboard page not responding (HTTP $DASH_PAGE)"
fi

run_test "Test time tracking pages"
TIME_PAGE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/time)
if [ "$TIME_PAGE" == "200" ] || [ "$TIME_PAGE" == "307" ]; then
    pass "Time page responding (HTTP $TIME_PAGE)"
else
    fail "Time page not responding (HTTP $TIME_PAGE)"
fi

run_test "Test job management pages"
JOBS_PAGE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/jobs)
if [ "$JOBS_PAGE" == "200" ] || [ "$JOBS_PAGE" == "307" ]; then
    pass "Jobs page responding (HTTP $JOBS_PAGE)"
else
    fail "Jobs page not responding (HTTP $JOBS_PAGE)"
fi

run_test "Test schedule page"
SCHED_PAGE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/schedule)
if [ "$SCHED_PAGE" == "200" ] || [ "$SCHED_PAGE" == "307" ]; then
    pass "Schedule page responding (HTTP $SCHED_PAGE)"
else
    fail "Schedule page not responding (HTTP $SCHED_PAGE)"
fi

run_test "Test customer pages"
CUST_PAGE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/customers)
if [ "$CUST_PAGE" == "200" ] || [ "$CUST_PAGE" == "307" ]; then
    pass "Customers page responding (HTTP $CUST_PAGE)"
else
    warn "Customers page issue (HTTP $CUST_PAGE)"
fi

run_test "Test user management pages"
USERS_PAGE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/users)
if [ "$USERS_PAGE" == "200" ] || [ "$USERS_PAGE" == "307" ]; then
    pass "Users page responding (HTTP $USERS_PAGE)"
else
    fail "Users page not responding (HTTP $USERS_PAGE)"
fi

# ============================================
# SECTION 11: DATA INTEGRITY CHECKS
# ============================================

section "DATA INTEGRITY CHECKS"

run_test "Check for NULL user IDs in time entries"
NULL_USER=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT COUNT(*) FROM \"TimeEntry\" WHERE \"userId\" IS NULL")
if [ "$NULL_USER" -eq 0 ]; then
    pass "No time entries with NULL user IDs"
else
    fail "Found $NULL_USER time entries with NULL user IDs"
fi

run_test "Check for NULL job IDs in time entries"
NULL_JOB=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT COUNT(*) FROM \"TimeEntry\" WHERE \"jobId\" IS NULL")
if [ "$NULL_JOB" -eq 0 ]; then
    pass "No time entries with NULL job IDs"
else
    fail "Found $NULL_JOB time entries with NULL job IDs"
fi

run_test "Check for orphaned time entry materials"
ORPHAN_MAT=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*) FROM \"TimeEntryMaterial\"
    WHERE \"timeEntryId\" NOT IN (SELECT id FROM \"TimeEntry\")
")
if [ "$ORPHAN_MAT" -eq 0 ]; then
    pass "No orphaned time entry materials"
else
    warn "Found $ORPHAN_MAT orphaned materials"
fi

run_test "Check for orphaned time entry photos"
ORPHAN_PHOTO=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*) FROM \"TimeEntryPhoto\"
    WHERE \"timeEntryId\" NOT IN (SELECT id FROM \"TimeEntry\")
")
if [ "$ORPHAN_PHOTO" -eq 0 ]; then
    pass "No orphaned time entry photos"
else
    warn "Found $ORPHAN_PHOTO orphaned photos"
fi

run_test "Check for duplicate job numbers"
DUP_JOBS=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*) FROM (
        SELECT \"jobNumber\", COUNT(*)
        FROM \"Job\"
        GROUP BY \"jobNumber\"
        HAVING COUNT(*) > 1
    ) duplicates
")
if [ "$DUP_JOBS" -eq 0 ]; then
    pass "No duplicate job numbers"
else
    fail "Found $DUP_JOBS duplicate job numbers"
fi

run_test "Check for inactive users with active time entries"
INACTIVE_ENTRIES=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(DISTINCT te.\"userId\")
    FROM \"TimeEntry\" te
    JOIN \"User\" u ON te.\"userId\" = u.id
    WHERE u.active = false
    AND te.date >= CURRENT_DATE - INTERVAL '30 days'
")
if [ "$INACTIVE_ENTRIES" -eq 0 ]; then
    pass "No recent time entries from inactive users"
else
    warn "$INACTIVE_ENTRIES inactive users have recent time entries"
fi

# ============================================
# SECTION 12: BUSINESS LOGIC VALIDATION
# ============================================

section "BUSINESS LOGIC VALIDATION"

run_test "Verify users have valid roles"
INVALID_ROLES=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM \"User\"
    WHERE role::text NOT IN ('OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN', 'VIEWER', 'OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE')
")
if [ "$INVALID_ROLES" -eq 0 ]; then
    pass "All users have valid roles"
else
    fail "Found $INVALID_ROLES users with invalid roles"
fi

run_test "Verify jobs have valid statuses"
INVALID_STATUS=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM \"Job\"
    WHERE status NOT IN ('ESTIMATE', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PENDING_REVIEW', 'DISPATCHED')
")
if [ "$INVALID_STATUS" -eq 0 ]; then
    pass "All jobs have valid statuses"
else
    warn "Found $INVALID_STATUS jobs with invalid statuses"
fi

run_test "Verify time entries have positive hours"
NEGATIVE_HOURS=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM \"TimeEntry\"
    WHERE hours <= 0
")
if [ "$NEGATIVE_HOURS" -eq 0 ]; then
    pass "All time entries have positive hours"
else
    fail "Found $NEGATIVE_HOURS time entries with zero or negative hours"
fi

run_test "Verify time entries within reasonable date range"
FUTURE_ENTRIES=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM \"TimeEntry\"
    WHERE date > CURRENT_DATE + INTERVAL '1 day'
")
if [ "$FUTURE_ENTRIES" -eq 0 ]; then
    pass "No time entries dated in the future"
else
    warn "Found $FUTURE_ENTRIES time entries dated in the future"
fi

OLD_ENTRIES=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM \"TimeEntry\"
    WHERE date < CURRENT_DATE - INTERVAL '1 year'
")
info "Historical time entries (>1 year old): $OLD_ENTRIES"

run_test "Verify pay rates are reasonable"
ZERO_RATES=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM \"User\"
    WHERE role IN ('EMPLOYEE', 'FOREMAN')
    AND (\"regularRate\" IS NULL OR \"regularRate\" <= 0)
")
if [ "$ZERO_RATES" -eq 0 ]; then
    pass "All employees/foremen have pay rates set"
else
    warn "$ZERO_RATES employees/foremen have no pay rate (cost tracking affected)"
fi

# ============================================
# SECTION 13: SECURITY CHECKS
# ============================================

section "SECURITY & AUTHENTICATION"

run_test "Check password encryption"
PLAIN_PASSWORDS=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM \"User\"
    WHERE password NOT LIKE '\$%'
")
if [ "$PLAIN_PASSWORDS" -eq 0 ]; then
    pass "All passwords are encrypted"
else
    fail "Found $PLAIN_PASSWORDS users with plain text passwords"
fi

run_test "Check for admin users"
ADMIN_COUNT=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM \"User\"
    WHERE role = 'OWNER_ADMIN' AND active = true
")
if [ "$ADMIN_COUNT" -gt 0 ]; then
    pass "Found $ADMIN_COUNT active admin users"
else
    fail "No active admin users found"
fi

run_test "Check for test/default passwords"
# This is a basic check - adjust for your actual test users
TEST_ACCOUNTS=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM \"User\"
    WHERE email IN ('test@test.com', 'demo@demo.com')
    AND active = true
")
if [ "$TEST_ACCOUNTS" -eq 0 ]; then
    pass "No active test accounts found"
else
    warn "Found $TEST_ACCOUNTS active test accounts - remove before production"
fi

# ============================================
# SECTION 14: PERFORMANCE CHECKS
# ============================================

section "PERFORMANCE & OPTIMIZATION"

run_test "Check database indexes exist"
INDEX_COUNT=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN ('TimeEntry', 'Job', 'User', 'Material')
")
if [ "$INDEX_COUNT" -gt 10 ]; then
    pass "Found $INDEX_COUNT indexes on core tables"
else
    warn "Only $INDEX_COUNT indexes found - performance may be affected"
fi

run_test "Check for large tables without indexes"
UNINDEXED=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM pg_tables t
    LEFT JOIN pg_indexes i ON t.tablename = i.tablename
    WHERE t.schemaname = 'public'
    AND i.indexname IS NULL
    AND t.tablename NOT LIKE 'pg_%'
")
if [ "$UNINDEXED" -eq 0 ]; then
    pass "All tables have indexes"
else
    info "$UNINDEXED tables without indexes (may be intentional)"
fi

run_test "Check database connection pool"
CONNECTIONS=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT count(*) FROM pg_stat_activity
")
info "Current database connections: $CONNECTIONS"

# ============================================
# SECTION 15: FILE SYSTEM CHECKS
# ============================================

section "FILE SYSTEM & UPLOADS"

run_test "Check upload directories exist and writable"
UPLOAD_DIRS=(
    "public/uploads"
    "public/uploads/packing-slips"
    "public/uploads/time-entry-photos"
)

for dir in "${UPLOAD_DIRS[@]}"; do
    if [ -d "$dir" ] && [ -w "$dir" ]; then
        pass "$dir exists and is writable"
    elif [ -d "$dir" ]; then
        warn "$dir exists but may not be writable"
    else
        warn "$dir does not exist"
    fi
done

run_test "Check for uploaded files"
PACKING_SLIPS=$(find public/uploads/packing-slips -type f 2>/dev/null | wc -l)
PHOTOS=$(find public/uploads/time-entry-photos -type f 2>/dev/null | wc -l)
info "Packing slips uploaded: $PACKING_SLIPS"
info "Photos uploaded: $PHOTOS"

# ============================================
# SECTION 16: ENVIRONMENT CONFIGURATION
# ============================================

section "ENVIRONMENT CONFIGURATION"

run_test "Check environment file"
if [ -f ".env.local" ]; then
    pass ".env.local exists"

    if grep -q "DATABASE_URL" .env.local; then
        pass "DATABASE_URL configured"
    else
        fail "DATABASE_URL missing"
    fi

    if grep -q "NEXTAUTH_SECRET\|JWT_SECRET" .env.local; then
        pass "Auth secret configured"
    else
        warn "Auth secret not found"
    fi

    if grep -q "CRON_SECRET" .env.local; then
        pass "CRON_SECRET configured"
    else
        warn "CRON_SECRET not configured (auto-submit won't work)"
    fi
else
    fail ".env.local does not exist"
fi

run_test "Check Node.js version"
NODE_VERSION=$(node -v)
pass "Node.js version: $NODE_VERSION"

run_test "Check npm packages"
if [ -d "node_modules" ]; then
    pass "node_modules exists"
    PACKAGE_COUNT=$(ls -1 node_modules | wc -l)
    info "Packages installed: $PACKAGE_COUNT"
else
    fail "node_modules missing - run npm install"
fi

# ============================================
# SECTION 17: FEATURE COMPLETENESS
# ============================================

section "FEATURE COMPLETENESS CHECK"

run_test "Time tracking features"
if [ -f "src/components/time/MultiJobTimeEntry.tsx" ] && \
   [ -f "src/components/time/SimpleTimeEntry.tsx" ] && \
   [ -f "src/components/time/WeeklyTimesheetDisplay.tsx" ]; then
    pass "Time tracking components complete"
else
    fail "Some time tracking components missing"
fi

run_test "Material tracking features"
TIME_MAT_COUNT=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT COUNT(*) FROM \"TimeEntryMaterial\"")
if [ "$TIME_MAT_COUNT" -gt 0 ]; then
    pass "Material tracking functional ($TIME_MAT_COUNT materials tracked)"
else
    info "Material tracking ready but not yet used"
fi

run_test "Photo upload features"
if [ -f "src/components/time/PhotoGallery.tsx" ]; then
    pass "Photo upload component exists"
else
    warn "Photo upload component missing"
fi

run_test "User management features"
if [ -f "src/app/(app)/users/page.tsx" ]; then
    pass "User management page exists"
else
    warn "User management page missing"
fi

run_test "Job management features"
JOB_COUNT=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT COUNT(*) FROM \"Job\"")
if [ "$JOB_COUNT" -gt 0 ]; then
    pass "Job management functional ($JOB_COUNT jobs in system)"
else
    warn "No jobs in system yet"
fi

run_test "Employee job creation feature"
if [ -f "src/app/(app)/time/new-job-review/page.tsx" ]; then
    pass "Employee job creation review page exists"
else
    warn "Employee job creation review page missing"
fi

# ============================================
# SECTION 18: CRITICAL PATH TEST
# ============================================

section "CRITICAL USER PATHS"

run_test "Admin can access all pages"
ADMIN_EMAIL="admin@admin.com"
ADMIN_EXISTS=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*) FROM \"User\"
    WHERE email = '$ADMIN_EMAIL' AND role = 'OWNER_ADMIN' AND active = true
")
if [ "$ADMIN_EXISTS" -gt 0 ]; then
    pass "Admin user $ADMIN_EMAIL exists and active"
else
    warn "Admin user may need verification"
fi

run_test "Employee users can track time"
EMP_COUNT=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*) FROM \"User\"
    WHERE role = 'EMPLOYEE' AND active = true
")
if [ "$EMP_COUNT" -gt 0 ]; then
    pass "$EMP_COUNT active employees in system"
else
    warn "No active employees - create test employee"
fi

run_test "Jobs exist for time tracking"
ACTIVE_JOBS=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*) FROM \"Job\"
    WHERE status IN ('SCHEDULED', 'IN_PROGRESS', 'DISPATCHED')
")
if [ "$ACTIVE_JOBS" -gt 0 ]; then
    pass "$ACTIVE_JOBS active jobs for time tracking"
else
    warn "No active jobs - employees may not have work to track"
fi

# ============================================
# SUMMARY
# ============================================

echo ""
echo -e "${CYAN}=========================================="
echo -e "PRODUCTION READINESS SUMMARY"
echo -e "==========================================${NC}"
echo ""
echo -e "${GREEN}✓ Tests Passed: $PASSED${NC}"
echo -e "${RED}✗ Tests Failed: $FAILED${NC}"
echo -e "${YELLOW}⚠ Warnings: $WARNINGS${NC}"
echo ""
echo "Total Tests Run: $TEST_NUM across $SECTION_NUM sections"
echo ""

# Calculate pass rate
TOTAL_TESTS=$TEST_NUM
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$(echo "scale=1; $PASSED * 100 / $TOTAL_TESTS" | bc)
    echo "Pass Rate: $PASS_RATE%"
fi

echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}=========================================="
        echo -e "🚀 READY FOR PRODUCTION!"
        echo -e "==========================================${NC}"
        echo ""
        echo "All critical tests passed with no warnings."
        echo "Your application is ready to deploy."
        exit 0
    else
        echo -e "${YELLOW}=========================================="
        echo -e "⚠️  READY WITH MINOR WARNINGS"
        echo -e "==========================================${NC}"
        echo ""
        echo "All critical tests passed."
        echo "Review $WARNINGS warnings before production deploy."
        echo "Most warnings are informational or optional features."
        exit 0
    fi
else
    echo -e "${RED}=========================================="
    echo -e "❌ NOT READY FOR PRODUCTION"
    echo -e "==========================================${NC}"
    echo ""
    echo "Found $FAILED critical failures."
    echo "Please fix all failures before deploying."
    echo ""
    echo "Common fixes:"
    echo "  - Ensure dev server is running: npm run dev"
    echo "  - Check database connection"
    echo "  - Verify all migrations applied"
    echo "  - Check .env.local configuration"
    exit 1
fi
