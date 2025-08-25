-- Initialize local database with tables and admin user

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'TECHNICIAN',
    active BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Customer table
CREATE TABLE IF NOT EXISTS "Customer" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Job table
CREATE TABLE IF NOT EXISTS "Job" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    customer_id UUID REFERENCES "Customer"(id),
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2),
    estimated_amount DECIMAL(10,2),
    billed_amount DECIMAL(10,2),
    billed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Material table
CREATE TABLE IF NOT EXISTS "Material" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    manufacturer VARCHAR(255),
    category VARCHAR(100),
    unit VARCHAR(50),
    in_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    cost DECIMAL(10,2),
    price DECIMAL(10,2),
    location VARCHAR(255),
    active BOOLEAN DEFAULT true,
    vendor_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Lead table
CREATE TABLE IF NOT EXISTS "Lead" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'NEW',
    source VARCHAR(100),
    estimated_value DECIMAL(10,2),
    priority VARCHAR(50),
    description TEXT,
    last_contact_date DATE,
    next_follow_up_date DATE,
    assigned_to UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create FileAttachment table
CREATE TABLE IF NOT EXISTS "FileAttachment" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "fileName" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255),
    "mimeType" VARCHAR(100),
    "fileSize" INTEGER,
    "fileExtension" VARCHAR(20),
    "filePath" TEXT,
    "fileUrl" TEXT,
    "isImage" BOOLEAN DEFAULT false,
    description TEXT,
    tags TEXT[],
    metadata JSONB,
    "uploadedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin user (password: OTS123)
-- Password hash for 'OTS123' using bcrypt
INSERT INTO "User" (email, password, name, role, active) VALUES 
('admin@admin.com', '$2a$10$kQHSvDhPcw5Lc7kqA8vFR.rYFhT5ZqR8YZMxYBF5HQ1qBrNwEH7Bi', 'Admin User', 'OWNER_ADMIN', true)
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    name = EXCLUDED.name,
    role = EXCLUDED.role;

-- Insert some test data
INSERT INTO "Customer" (first_name, last_name, company_name, phone, email, city, state) VALUES
('John', 'Doe', 'Doe Construction', '555-0101', 'john@doeconstruction.com', 'Los Angeles', 'CA'),
('Jane', 'Smith', 'Smith Electric', '555-0102', 'jane@smithelectric.com', 'San Diego', 'CA'),
('Bob', 'Johnson', 'Johnson Plumbing', '555-0103', 'bob@johnsonplumbing.com', 'San Francisco', 'CA')
ON CONFLICT DO NOTHING;

-- Insert some test jobs
INSERT INTO "Job" (job_number, description, status, customer_id, estimated_hours) 
SELECT 
    'JOB-' || LPAD(generate_series::text, 4, '0'),
    'Test Job ' || generate_series,
    CASE 
        WHEN generate_series % 3 = 0 THEN 'COMPLETED'
        WHEN generate_series % 3 = 1 THEN 'IN_PROGRESS'
        ELSE 'PENDING'
    END,
    (SELECT id FROM "Customer" ORDER BY RANDOM() LIMIT 1),
    (10 + random() * 40)::numeric(10,2)
FROM generate_series(1, 5)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;