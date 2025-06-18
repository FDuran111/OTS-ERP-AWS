-- Create a test invoice if Job and Customer tables have data
-- First check if we have any jobs and customers
DO $$ 
DECLARE
    test_job_id text;
    test_customer_id text;
BEGIN
    -- Get the first job ID
    SELECT id INTO test_job_id FROM "Job" LIMIT 1;
    
    -- Get the first customer ID  
    SELECT id INTO test_customer_id FROM "Customer" LIMIT 1;
    
    -- Only create test invoice if we have both job and customer
    IF test_job_id IS NOT NULL AND test_customer_id IS NOT NULL THEN
        -- Insert test invoice
        INSERT INTO "Invoice" (
            id, 
            "invoiceNumber", 
            "jobId", 
            "customerId", 
            status,
            "subtotalAmount", 
            "taxAmount", 
            "totalAmount", 
            "dueDate", 
            notes,
            "createdAt", 
            "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            'INV-2024-001-TEST',
            test_job_id,
            test_customer_id,
            'DRAFT',
            1000.00,
            80.00,
            1080.00,
            CURRENT_DATE + INTERVAL '30 days',
            'Test invoice for system testing',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT ("invoiceNumber") DO NOTHING;
        
        RAISE NOTICE 'Test invoice created successfully';
    ELSE
        RAISE NOTICE 'No jobs or customers found - cannot create test invoice';
    END IF;
END $$;