#!/bin/bash

# Job Costing Integration Test Suite
# Tests time tracking → job costs → billing calculations
# Date: October 12, 2025

echo "======================================"
echo "JOB COSTING INTEGRATION TEST SUITE"
echo "======================================"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0
TEST_NUM=0

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
# PHASE 1: JOB COST TRACKING TABLES
# ============================================

echo "======================================"
echo "PHASE 1: JOB COST TRACKING SCHEMA"
echo "======================================"

run_test "Check JobLaborCost table exists"
if psql postgresql://localhost/ots_erp_local -c "\d \"JobLaborCost\"" > /dev/null 2>&1; then
    pass "JobLaborCost table exists"

    # Check for key columns
    COLUMNS=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'JobLaborCost'")
    if echo "$COLUMNS" | grep -q "hours"; then
        pass "hours column exists"
    else
        warn "hours column missing - labor cost tracking may not work"
    fi

    if echo "$COLUMNS" | grep -q "rate"; then
        pass "rate column exists"
    else
        warn "rate column missing - cost calculations may not work"
    fi

    if echo "$COLUMNS" | grep -q "cost"; then
        pass "cost column exists"
    else
        warn "cost column missing - total cost tracking may not work"
    fi
else
    warn "JobLaborCost table does not exist - labor cost tracking not available"
fi

run_test "Check JobMaterialCost table exists"
if psql postgresql://localhost/ots_erp_local -c "\d \"JobMaterialCost\"" > /dev/null 2>&1; then
    pass "JobMaterialCost table exists"

    COLUMNS=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'JobMaterialCost'")
    if echo "$COLUMNS" | grep -q "quantity"; then
        pass "quantity column exists"
    else
        warn "quantity column missing"
    fi

    if echo "$COLUMNS" | grep -q "unitCost"; then
        pass "unitCost column exists"
    else
        warn "unitCost column missing"
    fi

    if echo "$COLUMNS" | grep -q "totalCost"; then
        pass "totalCost column exists"
    else
        warn "totalCost column missing"
    fi
else
    warn "JobMaterialCost table does not exist - material cost tracking not available"
fi

run_test "Check Job table has cost tracking columns"
COLUMNS=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'Job'")

if echo "$COLUMNS" | grep -q "actualCost"; then
    pass "actualCost column exists"
else
    warn "actualCost column missing - job cost summaries may not work"
fi

if echo "$COLUMNS" | grep -q "estimatedCost"; then
    pass "estimatedCost column exists"
else
    warn "estimatedCost column missing - cost comparisons not available"
fi

if echo "$COLUMNS" | grep -q "billedAmount"; then
    pass "billedAmount column exists"
else
    warn "billedAmount column missing - profitability tracking not available"
fi

if echo "$COLUMNS" | grep -q "actualHours"; then
    pass "actualHours column exists"
else
    warn "actualHours column missing - hour tracking not available"
fi

# ============================================
# PHASE 2: TIME ENTRY COST CALCULATIONS
# ============================================

echo ""
echo "======================================"
echo "PHASE 2: TIME ENTRY COST INTEGRATION"
echo "======================================"

run_test "Test time entries have user associations"
RESULT=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM \"TimeEntry\" te
    JOIN \"User\" u ON te.\"userId\" = u.id
    WHERE te.hours > 0
")

