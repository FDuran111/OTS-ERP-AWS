-- =====================================
-- VIEWS DEFINITIONS
-- Create after all tables and foreign keys
-- =====================================

BEGIN;

-- View: CategoryPerformanceView
CREATE OR REPLACE VIEW public."CategoryPerformanceView" AS 
 SELECT jc.id AS "categoryId",
    jc."categoryCode",
    jc."categoryName",
    jc.color,
    count(j.id) AS "totalJobs",
    count(
        CASE
            WHEN (j.status = 'COMPLETED'::"JobStatus") THEN 1
            ELSE NULL::integer
        END) AS "completedJobs",
    count(
        CASE
            WHEN (j.status = 'IN_PROGRESS'::"JobStatus") THEN 1
            ELSE NULL::integer
        END) AS "activeJobs",
    count(
        CASE
            WHEN (j.status = 'SCHEDULED'::"JobStatus") THEN 1
            ELSE NULL::integer
        END) AS "scheduledJobs",
    sum(j."billedAmount") AS "totalRevenue",
    avg(j."billedAmount") AS "avgJobValue",
    sum(jcost."totalJobCost") AS "totalCosts",
    sum(jcost."grossProfit") AS "totalProfit",
    avg(jcost."grossMargin") AS "avgMargin",
    sum(j."actualHours") AS "totalHours",
    avg(j."actualHours") AS "avgHoursPerJob",
    avg(
        CASE
            WHEN ((j."estimatedHours" > (0)::double precision) AND (j."actualHours" > (0)::double precision)) THEN ((j."actualHours" / j."estimatedHours") * (100)::double precision)
            ELSE NULL::double precision
        END) AS "avgTimeAccuracy",
    count(
        CASE
            WHEN ((j.complexity)::text = 'SIMPLE'::text) THEN 1
            ELSE NULL::integer
        END) AS "simpleJobs",
    count(
        CASE
            WHEN ((j.complexity)::text = 'STANDARD'::text) THEN 1
            ELSE NULL::integer
        END) AS "standardJobs",
    count(
        CASE
            WHEN ((j.complexity)::text = 'COMPLEX'::text) THEN 1
            ELSE NULL::integer
        END) AS "complexJobs",
    count(
        CASE
            WHEN ((j.complexity)::text = 'CRITICAL'::text) THEN 1
            ELSE NULL::integer
        END) AS "criticalJobs",
    min(j."createdAt") AS "firstJob",
    max(j."createdAt") AS "lastJob",
        CASE
            WHEN (count(j.id) > 0) THEN (((count(
            CASE
                WHEN (j.status = 'COMPLETED'::"JobStatus") THEN 1
                ELSE NULL::integer
            END))::numeric / (count(j.id))::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END AS "completionRate",
        CASE
            WHEN ((sum(j."billedAmount") > (0)::double precision) AND (sum(jcost."totalJobCost") > (0)::numeric)) THEN (((sum(j."billedAmount") - (sum(jcost."totalJobCost"))::double precision) / sum(j."billedAmount")) * (100)::double precision)
            ELSE (0)::double precision
        END AS "profitMargin"
   FROM (("JobCategory" jc
     LEFT JOIN "Job" j ON ((jc.id = j."categoryId")))
     LEFT JOIN "JobCost" jcost ON ((j.id = jcost."jobId")))
  WHERE (jc.active = true)
  GROUP BY jc.id, jc."categoryCode", jc."categoryName", jc.color
  ORDER BY (sum(j."billedAmount")) DESC;

-- View: CustomerPhotoView
CREATE OR REPLACE VIEW public."CustomerPhotoView" AS 
 SELECT c.id AS "customerId",
    COALESCE(c."companyName", concat(c."firstName", ' ', c."lastName")) AS "customerName",
    c."companyName",
    c.email,
    c.phone,
    ca.id AS "attachmentId",
    ca."attachmentType",
    ca.description AS "attachmentDescription",
    ca."isPrimary",
    ca."attachedAt",
    fa.id AS "fileId",
    fa."fileName",
    fa."originalName",
    fa."filePath",
    fa."fileUrl",
    fa."thumbnailPath",
    fa."thumbnailUrl",
    fa."imageWidth",
    fa."imageHeight",
    fa."uploadedAt"
   FROM (("Customer" c
     JOIN "CustomerAttachment" ca ON ((c.id = ca."customerId")))
     JOIN "FileAttachment" fa ON ((ca."fileId" = fa.id)))
  WHERE ((fa."isImage" = true) AND (fa.active = true))
  ORDER BY c."firstName", c."lastName", ca."isPrimary" DESC;

-- View: CustomerQuickBooksMapping
CREATE OR REPLACE VIEW public."CustomerQuickBooksMapping" AS 
 SELECT c.id AS "customerId",
    c."companyName",
    c."firstName",
    c."lastName",
    c.email,
    c.phone,
    qbm."quickbooksId",
    qbm."syncVersion",
    qbm."lastSyncAt",
    qbm."syncStatus",
    qbm."syncErrors"
   FROM ("Customer" c
     LEFT JOIN "QuickBooksMapping" qbm ON (((c.id = qbm."localEntityId") AND ((qbm."localEntityType")::text = 'CUSTOMER'::text))));

-- View: DailyRoutePerformanceView
CREATE OR REPLACE VIEW public."DailyRoutePerformanceView" AS 
 SELECT r."routeDate",
    count(r.id) AS "totalRoutes",
    count(
        CASE
            WHEN ((r.status)::text = 'COMPLETED'::text) THEN 1
            ELSE NULL::integer
        END) AS "completedRoutes",
    count(
        CASE
            WHEN ((r.status)::text = 'IN_PROGRESS'::text) THEN 1
            ELSE NULL::integer
        END) AS "activeRoutes",
    count(
        CASE
            WHEN ((r.status)::text = 'CANCELLED'::text) THEN 1
            ELSE NULL::integer
        END) AS "cancelledRoutes",
    sum(rs_count.total_stops) AS "totalStops",
    sum(rs_count.completed_stops) AS "completedStops",
    round(avg(r."optimizationScore"), 2) AS "avgOptimizationScore",
    sum(r."estimatedDistance") AS "totalPlannedDistance",
    sum(r."actualDistance") AS "totalActualDistance",
    sum(r."estimatedCost") AS "totalPlannedCost",
    sum(r."actualCost") AS "totalActualCost",
        CASE
            WHEN (sum(r."estimatedDistance") > (0)::numeric) THEN round(((sum(r."actualDistance") / sum(r."estimatedDistance")) * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS "distanceEfficiency",
        CASE
            WHEN (sum(r."estimatedDuration") > 0) THEN round((((sum(r."actualDuration") / sum(r."estimatedDuration")) * 100))::numeric, 2)
            ELSE NULL::numeric
        END AS "timeEfficiency"
   FROM ("Route" r
     LEFT JOIN ( SELECT "RouteStop"."routeId",
            count(*) AS total_stops,
            count(
                CASE
                    WHEN (("RouteStop".status)::text = 'COMPLETED'::text) THEN 1
                    ELSE NULL::integer
                END) AS completed_stops
           FROM "RouteStop"
          GROUP BY "RouteStop"."routeId") rs_count ON ((r.id = rs_count."routeId")))
  GROUP BY r."routeDate"
  ORDER BY r."routeDate" DESC;

-- View: EmployeeCostSummary
CREATE OR REPLACE VIEW public."EmployeeCostSummary" AS 
 SELECT u.id AS user_id,
    u.name AS user_name,
    u.email,
    u.role,
    u.active,
    u."createdAt",
    u."updatedAt"
   FROM "User" u
  WHERE (u.active = true);

-- View: EquipmentBillingSummary
CREATE OR REPLACE VIEW public."EquipmentBillingSummary" AS 
 SELECT eu.id AS "usageId",
    eu."jobId",
    j."jobNumber",
    j.description AS "jobDescription",
    eu."equipmentName",
    eu."equipmentType",
    eu."usageDate",
    u.name AS "operatorName",
    eu."totalHours",
    eu."billableHours",
    eu."workingHours",
    eu."travelHours",
    eu."setupHours",
    eu."idleHours",
    eu."hourlyRate",
    eu."appliedMultiplier",
    eu."baseCost",
    eu."travelCost",
    eu."setupCost",
    eu."operatorCost",
    eu."totalCost",
        CASE
            WHEN (eu."totalHours" > (0)::numeric) THEN ((eu."workingHours" / eu."totalHours") * (100)::numeric)
            ELSE (0)::numeric
        END AS "utilizationPercent",
        CASE
            WHEN (eu."billableHours" > (0)::numeric) THEN (eu."totalCost" / eu."billableHours")
            ELSE (0)::numeric
        END AS "effectiveHourlyRate",
    eu.status,
    eu.notes,
    eu."createdAt"
   FROM (("EquipmentUsage" eu
     LEFT JOIN "Job" j ON ((eu."jobId" = j.id)))
     LEFT JOIN "User" u ON ((eu."operatorId" = u.id)))
  ORDER BY eu."usageDate" DESC, eu."createdAt" DESC;

-- View: EquipmentProfitabilityAnalysis
CREATE OR REPLACE VIEW public."EquipmentProfitabilityAnalysis" AS 
 SELECT er.id AS "rateId",
    er."equipmentType",
    er."equipmentClass",
    er."rateName",
    er."hourlyRate" AS "standardRate",
    count(eu.id) AS "totalUsages",
    sum(eu."billableHours") AS "totalBillableHours",
    sum(eu."totalHours") AS "totalActualHours",
    avg(
        CASE
            WHEN (eu."totalHours" > (0)::numeric) THEN ((eu."workingHours" / eu."totalHours") * (100)::numeric)
            ELSE (0)::numeric
        END) AS "avgUtilization",
    sum(eu."totalCost") AS "totalRevenue",
    avg(eu."totalCost") AS "avgRevenuePerUsage",
    avg(
        CASE
            WHEN (eu."billableHours" > (0)::numeric) THEN (eu."totalCost" / eu."billableHours")
            ELSE (0)::numeric
        END) AS "avgEffectiveRate",
    sum(eu."baseCost") AS "totalBaseCost",
    sum(eu."travelCost") AS "totalTravelCost",
    sum(eu."setupCost") AS "totalSetupCost",
    sum(eu."operatorCost") AS "totalOperatorCost",
        CASE
            WHEN (sum(eu."totalHours") > (0)::numeric) THEN ((sum(eu."workingHours") / sum(eu."totalHours")) * (100)::numeric)
            ELSE (0)::numeric
        END AS "productiveTimePercent",
        CASE
            WHEN (sum(eu."billableHours") > (0)::numeric) THEN (sum(eu."totalCost") / sum(eu."billableHours"))
            ELSE (0)::numeric
        END AS "revenuePerBillableHour",
    min(eu."usageDate") AS "firstUsage",
    max(eu."usageDate") AS "lastUsage",
    count(DISTINCT eu."jobId") AS "jobsUsed"
   FROM ("EquipmentRate" er
     LEFT JOIN "EquipmentUsage" eu ON (((er.id = eu."equipmentRateId") AND ((eu.status)::text = 'COMPLETED'::text))))
  WHERE (er.active = true)
  GROUP BY er.id, er."equipmentType", er."equipmentClass", er."rateName", er."hourlyRate"
  ORDER BY (sum(eu."totalCost")) DESC;

-- View: InvoiceQuickBooksMapping
CREATE OR REPLACE VIEW public."InvoiceQuickBooksMapping" AS 
 SELECT j.id AS "jobId",
    j."jobNumber",
    j."customerId",
    j."billedAmount",
    j."billedDate",
    j.status AS "jobStatus",
    qbm."quickbooksId",
    qbm."syncVersion",
    qbm."lastSyncAt",
    qbm."syncStatus",
    qbm."syncErrors"
   FROM ("Job" j
     LEFT JOIN "QuickBooksMapping" qbm ON (((j.id = qbm."localEntityId") AND ((qbm."localEntityType")::text = 'INVOICE'::text))))
  WHERE ((j."billedAmount" IS NOT NULL) AND (j."billedAmount" > (0)::double precision));

-- View: JobClassificationView
CREATE OR REPLACE VIEW public."JobClassificationView" AS 
 SELECT j.id AS "jobId",
    j."jobNumber",
    j.description AS "jobDescription",
    j.status,
    j.type AS "jobType",
    j.sector,
    j.complexity,
    jc.id AS "categoryId",
    jc."categoryCode",
    jc."categoryName",
    jc.color AS "categoryColor",
    jc.icon AS "categoryIcon",
    jsc.id AS "subCategoryId",
    jsc."subCategoryCode",
    jsc."subCategoryName",
    jsc."defaultLaborRate",
    jsc."estimatedHours",
    jsc."requiresCertification",
    jsc."requiredSkillLevel",
    st.id AS "serviceTypeId",
    st."serviceCode",
    st."serviceName",
    st."standardRate",
    st."estimatedDuration",
    st."requiredEquipment",
    st."permitRequired",
    COALESCE(c."companyName", concat(c."firstName", ' ', c."lastName")) AS "customerName",
    c."firstName" AS "customerFirstName",
    c."lastName" AS "customerLastName",
    c."companyName" AS "customerCompany",
    j."estimatedCost",
    j."actualCost",
    j."billedAmount",
    j."estimatedHours" AS "jobEstimatedHours",
    j."actualHours" AS "jobActualHours",
    j."scheduledDate",
    j."startDate",
    j."completedDate",
    j."createdAt",
    array_agg(DISTINCT jt."tagName") FILTER (WHERE (jt."tagName" IS NOT NULL)) AS tags
   FROM (((((("Job" j
     LEFT JOIN "JobCategory" jc ON ((j."categoryId" = jc.id)))
     LEFT JOIN "JobSubCategory" jsc ON ((j."subCategoryId" = jsc.id)))
     LEFT JOIN "ServiceType" st ON ((j."serviceTypeId" = st.id)))
     LEFT JOIN "Customer" c ON ((j."customerId" = c.id)))
     LEFT JOIN "JobTagAssignment" jta ON ((j.id = jta."jobId")))
     LEFT JOIN "JobTag" jt ON (((jta."tagId" = jt.id) AND (jt.active = true))))
  GROUP BY j.id, j."jobNumber", j.description, j.status, j.type, j.sector, j.complexity, jc.id, jc."categoryCode", jc."categoryName", jc.color, jc.icon, jsc.id, jsc."subCategoryCode", jsc."subCategoryName", jsc."defaultLaborRate", jsc."estimatedHours", jsc."requiresCertification", jsc."requiredSkillLevel", st.id, st."serviceCode", st."serviceName", st."standardRate", st."estimatedDuration", st."requiredEquipment", st."permitRequired", c."firstName", c."lastName", c."companyName", j."estimatedCost", j."actualCost", j."billedAmount", j."estimatedHours", j."actualHours", j."scheduledDate", j."startDate", j."completedDate", j."createdAt"
  ORDER BY j."createdAt" DESC;

-- View: JobCostAnalysis
CREATE OR REPLACE VIEW public."JobCostAnalysis" AS 
 SELECT j.id AS "jobId",
    j."jobNumber",
    j.description AS "jobTitle",
    j.status AS "jobStatus",
    COALESCE(c."companyName", concat(c."firstName", ' ', c."lastName")) AS "customerName",
    jc."totalLaborHours",
    jc."totalLaborCost",
    jc."totalTrueLaborCost",
    jc."averageLaborRate",
    jc."averageTrueLaborRate",
    jc."totalMaterialCost",
    jc."totalEquipmentCost",
    jc."overheadAmount",
    jc."miscCosts",
    jc."totalDirectCosts",
    jc."totalIndirectCosts",
    jc."totalJobCost",
    (jc."totalJobCost" + jc."trueCostDifference") AS "totalTrueJobCost",
    jc."trueCostDifference",
    jc."billedAmount",
    jc."grossProfit",
    (jc."billedAmount" - (jc."totalJobCost" + jc."trueCostDifference")) AS "trueGrossProfit",
    jc."grossMargin",
        CASE
            WHEN (jc."billedAmount" > (0)::numeric) THEN (((jc."billedAmount" - (jc."totalJobCost" + jc."trueCostDifference")) / jc."billedAmount") * (100)::numeric)
            ELSE (0)::numeric
        END AS "trueGrossMargin",
        CASE
            WHEN (jc."totalLaborCost" > (0)::numeric) THEN ((jc."trueCostDifference" / jc."totalLaborCost") * (100)::numeric)
            ELSE (0)::numeric
        END AS "costVariancePercentage",
    jc."lastCalculated",
    jc."createdAt",
    jc."updatedAt"
   FROM (("Job" j
     LEFT JOIN "Customer" c ON ((j."customerId" = c.id)))
     LEFT JOIN "JobCost" jc ON ((j.id = jc."jobId")))
  WHERE (jc."jobId" IS NOT NULL);

-- View: JobEquipmentCostSummary
CREATE OR REPLACE VIEW public."JobEquipmentCostSummary" AS 
 SELECT j.id AS "jobId",
    j."jobNumber",
    j.description AS "jobDescription",
    j.status AS "jobStatus",
    count(jec.id) AS "equipmentEntries",
    sum(jec."totalCost") AS "totalEquipmentCost",
    sum(jec."hoursUsed") AS "totalEquipmentHours",
    count(
        CASE
            WHEN ((jec."equipmentType")::text = 'BUCKET_TRUCK'::text) THEN 1
            ELSE NULL::integer
        END) AS "bucketTruckUsages",
    sum(
        CASE
            WHEN ((jec."equipmentType")::text = 'BUCKET_TRUCK'::text) THEN jec."totalCost"
            ELSE (0)::numeric
        END) AS "bucketTruckCost",
    count(
        CASE
            WHEN ((jec."equipmentType")::text = 'CRANE'::text) THEN 1
            ELSE NULL::integer
        END) AS "craneUsages",
    sum(
        CASE
            WHEN ((jec."equipmentType")::text = 'CRANE'::text) THEN jec."totalCost"
            ELSE (0)::numeric
        END) AS "craneCost",
        CASE
            WHEN (sum(jec."hoursUsed") > (0)::numeric) THEN (sum(jec."totalCost") / sum(jec."hoursUsed"))
            ELSE (0)::numeric
        END AS "avgEquipmentRate",
    min(jec."usageDate") AS "firstEquipmentUsage",
    max(jec."usageDate") AS "lastEquipmentUsage",
    jc."billedAmount",
    jc."totalJobCost",
    jc."grossProfit",
    jc."grossMargin",
        CASE
            WHEN (jc."totalJobCost" > (0)::numeric) THEN ((sum(jec."totalCost") / jc."totalJobCost") * (100)::numeric)
            ELSE (0)::numeric
        END AS "equipmentCostPercent"
   FROM (("Job" j
     LEFT JOIN "JobEquipmentCost" jec ON ((j.id = jec."jobId")))
     LEFT JOIN "JobCost" jc ON ((j.id = jc."jobId")))
  GROUP BY j.id, j."jobNumber", j.description, j.status, jc."billedAmount", jc."totalJobCost", jc."grossProfit", jc."grossMargin"
 HAVING (count(jec.id) > 0)
  ORDER BY (sum(jec."totalCost")) DESC;

-- View: JobLaborRatesWithDetails
CREATE OR REPLACE VIEW public."JobLaborRatesWithDetails" AS 
 SELECT jlr.id,
    jlr.job_id,
    jlr.user_id,
    jlr.overridden_rate,
    jlr.created_at,
    jlr.updated_at,
    jlr.notes,
    u.name AS user_name,
    u.email AS user_email,
    u.role AS user_role,
    j."jobNumber",
    j.description AS job_description,
    j.status AS job_status
   FROM (("JobLaborRates" jlr
     JOIN "User" u ON ((jlr.user_id = u.id)))
     JOIN "Job" j ON ((jlr.job_id = j.id)));

-- View: JobPhotoView
CREATE OR REPLACE VIEW public."JobPhotoView" AS 
 SELECT j.id AS "jobId",
    j."jobNumber",
    j.description AS "jobDescription",
    j.status AS "jobStatus",
    ja.id AS "attachmentId",
    ja."attachmentType",
    ja.category,
    ja.phase,
    ja.description AS "attachmentDescription",
    ja."isPrimary",
    ja."sortOrder",
    ja."attachedAt",
    fa.id AS "fileId",
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
    fa.description AS "fileDescription",
    fa.tags,
    fa.metadata,
    fa."uploadedAt",
    COALESCE(c."companyName", concat(c."firstName", ' ', c."lastName")) AS "customerName"
   FROM ((("Job" j
     JOIN "JobAttachment" ja ON ((j.id = ja."jobId")))
     JOIN "FileAttachment" fa ON ((ja."fileId" = fa.id)))
     LEFT JOIN "Customer" c ON ((j."customerId" = c.id)))
  WHERE ((fa."isImage" = true) AND (fa.active = true))
  ORDER BY j."jobNumber", ja."sortOrder", ja."attachedAt";

-- View: MaterialAvailability
CREATE OR REPLACE VIEW public."MaterialAvailability" AS 
 SELECT m.id,
    m.code,
    m.name,
    m.unit,
    m."inStock" AS total_stock,
    COALESCE(sum(
        CASE
            WHEN ((mr.status)::text = 'ACTIVE'::text) THEN (mr."quantityReserved" - COALESCE(mr."fulfilledQuantity", (0)::numeric))
            ELSE (0)::numeric
        END), (0)::numeric) AS total_reserved,
    ((m."inStock")::numeric - COALESCE(sum(
        CASE
            WHEN ((mr.status)::text = 'ACTIVE'::text) THEN (mr."quantityReserved" - COALESCE(mr."fulfilledQuantity", (0)::numeric))
            ELSE (0)::numeric
        END), (0)::numeric)) AS available_stock,
    m."minStock",
    m.cost,
    m.category,
    m."vendorId",
    m.active
   FROM ("Material" m
     LEFT JOIN "MaterialReservation" mr ON (((m.id = mr."materialId") AND ((mr.status)::text = 'ACTIVE'::text))))
  WHERE (m.active = true)
  GROUP BY m.id, m.code, m.name, m.unit, m."inStock", m."minStock", m.cost, m.category, m."vendorId", m.active;

-- View: MaterialPhotoView
CREATE OR REPLACE VIEW public."MaterialPhotoView" AS 
 SELECT m.id AS "materialId",
    m.code AS "materialCode",
    m.name AS "materialName",
    m.description AS "materialDescription",
    m.cost AS "unitCost",
    m.manufacturer AS "supplierName",
    ma.id AS "attachmentId",
    ma."attachmentType",
    ma.description AS "attachmentDescription",
    ma."isPrimary",
    ma."attachedAt",
    fa.id AS "fileId",
    fa."fileName",
    fa."originalName",
    fa."filePath",
    fa."fileUrl",
    fa."thumbnailPath",
    fa."thumbnailUrl",
    fa."imageWidth",
    fa."imageHeight",
    fa."uploadedAt"
   FROM (("Material" m
     JOIN "MaterialAttachment" ma ON ((m.id = ma."materialId")))
     JOIN "FileAttachment" fa ON ((ma."fileId" = fa.id)))
  WHERE ((fa."isImage" = true) AND (fa.active = true))
  ORDER BY m.name, ma."isPrimary" DESC;

-- View: QuickBooksSyncStatus
CREATE OR REPLACE VIEW public."QuickBooksSyncStatus" AS 
 SELECT qbc."companyId",
    qbc."realmId",
    qbc."isActive" AS "connectionActive",
    qbc."lastSyncAt" AS "lastConnectionSync",
    qbc."tokenExpiresAt",
    count(DISTINCT qbm.id) AS "totalMappings",
    count(DISTINCT
        CASE
            WHEN ((qbm."syncStatus")::text = 'SYNCED'::text) THEN qbm.id
            ELSE NULL::uuid
        END) AS "syncedMappings",
    count(DISTINCT
        CASE
            WHEN ((qbm."syncStatus")::text = 'ERROR'::text) THEN qbm.id
            ELSE NULL::uuid
        END) AS "errorMappings",
    count(DISTINCT
        CASE
            WHEN ((qbm."syncStatus")::text = 'PENDING'::text) THEN qbm.id
            ELSE NULL::uuid
        END) AS "pendingMappings",
    count(DISTINCT
        CASE
            WHEN (((qbsl.status)::text = 'SUCCESS'::text) AND (qbsl."createdAt" > (now() - '01:00:00'::interval))) THEN qbsl.id
            ELSE NULL::uuid
        END) AS "recentSuccessfulSyncs",
    count(DISTINCT
        CASE
            WHEN (((qbsl.status)::text = 'ERROR'::text) AND (qbsl."createdAt" > (now() - '01:00:00'::interval))) THEN qbsl.id
            ELSE NULL::uuid
        END) AS "recentErrorSyncs",
        CASE
            WHEN (qbc."tokenExpiresAt" < now()) THEN 'TOKEN_EXPIRED'::text
            WHEN (qbc."tokenExpiresAt" < (now() + '1 day'::interval)) THEN 'TOKEN_EXPIRING'::text
            WHEN (qbc."lastSyncAt" < (now() - '1 day'::interval)) THEN 'SYNC_STALE'::text
            ELSE 'HEALTHY'::text
        END AS "healthStatus"
   FROM (("QuickBooksConnection" qbc
     LEFT JOIN "QuickBooksMapping" qbm ON (((qbc."companyId")::text = (qbc."companyId")::text)))
     LEFT JOIN "QuickBooksSyncLog" qbsl ON (((qbc."companyId")::text = (qbc."companyId")::text)))
  GROUP BY qbc."companyId", qbc."realmId", qbc."isActive", qbc."lastSyncAt", qbc."tokenExpiresAt";

-- View: RouteSummaryView
CREATE OR REPLACE VIEW public."RouteSummaryView" AS 
 SELECT r.id AS "routeId",
    r."routeName",
    r."routeDate",
    r."vehicleId",
    v."vehicleNumber",
    v."vehicleName",
    r."driverId",
    r.status,
    r."startTime",
    r."endTime",
    r."estimatedDuration",
    r."actualDuration",
    r."estimatedDistance",
    r."actualDistance",
    r."estimatedCost",
    r."actualCost",
    r."optimizationScore",
    count(rs.id) AS "totalStops",
    count(
        CASE
            WHEN ((rs."stopType")::text = 'JOB_SITE'::text) THEN 1
            ELSE NULL::integer
        END) AS "jobStops",
    count(
        CASE
            WHEN ((rs.status)::text = 'COMPLETED'::text) THEN 1
            ELSE NULL::integer
        END) AS "completedStops",
    count(
        CASE
            WHEN ((rs.status)::text = 'IN_PROGRESS'::text) THEN 1
            ELSE NULL::integer
        END) AS "inProgressStops",
    min(rs."estimatedArrival") AS "firstStopTime",
    max(rs."estimatedDeparture") AS "lastStopTime",
    sum(rs."estimatedDuration") AS "totalJobTime",
    sum(rs."travelTimeFromPrevious") AS "totalTravelTime",
    sum(rs."distanceFromPrevious") AS "totalRouteDistance"
   FROM (("Route" r
     LEFT JOIN "Vehicle" v ON ((r."vehicleId" = v.id)))
     LEFT JOIN "RouteStop" rs ON ((r.id = rs."routeId")))
  GROUP BY r.id, r."routeName", r."routeDate", r."vehicleId", v."vehicleNumber", v."vehicleName", r."driverId", r.status, r."startTime", r."endTime", r."estimatedDuration", r."actualDuration", r."estimatedDistance", r."actualDistance", r."estimatedCost", r."actualCost", r."optimizationScore"
  ORDER BY r."routeDate" DESC, r."startTime";

-- View: ScheduleView
CREATE OR REPLACE VIEW public."ScheduleView" AS 
 SELECT js.id AS "scheduleId",
    js."jobId",
    js."startDate",
    js."endDate",
    js."estimatedHours",
    js."actualHours",
    js.status AS "scheduleStatus",
    js.notes AS "scheduleNotes",
    js."createdAt" AS "scheduledAt",
    j."jobNumber",
    j.description AS "jobTitle",
    j."customerId",
    j.type AS "jobType",
    j.priority AS "jobPriority",
    j.status AS "jobStatus",
    j.address,
    j.city,
    j.state,
    j.zip,
    COALESCE(json_agg(json_build_object('userId', ca."userId", 'userName', u.name, 'userEmail', u.email, 'role', ca.role, 'status', ca.status, 'checkedInAt', ca."checkedInAt", 'checkedOutAt', ca."checkedOutAt")) FILTER (WHERE (ca.id IS NOT NULL)), '[]'::json) AS crew,
    count(ca.id) FILTER (WHERE ((ca.status)::text = 'ASSIGNED'::text)) AS "assignedCrewCount"
   FROM ((("JobSchedule" js
     JOIN "Job" j ON ((js."jobId" = j.id)))
     LEFT JOIN "CrewAssignment" ca ON (((js.id = ca."scheduleId") AND ((ca.status)::text <> 'REMOVED'::text))))
     LEFT JOIN "User" u ON ((ca."userId" = u.id)))
  GROUP BY js.id, j.id;

-- View: UserPermissionsView
CREATE OR REPLACE VIEW public."UserPermissionsView" AS 
 SELECT u.id AS user_id,
    u.name AS user_name,
    u.email,
    u.role,
    u.active,
    'jobs'::text AS resource,
    'read'::text AS action,
    user_has_permission(u.id, 'jobs'::text, 'read'::text) AS has_permission
   FROM "User" u
  WHERE (u.active = true)
UNION ALL
 SELECT u.id AS user_id,
    u.name AS user_name,
    u.email,
    u.role,
    u.active,
    'invoices'::text AS resource,
    'create'::text AS action,
    user_has_permission(u.id, 'invoices'::text, 'create'::text) AS has_permission
   FROM "User" u
  WHERE (u.active = true);

COMMIT;