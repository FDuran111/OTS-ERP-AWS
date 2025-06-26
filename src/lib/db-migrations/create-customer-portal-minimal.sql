-- Minimal Customer Portal Tables
-- Essential tables needed for authentication to work

-- Customer Portal Users table
CREATE TABLE IF NOT EXISTS "CustomerPortalUser" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" TEXT NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  "firstName" VARCHAR(100),
  "lastName" VARCHAR(100),
  "phoneNumber" VARCHAR(20),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
  "emailVerificationToken" VARCHAR(255),
  "emailVerificationExpires" TIMESTAMP WITH TIME ZONE,
  "passwordResetToken" VARCHAR(255),
  "passwordResetExpires" TIMESTAMP WITH TIME ZONE,
  "lastLoginAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customer Portal Sessions table
CREATE TABLE IF NOT EXISTS "CustomerPortalSession" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "CustomerPortalUser"(id) ON DELETE CASCADE,
  "sessionToken" VARCHAR(500) NOT NULL UNIQUE,
  "ipAddress" INET,
  "userAgent" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastAccessedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customer Portal Preferences table
CREATE TABLE IF NOT EXISTS "CustomerPortalPreferences" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "CustomerPortalUser"(id) ON DELETE CASCADE,
  "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
  "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
  "theme" VARCHAR(20) NOT NULL DEFAULT 'light',
  "language" VARCHAR(10) NOT NULL DEFAULT 'en',
  "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_customer_portal_user_customer_id" ON "CustomerPortalUser"("customerId");
CREATE INDEX IF NOT EXISTS "idx_customer_portal_user_email" ON "CustomerPortalUser"(email);
CREATE INDEX IF NOT EXISTS "idx_customer_portal_session_user_id" ON "CustomerPortalSession"("userId");
CREATE INDEX IF NOT EXISTS "idx_customer_portal_session_token" ON "CustomerPortalSession"("sessionToken");
CREATE INDEX IF NOT EXISTS "idx_customer_portal_session_active" ON "CustomerPortalSession"("isActive");

-- Update triggers for timestamps
CREATE OR REPLACE FUNCTION update_customer_portal_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION update_customer_portal_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_portal_user_updated_at ON "CustomerPortalUser";
CREATE TRIGGER trigger_update_customer_portal_user_updated_at
  BEFORE UPDATE ON "CustomerPortalUser"
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_portal_user_updated_at();

DROP TRIGGER IF EXISTS trigger_update_customer_portal_preferences_updated_at ON "CustomerPortalPreferences";
CREATE TRIGGER trigger_update_customer_portal_preferences_updated_at
  BEFORE UPDATE ON "CustomerPortalPreferences"
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_portal_preferences_updated_at();