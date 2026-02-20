-- Globe Locations (spikes) and Routes (arcs) tables
-- Supports the real-time geo-social engine: section 1.B of the architecture spec
-- PostGIS geography(POINT) columns for spatial indexing + Great Circle Distance

-- Enable PostGIS extension (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- =====================================================
-- TABLE: locations
-- Represents individual geo-pinned spikes on the globe
-- =====================================================

CREATE TABLE IF NOT EXISTS public.locations (
  id          uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  title       text,
  description text,
  kind        text             NOT NULL DEFAULT 'spike',
  intensity   double precision NOT NULL DEFAULT 1.0,
  metadata    jsonb,
  created_by  uuid             REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz      NOT NULL DEFAULT now(),

  -- Coordinate range validation
  CONSTRAINT locations_lat_range CHECK (lat  >= -90  AND lat  <= 90),
  CONSTRAINT locations_lng_range CHECK (lng  >= -180 AND lng  <= 180),
  CONSTRAINT locations_intensity_range CHECK (intensity >= 0 AND intensity <= 1)
);

-- Computed geography column (requires PostgreSQL 12+ with PostGIS)
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS geo geography(POINT, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED;

-- Spatial + query indexes
CREATE INDEX IF NOT EXISTS idx_locations_geo     ON public.locations USING GIST (geo);
CREATE INDEX IF NOT EXISTS idx_locations_created ON public.locations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_locations_kind    ON public.locations (kind);

-- Row-level security
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "locations_select_all"
  ON public.locations FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "locations_insert_authenticated"
  ON public.locations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid()));

-- Grant permissions
GRANT SELECT         ON public.locations TO anon, authenticated;
GRANT INSERT         ON public.locations TO authenticated;
GRANT USAGE, SELECT  ON SEQUENCE         locations_id_seq TO authenticated;

-- =====================================================
-- TABLE: routes
-- Represents great-circle arc connections between two points
-- =====================================================

CREATE TABLE IF NOT EXISTS public.routes (
  id         uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  from_lat   double precision NOT NULL,
  from_lng   double precision NOT NULL,
  to_lat     double precision NOT NULL,
  to_lng     double precision NOT NULL,
  label      text,
  color      text,
  metadata   jsonb,
  created_by uuid             REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz      NOT NULL DEFAULT now(),

  -- Coordinate range validation
  CONSTRAINT routes_from_lat_range CHECK (from_lat >= -90  AND from_lat <= 90),
  CONSTRAINT routes_from_lng_range CHECK (from_lng >= -180 AND from_lng <= 180),
  CONSTRAINT routes_to_lat_range   CHECK (to_lat   >= -90  AND to_lat   <= 90),
  CONSTRAINT routes_to_lng_range   CHECK (to_lng   >= -180 AND to_lng   <= 180)
);

-- Computed geography + distance columns
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS from_geo   geography(POINT, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(from_lng, from_lat), 4326)::geography) STORED,
  ADD COLUMN IF NOT EXISTS to_geo     geography(POINT, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(to_lng, to_lat), 4326)::geography) STORED,
  ADD COLUMN IF NOT EXISTS distance_m double precision
    GENERATED ALWAYS AS (
      ST_Distance(
        ST_SetSRID(ST_MakePoint(from_lng, from_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(to_lng,   to_lat),   4326)::geography
      )
    ) STORED;

-- Spatial + query indexes
CREATE INDEX IF NOT EXISTS idx_routes_from_geo ON public.routes USING GIST (from_geo);
CREATE INDEX IF NOT EXISTS idx_routes_to_geo   ON public.routes USING GIST (to_geo);
CREATE INDEX IF NOT EXISTS idx_routes_created  ON public.routes (created_at DESC);

-- Row-level security
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "routes_select_all"
  ON public.routes FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "routes_insert_authenticated"
  ON public.routes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid()));

-- Grant permissions
GRANT SELECT        ON public.routes TO anon, authenticated;
GRANT INSERT        ON public.routes TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE      routes_id_seq TO authenticated;
