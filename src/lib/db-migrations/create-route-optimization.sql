-- Create route optimization and scheduling system
-- This supports crew routing, job scheduling, and travel time optimization

-- Crew/Vehicle information table
CREATE TABLE IF NOT EXISTS "Vehicle" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "vehicleNumber" varchar(50) NOT NULL UNIQUE,
  "vehicleName" varchar(100) NOT NULL,
  "vehicleType" varchar(50) NOT NULL DEFAULT 'SERVICE_TRUCK',
  "capacity" integer DEFAULT 2,
  "licensePlate" varchar(20),
  "vin" varchar(50),
  "year" integer,
  "make" varchar(50),
  "model" varchar(50),
  "homeBaseAddress" text,
  "homeBaseLat" decimal(10, 8),
  "homeBaseLng" decimal(11, 8),
  "fuelType" varchar(20) DEFAULT 'GASOLINE',
  "avgFuelConsumption" decimal(5, 2),
  "hourlyOperatingCost" decimal(8, 2),
  "mileageRate" decimal(5, 2),
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Route definitions table
CREATE TABLE IF NOT EXISTS "Route" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "routeName" varchar(100) NOT NULL,
  "routeDate" date NOT NULL,
  "vehicleId" uuid REFERENCES "Vehicle"(id) ON DELETE SET NULL,
  "driverId" text,
  "crewMembers" text[],
  "status" varchar(50) NOT NULL DEFAULT 'PLANNED',
  "startTime" time,
  "endTime" time,
  "estimatedDuration" integer,
  "actualDuration" integer,
  "estimatedDistance" decimal(8, 2),
  "actualDistance" decimal(8, 2),
  "estimatedCost" decimal(10, 2),
  "actualCost" decimal(10, 2),
  "notes" text,
  "optimizationScore" decimal(5, 2),
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Route stops (jobs in sequence)
CREATE TABLE IF NOT EXISTS "RouteStop" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "routeId" uuid NOT NULL REFERENCES "Route"(id) ON DELETE CASCADE,
  "jobId" text REFERENCES "Job"(id) ON DELETE CASCADE,
  "stopOrder" integer NOT NULL,
  "stopType" varchar(50) NOT NULL DEFAULT 'JOB_SITE',
  "address" text NOT NULL,
  "latitude" decimal(10, 8),
  "longitude" decimal(11, 8),
  "estimatedArrival" timestamp,
  "actualArrival" timestamp,
  "estimatedDeparture" timestamp,
  "actualDeparture" timestamp,
  "estimatedDuration" integer,
  "actualDuration" integer,
  "travelTimeFromPrevious" integer,
  "distanceFromPrevious" decimal(8, 2),
  "notes" text,
  "status" varchar(50) DEFAULT 'PLANNED',
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW(),
  UNIQUE("routeId", "stopOrder")
);

-- Travel time matrix for caching distances/times between locations
CREATE TABLE IF NOT EXISTS "TravelMatrix" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fromAddress" text NOT NULL,
  "toAddress" text NOT NULL,
  "fromLat" decimal(10, 8),
  "fromLng" decimal(11, 8),
  "toLat" decimal(10, 8),
  "toLng" decimal(11, 8),
  "distance" decimal(8, 2) NOT NULL,
  "duration" integer NOT NULL,
  "durationInTraffic" integer,
  "calculatedAt" timestamp DEFAULT NOW(),
  "source" varchar(50) DEFAULT 'GOOGLE_MAPS',
  "vehicleType" varchar(50) DEFAULT 'TRUCK',
  UNIQUE("fromLat", "fromLng", "toLat", "toLng", "vehicleType")
);

-- Route optimization templates for recurring routes
CREATE TABLE IF NOT EXISTS "RouteTemplate" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "templateName" varchar(100) NOT NULL,
  "description" text,
  "vehicleId" uuid REFERENCES "Vehicle"(id) ON DELETE SET NULL,
  "daysOfWeek" integer[], -- 0=Sunday, 1=Monday, etc.
  "startTime" time,
  "maxDuration" integer,
  "maxDistance" decimal(8, 2),
  "serviceArea" text[], -- Array of service areas/zip codes
  "jobTypes" text[], -- Types of jobs this route handles
  "priority" integer DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Geographic service areas for route planning
CREATE TABLE IF NOT EXISTS "ServiceArea" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "areaName" varchar(100) NOT NULL,
  "areaCode" varchar(20) UNIQUE NOT NULL,
  "centerLat" decimal(10, 8),
  "centerLng" decimal(11, 8),
  "radius" decimal(8, 2), -- in miles
  "zipCodes" text[],
  "cities" text[],
  "boundaryCoords" jsonb, -- GeoJSON polygon for complex boundaries
  "defaultVehicleId" uuid REFERENCES "Vehicle"(id) ON DELETE SET NULL,
  "serviceDays" integer[], -- Days this area is serviced
  "priority" integer DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Route optimization settings and parameters
