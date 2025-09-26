-- Add fields to track employee-created customers
ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "createdBy" UUID REFERENCES "User"(id),
ADD COLUMN IF NOT EXISTS "createdByEmployee" BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_customer_created_by ON "Customer"("createdBy");
CREATE INDEX IF NOT EXISTS idx_customer_employee_created ON "Customer"("createdByEmployee");

-- Update existing customers to not be marked as employee created
UPDATE "Customer"
SET "createdByEmployee" = FALSE
WHERE "createdByEmployee" IS NULL;