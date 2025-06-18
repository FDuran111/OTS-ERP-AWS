-- Create a test job if Customer table has data
DO $$ 
DECLARE
    test_customer_id text;
BEGIN
    -- Get the first customer ID
    SELECT id INTO test_customer_id FROM "Customer" LIMIT 1;
    
    -- Only create test job if we have a customer
    IF test_customer_id IS NOT NULL THEN
        -- Insert test job
        INSERT INTO "Job" (
            id, 
            "jobNumber", 
            "customerId", 
            description,
            status,
            "createdAt", 
            "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            'JOB-2024-001-TEST',
            test_customer_id,
            'Test job for invoice testing',
            'COMPLETED',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT ("jobNumber") DO NOTHING;
        
        RAISE NOTICE 'Test job created successfully';
    ELSE
        RAISE NOTICE 'No customers found - cannot create test job';
    END IF;
END $$;