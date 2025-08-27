-- Default OWNER_ADMIN user
INSERT INTO "User" (id, email, password, name, role, active, createdAt, updatedAt)
VALUES (
  gen_random_uuid(),
  'admin@ortmeier.com',
  '$2b$12$changemehashchangemehashchangemehash', -- replace with real bcrypt hash
  'Admin',
  'OWNER_ADMIN',
  true,
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Default settings
INSERT INTO "Settings" (key, value, category)
VALUES 
  ('company_name', 'Ortmeier Technical Service', 'company'),
  ('default_tax_rate', '0.0875', 'billing'),
  ('time_zone', 'America/Chicago', 'system')
ON CONFLICT DO NOTHING;