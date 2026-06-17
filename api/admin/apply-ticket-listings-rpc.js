/**
 * ONE-SHOT migration — delete after running. Token: hm-migrate-2026-ticket-rpc-9x7k
 */
import pg from 'pg';
const { Client } = pg;

const SQL = `DROP FUNCTION IF EXISTS get_ticket_listings(text, date, date, float8, float8, numeric);

CREATE OR REPLACE FUNCTION get_ticket_listings(
  p_user_id   uuid    DEFAULT NULL,
  p_city      text    DEFAULT NULL,
  p_date_from date    DEFAULT NULL,
  p_date_to   date    DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_lat       float8  DEFAULT NULL,
  p_lng       float8  DEFAULT NULL,
  p_limit     int     DEFAULT 20,
  p_offset    int     DEFAULT 0
)
RETURNS TABLE (
  pool_id             uuid,
  beacon_id           uuid,
  ticket_type         text,
  label               text,
  price               numeric,
  fee_rate            numeric,
  inventory_cap       int,
  inventory_sold      int,
  inventory_remaining int,
  released_at         timestamptz,
  closes_at           timestamptz,
  tier_gate           text,
  resale_allowed      bool,
  event_title         text,
  event_start_at      timestamptz,
  event_end_at        timestamptz,
  city                text,
  city_slug           text,
  venue_id            uuid,
  geo_lat             float8,
  geo_lng             float8,
  distance_km         float8
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH viewer_verified AS (
    SELECT COALESCE((SELECT age_verified FROM profiles WHERE id = p_user_id LIMIT 1), false) AS is_verified
  )
  SELECT
    tip.id, tip.beacon_id, tip.ticket_type::text, tip.label, tip.price, tip.fee_rate,
    tip.inventory_cap, tip.inventory_sold,
    GREATEST(0, tip.inventory_cap - tip.inventory_sold),
    tip.released_at, tip.closes_at, tip.tier_gate::text, tip.resale_allowed,
    b.title, b.event_start_at, b.event_end_at, b.city, b.city_slug, b.venue_id,
    b.geo_lat, b.geo_lng,
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND b.geo_lat IS NOT NULL AND b.geo_lng IS NOT NULL
      THEN 6371.0 * acos(LEAST(1.0, cos(radians(p_lat)) * cos(radians(b.geo_lat)) * cos(radians(b.geo_lng) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(b.geo_lat))))
      ELSE NULL
    END
  FROM ticket_inventory_pools tip
  JOIN beacons b ON b.id = tip.beacon_id
  CROSS JOIN viewer_verified vv
  WHERE tip.is_active = true AND tip.released_at <= now() AND tip.closes_at > now()
    AND GREATEST(0, tip.inventory_cap - tip.inventory_sold) > 0
    AND (tip.tier_gate IS NULL OR vv.is_verified = true)
    AND (p_city IS NULL OR b.city ILIKE '%' || p_city || '%' OR b.city_slug ILIKE '%' || p_city || '%')
    AND (p_date_from IS NULL OR b.event_start_at::date >= p_date_from)
    AND (p_date_to IS NULL OR b.event_start_at::date <= p_date_to)
    AND (p_max_price IS NULL OR tip.price <= p_max_price)
  ORDER BY
    CASE WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND b.geo_lat IS NOT NULL AND b.geo_lng IS NOT NULL
      THEN 6371.0 * acos(LEAST(1.0, cos(radians(p_lat)) * cos(radians(b.geo_lat)) * cos(radians(b.geo_lng) - radians(p_lng)) + sin(radians(p_lat)) * sin(radians(b.geo_lat))))
      ELSE NULL END ASC NULLS LAST, b.event_start_at ASC NULLS LAST
  LIMIT LEAST(p_limit, 50) OFFSET GREATEST(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION get_ticket_listings(uuid,text,date,date,numeric,float8,float8,int,int) TO anon, authenticated, service_role;`;

export default async function handler(req, res) {
  const auth = req.headers['authorization'] || '';
  if (auth !== 'Bearer hm-migrate-2026-ticket-rpc-9x7k') return res.status(401).json({ error: 'Unauthorized' });

  // Try Supabase Management API first (if personal access token is set)
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (accessToken) {
    const r = await fetch('https://api.supabase.com/v1/projects/rfoftonnlwudilafhfkl/database/query', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SQL }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) return res.status(200).json({ ok: true, method: 'management_api', result: data });
    console.error('[migrate] mgmt api:', r.status, data);
  }

  // Fallback: direct pg connection
  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!dbUrl) {
    const keys = Object.keys(process.env).filter(k => /POSTGRES|DATABASE|SUPABASE|PG/.test(k)).sort();
    return res.status(500).json({ ok: false, error: 'No DB URL env var found', available_keys: keys });
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(SQL);
    await client.end();
    return res.status(200).json({ ok: true, method: 'pg' });
  } catch (err) {
    await client.end().catch(() => {});
    return res.status(500).json({ ok: false, method: 'pg', error: err.message });
  }
}
