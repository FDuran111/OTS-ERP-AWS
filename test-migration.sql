-- Simulated Supabase to RDS migration data
BEGIN;

-- Insert test customers (simulating Supabase export)
INSERT INTO "Customer" (id, name, email, phone, address, city, state, zip, "createdAt", "updatedAt")
VALUES 
  ('sup-cust-001', 'Supabase Customer 1', 'customer1@supabase.com', '555-0001', '123 Cloud St', 'San Francisco', 'CA', '94102', NOW(), NOW()),
  ('sup-cust-002', 'Supabase Customer 2', 'customer2@supabase.com', '555-0002', '456 Database Ave', 'Los Angeles', 'CA', '90001', NOW(), NOW())
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, 
    email = EXCLUDED.email,
    "updatedAt" = NOW();

-- Insert test jobs
INSERT INTO "Job" (id, "customerId", name, description, status, "scheduledDate", "completedDate", price, "createdAt", "updatedAt")
VALUES 
  ('sup-job-001', 'sup-cust-001', 'Migrated Job 1', 'Data migration test job', 'COMPLETED', NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days', 1500.00, NOW(), NOW()),
  ('sup-job-002', 'sup-cust-002', 'Migrated Job 2', 'Another migration test', 'IN_PROGRESS', NOW() - INTERVAL '2 days', NULL, 2500.00, NOW(), NOW())
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    status = EXCLUDED.status,
    "updatedAt" = NOW();

-- Insert test materials
INSERT INTO "Material" (id, name, description, quantity, unit, "unitCost", category, "minimumStock", "createdAt", "updatedAt")
VALUES 
  ('sup-mat-001', 'Migrated Material 1', 'Test material from Supabase', 100, 'units', 25.50, 'SUPPLIES', 10, NOW(), NOW()),
  ('sup-mat-002', 'Migrated Material 2', 'Another test material', 50, 'boxes', 75.00, 'EQUIPMENT', 5, NOW(), NOW())
ON CONFLICT (id) DO UPDATE 
SET quantity = EXCLUDED.quantity,
    "updatedAt" = NOW();

COMMIT;

-- Validation queries
SELECT 'Migration Summary:' as info;
SELECT 'Customers: ' || COUNT(*) as count FROM "Customer" WHERE id LIKE 'sup-%';
SELECT 'Jobs: ' || COUNT(*) as count FROM "Job" WHERE id LIKE 'sup-%';
SELECT 'Materials: ' || COUNT(*) as count FROM "Material" WHERE id LIKE 'sup-%';