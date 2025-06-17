-- Add manufacturer field to existing Material table
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "manufacturer" TEXT;