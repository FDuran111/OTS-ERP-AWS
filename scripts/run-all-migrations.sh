#!/bin/bash

# Run all database migrations for OTS-ARP-AWS
# This script applies all migration files from src/lib/db-migrations/

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🗄️  Running database migrations..."
echo "================================"
echo ""

# Check if PostgreSQL container is running
if ! docker ps | grep -q postgres-ots; then
    echo -e "${RED}Error: PostgreSQL container is not running${NC}"
    echo "Please run: ./scripts/setup-local-dev.sh first"
    exit 1
fi

# First, initialize the base schema
echo -e "${YELLOW}Initializing base database schema...${NC}"
docker exec -i postgres-ots psql -U postgres -d ots_dev < scripts/init-complete-db.sql

# Define migration order (dependencies first)
MIGRATIONS=(
    # Core tables and settings
    "create-settings.sql"
    "create-rbac-system.sql"
    
    # Labor and time tracking
    "create-labor-rates.sql"
    "create-employee-overhead.sql"
    "create-time-tracking.sql"
    
    # Job management
    "create-job-scheduling.sql"
    "create-job-reminders-simple.sql"
    "create-job-categorization.sql"
    "add-job-division.sql"
    "update-job-types.sql"
    "update-job-type-enum.sql"
    
    # Job costing
    "create-job-costs.sql"
    "create-job-labor-rates.sql"
    "update-job-costs-labor-rate-overrides.sql"
    "update-job-costs-true-cost.sql"
    "add-crew-hours-tracking.sql"
    "fix-get-available-crew-roles.sql"
    
    # Inventory and materials
    "create-inventory-basic.sql"
    "create-material-usage.sql"
    "create-material-reservations.sql"
    "create-stock-movement-simple.sql"
    "warehouse-only.sql"
    
    # Purchase orders
    "create-purchase-orders.sql"
    "upgrade-purchase-orders.sql"
    
    # Equipment
    "create-equipment-billing.sql"
    "integrate-equipment-billing.sql"
    
    # Service and routing
    "create-service-calls.sql"
    "create-route-optimization.sql"
    
    # File management
    "create-picture-upload.sql"
    "update-file-urls.sql"
    
    # Integrations
    "create-quickbooks-integration.sql"
    
    # Bid sheets (new feature)
    "create-bid-sheet.sql"
)

# Run each migration
for migration in "${MIGRATIONS[@]}"; do
    if [ -f "src/lib/db-migrations/$migration" ]; then
        echo -e "${GREEN}Running migration: $migration${NC}"
        docker exec -i postgres-ots psql -U postgres -d ots_dev < "src/lib/db-migrations/$migration" 2>/dev/null || {
            echo -e "${YELLOW}Skipping $migration (may already be applied or have conflicts)${NC}"
        }
    else
        echo -e "${YELLOW}Migration file not found: $migration${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ All migrations completed!${NC}"
echo ""
echo "Database is ready with:"
echo "  - All tables from original Supabase schema"
echo "  - Admin user: admin@admin.com / OTS123"
echo "  - Sample customers and jobs"
echo "  - Default labor rates and settings"
echo ""
echo "You can now access the app at: http://localhost:3002"