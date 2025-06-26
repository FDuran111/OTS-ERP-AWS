-- Create picture upload and attachment system
-- This supports job photos, customer profile pictures, and general document attachments

-- File storage table for all uploaded files
CREATE TABLE IF NOT EXISTS "FileAttachment" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fileName" varchar(255) NOT NULL,
  "originalName" varchar(255) NOT NULL,
  "mimeType" varchar(100) NOT NULL,
  "fileSize" bigint NOT NULL,
  "fileExtension" varchar(10) NOT NULL,
  "filePath" text NOT NULL,
  "fileUrl" text,
  "uploadedBy" uuid,
  "uploadedAt" timestamp DEFAULT NOW(),
  "isImage" boolean DEFAULT false,
  "imageWidth" integer,
  "imageHeight" integer,
  "thumbnailPath" text,
  "thumbnailUrl" text,
  "description" text,
  "tags" text[],
  "metadata" jsonb,
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Job attachments linking table
CREATE TABLE IF NOT EXISTS "JobAttachment" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId" text NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
  "fileId" uuid NOT NULL REFERENCES "FileAttachment"(id) ON DELETE CASCADE,
  "attachmentType" varchar(50) NOT NULL DEFAULT 'GENERAL',
  "category" varchar(50),
  "phase" varchar(50),
  "description" text,
  "isPrimary" boolean DEFAULT false,
  "sortOrder" integer DEFAULT 0,
  "attachedBy" uuid,
  "attachedAt" timestamp DEFAULT NOW(),
  UNIQUE("jobId", "fileId")
);

-- Customer attachments linking table
CREATE TABLE IF NOT EXISTS "CustomerAttachment" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerId" text NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
  "fileId" uuid NOT NULL REFERENCES "FileAttachment"(id) ON DELETE CASCADE,
  "attachmentType" varchar(50) NOT NULL DEFAULT 'GENERAL',
  "description" text,
  "isPrimary" boolean DEFAULT false,
  "attachedBy" uuid,
  "attachedAt" timestamp DEFAULT NOW(),
  UNIQUE("customerId", "fileId")
);

-- Material attachments linking table (for product photos, spec sheets, etc.)
CREATE TABLE IF NOT EXISTS "MaterialAttachment" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "materialId" text NOT NULL REFERENCES "Material"(id) ON DELETE CASCADE,
  "fileId" uuid NOT NULL REFERENCES "FileAttachment"(id) ON DELETE CASCADE,
  "attachmentType" varchar(50) NOT NULL DEFAULT 'PRODUCT_PHOTO',
  "description" text,
  "isPrimary" boolean DEFAULT false,
  "attachedBy" uuid,
  "attachedAt" timestamp DEFAULT NOW(),
  UNIQUE("materialId", "fileId")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_file_attachment_uploaded_by" ON "FileAttachment"("uploadedBy");
CREATE INDEX IF NOT EXISTS "idx_file_attachment_mime_type" ON "FileAttachment"("mimeType");
CREATE INDEX IF NOT EXISTS "idx_file_attachment_is_image" ON "FileAttachment"("isImage");
CREATE INDEX IF NOT EXISTS "idx_file_attachment_uploaded_at" ON "FileAttachment"("uploadedAt");
CREATE INDEX IF NOT EXISTS "idx_file_attachment_active" ON "FileAttachment"("active");

CREATE INDEX IF NOT EXISTS "idx_job_attachment_job_id" ON "JobAttachment"("jobId");
CREATE INDEX IF NOT EXISTS "idx_job_attachment_file_id" ON "JobAttachment"("fileId");
CREATE INDEX IF NOT EXISTS "idx_job_attachment_type" ON "JobAttachment"("attachmentType");
CREATE INDEX IF NOT EXISTS "idx_job_attachment_category" ON "JobAttachment"("category");
CREATE INDEX IF NOT EXISTS "idx_job_attachment_phase" ON "JobAttachment"("phase");

CREATE INDEX IF NOT EXISTS "idx_customer_attachment_customer_id" ON "CustomerAttachment"("customerId");
CREATE INDEX IF NOT EXISTS "idx_customer_attachment_file_id" ON "CustomerAttachment"("fileId");

