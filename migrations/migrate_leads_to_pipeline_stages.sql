-- Migrate existing leads from status enum to pipeline stage IDs
-- This migration maps leads with the old status enum to the new pipeline stages

UPDATE "Lead" l
SET "pipelineStageId" = ps.id
FROM "LeadPipelineStage" ps
WHERE ps."systemName" = l.status::text
AND l."pipelineStageId" IS NULL;

-- For any leads with statuses that don't match a systemName,
-- assign them to the first stage (Cold Lead) as a fallback
UPDATE "Lead"
SET "pipelineStageId" = (
    SELECT id FROM "LeadPipelineStage"
    WHERE "systemName" = 'COLD_LEAD'
    LIMIT 1
)
WHERE "pipelineStageId" IS NULL;