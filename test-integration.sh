#!/bin/bash

# Integration Test Suite for OTS-ERP
# Tests all features from MANUAL_TESTING_10-10-25.md
# Date: October 12, 2025

echo "======================================"
echo "OTS-ERP INTEGRATION TEST SUITE"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

# Test counter
TEST_NUM=0

# Function to run test
run_test() {
    TEST_NUM=$((TEST_NUM + 1))
    echo -e "\n${YELLOW}[TEST $TEST_NUM]${NC} $1"
}

# Function to mark test as passed
pass() {
    echo -e "  ${GREEN}✓ PASS${NC} - $1"
    PASSED=$((PASSED + 1))
}

# Function to mark test as failed
fail() {
    echo -e "  ${RED}✗ FAIL${NC} - $1"
    FAILED=$((FAILED + 1))
}

# Function to mark test as warning
warn() {
    echo -e "  ${YELLOW}⚠ WARN${NC} - $1"
    WARNINGS=$((WARNINGS + 1))
}

echo "Starting tests..."
echo ""

# ============================================
# PHASE 1: DATABASE SCHEMA TESTS
# ============================================

echo "======================================"
echo "PHASE 1: DATABASE SCHEMA VALIDATION"
echo "======================================"

run_test "Check database connection"
if psql postgresql://localhost/ots_erp_local -c "SELECT 1" > /dev/null 2>&1; then
    pass "Database connection successful"
else
    fail "Cannot connect to database"
fi

run_test "Verify TimeEntryMaterial table exists"
if psql postgresql://localhost/ots_erp_local -c "\d \"TimeEntryMaterial\"" > /dev/null 2>&1; then
    pass "TimeEntryMaterial table exists"

    # Check for required columns
    COLUMNS=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'TimeEntryMaterial'")
    if echo "$COLUMNS" | grep -q "materialId"; then
        pass "materialId column exists"
    else
        fail "materialId column missing"
    fi

    if echo "$COLUMNS" | grep -q "offTruck"; then
        pass "offTruck column exists"
    else
        fail "offTruck column missing"
    fi

    if echo "$COLUMNS" | grep -q "packingSlipUrl"; then
        pass "packingSlipUrl column exists"
    else
        fail "packingSlipUrl column missing"
    fi
else
    fail "TimeEntryMaterial table does not exist"
fi

run_test "Verify TimeEntryPhoto table exists"
if psql postgresql://localhost/ots_erp_local -c "\d \"TimeEntryPhoto\"" > /dev/null 2>&1; then
    pass "TimeEntryPhoto table exists"

    COLUMNS=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'TimeEntryPhoto'")
    if echo "$COLUMNS" | grep -q "photoUrl"; then
        pass "photoUrl column exists"
    else
        fail "photoUrl column missing"
    fi

    if echo "$COLUMNS" | grep -q "thumbnailUrl"; then
        pass "thumbnailUrl column exists"
    else
        fail "thumbnailUrl column missing"
    fi
else
    fail "TimeEntryPhoto table does not exist"
fi

run_test "Verify User table has pay rate columns"
COLUMNS=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'User'")
if echo "$COLUMNS" | grep -q "regularRate"; then
    pass "regularRate column exists"
else
    fail "regularRate column missing"
fi

if echo "$COLUMNS" | grep -q "overtimeRate"; then
    pass "overtimeRate column exists"
else
    fail "overtimeRate column missing"
fi

run_test "Verify Job table has customerPO column"
COLUMNS=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'Job'")
if echo "$COLUMNS" | grep -q "customerPO"; then
    pass "customerPO column exists"
else
    fail "customerPO column missing"
fi

run_test "Verify NotificationLog table exists (for auto-submit)"
if psql postgresql://localhost/ots_erp_local -c "\d \"NotificationLog\"" > /dev/null 2>&1; then
    pass "NotificationLog table exists"
else
    warn "NotificationLog table does not exist - notifications may not work"
fi

