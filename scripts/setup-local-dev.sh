#!/bin/bash

# Local Development Setup Script
# Sets up PostgreSQL and LocalStack for AWS-like local development

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 OTS-ARP-AWS Local Development Setup"
echo "======================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo -e "${GREEN}✅ Docker found${NC}"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}📝 Creating .env.local from template...${NC}"
    cp .env.local.example .env.local
    echo -e "${GREEN}✅ Created .env.local${NC}"
else
    echo -e "${GREEN}✅ .env.local already exists${NC}"
fi

# Start PostgreSQL
echo ""
echo "🐘 Starting PostgreSQL..."
if docker ps | grep -q postgres-ots; then
    echo -e "${YELLOW}PostgreSQL is already running${NC}"
else
    docker run -d \
        --name postgres-ots \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=ots_dev \
        -p 5432:5432 \
        postgres:15
    
    echo "Waiting for PostgreSQL to start..."
    sleep 5
    echo -e "${GREEN}✅ PostgreSQL started${NC}"
fi

# Start LocalStack for S3
echo ""
echo "☁️  Starting LocalStack (S3)..."
if docker ps | grep -q localstack-ots; then
    echo -e "${YELLOW}LocalStack is already running${NC}"
else
    docker run -d \
        --name localstack-ots \
        -e SERVICES=s3 \
        -e DEFAULT_REGION=us-east-2 \
        -e DATA_DIR=/tmp/localstack/data \
        -p 4566:4566 \
        localstack/localstack:latest
    
    echo "Waiting for LocalStack to start..."
    sleep 10
    
    # Create S3 bucket
    echo "Creating S3 bucket..."
    docker exec localstack-ots \
        awslocal s3 mb s3://ots-arp-aws-dev-files 2>/dev/null || true
    
    echo -e "${GREEN}✅ LocalStack started with S3 bucket${NC}"
fi

# Install dependencies
echo ""
echo "📦 Installing npm dependencies..."
npm install

# Run database migrations
echo ""
echo "🔄 Running database migrations..."
npm run db:migrate:dev 2>/dev/null || echo -e "${YELLOW}No migrations to run${NC}"

# Summary
echo ""
echo "======================================="
echo -e "${GREEN}✅ Local development environment ready!${NC}"
echo ""
echo "Services running:"
echo "  • PostgreSQL: localhost:5432"
echo "  • LocalStack S3: localhost:4566"
echo ""
echo "Next steps:"
echo "  1. Run the development server:"
echo -e "     ${GREEN}npm run dev${NC}"
echo ""
echo "  2. Open your browser:"
echo -e "     ${GREEN}http://localhost:3000${NC}"
echo ""
echo "To stop services later:"
echo "  docker stop postgres-ots localstack-ots"
echo "  docker rm postgres-ots localstack-ots"
echo ""