CREATE INDEX IF NOT EXISTS "idx_material_attachment_material_id" ON "MaterialAttachment"("materialId");
CREATE INDEX IF NOT EXISTS "idx_material_attachment_file_id" ON "MaterialAttachment"("fileId");

-- Create view for job photos with full details
CREATE OR REPLACE VIEW "JobPhotoView" AS
SELECT 
  j.id as "jobId",
  j."jobNumber",
  j.description as "jobDescription",
  j.status as "jobStatus",
  
  ja.id as "attachmentId",
  ja."attachmentType",
  ja.category,
  ja.phase,
  ja.description as "attachmentDescription",
  ja."isPrimary",
  ja."sortOrder",
  ja."attachedAt",
  
  fa.id as "fileId",
  fa."fileName",
  fa."originalName",
  fa."mimeType",
  fa."fileSize",
  fa."fileExtension",
  fa."filePath",
  fa."fileUrl",
  fa."isImage",
  fa."imageWidth",
  fa."imageHeight",
  fa."thumbnailPath",
  fa."thumbnailUrl",
  fa.description as "fileDescription",
  fa.tags,
  fa.metadata,
  fa."uploadedAt",
  
  COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as "customerName"
  
FROM "Job" j
JOIN "JobAttachment" ja ON j.id = ja."jobId"
JOIN "FileAttachment" fa ON ja."fileId" = fa.id
LEFT JOIN "Customer" c ON j."customerId" = c.id
WHERE fa."isImage" = true AND fa.active = true
ORDER BY j."jobNumber", ja."sortOrder", ja."attachedAt";

-- Create view for customer profile photos
CREATE OR REPLACE VIEW "CustomerPhotoView" AS
SELECT 
  c.id as "customerId",
  COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as "customerName",
  c."companyName",
  c.email,
  c.phone,
  
  ca.id as "attachmentId",
  ca."attachmentType",
  ca.description as "attachmentDescription",
  ca."isPrimary",
  ca."attachedAt",
  
  fa.id as "fileId",
  fa."fileName",
  fa."originalName",
  fa."filePath",
  fa."fileUrl",
  fa."thumbnailPath",
  fa."thumbnailUrl",
  fa."imageWidth",
  fa."imageHeight",
  fa."uploadedAt"
  
FROM "Customer" c
JOIN "CustomerAttachment" ca ON c.id = ca."customerId"
JOIN "FileAttachment" fa ON ca."fileId" = fa.id
WHERE fa."isImage" = true AND fa.active = true
ORDER BY c."firstName", c."lastName", ca."isPrimary" DESC;

-- Create view for material product photos
CREATE OR REPLACE VIEW "MaterialPhotoView" AS
SELECT 
  m.id as "materialId",
  m.code as "materialCode",
  m.name as "materialName",
  m.description as "materialDescription",
  m.cost as "unitCost",
  m.manufacturer as "supplierName",
  
  ma.id as "attachmentId",
  ma."attachmentType",
  ma.description as "attachmentDescription",
  ma."isPrimary",
  ma."attachedAt",
  
  fa.id as "fileId",
  fa."fileName",
  fa."originalName",
  fa."filePath",
  fa."fileUrl",
  fa."thumbnailPath",
  fa."thumbnailUrl",
  fa."imageWidth",
  fa."imageHeight",
  fa."uploadedAt"
  
FROM "Material" m
JOIN "MaterialAttachment" ma ON m.id = ma."materialId"
JOIN "FileAttachment" fa ON ma."fileId" = fa.id
WHERE fa."isImage" = true AND fa.active = true
ORDER BY m.name, ma."isPrimary" DESC;