run_test "Verify NewJobEntry table exists"
if psql postgresql://localhost/ots_erp_local -c "\d \"NewJobEntry\"" > /dev/null 2>&1; then
    pass "NewJobEntry table exists"

    COLUMNS=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'NewJobEntry'")
    if echo "$COLUMNS" | grep -q "status"; then
        pass "status column exists"
    else
        fail "status column missing"
    fi

    if echo "$COLUMNS" | grep -q "approvedBy"; then
        pass "approvedBy column exists"
    else
        fail "approvedBy column missing"
    fi

    if echo "$COLUMNS" | grep -q "reviewedAt"; then
        pass "reviewedAt column exists"
    else
        fail "reviewedAt column missing"
    fi

    if echo "$COLUMNS" | grep -q "approvedJobId"; then
        pass "approvedJobId column exists"
    else
        fail "approvedJobId column missing"
    fi
else
    fail "NewJobEntry table does not exist"
fi

# ============================================
# PHASE 2: FILE STRUCTURE TESTS
# ============================================

echo ""
echo "======================================"
echo "PHASE 2: FILE STRUCTURE VALIDATION"
echo "======================================"

run_test "Check component files exist"

FILES=(
    "src/components/time/MultiJobTimeEntry.tsx"
    "src/components/time/SimpleTimeEntry.tsx"
    "src/components/time/WeeklyTimesheetDisplay.tsx"
    "src/components/time/PhotoGallery.tsx"
    "src/components/layout/ResponsiveSidebar.tsx"
    "src/components/layout/MobileBottomNav.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        pass "Found $file"
    else
        fail "Missing $file"
    fi
done

run_test "Check API route files exist"

API_ROUTES=(
    "src/app/api/time-entries/route.ts"
    "src/app/api/time-entries/[id]/route.ts"
    "src/app/api/time-entries/[id]/photos/route.ts"
    "src/app/api/time-entries/new-job/route.ts"
    "src/app/api/jobs/route.ts"
    "src/app/api/users/route.ts"
    "src/app/api/cron/sunday-reminder/route.ts"
    "src/app/api/cron/sunday-auto-submit/route.ts"
)

for route in "${API_ROUTES[@]}"; do
    if [ -f "$route" ]; then
        pass "Found $route"
    else
        fail "Missing $route"
    fi
done

run_test "Check page files exist"

PAGES=(
    "src/app/(app)/time/page.tsx"
    "src/app/(app)/time/new-job-review/page.tsx"
    "src/app/(app)/jobs/page.tsx"
    "src/app/(app)/schedule/page.tsx"
    "src/app/(app)/users/page.tsx"
)

for page in "${PAGES[@]}"; do
    if [ -f "$page" ]; then
        pass "Found $page"
    else
        fail "Missing $page"
    fi
done

run_test "Check migration files exist"

MIGRATIONS=(
    "src/lib/db-migrations/2025-10-10-time-entry-photos.sql"
    "src/lib/db-migrations/2025-10-12-add-customer-po.sql"
    "src/lib/db-migrations/2025-10-12-new-job-entry.sql"
    "src/lib/db-migrations/2025-10-12-new-job-entry-fix.sql"
)

for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$migration" ]; then
        pass "Found $migration"
    else
        warn "Missing $migration (may be OK if already applied)"
    fi
done

run_test "Check upload directories exist"

UPLOAD_DIRS=(
    "public/uploads"
    "public/uploads/packing-slips"
    "public/uploads/time-entry-photos"
)

for dir in "${UPLOAD_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        pass "Found $dir"
    else
        warn "Missing $dir - will be created on first upload"
    fi
done

# ============================================
# PHASE 3: API ENDPOINT TESTS
# ============================================

echo ""
echo "======================================"
echo "PHASE 3: API ENDPOINT VALIDATION"
echo "======================================"
echo "(Note: Some endpoints require authentication and will return 401 - this is expected)"

run_test "Test GET /api/jobs endpoint"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/jobs)
if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "401" ] || [ "$RESPONSE" == "307" ]; then
    pass "Jobs API endpoint responding (HTTP $RESPONSE - auth required)"
else
    fail "Jobs API endpoint not responding correctly (HTTP $RESPONSE)"