CREATE TABLE IF NOT EXISTS "RouteOptimizationSettings" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "settingName" varchar(100) NOT NULL UNIQUE,
  "maxStopsPerRoute" integer DEFAULT 8,
  "maxRouteHours" integer DEFAULT 480, -- 8 hours in minutes
  "maxRouteDistance" decimal(8, 2) DEFAULT 100,
  "breakDuration" integer DEFAULT 30, -- minutes
  "lunchBreakDuration" integer DEFAULT 60,
  "travelBufferPercent" decimal(5, 2) DEFAULT 15.0,
  "trafficMultiplier" decimal(5, 2) DEFAULT 1.3,
  "priorityWeighting" decimal(5, 2) DEFAULT 2.0,
  "distanceWeight" decimal(5, 2) DEFAULT 0.4,
  "timeWeight" decimal(5, 2) DEFAULT 0.4,
  "costWeight" decimal(5, 2) DEFAULT 0.2,
  "allowOvertimeRoutes" boolean DEFAULT false,
  "createdAt" timestamp DEFAULT NOW(),
  "updatedAt" timestamp DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_route_date_vehicle" ON "Route"("routeDate", "vehicleId");
CREATE INDEX IF NOT EXISTS "idx_route_status" ON "Route"("status");
CREATE INDEX IF NOT EXISTS "idx_route_stop_route_order" ON "RouteStop"("routeId", "stopOrder");
CREATE INDEX IF NOT EXISTS "idx_route_stop_job" ON "RouteStop"("jobId");
CREATE INDEX IF NOT EXISTS "idx_travel_matrix_coords" ON "TravelMatrix"("fromLat", "fromLng", "toLat", "toLng");
CREATE INDEX IF NOT EXISTS "idx_vehicle_active" ON "Vehicle"("active");
CREATE INDEX IF NOT EXISTS "idx_service_area_codes" ON "ServiceArea"("areaCode");

-- Create view for route summary with statistics
CREATE OR REPLACE VIEW "RouteSummaryView" AS
SELECT 
  r.id as "routeId",
  r."routeName",
  r."routeDate",
  r."vehicleId",
  v."vehicleNumber",
  v."vehicleName",
  r."driverId",
  r."status",
  r."startTime",
  r."endTime",
  r."estimatedDuration",
  r."actualDuration",
  r."estimatedDistance",
  r."actualDistance",
  r."estimatedCost",
  r."actualCost",
  r."optimizationScore",
  
  COUNT(rs.id) as "totalStops",
  COUNT(CASE WHEN rs."stopType" = 'JOB_SITE' THEN 1 END) as "jobStops",
  COUNT(CASE WHEN rs.status = 'COMPLETED' THEN 1 END) as "completedStops",
  COUNT(CASE WHEN rs.status = 'IN_PROGRESS' THEN 1 END) as "inProgressStops",
  
  MIN(rs."estimatedArrival") as "firstStopTime",
  MAX(rs."estimatedDeparture") as "lastStopTime",
  
  SUM(rs."estimatedDuration") as "totalJobTime",
  SUM(rs."travelTimeFromPrevious") as "totalTravelTime",
  SUM(rs."distanceFromPrevious") as "totalRouteDistance"
  
FROM "Route" r
LEFT JOIN "Vehicle" v ON r."vehicleId" = v.id
LEFT JOIN "RouteStop" rs ON r.id = rs."routeId"
GROUP BY r.id, r."routeName", r."routeDate", r."vehicleId", v."vehicleNumber", 
         v."vehicleName", r."driverId", r."status", r."startTime", r."endTime",
         r."estimatedDuration", r."actualDuration", r."estimatedDistance", 
         r."actualDistance", r."estimatedCost", r."actualCost", r."optimizationScore"
ORDER BY r."routeDate" DESC, r."startTime";

