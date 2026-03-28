-- Search RPC Functions Migration
-- Creates full-text search functions for users and beacons

-- Enable pg_trgm extension for similarity search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add search vector columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search vector column to Beacon table  
ALTER TABLE "Beacon" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Drop existing functions if they exist (to allow return type changes)
DROP FUNCTION IF EXISTS search_users(TEXT, INTEGER);
DROP FUNCTION IF EXISTS search_beacons(TEXT, INTEGER);

-- Create function to update User search vector
CREATE OR REPLACE FUNCTION update_user_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.username, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.bio, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.city, '')), 'C') ||
    -- archetype removed
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.interests, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update Beacon search vector
CREATE OR REPLACE FUNCTION update_beacon_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.city, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.venue_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.mode, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for search vector updates
DROP TRIGGER IF EXISTS trigger_update_user_search_vector ON "User";
CREATE TRIGGER trigger_update_user_search_vector
  BEFORE INSERT OR UPDATE OF full_name, username, bio, city, interests
  ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION update_user_search_vector();

DROP TRIGGER IF EXISTS trigger_update_beacon_search_vector ON "Beacon";
CREATE TRIGGER trigger_update_beacon_search_vector
  BEFORE INSERT OR UPDATE OF title, description, city, venue_name, mode
  ON "Beacon"
  FOR EACH ROW
  EXECUTE FUNCTION update_beacon_search_vector();

-- Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS idx_user_search_vector ON "User" USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_beacon_search_vector ON "Beacon" USING GIN(search_vector);

-- Create trigram indexes for fuzzy search fallback
CREATE INDEX IF NOT EXISTS idx_user_full_name_trgm ON "User" USING GIN(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_user_username_trgm ON "User" USING GIN(username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_beacon_title_trgm ON "Beacon" USING GIN(title gin_trgm_ops);

-- Update existing records to populate search vectors
UPDATE "User" SET search_vector = 
  setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(username, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(bio, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(city, '')), 'C') ||
  -- archetype removed
  setweight(to_tsvector('english', coalesce(array_to_string(interests, ' '), '')), 'B')
WHERE search_vector IS NULL;

UPDATE "Beacon" SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(city, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(venue_name, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(mode, '')), 'C')
WHERE search_vector IS NULL;

-- Create search_users RPC function
CREATE OR REPLACE FUNCTION search_users(
  search_query TEXT,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  xp INTEGER,
  level INTEGER,
  is_verified BOOLEAN,
  rank REAL
) AS $$
BEGIN
  -- Return results using full-text search with fuzzy fallback
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.username,
    u.avatar_url,
    u.bio,
    u.city,
    -- u.archetype removed
    u.xp,
    u.level,
    u.is_verified,
    COALESCE(
      ts_rank(u.search_vector, websearch_to_tsquery('english', search_query)),
      0
    ) + 
    COALESCE(
      similarity(u.full_name, search_query) * 0.5,
      0
    ) +
    COALESCE(
      similarity(u.username, search_query) * 0.5,
      0
    ) AS rank
  FROM "User" u
  WHERE 
    u.search_vector @@ websearch_to_tsquery('english', search_query)
    OR u.full_name ILIKE '%' || search_query || '%'
    OR u.username ILIKE '%' || search_query || '%'
    OR u.email ILIKE '%' || search_query || '%'
    OR similarity(u.full_name, search_query) > 0.2
    OR similarity(u.username, search_query) > 0.2
  ORDER BY rank DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create search_beacons RPC function
CREATE OR REPLACE FUNCTION search_beacons(
  search_query TEXT,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  city TEXT,
  venue_name TEXT,
  mode TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  image_url TEXT,
  active BOOLEAN,
  created_by TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.description,
    b.city,
    b.venue_name,
    b.mode,
    b.latitude,
    b.longitude,
    b.starts_at,
    b.ends_at,
    b.image_url,
    b.active,
    b.created_by,
    COALESCE(
      ts_rank(b.search_vector, websearch_to_tsquery('english', search_query)),
      0
    ) + 
    COALESCE(
      similarity(b.title, search_query) * 0.5,
      0
    ) AS rank
  FROM "Beacon" b
  WHERE 
    b.search_vector @@ websearch_to_tsquery('english', search_query)
    OR b.title ILIKE '%' || search_query || '%'
    OR b.description ILIKE '%' || search_query || '%'
    OR b.city ILIKE '%' || search_query || '%'
    OR b.venue_name ILIKE '%' || search_query || '%'
    OR similarity(b.title, search_query) > 0.2
  ORDER BY rank DESC, b.starts_at DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_users(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_users(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION search_beacons(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_beacons(TEXT, INTEGER) TO anon;

-- Add comments
COMMENT ON FUNCTION search_users IS 'Full-text search for users with fuzzy matching';
COMMENT ON FUNCTION search_beacons IS 'Full-text search for beacons/events with fuzzy matching';