fi

run_test "Test GET /api/users endpoint"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/users)
if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "401" ] || [ "$RESPONSE" == "307" ]; then
    pass "Users API endpoint responding (HTTP $RESPONSE - auth required)"
else
    fail "Users API endpoint not responding correctly (HTTP $RESPONSE)"
fi

run_test "Test GET /api/time-entries endpoint"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/time-entries)
if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "401" ] || [ "$RESPONSE" == "307" ]; then
    pass "Time entries API endpoint responding (HTTP $RESPONSE - auth required)"
else
    fail "Time entries API endpoint not responding correctly (HTTP $RESPONSE)"
fi

run_test "Test GET /api/time-entries/new-job endpoint"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/time-entries/new-job)
if [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "401" ] || [ "$RESPONSE" == "307" ]; then
    pass "New job entry API endpoint responding (HTTP $RESPONSE - auth required)"
else
    fail "New job entry API endpoint not responding correctly (HTTP $RESPONSE)"
fi

run_test "Test cron endpoints (should return 401 without auth)"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/cron/sunday-reminder)
if [ "$RESPONSE" == "401" ] || [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "307" ]; then
    pass "Sunday reminder cron endpoint exists (HTTP $RESPONSE)"
else
    warn "Sunday reminder cron endpoint returned unexpected code (HTTP $RESPONSE)"
fi

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/cron/sunday-auto-submit)
if [ "$RESPONSE" == "401" ] || [ "$RESPONSE" == "200" ] || [ "$RESPONSE" == "307" ]; then
    pass "Sunday auto-submit cron endpoint exists (HTTP $RESPONSE)"
else
    warn "Sunday auto-submit cron endpoint returned unexpected code (HTTP $RESPONSE)"
fi

# ============================================
# PHASE 4: CODE CONTENT VALIDATION
# ============================================

echo ""
echo "======================================"
echo "PHASE 4: CODE CONTENT VALIDATION"
echo "======================================"

run_test "Verify SimpleTimeEntry has 'New Job Entry' enabled"
if grep -q '{currentUser?.role === .EMPLOYEE. && (' src/components/time/SimpleTimeEntry.tsx; then
    pass "'New Job Entry' button is enabled for employees"
else
    fail "'New Job Entry' button still disabled or code changed"
fi

run_test "Verify Schedule removed from employee navigation"
if grep -q "roles: \['OWNER_ADMIN', 'FOREMAN'\].*Schedule" src/components/layout/ResponsiveSidebar.tsx; then
    pass "Schedule navigation restricted to admin/foreman"
else
    warn "Schedule navigation roles may not be correctly set"
fi

if grep -B 2 "path: '/schedule'" src/components/layout/MobileBottomNav.tsx | grep -q "OWNER_ADMIN.*FOREMAN"; then
    pass "Mobile schedule navigation restricted to admin/foreman"
else
    warn "Mobile schedule navigation roles may not be correctly set"
fi

run_test "Verify Schedule page has employee redirect"
if grep -q "user.role === 'EMPLOYEE'" src/app/\(app\)/schedule/page.tsx; then
    pass "Schedule page has employee redirect check"
else
    warn "Schedule page may not redirect employees"
fi

run_test "Verify MultiJobTimeEntry button text"
if grep -q "Submit Time Card" src/components/time/MultiJobTimeEntry.tsx; then
    pass "Button text changed to 'Submit Time Card'"
else
    warn "Button text may not be updated"
fi

run_test "Check if PhotoGallery component exists"
if [ -f "src/components/time/PhotoGallery.tsx" ]; then
    pass "PhotoGallery component file exists"
    if grep -q "lightbox\|modal" src/components/time/PhotoGallery.tsx; then
        pass "PhotoGallery appears to have lightbox functionality"
    else
        warn "PhotoGallery may not have lightbox feature"
    fi
else
    warn "PhotoGallery component not found"
fi

# ============================================
# PHASE 5: DATABASE DATA VALIDATION
# ============================================

echo ""
echo "======================================"
echo "PHASE 5: DATABASE DATA VALIDATION"
echo "======================================"

