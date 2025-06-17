# Multi-Location Inventory Deployment Checklist

## Database Migration Required

### Step 1: Run the Database Migration
You need to apply the database schema changes to your Supabase database. 

**Option A: Using Prisma (Recommended)**
```bash
npx prisma db push
```

**Option B: Manual SQL Execution in Supabase**
If Prisma push doesn't work, run this SQL directly in your Supabase SQL editor:

```sql
-- Create LocationType enum
CREATE TYPE "LocationType" AS ENUM ('WAREHOUSE', 'SHOP', 'TRUCK', 'OFFICE', 'SUPPLIER');

-- Create StorageLocation table
CREATE TABLE "StorageLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'WAREHOUSE',
    "address" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageLocation_pkey" PRIMARY KEY ("id")
);

-- Create MaterialStockLocation table
CREATE TABLE "MaterialStockLocation" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialStockLocation_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "StorageLocation_name_key" ON "StorageLocation"("name");
CREATE UNIQUE INDEX "StorageLocation_code_key" ON "StorageLocation"("code");
CREATE UNIQUE INDEX "MaterialStockLocation_materialId_locationId_key" ON "MaterialStockLocation"("materialId", "locationId");

-- Add foreign key constraints
ALTER TABLE "MaterialStockLocation" ADD CONSTRAINT "MaterialStockLocation_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialStockLocation" ADD CONSTRAINT "MaterialStockLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StorageLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default storage locations
INSERT INTO "StorageLocation" ("id", "name", "code", "type", "description", "createdAt", "updatedAt") VALUES
('default_warehouse', 'Main Warehouse', 'WH01', 'WAREHOUSE', 'Primary storage facility', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('default_shop', 'Shop Floor', 'SHOP1', 'SHOP', 'On-site shop storage', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('default_truck', 'Service Truck', 'TRUCK1', 'TRUCK', 'Mobile inventory', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

### Step 2: Deploy to Production
1. Push all code changes to your main branch
2. Deploy through Coolify
3. Test the new multi-location inventory features

## New Features Added

### 🏢 Storage Location Management
- **Manage Locations** button in Materials page
- Create, edit, delete storage locations
- Location types: Warehouse, Shop, Truck, Office, Supplier
- Location codes for easy identification

### 📦 Multi-Location Stock Tracking
- Stock breakdown by location in materials table
- Total stock + individual location quantities
- Example display: "Total: 25 units → WH01: 20 units, SHOP1: 5 units"

### 🔄 Database Changes
- New `StorageLocation` table
- New `MaterialStockLocation` table for stock tracking
- Updated Materials API to include location data

## API Endpoints Added
- `GET /api/storage-locations` - List all locations
- `POST /api/storage-locations` - Create new location
- `PATCH /api/storage-locations/[id]` - Update location
- `DELETE /api/storage-locations/[id]` - Delete location

## Testing Checklist
After deployment, verify:
- [ ] Materials page loads without errors
- [ ] "Manage Locations" button works
- [ ] Can create new storage locations
- [ ] Stock displays show location breakdown
- [ ] Emoji status indicators still work
- [ ] Low stock filtering still works

## Troubleshooting
If you encounter issues:
1. Check Supabase logs for any migration errors
2. Verify all new tables were created correctly
3. Check browser console for any API errors
4. Ensure environment variables are correct in production

---
*All features are backward compatible and won't break existing functionality*