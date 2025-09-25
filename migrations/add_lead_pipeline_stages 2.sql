-- Migration: Add customizable lead pipeline stages
-- Date: 2024-01-24
-- Description: Creates table for custom pipeline stages and updates Lead table

-- Create LeadPipelineStage table
CREATE TABLE IF NOT EXISTS "LeadPipelineStage" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    "systemName" VARCHAR(50) NOT NULL, -- For programmatic reference
    position INTEGER NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    "isActive" BOOLEAN DEFAULT true,
    "isDefault" BOOLEAN DEFAULT false,
    "autoActions" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint on position for active stages
CREATE UNIQUE INDEX idx_pipeline_stage_position ON "LeadPipelineStage"(position) WHERE "isActive" = true;

-- Add column to Lead table for custom stage
ALTER TABLE "Lead"
ADD COLUMN IF NOT EXISTS "pipelineStageId" UUID REFERENCES "LeadPipelineStage"(id);

-- Insert default pipeline stages
INSERT INTO "LeadPipelineStage" (name, "systemName", position, color, "isActive", "isDefault") VALUES
    ('Cold Lead', 'COLD_LEAD', 1, '#9CA3AF', true, true),
    ('Warm Lead', 'WARM_LEAD', 2, '#FCD34D', true, true),
    ('Estimate Required', 'ESTIMATE_REQUIRED', 3, '#F59E0B', true, true),
    ('Estimate Sent', 'ESTIMATE_SENT', 4, '#3B82F6', true, true),
    ('Approved', 'APPROVED', 5, '#10B981', true, true),
    ('Job Scheduled', 'JOB_SCHEDULED', 6, '#059669', true, true),
    ('Follow-up Required', 'FOLLOW_UP', 7, '#8B5CF6', true, true),
    ('Lost', 'LOST', 8, '#EF4444', true, true);

-- Migrate existing leads to use pipeline stages
UPDATE "Lead" l
SET "pipelineStageId" = ps.id
FROM "LeadPipelineStage" ps
WHERE l."pipelineStageId" IS NULL
  AND ps."systemName" =
    CASE l.status
        WHEN 'COLD_LEAD' THEN 'COLD_LEAD'
        WHEN 'WARM_LEAD' THEN 'WARM_LEAD'
        WHEN 'CONTACTED' THEN 'WARM_LEAD'
        WHEN 'QUALIFIED' THEN 'ESTIMATE_REQUIRED'
        WHEN 'PROPOSAL_SENT' THEN 'ESTIMATE_SENT'
        WHEN 'NEGOTIATION' THEN 'ESTIMATE_SENT'
        WHEN 'CONVERTED' THEN 'APPROVED'
        WHEN 'LOST' THEN 'LOST'
        ELSE 'COLD_LEAD'
    END;

-- Create audit table for pipeline changes
CREATE TABLE IF NOT EXISTS "LeadPipelineHistory" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "leadId" UUID NOT NULL REFERENCES "Lead"(id) ON DELETE CASCADE,
    "fromStageId" UUID REFERENCES "LeadPipelineStage"(id),
    "toStageId" UUID REFERENCES "LeadPipelineStage"(id),
    "changedBy" UUID REFERENCES "User"(id),
    "changedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create index for performance
CREATE INDEX idx_lead_pipeline_stage ON "Lead"("pipelineStageId");
CREATE INDEX idx_pipeline_history_lead ON "LeadPipelineHistory"("leadId");
CREATE INDEX idx_pipeline_history_date ON "LeadPipelineHistory"("changedAt");

-- Add trigger to update updatedAt on pipeline stage changes
CREATE OR REPLACE FUNCTION update_pipeline_stage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pipeline_stage_updated_at
    BEFORE UPDATE ON "LeadPipelineStage"
    FOR EACH ROW
    EXECUTE FUNCTION update_pipeline_stage_updated_at();