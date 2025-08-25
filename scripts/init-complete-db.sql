-- Complete Database Schema for OTS-ARP-AWS
-- This file contains the full database schema migrated from Supabase
-- Run this to initialize a fresh PostgreSQL database with all tables and data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CORE TABLES (Base entities)
-- ============================================

-- User table with roles
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

-- Customer table
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
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job table with comprehensive fields
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
    scheduled_date DATE,
    scheduled_time TIME,
    completed_date DATE,
    job_type VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'NORMAL',
    assigned_to UUID REFERENCES "User"(id),
    notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Material/Inventory table
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

-- Lead table for CRM
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

-- FileAttachment table for document management
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

-- ============================================
-- INVOICE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS "Invoice" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES "Customer"(id),
    job_id UUID REFERENCES "Job"(id),
    status VARCHAR(50) DEFAULT 'DRAFT',
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "InvoiceLineItem" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES "Invoice"(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    item_type VARCHAR(50) DEFAULT 'SERVICE',
    material_id UUID REFERENCES "Material"(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TIME TRACKING & LABOR
-- ============================================

-- Labor rates table
CREATE TABLE IF NOT EXISTS "LaborRate" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    "hourlyRate" DECIMAL(10,2) NOT NULL CHECK ("hourlyRate" > 0),
    "skillLevel" VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'ELECTRICAL',
    "effectiveDate" DATE NOT NULL DEFAULT CURRENT_DATE,
    "expiryDate" DATE NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Time entries
CREATE TABLE IF NOT EXISTS "TimeEntry" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES "User"(id),
    job_id UUID REFERENCES "Job"(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    hours_worked DECIMAL(10,2),
    description TEXT,
    labor_rate_id UUID REFERENCES "LaborRate"(id),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    approved_by UUID REFERENCES "User"(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EQUIPMENT & ASSETS
-- ============================================

CREATE TABLE IF NOT EXISTS "Equipment" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(100) UNIQUE,
    model VARCHAR(255),
    manufacturer VARCHAR(255),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'AVAILABLE',
    purchase_date DATE,
    purchase_price DECIMAL(10,2),
    current_value DECIMAL(10,2),
    location VARCHAR(255),
    assigned_to UUID REFERENCES "User"(id),
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- JOB ATTACHMENTS (Junction Tables)
-- ============================================

CREATE TABLE IF NOT EXISTS "JobAttachment" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES "Job"(id) ON DELETE CASCADE,
    file_attachment_id UUID REFERENCES "FileAttachment"(id) ON DELETE CASCADE,
    attached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attached_by UUID REFERENCES "User"(id),
    UNIQUE(job_id, file_attachment_id)
);

CREATE TABLE IF NOT EXISTS "JobMaterial" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES "Job"(id) ON DELETE CASCADE,
    material_id UUID REFERENCES "Material"(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    used_date DATE DEFAULT CURRENT_DATE,
    added_by UUID REFERENCES "User"(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SETTINGS & CONFIGURATION
-- ============================================

CREATE TABLE IF NOT EXISTS "Settings" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_job_customer_id ON "Job"(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_status ON "Job"(status);
CREATE INDEX IF NOT EXISTS idx_job_scheduled_date ON "Job"(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_customer_email ON "Customer"(email);
CREATE INDEX IF NOT EXISTS idx_customer_company ON "Customer"(company_name);
CREATE INDEX IF NOT EXISTS idx_material_code ON "Material"(code);
CREATE INDEX IF NOT EXISTS idx_material_category ON "Material"(category);
CREATE INDEX IF NOT EXISTS idx_time_entry_user ON "TimeEntry"(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entry_job ON "TimeEntry"(job_id);
CREATE INDEX IF NOT EXISTS idx_invoice_customer ON "Invoice"(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON "Invoice"(status);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert admin user (password: OTS123)
-- Password hash for 'OTS123' using bcrypt
INSERT INTO "User" (email, password, name, role, active) VALUES 
('admin@admin.com', '$2a$10$kQHSvDhPcw5Lc7kqA8vFR.rYFhT5ZqR8YZMxYBF5HQ1qBrNwEH7Bi', 'Admin User', 'OWNER_ADMIN', true)
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    name = EXCLUDED.name,
    role = EXCLUDED.role;

-- Insert default labor rates
INSERT INTO "LaborRate" (name, description, "hourlyRate", "skillLevel", category) VALUES
('Apprentice Electrician', 'Entry-level apprentice electrician', 45.00, 'APPRENTICE', 'ELECTRICAL'),
('Helper/Laborer', 'General helper and laborer', 35.00, 'HELPER', 'ELECTRICAL'),
('Technician Level 1', 'Junior technician with basic skills', 55.00, 'TECH_L1', 'ELECTRICAL'),
('Technician Level 2', 'Senior technician with advanced skills', 65.00, 'TECH_L2', 'ELECTRICAL'),
('Journeyman Electrician', 'Certified journeyman electrician', 75.00, 'JOURNEYMAN', 'ELECTRICAL'),
('Foreman/Supervisor', 'Project foreman and supervisor', 85.00, 'FOREMAN', 'ELECTRICAL'),
('Service Call Rate', 'Standard service call rate', 95.00, 'JOURNEYMAN', 'SERVICE')
ON CONFLICT DO NOTHING;

-- Insert some test customers
INSERT INTO "Customer" (first_name, last_name, company_name, phone, email, city, state) VALUES
('John', 'Doe', 'Doe Construction', '555-0101', 'john@doeconstruction.com', 'Los Angeles', 'CA'),
('Jane', 'Smith', 'Smith Electric', '555-0102', 'jane@smithelectric.com', 'San Diego', 'CA'),
('Bob', 'Johnson', 'Johnson Plumbing', '555-0103', 'bob@johnsonplumbing.com', 'San Francisco', 'CA')
ON CONFLICT DO NOTHING;

-- Insert sample jobs
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

-- Insert default settings
INSERT INTO "Settings" (key, value, category, description) VALUES
('company.name', '"Ortmeier Technical Services"', 'company', 'Company name'),
('company.address', '"123 Main St, San Diego, CA 92101"', 'company', 'Company address'),
('company.phone', '"(555) 123-4567"', 'company', 'Company phone'),
('invoice.tax_rate', '0.0775', 'invoice', 'Default tax rate'),
('invoice.terms', '"Net 30"', 'invoice', 'Default invoice terms')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database initialization complete!';
    RAISE NOTICE 'Admin login: admin@admin.com / OTS123';
END $$;