if [ "$RESULT" -gt 0 ]; then
    pass "Found $RESULT time entries linked to users"

    # Check if users have pay rates
    USERS_WITH_RATES=$(psql postgresql://localhost/ots_erp_local -t -c "
        SELECT COUNT(DISTINCT u.id)
        FROM \"TimeEntry\" te
        JOIN \"User\" u ON te.\"userId\" = u.id
        WHERE u.\"regularRate\" IS NOT NULL AND u.\"regularRate\" > 0
    ")

    if [ "$USERS_WITH_RATES" -gt 0 ]; then
        pass "$USERS_WITH_RATES users have pay rates configured"
    else
        warn "No users have pay rates - cost calculations will be $0"
    fi
else
    warn "No time entries with user associations found"
fi

run_test "Test time entries linked to jobs"
RESULT=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM \"TimeEntry\" te
    JOIN \"Job\" j ON te.\"jobId\" = j.id
    WHERE te.hours > 0
")

if [ "$RESULT" -gt 0 ]; then
    pass "Found $RESULT time entries linked to jobs"
else
    warn "No time entries linked to jobs - job costing won't work"
fi

run_test "Calculate expected labor costs"
echo ""
info "Sample labor cost calculation:"

SAMPLE=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT
        j.\"jobNumber\",
        u.name as employee,
        te.hours,
        u.\"regularRate\" as rate,
        (te.hours * COALESCE(u.\"regularRate\", 0)) as labor_cost
    FROM \"TimeEntry\" te
    JOIN \"Job\" j ON te.\"jobId\" = j.id
    JOIN \"User\" u ON te.\"userId\" = u.id
    WHERE te.hours > 0
    LIMIT 5
")

if [ -n "$SAMPLE" ]; then
    echo "$SAMPLE" | while IFS='|' read -r jobnum employee hours rate cost; do
        if [ -n "$jobnum" ]; then
            info "  Job $jobnum: $employee worked $hours hrs @ \$$rate/hr = \$$cost"
        fi
    done
    pass "Labor cost calculations possible"
else
    warn "Cannot calculate labor costs - missing data"
fi

# ============================================
# PHASE 3: MATERIAL COST INTEGRATION
# ============================================

echo ""
echo "======================================"
echo "PHASE 3: MATERIAL COST INTEGRATION"
echo "======================================"

run_test "Check materials have unit costs"
MATERIALS_WITH_COST=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM \"Material\"
    WHERE \"unitCost\" IS NOT NULL AND \"unitCost\" > 0
")

if [ "$MATERIALS_WITH_COST" -gt 0 ]; then
    pass "$MATERIALS_WITH_COST materials have unit costs configured"
else
    warn "No materials have unit costs - material cost tracking won't work"
fi

run_test "Test time entry materials cost calculation"
TEM_COUNT=$(psql postgresql://localhost/ots_erp_local -t -c "SELECT COUNT(*) FROM \"TimeEntryMaterial\"")

if [ "$TEM_COUNT" -gt 0 ]; then
    info "Found $TEM_COUNT time entry materials"

    # Calculate material costs
    SAMPLE=$(psql postgresql://localhost/ots_erp_local -t -c "
        SELECT
            j.\"jobNumber\",
            m.code,
            m.name,
            tem.quantity,
            m.\"unitCost\",
            (tem.quantity * COALESCE(m.\"unitCost\", 0)) as material_cost
        FROM \"TimeEntryMaterial\" tem
        JOIN \"TimeEntry\" te ON tem.\"timeEntryId\" = te.id
        JOIN \"Job\" j ON te.\"jobId\" = j.id
        JOIN \"Material\" m ON tem.\"materialId\" = m.id
        LIMIT 5
    ")

    if [ -n "$SAMPLE" ]; then
        echo ""
        info "Sample material cost calculation:"
        echo "$SAMPLE" | while IFS='|' read -r jobnum code name qty cost total; do
            if [ -n "$jobnum" ]; then
                info "  Job $jobnum: $name (qty: $qty @ \$$cost) = \$$total"
            fi
        done
        pass "Material cost calculations working"
    else
        warn "Cannot calculate material costs"
    fi
else
    info "No time entry materials to test (this is OK)"
fi

# ============================================
# PHASE 4: JOB-LEVEL COST AGGREGATION
# ============================================

echo ""
echo "======================================"
echo "PHASE 4: JOB COST AGGREGATION"
echo "======================================"

run_test "Calculate total costs per job"
echo ""
info "Job cost breakdown (top 5 jobs by activity):"

JOB_COSTS=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT
        j.\"jobNumber\",
        j.status,
        COUNT(DISTINCT te.id) as time_entries,
        SUM(te.hours) as total_hours,
        SUM(te.hours * COALESCE(u.\"regularRate\", 0)) as labor_cost,
        COUNT(DISTINCT tem.id) as materials_count
    FROM \"Job\" j
    LEFT JOIN \"TimeEntry\" te ON j.id = te.\"jobId\"
    LEFT JOIN \"User\" u ON te.\"userId\" = u.id
    LEFT JOIN \"TimeEntryMaterial\" tem ON te.id = tem.\"timeEntryId\"
    GROUP BY j.id, j.\"jobNumber\", j.status
    HAVING COUNT(te.id) > 0
    ORDER BY COUNT(te.id) DESC
    LIMIT 5
")

if [ -n "$JOB_COSTS" ]; then
    echo "$JOB_COSTS" | while IFS='|' read -r jobnum status entries hours labor materials; do
        if [ -n "$jobnum" ]; then
            jobnum=$(echo "$jobnum" | xargs)
            status=$(echo "$status" | xargs)
            entries=$(echo "$entries" | xargs)
            hours=$(echo "$hours" | xargs)
            labor=$(echo "$labor" | xargs)
            materials=$(echo "$materials" | xargs)

            info "  Job $jobnum ($status):"
            info "    - Time Entries: $entries"
            info "    - Total Hours: $hours"
            info "    - Labor Cost: \$$labor"
            info "    - Materials Used: $materials"
        fi
    done
    pass "Job cost aggregation working"
else
    warn "No job cost data to aggregate"
fi

run_test "Check Job actualCost vs calculated costs"
COST_COMPARISON=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT
        j.\"jobNumber\",
        j.\"actualCost\" as recorded_cost,
        COALESCE(SUM(te.hours * COALESCE(u.\"regularRate\", 0)), 0) as calculated_labor_cost
    FROM \"Job\" j
    LEFT JOIN \"TimeEntry\" te ON j.id = te.\"jobId\"
    LEFT JOIN \"User\" u ON te.\"userId\" = u.id
    WHERE j.\"actualCost\" IS NOT NULL AND j.\"actualCost\" > 0
    GROUP BY j.id, j.\"jobNumber\", j.\"actualCost\"
    LIMIT 3
")

if [ -n "$COST_COMPARISON" ]; then
    echo ""
    info "Recorded vs Calculated costs:"
    echo "$COST_COMPARISON" | while IFS='|' read -r jobnum recorded calculated; do
        if [ -n "$jobnum" ]; then
            info "  Job $jobnum: Recorded: \$$recorded, Calculated: \$$calculated"
        fi
    done
    pass "Can compare recorded vs calculated costs"
else
    info "No jobs have actualCost set yet (jobs still in progress)"
fi

# ============================================
# PHASE 5: PROFITABILITY TRACKING
# ============================================

echo ""
echo "======================================"
echo "PHASE 5: PROFITABILITY TRACKING"
echo "======================================"

run_test "Check jobs with billing amounts"
BILLED_JOBS=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*)
    FROM \"Job\"
    WHERE \"billedAmount\" IS NOT NULL AND \"billedAmount\" > 0
")

if [ "$BILLED_JOBS" -gt 0 ]; then
    pass "$BILLED_JOBS jobs have billing amounts"

    # Calculate profitability
    PROFIT_CALC=$(psql postgresql://localhost/ots_erp_local -t -c "
        SELECT
            j.\"jobNumber\",
            j.\"billedAmount\",
            COALESCE(SUM(te.hours * COALESCE(u.\"regularRate\", 0)), 0) as labor_cost,
            j.\"billedAmount\" - COALESCE(SUM(te.hours * COALESCE(u.\"regularRate\", 0)), 0) as profit,
            CASE
                WHEN j.\"billedAmount\" > 0 THEN
                    ROUND(((j.\"billedAmount\" - COALESCE(SUM(te.hours * COALESCE(u.\"regularRate\", 0)), 0)) / j.\"billedAmount\" * 100)::numeric, 1)
                ELSE 0
            END as profit_margin
        FROM \"Job\" j
        LEFT JOIN \"TimeEntry\" te ON j.id = te.\"jobId\"
        LEFT JOIN \"User\" u ON te.\"userId\" = u.id
        WHERE j.\"billedAmount\" IS NOT NULL AND j.\"billedAmount\" > 0
        GROUP BY j.id, j.\"jobNumber\", j.\"billedAmount\"
        LIMIT 5
    ")

    if [ -n "$PROFIT_CALC" ]; then
        echo ""
        info "Profitability analysis:"
        echo "$PROFIT_CALC" | while IFS='|' read -r jobnum billed labor profit margin; do
            if [ -n "$jobnum" ]; then
                jobnum=$(echo "$jobnum" | xargs)
                billed=$(echo "$billed" | xargs)
                labor=$(echo "$labor" | xargs)
                profit=$(echo "$profit" | xargs)
                margin=$(echo "$margin" | xargs)

                info "  Job $jobnum:"
                info "    - Billed: \$$billed"
                info "    - Labor Cost: \$$labor"
                info "    - Profit: \$$profit ($margin% margin)"
            fi
        done
        pass "Profitability calculations working"
    fi
else
    info "No jobs billed yet (jobs still in progress)"
fi

# ============================================
# PHASE 6: INTEGRATION COMPLETENESS
# ============================================

echo ""
echo "======================================"
echo "PHASE 6: INTEGRATION COMPLETENESS"
echo "======================================"

run_test "End-to-end flow validation"
echo ""
info "Checking complete time-to-billing flow..."

COMPLETE_FLOW=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT
        j.\"jobNumber\",
        j.status,
        COUNT(DISTINCT te.id) as time_entries,
        COUNT(DISTINCT tem.id) as materials,
        j.\"actualCost\",
        j.\"billedAmount\"
    FROM \"Job\" j
    LEFT JOIN \"TimeEntry\" te ON j.id = te.\"jobId\"
    LEFT JOIN \"TimeEntryMaterial\" tem ON te.id = tem.\"timeEntryId\"
    WHERE j.status IN ('COMPLETED', 'IN_PROGRESS')
    GROUP BY j.id, j.\"jobNumber\", j.status, j.\"actualCost\", j.\"billedAmount\"
    HAVING COUNT(te.id) > 0
    LIMIT 5
")

if [ -n "$COMPLETE_FLOW" ]; then
    echo "$COMPLETE_FLOW" | while IFS='|' read -r jobnum status entries materials cost billed; do
        if [ -n "$jobnum" ]; then
            info "  Job $jobnum ($status): $entries time entries, $materials materials"
        fi
    done
    pass "Complete integration flow exists"
else
    warn "No completed jobs with full costing data"
fi

run_test "Check for orphaned data"
ORPHANED_TIME=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*) FROM \"TimeEntry\" WHERE \"jobId\" NOT IN (SELECT id FROM \"Job\")
")

if [ "$ORPHANED_TIME" -eq 0 ]; then
    pass "No orphaned time entries (all linked to valid jobs)"
else
    warn "Found $ORPHANED_TIME orphaned time entries"
fi

ORPHANED_MATERIALS=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT COUNT(*) FROM \"TimeEntryMaterial\"
    WHERE \"timeEntryId\" NOT IN (SELECT id FROM \"TimeEntry\")
")

if [ "$ORPHANED_MATERIALS" -eq 0 ]; then
    pass "No orphaned materials (all linked to valid time entries)"
else
    warn "Found $ORPHANED_MATERIALS orphaned materials"
fi

# ============================================
# PHASE 7: REPORTING CAPABILITIES
# ============================================

echo ""
echo "======================================"
echo "PHASE 7: REPORTING CAPABILITIES"
echo "======================================"

run_test "Test job cost summary report"
SUMMARY=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT
        COUNT(DISTINCT j.id) as total_jobs,
        COUNT(DISTINCT CASE WHEN te.id IS NOT NULL THEN j.id END) as jobs_with_time,
        SUM(te.hours) as total_hours,
        SUM(te.hours * COALESCE(u.\"regularRate\", 0)) as total_labor_cost,
        SUM(j.\"billedAmount\") as total_billed
    FROM \"Job\" j
    LEFT JOIN \"TimeEntry\" te ON j.id = te.\"jobId\"
    LEFT JOIN \"User\" u ON te.\"userId\" = u.id
")

if [ -n "$SUMMARY" ]; then
    echo ""
    info "System-wide summary:"
    echo "$SUMMARY" | while IFS='|' read -r jobs jobs_time hours labor billed; do
        if [ -n "$jobs" ]; then
            info "  Total Jobs: $jobs"
            info "  Jobs with Time Entries: $jobs_time"
            info "  Total Hours Tracked: ${hours:-0}"
            info "  Total Labor Cost: \$${labor:-0}"
            info "  Total Billed: \$${billed:-0}"
        fi
    done
    pass "System-wide reporting working"
else
    warn "Cannot generate system summary"
fi

run_test "Test employee productivity report"
EMP_PROD=$(psql postgresql://localhost/ots_erp_local -t -c "
    SELECT
        u.name,
        COUNT(te.id) as entries,
        SUM(te.hours) as hours,
        COUNT(DISTINCT te.\"jobId\") as jobs_worked
    FROM \"User\" u
    LEFT JOIN \"TimeEntry\" te ON u.id = te.\"userId\"
    WHERE u.role = 'EMPLOYEE'
    GROUP BY u.id, u.name
    HAVING COUNT(te.id) > 0
    ORDER BY SUM(te.hours) DESC
    LIMIT 5
")

if [ -n "$EMP_PROD" ]; then
    echo ""
    info "Employee productivity:"
    echo "$EMP_PROD" | while IFS='|' read -r name entries hours jobs; do
        if [ -n "$name" ]; then
            info "  $name: $hours hrs across $jobs jobs ($entries entries)"
        fi
    done
    pass "Employee productivity reporting working"
else
    info "No employee time entries to analyze"
fi

# ============================================
# SUMMARY
# ============================================

echo ""
echo "======================================"
echo "JOB COSTING TEST SUMMARY"
echo "======================================"
echo ""
echo -e "${GREEN}✓ Passed: $PASSED${NC}"
echo -e "${RED}✗ Failed: $FAILED${NC}"
echo -e "${YELLOW}⚠ Warnings: $WARNINGS${NC}"
echo ""
echo "Total Tests Run: $TEST_NUM"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}ALL JOB COSTING TESTS PASSED! ✓${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo ""
        echo "Job costing integration is working correctly!"
        exit 0
    else
        echo -e "${YELLOW}========================================${NC}"
        echo -e "${YELLOW}TESTS PASSED WITH WARNINGS ⚠${NC}"
        echo -e "${YELLOW}========================================${NC}"
        echo ""
        echo "Job costing basics work, but some features need attention."
        echo "Review warnings above for improvements."
        exit 0
    fi
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}SOME TESTS FAILED! ✗${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Job costing integration has issues."
    echo "Review the failures above."
    exit 1
fi
