/**
 * GET /api/globe — Initial globe data payload
 *
 * Returns everything the globe needs on first render:
 * - cities: night_pulse_realtime heat data (13 cities)
 * - beacons: active beacons with globe visual config
 * - globe_events: last 30s of events for initial animation burst
 *
 * Query params:
 * - city: filter beacons to a single city_slug (optional)
 *
 * Auth: required (Bearer token / Supabase session)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use service key if available, otherwise anon key with user's auth
  const key = supabaseServiceKey || supabaseAnonKey;
  if (!supabaseUrl || !key) {
    return res.status(500).json({ error: 'Supabase config missing' });
  }

  const supabase = createClient(supabaseUrl, key);

  // Forward user auth if using anon key
  const authHeader = req.headers.authorization;
  if (authHeader && !supabaseServiceKey) {
    supabase.auth.setSession({ access_token: authHeader.replace('Bearer ', ''), refresh_token: '' });
  }

  const cityFilter = req.query?.city || null;

  try {
    // Run all three queries in parallel
    const [citiesResult, beaconsResult, eventsResult] = await Promise.all([
      // 1. City heat from materialized view
      supabase
        .from('night_pulse_realtime')
        .select('city_id, city_name, latitude, longitude, active_beacons, heat_intensity, scans_last_hour'),

      // 2. Active beacons
      (() => {
        let q = supabase
          .from('beacons')
          .select(
            'id, code, type, beacon_category, title, status, geo_lat, geo_lng, city_slug, ' +
            'globe_color, globe_pulse_type, globe_size_base, intensity, checkin_count, ' +
            'venue_id, ends_at, starts_at, description, owner_id'
          )
          .eq('status', 'active');
        if (cityFilter) q = q.eq('city_slug', cityFilter);
        return q;
      })(),

      // 3. Recent globe events (last 30 seconds)
      supabase
        .from('globe_events')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const cities = (citiesResult.data || []).map((c) => ({
      city_id: c.city_id,
      city_name: c.city_name,
      lat: Number(c.latitude),
      lng: Number(c.longitude),
      active_beacons: Number(c.active_beacons) || 0,
      heat_intensity: Number(c.heat_intensity) || 0,
      scans_last_hour: Number(c.scans_last_hour) || 0,
    }));

    const now = new Date();
    const beacons = (beaconsResult.data || [])
      .filter((b) => !b.ends_at || new Date(b.ends_at) > now)
      .map((b) => ({
        id: b.id,
        code: b.code,
        type: b.type,
        beacon_category: b.beacon_category,
        title: b.title,
        geo_lat: Number(b.geo_lat),
        geo_lng: Number(b.geo_lng),
        city_slug: b.city_slug,
        globe_color: b.globe_color,
        globe_pulse_type: b.globe_pulse_type,
        globe_size_base: Number(b.globe_size_base) || 1.0,
        intensity: Number(b.intensity) || 1,
        checkin_count: Number(b.checkin_count) || 0,
        venue_id: b.venue_id,
        ends_at: b.ends_at,
        starts_at: b.starts_at,
        description: b.description,
        owner_id: b.owner_id,
      }));

    const globe_events = eventsResult.data || [];

    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    return res.status(200).json({ cities, beacons, globe_events });
  } catch (err) {
    console.error('[/api/globe] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
