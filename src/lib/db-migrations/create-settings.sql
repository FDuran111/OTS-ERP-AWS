-- Settings System Database Migration
-- Creates comprehensive settings tables for company info, user preferences, and security settings

-- Company Settings Table
CREATE TABLE IF NOT EXISTS "CompanySettings" (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL DEFAULT 'Ortmeier Technicians',
  business_address TEXT,
  phone_number VARCHAR(50),
  email VARCHAR(255),
  license_number VARCHAR(100),
  tax_id VARCHAR(50),
  default_hourly_rate DECIMAL(10,2) DEFAULT 125.00,
  invoice_terms VARCHAR(100) DEFAULT 'Net 30',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User Notification Settings Table
CREATE TABLE IF NOT EXISTS "UserNotificationSettings" (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  new_job_assignments BOOLEAN DEFAULT true,
  schedule_changes BOOLEAN DEFAULT true,
  invoice_reminders BOOLEAN DEFAULT true,
  material_low_stock_alerts BOOLEAN DEFAULT false,
  customer_messages BOOLEAN DEFAULT true,
  daily_summary BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- User Security Settings Table
CREATE TABLE IF NOT EXISTS "UserSecuritySettings" (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  two_factor_auth BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  password_changed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- User Appearance Settings Table
CREATE TABLE IF NOT EXISTS "UserAppearanceSettings" (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  dark_mode BOOLEAN DEFAULT true,
  show_job_numbers BOOLEAN DEFAULT true,
  compact_view BOOLEAN DEFAULT true,
  show_tooltips BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Insert default company settings if none exist
INSERT INTO "CompanySettings" (
  company_name, 
  business_address, 
  phone_number, 
  email, 
  license_number, 
  tax_id, 
  default_hourly_rate, 
  invoice_terms
) 
SELECT 
  'Ortmeier Technicians',
  '123 Electric Ave, Anytown, ST 12345',
  '(555) 123-4567',
  'info@ortmeiertech.com',
  'EC-123456',
  '12-3456789',
  125.00,
  'Net 30'
WHERE NOT EXISTS (SELECT 1 FROM "CompanySettings");

-- Create function to auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON "CompanySettings";
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON "CompanySettings"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON "UserNotificationSettings";
CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON "UserNotificationSettings"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_security_settings_updated_at ON "UserSecuritySettings";
CREATE TRIGGER update_user_security_settings_updated_at
  BEFORE UPDATE ON "UserSecuritySettings"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_appearance_settings_updated_at ON "UserAppearanceSettings";
CREATE TRIGGER update_user_appearance_settings_updated_at
  BEFORE UPDATE ON "UserAppearanceSettings"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id ON "UserNotificationSettings"(user_id);
CREATE INDEX IF NOT EXISTS idx_user_security_settings_user_id ON "UserSecuritySettings"(user_id);
CREATE INDEX IF NOT EXISTS idx_user_appearance_settings_user_id ON "UserAppearanceSettings"(user_id);

-- Comments for documentation
COMMENT ON TABLE "CompanySettings" IS 'Company-wide settings and configuration';
COMMENT ON TABLE "UserNotificationSettings" IS 'Per-user notification preferences';
COMMENT ON TABLE "UserSecuritySettings" IS 'Per-user security settings and 2FA configuration';
COMMENT ON TABLE "UserAppearanceSettings" IS 'Per-user UI/appearance preferences';