-- Function to get file storage statistics
CREATE OR REPLACE FUNCTION get_file_storage_stats()
RETURNS TABLE(
  total_files bigint,
  total_size_bytes bigint,
  total_size_mb numeric,
  total_images bigint,
  image_size_bytes bigint,
  job_attachments bigint,
  customer_attachments bigint,
  material_attachments bigint,
  recent_uploads bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_files,
    SUM("fileSize")::bigint as total_size_bytes,
    ROUND(SUM("fileSize")::numeric / 1024 / 1024, 2) as total_size_mb,
    COUNT(CASE WHEN "isImage" = true THEN 1 END)::bigint as total_images,
    SUM(CASE WHEN "isImage" = true THEN "fileSize" ELSE 0 END)::bigint as image_size_bytes,
    (SELECT COUNT(*) FROM "JobAttachment")::bigint as job_attachments,
    (SELECT COUNT(*) FROM "CustomerAttachment")::bigint as customer_attachments,
    (SELECT COUNT(*) FROM "MaterialAttachment")::bigint as material_attachments,
    COUNT(CASE WHEN "uploadedAt" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::bigint as recent_uploads
  FROM "FileAttachment"
  WHERE active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up orphaned files
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS TABLE(
  deleted_files bigint,
  freed_space_mb numeric
) AS $$
DECLARE
  deleted_count bigint := 0;
  freed_bytes bigint := 0;
BEGIN
  -- Find orphaned files (not attached to any entity)
  WITH orphaned_files AS (
    SELECT fa.id, fa."fileSize"
    FROM "FileAttachment" fa
    WHERE fa.active = true
    AND NOT EXISTS (SELECT 1 FROM "JobAttachment" ja WHERE ja."fileId" = fa.id)
    AND NOT EXISTS (SELECT 1 FROM "CustomerAttachment" ca WHERE ca."fileId" = fa.id)
    AND NOT EXISTS (SELECT 1 FROM "MaterialAttachment" ma WHERE ma."fileId" = fa.id)
    AND fa."uploadedAt" < CURRENT_DATE - INTERVAL '30 days'
  ),
  cleanup_stats AS (
    SELECT 
      COUNT(*)::bigint as file_count,
      SUM("fileSize")::bigint as total_size
    FROM orphaned_files
  )
  UPDATE "FileAttachment" 
  SET active = false, "updatedAt" = NOW()
  WHERE id IN (SELECT id FROM orphaned_files);
  
  SELECT 
    COALESCE((SELECT file_count FROM cleanup_stats), 0),
    COALESCE(ROUND((SELECT total_size FROM cleanup_stats)::numeric / 1024 / 1024, 2), 0)
  INTO deleted_count, freed_bytes;
  
  RETURN QUERY SELECT deleted_count, freed_bytes;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update file metadata on attachment changes
CREATE OR REPLACE FUNCTION update_file_attachment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_file_attachment_timestamp
  BEFORE UPDATE ON "FileAttachment"
  FOR EACH ROW
  EXECUTE FUNCTION update_file_attachment_timestamp();

-- Add some initial attachment type constants
INSERT INTO "FileAttachment" (id, "fileName", "originalName", "mimeType", "fileSize", "fileExtension", "filePath", "isImage", "uploadedBy", "description") 
VALUES ('00000000-0000-0000-0000-000000000000', 'placeholder.png', 'placeholder.png', 'image/png', 1024, 'png', '/uploads/placeholder.png', true, null, 'System placeholder image') 
ON CONFLICT (id) DO NOTHING;

-- Common attachment types for reference:
-- Job Attachment Types: BEFORE_PHOTO, AFTER_PHOTO, PROGRESS_PHOTO, PROBLEM_PHOTO, SOLUTION_PHOTO, PERMIT, INVOICE, CONTRACT, SPEC_SHEET, DIAGRAM, RECEIPT
-- Customer Attachment Types: PROFILE_PHOTO, ID_DOCUMENT, CONTRACT, AGREEMENT, SIGNATURE
-- Material Attachment Types: PRODUCT_PHOTO, SPEC_SHEET, WARRANTY, MANUAL, CERTIFICATE, INVOICE

COMMENT ON TABLE "FileAttachment" IS 'Central file storage for all uploaded files with metadata';
COMMENT ON TABLE "JobAttachment" IS 'Links files to specific jobs with categorization';
COMMENT ON TABLE "CustomerAttachment" IS 'Links files to customer profiles';
COMMENT ON TABLE "MaterialAttachment" IS 'Links files to materials for product photos and documentation';
COMMENT ON COLUMN "FileAttachment"."metadata" IS 'JSON metadata including EXIF data for images, GPS coordinates, etc.';
COMMENT ON COLUMN "JobAttachment"."category" IS 'Categories: ELECTRICAL, PERMITS, SAFETY, DOCUMENTATION, BILLING';
COMMENT ON COLUMN "JobAttachment"."phase" IS 'Job phases: PLANNING, INSTALLATION, TESTING, COMPLETION, FOLLOW_UP';