-- Create view for daily route performance
CREATE OR REPLACE VIEW "DailyRoutePerformanceView" AS
SELECT 
  r."routeDate",
  COUNT(r.id) as "totalRoutes",
  COUNT(CASE WHEN r.status = 'COMPLETED' THEN 1 END) as "completedRoutes",
  COUNT(CASE WHEN r.status = 'IN_PROGRESS' THEN 1 END) as "activeRoutes",
  COUNT(CASE WHEN r.status = 'CANCELLED' THEN 1 END) as "cancelledRoutes",
  
  SUM(rs_count.total_stops) as "totalStops",
  SUM(rs_count.completed_stops) as "completedStops",
  
  ROUND(AVG(r."optimizationScore"), 2) as "avgOptimizationScore",
  SUM(r."estimatedDistance") as "totalPlannedDistance",
  SUM(r."actualDistance") as "totalActualDistance",
  SUM(r."estimatedCost") as "totalPlannedCost",
  SUM(r."actualCost") as "totalActualCost",
  
  -- Calculate efficiency metrics
  CASE 
    WHEN SUM(r."estimatedDistance") > 0 THEN 
      ROUND((SUM(r."actualDistance") / SUM(r."estimatedDistance")) * 100, 2)
    ELSE NULL 
  END as "distanceEfficiency",
  
  CASE 
    WHEN SUM(r."estimatedDuration") > 0 THEN 
      ROUND((SUM(r."actualDuration") / SUM(r."estimatedDuration")) * 100, 2)
    ELSE NULL 
  END as "timeEfficiency"
  
FROM "Route" r
LEFT JOIN (
  SELECT 
    "routeId",
    COUNT(*) as total_stops,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_stops
  FROM "RouteStop"
  GROUP BY "routeId"
) rs_count ON r.id = rs_count."routeId"
GROUP BY r."routeDate"
ORDER BY r."routeDate" DESC;

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 decimal(10,8), 
  lng1 decimal(11,8), 
  lat2 decimal(10,8), 
  lng2 decimal(11,8)
) RETURNS decimal(8,2) AS $$
DECLARE
  R decimal := 3959; -- Earth's radius in miles
  dLat decimal;
  dLng decimal;
  a decimal;
  c decimal;
  distance decimal;