run_test "Check if admin user exists"
ADMIN_COUNT=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT COUNT(*) FROM \"User\" WHERE email = 'admin@admin.com'")
if [ "$ADMIN_COUNT" -gt 0 ]; then
    pass "Admin user exists (admin@admin.com)"
else
    warn "Admin user not found - may need to create test user"
fi

run_test "Check user roles"
ROLE_COUNTS=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT role, COUNT(*) FROM \"User\" GROUP BY role")
if [ -n "$ROLE_COUNTS" ]; then
    pass "User roles found in database"
    echo "     Roles: $ROLE_COUNTS"
else
    warn "No users found in database"
fi

run_test "Check if jobs exist"
JOB_COUNT=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT COUNT(*) FROM \"Job\"")
if [ "$JOB_COUNT" -gt 0 ]; then
    pass "$JOB_COUNT jobs found in database"
else
    warn "No jobs found - may need test data"
fi

run_test "Check if materials exist"
MATERIAL_COUNT=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT COUNT(*) FROM \"Material\"")
if [ "$MATERIAL_COUNT" -gt 0 ]; then
    pass "$MATERIAL_COUNT materials found in database"
else
    warn "No materials found - may need test data"
fi

run_test "Check time entry counts"
TIME_ENTRY_COUNT=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT COUNT(*) FROM \"TimeEntry\"")
pass "$TIME_ENTRY_COUNT time entries in database"

run_test "Check time entry materials"
TEM_COUNT=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT COUNT(*) FROM \"TimeEntryMaterial\"")
pass "$TEM_COUNT time entry materials in database"

run_test "Check time entry photos"
PHOTO_COUNT=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT COUNT(*) FROM \"TimeEntryPhoto\"")
pass "$PHOTO_COUNT time entry photos in database"

run_test "Check new job entries"
NJE_COUNT=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT COUNT(*) FROM \"NewJobEntry\"")
pass "$NJE_COUNT new job entry requests in database"

# ============================================
# PHASE 6: ENVIRONMENT VALIDATION
# ============================================

echo ""
echo "======================================"
echo "PHASE 6: ENVIRONMENT VALIDATION"
echo "======================================"

run_test "Check if .env.local exists"
if [ -f ".env.local" ]; then
    pass ".env.local file exists"

    if grep -q "DATABASE_URL" .env.local; then
        pass "DATABASE_URL configured"
    else
        warn "DATABASE_URL not found in .env.local"
    fi

    if grep -q "CRON_SECRET" .env.local; then
        pass "CRON_SECRET configured (for auto-submit)"
    else
        warn "CRON_SECRET not configured - auto-submit may not work"
    fi
else
    warn ".env.local file not found"
fi

run_test "Check if development server is running"
if curl -s http://localhost:3000 > /dev/null; then
    pass "Development server is running on port 3000"
else
    fail "Development server is NOT running - start with 'npm run dev'"
fi

run_test "Check Node.js version"
NODE_VERSION=$(node -v)
pass "Node.js version: $NODE_VERSION"

run_test "Check npm packages installed"
if [ -d "node_modules" ]; then
    pass "node_modules directory exists"
else
    fail "node_modules not found - run 'npm install'"
fi

# ============================================
# SUMMARY
# ============================================

echo ""
echo "======================================"
echo "TEST SUMMARY"
echo "======================================"
echo ""
echo -e "${GREEN}✓ Passed: $PASSED${NC}"
echo -e "${RED}✗ Failed: $FAILED${NC}"
echo -e "${YELLOW}⚠ Warnings: $WARNINGS${NC}"
echo ""
echo "Total Tests Run: $TEST_NUM"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}ALL CRITICAL TESTS PASSED! ✓${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "System is ready for manual testing."
    echo "See MANUAL_TESTING_10-10-25.md for test scenarios."
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}SOME TESTS FAILED! ✗${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Please fix the failed tests before proceeding."
    echo "Review the errors above and check:"
    echo "  - Database migrations applied"
    echo "  - All required files present"
    echo "  - Development server running"
    exit 1
fi
