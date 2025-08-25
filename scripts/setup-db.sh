#!/bin/bash

# Database setup script with admin user

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🗄️  Setting up local database..."
echo "================================"
echo ""

# Check if PostgreSQL container is running
if ! docker ps | grep -q postgres-ots; then
    echo -e "${YELLOW}Starting PostgreSQL container...${NC}"
    docker run -d \
        --name postgres-ots \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=ots_dev \
        -p 5432:5432 \
        postgres:15
    
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
fi

# Run the complete database initialization
echo -e "${GREEN}Creating complete database schema...${NC}"
docker exec -i postgres-ots psql -U postgres -d ots_dev < scripts/init-complete-db.sql

echo ""
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo ""
echo "You can now login with:"
echo -e "  Email: ${GREEN}admin@admin.com${NC}"
echo -e "  Password: ${GREEN}OTS123${NC}"
echo ""
echo "The app is running at: http://localhost:3002"