BEGIN
  dLat := radians(lat2 - lat1);
  dLng := radians(lng2 - lng1);
  
  a := sin(dLat/2) * sin(dLat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dLng/2) * sin(dLng/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  distance := R * c;
  
  RETURN distance;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get or calculate travel time between two locations
CREATE OR REPLACE FUNCTION get_travel_time(
  from_lat decimal(10,8),
  from_lng decimal(11,8), 
  to_lat decimal(10,8),
  to_lng decimal(11,8),
  vehicle_type varchar(50) DEFAULT 'TRUCK'
) RETURNS TABLE(
  distance decimal(8,2),
  duration integer
) AS $$
DECLARE
  cached_record RECORD;
  calculated_distance decimal(8,2);
  estimated_duration integer;
BEGIN
  -- Try to find cached travel time
  SELECT tm.distance, tm.duration
  INTO cached_record
  FROM "TravelMatrix" tm
  WHERE ABS(tm."fromLat" - from_lat) < 0.001
    AND ABS(tm."fromLng" - from_lng) < 0.001
    AND ABS(tm."toLat" - to_lat) < 0.001
    AND ABS(tm."toLng" - to_lng) < 0.001
    AND tm."vehicleType" = vehicle_type
    AND tm."calculatedAt" > NOW() - INTERVAL '30 days'
  LIMIT 1;
  
  IF FOUND THEN
    distance := cached_record.distance;
    duration := cached_record.duration;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Calculate distance using Haversine formula
  calculated_distance := calculate_distance(from_lat, from_lng, to_lat, to_lng);
  
  -- Estimate duration based on distance and average speed
  -- Assume 25 mph average speed for service trucks in mixed traffic
  estimated_duration := ROUND(calculated_distance / 25.0 * 60); -- Convert to minutes
  
  distance := calculated_distance;
  duration := estimated_duration;
  
  -- Cache the result
  INSERT INTO "TravelMatrix" (
    "fromLat", "fromLng", "toLat", "toLng", 
    "distance", "duration", "vehicleType", "source"
  ) VALUES (
    from_lat, from_lng, to_lat, to_lng,
    calculated_distance, estimated_duration, vehicle_type, 'CALCULATED'
  ) ON CONFLICT ("fromLat", "fromLng", "toLat", "toLng", "vehicleType") 
  DO UPDATE SET 
    "distance" = calculated_distance,
    "duration" = estimated_duration,
    "calculatedAt" = NOW();
  
  RETURN NEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate route optimization score
CREATE OR REPLACE FUNCTION calculate_route_score(route_id uuid)
RETURNS decimal(5,2) AS $$
DECLARE
  total_distance decimal(8,2) := 0;
  total_time integer := 0;
  stop_count integer := 0;
  ideal_distance decimal(8,2);
  ideal_time integer;
  distance_score decimal(5,2);
  time_score decimal(5,2);
  efficiency_score decimal(5,2);
BEGIN
  -- Get route statistics
  SELECT 
    COALESCE(SUM("distanceFromPrevious"), 0),
    COALESCE(SUM("travelTimeFromPrevious"), 0),
    COUNT(*)
  INTO total_distance, total_time, stop_count
  FROM "RouteStop" 
  WHERE "routeId" = route_id;
  
  IF stop_count <= 1 THEN
    RETURN 100.0; -- Perfect score for single stop
  END IF;
  
  -- Calculate ideal metrics (straight line distance with minimal detours)
  ideal_distance := total_distance * 0.7; -- Assume 30% routing overhead is ideal
  ideal_time := total_time * 0.8; -- Assume 20% time overhead is ideal
  
  -- Calculate scores (lower is better, so invert)
  distance_score := CASE 
    WHEN total_distance <= ideal_distance THEN 100.0
    ELSE GREATEST(0, 100.0 - ((total_distance - ideal_distance) / ideal_distance * 50))
  END;
  
  time_score := CASE 
    WHEN total_time <= ideal_time THEN 100.0
    ELSE GREATEST(0, 100.0 - ((total_time - ideal_time) / ideal_time * 50))
  END;
  
  -- Combined efficiency score
  efficiency_score := (distance_score * 0.6 + time_score * 0.4);
  
  RETURN ROUND(efficiency_score, 2);
END;
$$ LANGUAGE plpgsql;

-- Insert default optimization settings
INSERT INTO "RouteOptimizationSettings" (
  "settingName", "maxStopsPerRoute", "maxRouteHours", "maxRouteDistance",
  "breakDuration", "lunchBreakDuration", "travelBufferPercent", 
  "trafficMultiplier", "priorityWeighting", "distanceWeight", 
  "timeWeight", "costWeight", "allowOvertimeRoutes"
) VALUES (
  'default', 8, 480, 100.0, 30, 60, 15.0, 1.3, 2.0, 0.4, 0.4, 0.2, false
) ON CONFLICT ("settingName") DO NOTHING;

-- Insert sample service areas
INSERT INTO "ServiceArea" ("areaName", "areaCode", "centerLat", "centerLng", "radius", "zipCodes", "cities") 
VALUES 
  ('North Metro', 'NORTH', 44.0521, -93.2235, 15.0, ARRAY['55112', '55113', '55126'], ARRAY['Roseville', 'Shoreview', 'Little Canada']),
  ('South Metro', 'SOUTH', 44.8831, -93.2289, 12.0, ARRAY['55124', '55125', '55077'], ARRAY['Apple Valley', 'Burnsville', 'Eagan']),
  ('West Metro', 'WEST', 44.9537, -93.4677, 10.0, ARRAY['55305', '55391', '55317'], ARRAY['Hopkins', 'Minnetonka', 'Excelsior'])
ON CONFLICT ("areaCode") DO NOTHING;

-- Trigger to update route optimization score
CREATE OR REPLACE FUNCTION update_route_score_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the route's optimization score when stops change
  UPDATE "Route" 
  SET "optimizationScore" = calculate_route_score(NEW."routeId"),
      "updatedAt" = NOW()
  WHERE id = NEW."routeId";
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_route_score
  AFTER INSERT OR UPDATE OR DELETE ON "RouteStop"
  FOR EACH ROW
  EXECUTE FUNCTION update_route_score_trigger();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_route_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_route_timestamp
  BEFORE UPDATE ON "Route"
  FOR EACH ROW
  EXECUTE FUNCTION update_route_timestamp();

CREATE TRIGGER trigger_update_vehicle_timestamp
  BEFORE UPDATE ON "Vehicle"
  FOR EACH ROW
  EXECUTE FUNCTION update_route_timestamp();

COMMENT ON TABLE "Vehicle" IS 'Fleet vehicles and equipment for route assignments';
COMMENT ON TABLE "Route" IS 'Planned and actual routes for job scheduling';
COMMENT ON TABLE "RouteStop" IS 'Individual stops/jobs within a route';
COMMENT ON TABLE "TravelMatrix" IS 'Cached travel times and distances between locations';
COMMENT ON TABLE "RouteTemplate" IS 'Reusable route templates for recurring schedules';
COMMENT ON TABLE "ServiceArea" IS 'Geographic service areas for route planning';
COMMENT ON COLUMN "Route"."optimizationScore" IS 'Score from 0-100 indicating route efficiency';
COMMENT ON COLUMN "TravelMatrix"."durationInTraffic" IS 'Travel time accounting for traffic conditions';
COMMENT ON COLUMN "RouteStop"."stopType" IS 'JOB_SITE, DEPOT, LUNCH, FUEL, SUPPLY_PICKUP';