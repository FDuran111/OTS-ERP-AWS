-- Customer Portal Authentication and Features Migration
-- This creates the infrastructure for customer self-service portal

-- Customer Portal Users (separate from internal users)
CREATE TABLE IF NOT EXISTS "CustomerPortalUser" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" UUID NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL, -- bcrypt hashed
  "firstName" VARCHAR(100),
  "lastName" VARCHAR(100),
  "phoneNumber" VARCHAR(20),
  "isActive" BOOLEAN DEFAULT true,
  "isEmailVerified" BOOLEAN DEFAULT false,
  "emailVerificationToken" VARCHAR(255),
  "passwordResetToken" VARCHAR(255),
  "passwordResetExpires" TIMESTAMP,
  "lastLoginAt" TIMESTAMP,
  "loginAttempts" INTEGER DEFAULT 0,
  "lockedUntil" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Customer Portal Sessions for security
CREATE TABLE IF NOT EXISTS "CustomerPortalSession" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "CustomerPortalUser"(id) ON DELETE CASCADE,
  "sessionToken" VARCHAR(500) NOT NULL UNIQUE,
  "ipAddress" INET,
  "userAgent" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Job Status Updates for Timeline
CREATE TABLE IF NOT EXISTS "JobStatusUpdate" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" UUID NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  "updatedBy" UUID NOT NULL REFERENCES "User"(id),
  "previousStatus" VARCHAR(50),
  "newStatus" VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  "isVisibleToCustomer" BOOLEAN DEFAULT true,
  "scheduledDate" TIMESTAMP,
  "completedDate" TIMESTAMP,
  photos JSONB DEFAULT '[]', -- Array of photo URLs
  documents JSONB DEFAULT '[]', -- Array of document URLs
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Customer Messages/Communication
CREATE TABLE IF NOT EXISTS "CustomerMessage" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" UUID REFERENCES "Job"(id) ON DELETE SET NULL,
  "customerId" UUID NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
  "fromCustomer" BOOLEAN NOT NULL, -- true if from customer, false if from staff
  "fromUserId" UUID REFERENCES "User"(id), -- staff member who sent (if fromCustomer=false)
  "fromCustomerUserId" UUID REFERENCES "CustomerPortalUser"(id), -- customer who sent (if fromCustomer=true)
  subject VARCHAR(200),
  message TEXT NOT NULL,
  "messageType" VARCHAR(50) DEFAULT 'general', -- general, service_request, complaint, compliment
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  "isRead" BOOLEAN DEFAULT false,
  "readAt" TIMESTAMP,
  attachments JSONB DEFAULT '[]', -- Array of attachment URLs
  "parentMessageId" UUID REFERENCES "CustomerMessage"(id), -- For threading
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Customer Notifications
CREATE TABLE IF NOT EXISTS "CustomerNotification" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" UUID NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
  "jobId" UUID REFERENCES "Job"(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL, -- job_update, payment_due, appointment_reminder, message_received
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  "actionUrl" VARCHAR(500), -- URL to relevant page in portal
  "isRead" BOOLEAN DEFAULT false,
  "readAt" TIMESTAMP,
  "sentViaEmail" BOOLEAN DEFAULT false,
  "sentViaSms" BOOLEAN DEFAULT false,
  "emailSentAt" TIMESTAMP,
  "smsSentAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Customer Portal Preferences
CREATE TABLE IF NOT EXISTS "CustomerPortalPreferences" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" UUID NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
  "emailNotifications" BOOLEAN DEFAULT true,
  "smsNotifications" BOOLEAN DEFAULT false,
  "jobUpdateNotifications" BOOLEAN DEFAULT true,
  "paymentNotifications" BOOLEAN DEFAULT true,
  "appointmentReminders" BOOLEAN DEFAULT true,
  "marketingEmails" BOOLEAN DEFAULT false,
  "preferredContactMethod" VARCHAR(20) DEFAULT 'email', -- email, sms, phone
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("customerId")
);

-- Customer Document Access (for shared documents)
CREATE TABLE IF NOT EXISTS "CustomerDocument" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" UUID NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
  "jobId" UUID REFERENCES "Job"(id) ON DELETE SET NULL,
  "uploadedBy" UUID NOT NULL REFERENCES "User"(id),
  "documentType" VARCHAR(50) NOT NULL, -- contract, invoice, receipt, photo, drawing, warranty
  title VARCHAR(200) NOT NULL,
  description TEXT,
  "fileName" VARCHAR(255) NOT NULL,
  "fileSize" INTEGER,
  "mimeType" VARCHAR(100),
  "fileUrl" VARCHAR(500) NOT NULL,
  "thumbnailUrl" VARCHAR(500),
  "isConfidential" BOOLEAN DEFAULT false,
  "expiresAt" TIMESTAMP, -- For temporary access
  "downloadCount" INTEGER DEFAULT 0,
  "lastDownloadedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Customer Payment Portal Integration
CREATE TABLE IF NOT EXISTS "CustomerPaymentMethod" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" UUID NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
  "paymentType" VARCHAR(20) NOT NULL, -- card, bank_account, digital_wallet
  "lastFourDigits" VARCHAR(4),
  "cardBrand" VARCHAR(20), -- visa, mastercard, amex, etc.
  "bankName" VARCHAR(100),
  "isDefault" BOOLEAN DEFAULT false,
  "isActive" BOOLEAN DEFAULT true,
  "externalPaymentId" VARCHAR(100), -- Stripe/Square payment method ID
  "billingName" VARCHAR(200),
  "billingAddress" TEXT,
  "expiryMonth" INTEGER,
  "expiryYear" INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_customer_portal_user_customer" ON "CustomerPortalUser"("customerId");
CREATE INDEX IF NOT EXISTS "idx_customer_portal_user_email" ON "CustomerPortalUser"(email);
CREATE INDEX IF NOT EXISTS "idx_customer_portal_session_user" ON "CustomerPortalSession"("userId");
CREATE INDEX IF NOT EXISTS "idx_customer_portal_session_token" ON "CustomerPortalSession"("sessionToken");
CREATE INDEX IF NOT EXISTS "idx_job_status_update_job" ON "JobStatusUpdate"("jobId");
CREATE INDEX IF NOT EXISTS "idx_job_status_update_created" ON "JobStatusUpdate"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_customer_message_customer" ON "CustomerMessage"("customerId");
CREATE INDEX IF NOT EXISTS "idx_customer_message_job" ON "CustomerMessage"("jobId");
CREATE INDEX IF NOT EXISTS "idx_customer_message_created" ON "CustomerMessage"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_customer_notification_customer" ON "CustomerNotification"("customerId");
CREATE INDEX IF NOT EXISTS "idx_customer_notification_unread" ON "CustomerNotification"("customerId", "isRead");
CREATE INDEX IF NOT EXISTS "idx_customer_document_customer" ON "CustomerDocument"("customerId");
CREATE INDEX IF NOT EXISTS "idx_customer_document_job" ON "CustomerDocument"("jobId");
CREATE INDEX IF NOT EXISTS "idx_customer_payment_method_customer" ON "CustomerPaymentMethod"("customerId");

-- Add trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
DROP TRIGGER IF EXISTS update_customer_portal_user_updated_at ON "CustomerPortalUser";
CREATE TRIGGER update_customer_portal_user_updated_at 
  BEFORE UPDATE ON "CustomerPortalUser" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_portal_preferences_updated_at ON "CustomerPortalPreferences";
CREATE TRIGGER update_customer_portal_preferences_updated_at 
  BEFORE UPDATE ON "CustomerPortalPreferences" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_payment_method_updated_at ON "CustomerPaymentMethod";
CREATE TRIGGER update_customer_portal_preferences_updated_at 
  BEFORE UPDATE ON "CustomerPaymentMethod" 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();